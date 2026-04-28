---
title: "Workflow Recipes — Common End-to-End Flows"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "recipes", "workflows", "playbooks"]
derives_from: "canon/governance/headless-operations.md (Part 8 Workflow Recipes)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

# Workflow Recipes

> **What this answers.** Common end-to-end flows the agent runs: draft a PDF, typeset an NT, set up a diglot, recover from a failure, lock down house style.
>
> **Related articles.** `klappy://canon/articles/payload-construction` · `klappy://canon/articles/diagnostic-patterns` · `klappy://canon/articles/settings-cookbook`

---

## Recipe: Draft PDF for review

**Context.** User has a project with USFM source. Wants to see what it looks like in print, fast.

```
1. List configurations (from project state). If none beyond Default, use Default.
2. Ask: which book(s)? Suggest a single short book (JUD, 3JN, PHM) if user is unsure.
3. Ask: any specific concerns? (Page size, paper, print or screen?)
4. Construct payload:
     project_id, config_name="Default", books=[<book>],
     mode="simple",
     define={"output_format": "Screen-Quickest"}
   Submit via submit_typeset. Receive job_id.
5. Poll get_job_status until state ∈ {succeeded, failed}.
6. Read log_tail and errors[] for warnings.
7. Surface pdf_url plus any non-trivial warnings.
```

Refinements: walk multi-config users through which to use; mention overfulls but don't block; run the seven-point picture checklist if pictures missing.

## Recipe: Print-ready New Testament

**Context.** User has a working draft and wants the full NT typeset for print.

```
1. Confirm: which configuration represents production layout?
   If none, walk through "create a new config" first.
2. Confirm books: standard NT is
   "MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH
    1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV".
3. Confirm output format:
     Print-CMYK for colour, Print-Gray for B/W, Print-Spot for two-colour.
4. Confirm page size and paper match printer's requirements.
5. Construct payload at full quality:
     mode="autofill" if the team uses autofill, else "simple".
     output_format set in define or in cfg.
   Submit.
6. Poll get_job_status with reasonable interval.
   Autofill on an NT can take 30+ minutes; set timeout=1800 in payload.
7. On completion: check failure_mode, page count (NT typically 250–500),
   overfull_count, picture rendering.
8. Surface pdf_url, page count, log_url, warnings.
```

Multi-pass typesetting plus autofill takes longer. Set `timeout: 1800` for an NT-scale autofill.

## Recipe: Modify a single setting and re-run

**Context.** User wants to change one thing in an existing config and see the result.

```
1. Read current value from project state (or working payload state if iterating).
2. Surface: "Current value is X. Change to Y?" If unclear, ask.
3. Check both override files for this key. If locked, surface and stop.
4. Update working ptxprint.cfg content — modify project state or stage in memory.
5. Construct new payload with updated config_files content. Submit.
6. Poll for completion. Receive new pdf_url.
7. Surface change visually (compare to previous pdf_url) or numerically
   (page count delta, overfull count delta).
```

For exploratory changes, prefer `define` over mutating `config_files["...ptxprint.cfg"]` — preserves saved state.

## Recipe: Set up a diglot publication

**Context.** User has two projects (primary, secondary) and wants them side by side.

```
1. Verify both projects exist in project state (Claude Desktop FS, Git, etc.).
2. Verify the secondary project has the books the user wants.
3. Discuss merge strategy: chapter / paragraph / verse merge.
4. Create a new configuration in the primary project (e.g. "DiglotEN-FR").
5. Set [diglot_L] → primary project + config + column fraction.
6. Set [diglot_R] → secondary project + config + column fraction.
7. Address font sizing — different scripts may need different sizes.
8. Submit a payload covering both projects' configs and a small range
   (single chapter) to start.
9. Diagnose alignment. If versification differs, address that next.
10. Iterate by submitting new payloads with adjusted config_files.
```

Diglot is multi-axis. Don't promise a one-shot setup. Walk axes in order: project pair → merge strategy → fonts → fractions → versification → pictures → headers.

## Recipe: Lock down house style for a cluster

**Note:** this operates on project state (filesystem, Git, Paratext server), not on the typesetting MCP. The MCP only sees resulting payloads at typesetting time.

**Context.** Cluster admin wants to enforce settings across multiple projects.

```
1. Confirm with admin which settings should be locked.
2. Per setting, decide hard lock (no user change) or soft lock
   (* prefix, user can change temporarily).
3. Project-wide settings → write to shared/ptxprint/ptxprint_project.cfg
   in project state.
4. Config-specific → write to shared/ptxprint/<config>/ptxprint_override.cfg.
5. Submit a payload that includes the override files; verify the settings
   take effect.
6. Regression check: try to override a locked setting via the payload's
   define field; confirm the override file wins.
7. Document for admin which keys are locked and where.
```

Repeat per project in the cluster. The admin propagates via Send/Receive (Paratext, Git, etc.) — not via the MCP.

## Recipe: Diagnose "PDF was produced but pictures are missing"

**Context.** Soft failure — `failure_mode: "soft"`, PDF exists, pictures missing.

Walk the seven-point checklist. See `klappy://canon/articles/diagnostic-patterns` for the full version.

```
1. Pictures listed in the piclist?         → inspect config_files
2. Picture files in the figures array?     → inspect payload
3. Can PTXprint see them?                  → grep "image not found" in log
4. Are all missing or just some?           → diff piclist vs log render count
5. Anchor Refs valid?                      → verify against source USFM
6. Pictures too large?                     → check piclist scale values
7. Too many on one page?                   → spread across more verses
```

Surface the specific fix. Multiple issues → fix one at a time and re-submit.

## Recipe: "I changed it but nothing happened"

**Context.** User edited a setting (or agent did) and output didn't change.

```
1. Confirm cfg key was actually changed in the submitted payload.
2. Check ptxprint_override.cfg in payload's config_files (and project state).
3. Check ptxprint_project.cfg in payload's config_files (and project state).
4. If neither override has the key, issue is elsewhere:
   - Was the latest payload submitted? Check payload_hash.
   - Was it a cache hit on a stale payload? Check the `cached` field.
   - Is parent config's value being inherited and child not overriding?
5. If override file has the key, surface and ask whether to edit override.
```

Most common cause: an override file silently winning. See `klappy://canon/articles/config-inheritance-and-overrides`.

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`.*
