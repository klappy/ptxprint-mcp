---
title: "Failure Mode Taxonomy — Hard, Soft, and Success"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "failure-modes", "diagnostics", "validation"]
derives_from: "canon/governance/headless-operations.md (Part 0 Three failure modes, Part 9 Diagnostic Patterns)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

# Failure Mode Taxonomy

> **What this answers.** When `get_job_status` returns, how does the agent know the job actually worked? What does "soft failure" mean? When is an exit code 0 still a problem?
>
> **Related articles.** `klappy://canon/articles/diagnostic-patterns` · `klappy://canon/articles/payload-construction` · `klappy://canon/articles/output-naming`

---

## The three outcomes

Headless typesetting has three outcomes, not two. An agent that checks only exit code or only PDF existence will report soft failures as success.

| Outcome | exit_code | PDF on disk | Content quality |
|---|---|---|---|
| **success** | 0 | yes | structural checks pass |
| **soft failure** | 0 | yes | structural checks fail (degraded output) |
| **hard failure** | non-zero | usually no | XeTeX errored or didn't produce a file |

`get_job_status` returns the classification result in the `failure_mode` field — one of `"hard" | "soft" | "success"`. **The agent reads this field directly. It does not re-derive the classification.** The worker has more information (PDF page count, structural checks, log inspection) than the agent receives.

## Why the distinction matters

A soft failure looks like a success on the surface: exit code 0, PDF in R2, presigned URL ready to share. Without the `failure_mode` classification, the agent surfaces a degraded PDF to the user as "your typesetting succeeded." Common soft failures:

- All pictures missing from a PDF that was supposed to have them
- ToC blank when the user expected one
- Footnotes silently dropped
- Pages collapsed when the source had more content
- Empty PDF from empty/malformed source USFM

Each of these is a "the run technically completed" outcome that hides a real problem. The taxonomy exists so the agent reports them as failures.

## How the worker classifies

The worker computes `failure_mode` using this truth table:

```
exit_code == 0 and pdf_exists and overfull_count < 50           → success
exit_code == 0 and pdf_exists and overfull_count >= 50          → success-with-concerns (still success)
exit_code == 0 and pdf_exists and pdf_page_count < expected     → soft failure (degraded)
exit_code == 0 and pdf_exists and "image not found" in log      → soft failure (missing pictures)
exit_code == 0 and not pdf_exists                                → impossible (XeTeX bug); investigate
exit_code != 0 and pdf_exists                                    → partial: PDF exists from previous run; ignore
exit_code != 0 and not pdf_exists                                → hard failure
exit_code == 4                                                   → hard failure (XeTeX errors during macro processing)
exit_code == 3                                                   → hard failure (XeTeX completed but didn't write PDF)
exit_code == 1                                                   → hard failure (startup; project not found, bad config, missing executable)
```

These are heuristics. The worker's exact logic may evolve; the agent always reads `failure_mode` rather than computing it.

## What to do per failure mode

### success

Surface the `pdf_url` to the user. Optionally mention `overfull_count` if it's notable but not blocking (see `klappy://canon/articles/diagnostic-patterns` for thresholds). Done.

### soft failure

Surface to the user as a problem, not a result. Read the `errors` array and `log_tail` for the cause.

Common patterns and fixes:

| Cause | Diagnostic | Fix |
|---|---|---|
| Pictures missing | `"image not found"` in log | Run the seven-point picture checklist; verify `figures` array URLs and sha256s |
| Page count too low | `pdf_page_count < expected` | Source USFM may be empty; check `sources` array contents |
| ToC blank | No `\ztoc` rendering, or `FRTlocal.sfm` missing the marker | Add `\ip \ztoc|main\*` to FRT |
| Footnotes dropped | `\f` styles not declared in `.sty` | Verify `ptxprint.sty` content has footnote style declarations |

The soft-failure PDF is still in R2 at `pdf_url`. The agent can surface it to the user as evidence of what went wrong ("here's what came out — pictures are missing because..."), but should not present it as the deliverable.

### hard failure

Surface to the user as a failure. Read `errors[]` and `log_tail` for the cause. The PDF (if any) referenced by `pdf_url` is from a prior run — do not surface it as the new result.

Common patterns and fixes:

| `exit_code` | Pattern | Likely cause | Fix |
|---|---|---|---|
| 1 | "project not found" | `project_id` in payload doesn't match a directory the worker can construct | Verify `project_id` value |
| 1 | "config path bad" | `config_name` doesn't have a corresponding `config_files` entry | Add the cfg content to `config_files` |
| 4 | `! Undefined control sequence \xyz` | A USFM marker not declared in `.sty` | Add the marker to `ptxprint.sty` content, or remove from source |
| 4 | `! Font \xyz not loadable` | Font missing from `fonts` array | Add the font with valid URL+sha256 |
| 4 | `! Missing number, treated as zero` | A cfg value expected a number and got something else | Find the misspelled or wrong-typed value |
| 4 | `! TeX capacity exceeded, sorry` | Document complexity exceeds XeTeX limits | Reduce complexity (fewer pictures per page, simpler styles) |
| 3 | XeTeX completed but no PDF | Permissions or disk issue inside the worker | Re-submit; if persistent, escalate as infrastructure issue |

## The recovery loop

Per session 6 D-024, the failure→fix loop is the agent's primary error-recovery mechanism (no separate validator):

1. `submit_typeset` → `job_id`
2. `get_job_status` → `failure_mode: "hard" | "soft"`, `log_tail`, `errors[]`
3. Agent reads the log evidence, identifies the cause, modifies the payload (cfg key, font URL, source content, whatever).
4. Re-submits the modified payload. New `payload_hash` → fresh run.
5. Repeat until `failure_mode: "success"`.

Latency budget matters. Per session 6 C-009, BT Servant cannot afford four minutes of back-and-forth on a long autofill. For autofill failures, prefer to fail fast with `mode: "simple"` first, fix the visible problems, then promote to autofill.

## Overfull-box count: a soft signal, not a failure

`get_job_status.overfull_count` reports the number of `Overfull \hbox` and `Overfull \vbox` warnings in the XeTeX log. **Non-zero is normal.** A book of poetry, a tight column width, or aggressive justification all produce overfulls without indicating failure.

Rough thresholds for an NT-sized publication:

| Count | Interpretation |
|---|---|
| < 20 | Excellent; nothing to do |
| 20–50 | Normal; some justification stretching |
| 50–200 | Worth investigating; specific paragraphs may need adjustment |
| 200–500 | Layout has problems; review font size, line spacing, column count |
| > 500 | Likely a fundamental layout mismatch (e.g., text too large for column width) |

These are heuristics, not rules. The classification flow:

- `overfull_count < 50` → `failure_mode: "success"` (no surface to user)
- `50 ≤ overfull_count < 200` → `failure_mode: "success"`, mention to user as info
- `overfull_count ≥ 200` → `failure_mode: "success"` per the truth table, but agent should surface as a concern: "your PDF rendered, but with N overfull boxes which may indicate layout problems"

The threshold is conservative because the cost of false alarms (interrupting a successful run) is higher than the cost of letting overfulls through.

## What "success" doesn't guarantee

A `failure_mode: "success"` means: exit code 0, PDF exists, structural checks passed. It does **not** guarantee:

- The PDF looks the way the user wanted (subjective; agent can't check this)
- The text is correct (the agent isn't a translation reviewer)
- The fonts are appropriate for the script (agent should check via canon if uncertain)
- The user will be happy with the result

For subjective qualities, the agent surfaces the PDF and lets the user judge. For technical qualities (correct fonts, expected pictures, expected page count), the structural checks catch most issues — but the agent can run additional checks if the user has stated specific expectations.

## When to surface partial results

When a job fails after producing some output (a partial log, a PDF from a previous payload, a half-written piclist), surface what exists with explicit caveats:

> "The run did not complete. The log at log_url shows the last successful step was X. The pdf_url from a previous payload (\<earlier_payload_hash\>) is still available and dates to \<date\>; it does not reflect this attempt."

Do not silently return an earlier payload's `pdf_url` as if it were the new result. Cache hits are deliberate (same payload → same output); ghost results from old payloads are confusing.

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`. See also: `klappy://canon/articles/diagnostic-patterns` for log-reading patterns and common error signatures.*
