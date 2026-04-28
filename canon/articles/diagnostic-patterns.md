---
title: "Diagnostic Patterns — Reading XeTeX Logs and Recovering from Failures"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "diagnostics", "log-reading", "recovery", "errors"]
derives_from: "canon/governance/headless-operations.md (Part 9 Diagnostic Patterns)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

# Diagnostic Patterns

> **What this answers.** How does the agent read a XeTeX log? What patterns indicate which problems? How does the recovery loop work?
>
> **Related articles.** `klappy://canon/articles/failure-mode-taxonomy` · `klappy://canon/articles/payload-construction` · `klappy://canon/articles/config-inheritance-and-overrides`

---

## Reading the XeTeX log

The log is uploaded to R2 alongside the PDF and surfaced two ways in `get_job_status`:

- `log_url` — presigned R2 GET URL for the full log
- `log_tail` — last 100 lines inline in the response

For long jobs, use `log_tail` for incremental visibility during the run; fetch the full log via `log_url` after completion if more context is needed.

## Patterns to grep

| Pattern | Meaning |
|---|---|
| `^!` | TeX fatal error. Read the next 5–10 lines for the cause. |
| `Overfull \hbox` | Horizontal overfull (line too long). One per occurrence. |
| `Overfull \vbox` | Vertical overfull (page too long). One per occurrence. |
| `Underfull \hbox` | Line too short (typically with stretched spacing). |
| `Output written on ...` | Successful PDF write; the canonical "did it complete" marker. |
| `! Undefined control sequence.` | A USFM marker the macros don't recognize. Check `ptxprint.sty`. |
| `! Missing number, treated as zero.` | A setting expected a number and got something else. |
| `image not found` (or similar) | Picture file missing from `figures` array or wrong URL. |
| `Output written on ... (0 pages)` | XeTeX completed but produced an empty PDF. Soft failure indicator. |

## Common error signatures and causes

| Error pattern | Likely cause | Fix |
|---|---|---|
| `! Undefined control sequence \xyz` | Custom marker not declared in `.sty` | Add the marker to `ptxprint.sty` content in the payload, or remove from source |
| `! Font \xyz not loadable` | Font missing from `fonts` array | Add the font with valid URL+sha256 |
| `! TeX capacity exceeded, sorry` | Document complexity exceeds XeTeX limits | Reduce complexity (fewer pictures per page, simpler styles) |
| Empty PDF / "0 pages" | Source USFM is empty or malformed | Check source files; PTXprint 3.0.9+ has pre-flight checks for this |
| Long hang during run | Hyphenation cache rebuild, or first-time picture processing | Increase the payload's timeout; check progress in `log_tail` |
| Pictures all missing | Piclist wrong, or `figures` array mismatch | Run the seven-point checklist below |
| Layout looks completely wrong | Override file silently overriding | Check `ptxprint_project.cfg` and `ptxprint_override.cfg` in the payload |

## The seven-point picture checklist

When `failure_mode == "soft"` and the user reports pictures missing:

```
1. Are pictures listed in the piclist for this configuration?
   → Inspect the piclist content in the working payload's config_files; confirm
     entries for the books being typeset.

2. Are the picture files in the payload's figures array, with valid URLs and
   matching sha256 hashes?
   → Inspect the payload (the agent has the working copy). Verify that the
     figures referenced by the piclist are present in the array and that their
     URLs return content matching the declared hashes.

3. Can PTXprint see them?
   → Look for "image not found" warnings in the log surfaced via log_tail or log_url.

4. Are all missing or just some?
   → Diff the piclist's expected entries against the log's rendered count.

5. Are Anchor Refs valid (do those verses exist)?
   → Verify against the source USFM; bridged verses can confuse anchors.

6. Are pictures too large?
   → Check the scale values in the piclist; reduce if oversize.

7. Are too many on one page?
   → Spread them across more verses by adjusting Anchor Refs.
```

Surface the specific fix to the user. If multiple issues, fix one at a time and re-submit.

## "I changed it but nothing happened"

When the agent updates a cfg key in the payload and the output doesn't change:

```
1. Confirm the cfg key was actually changed in the payload that was submitted.
   Read it back from the working payload state.
2. Check ptxprint_override.cfg in the payload's config_files (and project state).
3. Check ptxprint_project.cfg in the payload's config_files (and project state).
4. If neither override file has the key, the issue is elsewhere:
   - Was the most recent payload actually submitted? (Look at the payload_hash
     in the last submit_typeset response.)
   - Did the agent receive a cache hit on a stale payload? (The `cached` field
     on the submit_typeset response indicates this.)
   - Is the parent config's value being inherited and the child's value not
     overriding? (Walk the inheritance chain.)
5. If an override file does have the key, surface that to the user; ask whether
   to edit the override.
```

The most common cause is #2 or #3 — see `klappy://canon/articles/config-inheritance-and-overrides` for the resolution order.

## When to surface partial results

When a job fails after producing some output (a partial log, a PDF from a previous payload), surface what exists with explicit caveats:

> "The run did not complete. The log at log_url shows the last successful step was X. The pdf_url from a previous payload (\<earlier_payload_hash\>) is still available and dates to \<date\>; it does not reflect this attempt."

Do not silently return an earlier payload's pdf_url as if it were the new result. Cache hits are deliberate (same payload → same output); ghost results from old payloads confuse the user.

## Overfull box count: a signal, not a failure

`get_job_status.overfull_count` reports `Overfull \hbox` and `Overfull \vbox` warning counts. Non-zero is normal.

Rough thresholds for an NT-sized publication:

| Count | Interpretation |
|---|---|
| < 20 | Excellent; nothing to do |
| 20–50 | Normal; some justification stretching |
| 50–200 | Worth investigating; specific paragraphs may need adjustment |
| 200–500 | Layout has problems; review font size, line spacing, column count |
| > 500 | Likely a fundamental layout mismatch (text too large for column width) |

Heuristics, not hard rules. Poetry runs higher than narrative.

The `failure_mode` classification handles low-medium counts as success automatically. For counts ≥ 200, the agent should mention to the user as a concern even when `failure_mode: "success"`.

## The recovery loop

Per session 6 D-024, the failure → log → fix → resubmit loop is the agent's primary error-recovery mechanism:

1. `submit_typeset(payload)` → `job_id`
2. `get_job_status(job_id)` → `failure_mode`, `log_tail`, `errors[]`
3. Agent reads log evidence, identifies cause, modifies the payload (cfg key, font URL, source content, whatever).
4. Re-submits modified payload. New `payload_hash` → fresh run. Cache hits if the change matches a previous attempt.
5. Repeat until `failure_mode: "success"`.

### Latency budget

Per session 6 C-009, BT Servant cannot afford four minutes of back-and-forth on long autofill jobs. For autofill failures, prefer to:

- Fail fast with `mode: "simple"` first
- Fix visible problems (missing fonts, malformed cfg, bad sources)
- Promote to `mode: "autofill"` only when the simple run succeeds

This separates the long autofill cost from the short debugging cost.

### When to give up and ask the user

The recovery loop has limits. After 2–3 failed attempts on the same problem, surface to the user:

> "I've tried three approaches and none have worked. The log shows X. Here's what I've tried: A, B, C. Could you confirm Y, or check the underlying USFM?"

Better to ask one well-formed question than to keep iterating blindly.

## Specific failure patterns

### Hard failure: `! Undefined control sequence`

```
! Undefined control sequence.
l.123 \mycustommarker
```

Cause: a USFM marker in the source USFM that PTXprint's macros don't recognize.

Fix: declare the marker in `ptxprint.sty` content. Minimal declaration:

```
\Marker mycustommarker
\TextProperties paragraph
```

If the user authored the marker, this is the fix. If the marker is a typo in the source, surface to the user and let them fix in Paratext.

### Hard failure: `! Font ... not loadable`

```
! Font \specialfont/300:script=latn at 12pt not loadable: Metric (TFM) file or installed font not found.
```

Cause: the font referenced by the cfg or stylesheet isn't in the payload's `fonts` array.

Fix: add the font entry. See `klappy://canon/articles/font-resolution`.

### Hard failure: `! Missing number, treated as zero`

```
! Missing number, treated as zero.
<to be read again> 
                  =
```

Cause: a cfg value or `\zvar` substitution gave non-numeric content where a number was expected.

Fix: locate the cfg key in the log context (the `l.<num>` indicator before this error) and check the value type. Common: a `\zvar` whose value isn't set in `[vars]`, or a cfg key set to a string when the macro expects a number.

### Soft failure: missing pictures

See the seven-point checklist above.

### Soft failure: blank or truncated ToC

Cause: the `\ztoc` marker isn't in `FRTlocal.sfm`, or the `\toc1`/`\toc2`/`\toc3` markers aren't set in the source USFM.

Fix: verify `\ztoc|main\*` (or appropriate scope) is in `FRTlocal.sfm` content. Verify each book's `\toc1` is set.

### Soft failure: PDF page count too low

Cause: source USFM is empty, malformed, or only partially included.

Fix: verify each book's USFM source in the `sources` array has actual content. Empty `\id`-only files produce empty pages.

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`. See also: `klappy://canon/articles/failure-mode-taxonomy` for the hard/soft/success classification.*
