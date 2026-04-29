---
title: "PTXprint MCP — Session 10 Encoding (first PDF + drift 7 isolation)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "session-10", "phase-1-poc", "first-pdf", "drift-isolation"]
extends: "transcript-encoded-session-9.md"
encoded_at: 2026-04-29T01:00:00Z
session_window: 2026-04-29T00:53Z–2026-04-29T01:05Z (~12 min wall-clock; fresh-context-Claude executing handoff Move 2)
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
---

# PTXprint MCP — Session 10 Encoding

> Continues `transcript-encoded-session-9.md`. Session 10 is fresh-context-Claude executing the handoff written at 2026-04-29T00:38Z, ~15 min before this session opened. Completes Move 2 (drift 6 closed; first end-to-end PDF) and isolates drift 7 (font compatibility). Authors the H-016 canon update in the same surgical PR.

---

## D — Decisions

### D-019 — Direct cfg-edit, not `define` override, was the empirical path past drift 7
The minitests fixture's `ptxprint.cfg` declares `fontregular = Gentium Plus|...` and three siblings. Container bundles Charis SIL + Source Code Pro only (per session-9 PR #10). First attempt: pass `define: { fontregular: "Charis SIL|...", ... }` — failed identically with the same Gentium Plus error. Second attempt: edit the cfg in-place inside `config_files` before submission — succeeded.

**Implication:** PTXprint's `-D` widget IDs are NOT the same strings as `ptxprint.cfg` keys, despite the v1.2 spec language ("correspond directly to keys in ptxprint.cfg sections"). Until canon documents the widget-ID-to-cfg-key mapping (session-1 O-003 still open), the agent's reliable lever for runtime overrides is editing `config_files` content directly, not `define`.

### D-020 — First PDF was produced with Charis-substitution, not fixture-faithful Gentium Plus
The 66966-byte 2026-04-29T00:59:58Z PDF (`6f37b42b...minitest_Default_JHN_ptxp.pdf`) substitutes Charis SIL for Gentium Plus in all four font-role keys. This is a pipeline-validation artifact, **not** a faithful render of the minitests fixture. Faithful rendering of fixtures that declare Gentium Plus requires either (a) bundling Gentium Plus in the Dockerfile or (b) supplying it via the payload `fonts` field. Both are surgical-PR-shaped follow-ups and are out of session-10 scope.

---

## O — Observations (closed)

### O-033 — Drift 6 fully closed by adding `ptxprint-mods.sty` to `config_files`
The session-9 fatal `! Paratext stylesheet "../../../shared/ptxprint/Default/ptxprint-mods.sty" not found.` does not recur once the file is supplied. Verified by the second smoke run (job_id `bacb8ff9...`) which loaded `ptxprint-mods.sty` cleanly and progressed to font resolution. Session 9's hypothesis (the file is required, not optional) was correct — and the asymmetry with `ptxprint-premods.tex` (optional) and `ptxprint-mods.tex` (also optional) is preserved by upstream's loader.

### O-034 — Drift 7: minitests cfg requests Gentium Plus; container bundles only Charis + Source Code Pro
With drift 6 closed, the next fatal was:

```
! Font \font<p-12.0>="Gentium Plus:script=latn" at 11.00006pt not loadable: Metric (TFM) file or installed font not found.
```

The minitests fixture's `ptxprint.cfg` `[document]` section declares Gentium Plus across all four `fontregular`/`fontbold`/`fontitalic`/`fontbolditalic` keys. PR #10 only bundled Charis SIL + Source Code Pro. The session-1 O-open-P1-002 ("font dependency for headless deployment") prediction is now empirically demonstrated.

### O-035 — `define` overrides did not affect cfg keys named the same
Smoke run with `define: { fontregular: "Charis SIL|...", ... }` produced byte-identical XeTeX failure to the no-define run. Two possibilities:
1. PTXprint widget IDs differ from cfg key names (most likely — see session-1 O-003).
2. The cfg's `[document] fontregular = ...` is read before `-D` overrides apply, OR the override path doesn't reach this code path.

Either way, the practical conclusion is `D-019`: direct cfg-edit is the reliable lever today.

### O-036 — First end-to-end PDF generation: 4.1s, 2 pages, 173000 bytes XDV → 66966-byte PDF
Job `6f37b42b9c73ad5e4f7b8a576de8144bcc6c87fad944051e285a33d21de25059`. Submitted 2026-04-29T00:59:53.890Z, succeeded 2026-04-29T01:00:00Z. PTXprint reported 1 typesetting pass, exit code 0, 2 overfull-hbox warnings (text overflow in JHN genealogy table — expected for a small-page test fixture), 0 errors. PDF metadata: Title="The Testcase", Subject="JHN", Creator="PTXprint 3.0.20 (Default)", Producer="XeTeX". URL accessible via `GET https://ptxprint-mcp.klappy.workers.dev/r2/outputs/6f37b42b.../minitest_Default_JHN_ptxp.pdf`.

**Phase 1 DoD step 5 satisfied.** Worker → Container → PTXprint → R2 → presigned URL pipeline produces a real, retrievable PDF from a real fixture.

### O-037 — Page count discrepancy: log says 2 pages, pdfinfo says 1
The XeTeX log line reads `Output written on minitest_Default_JHN_ptxp.xdv (2 pages, 173000 bytes)`. The final PDF (post-pdfinish, presumably) reports 1 page via `pdfinfo`. Underfilled-page warnings appeared in the log:

```
Underfill[A]: [1] ht=217.5pt, space=345.00194pt, baseline=15.0pt
Underfill[B]: [1] ht=212.99326pt, space=345.00194pt, baseline=15.0pt
Underfill[B]: [2] ht=250.58304pt, space=287.99326pt, baseline=15.0pt
```

Likely the second page was empty or near-empty and got dropped during PDF finishing. Not blocking; documented for later investigation if it recurs in fuller fixtures.

### O-038 — `HEAD https://.../r2/outputs/<key>` returns 404; `GET` returns the PDF
A minor Worker-routing observation. The `r2.fetch` route in `src/index.ts` may not handle HEAD as a separate path. Not blocking (the predicted_pdf_url in submit responses works fine via GET); worth a one-line fix in a future Worker change.

---

## L — Learnings

### L-015 — Re-deriving the smoke harness from a clean handoff took ~5 min, exactly as predicted
Handoff said "OR re-derive in 5 minutes from this handoff." Empirically: `git clone` + reading `src/payload.ts` + reading `container/main.py` + writing `smoke.py` took roughly that. The handoff's discipline of pinning fixture SHAs and listing the schema constraints made re-derivation straightforward. Promotion candidate: *"A handoff that pins refs + names the schema lets the next agent rebuild local tooling without operator intervention."*

### L-016 — Drift-isolation cadence saved this session from drift 7 paralysis
With diagnostic surface (PR #8) producing the actual XeTeX log on silent-bail, drift 6 → drift 7 transition was a single cycle: see fatal error, hypothesise cause, fix-or-mitigate. PR #8's investment continues to compound. Without it, drift 7 would have looked like another opaque "PTXprint exits 1" symptom.

### L-017 — Empirical refutation works for execution-mode dead-ends as well as planning hypotheses
Session 9 L-013 introduced empirical-refutation as a fresh-context-Claude duty for hypotheses surfaced by the operator. Session 10 demonstrates it for the agent's own hypotheses too: I assumed `define: { fontregular: ... }` would override the cfg. Wrong. Tested. Moved on without a long debug detour. Promotion candidate: *"When an execution-mode call doesn't take effect, refute it with one targeted test and pivot, rather than retry-with-variations until the budget is exhausted."*

---

## C — Constraints

### C-010 — Schema enforces `project_id` ≤ 8 chars; "minitests" violates
Caught at submit-time with a 32602 validation error. Used `"minitest"` (8 chars, no `s`) for this session's runs. The Paratext convention is project-id-equals-folder-name; the minitests upstream folder is `minitests` (9 chars), so any future fixture work hitting this needs the same rename. Either the schema cap is wrong, or the agent renames. v1.2 spec did not flag this asymmetry.

---

## H — Handoffs

### H-018 — Surgical follow-up PR options for drift 7 (operator triage)
Three viable paths, each is a separate surgical PR:

1. **Bundle Gentium Plus in the Dockerfile** (mirrors session-9 PR #10's Charis pattern). One Dockerfile change + a font copy. Pro: faithful rendering of any fixture that requests Gentium Plus. Con: container-size growth; sets precedent that "we bundle everything users might want," which ends in the session-3 C-007 anti-direction.
2. **Document the payload `fonts` field in canon and demonstrate it in a smoke test.** The schema already has `FontSchema` with `family_id` / `version` / `filename` / `url` / `sha256`. Phase 2-aligned: agents supply fonts they use. Con: Gentium Plus URLs + sha256 must come from somewhere; container's fontconfig may need refresh after font materialisation.
3. **Document the cfg-edit-for-fonts mitigation pattern in canon** (this session's actually-worked path). Lowest container/code change. Con: doesn't make the fixture render *faithfully* — just renders. Phase 1 shape, not Phase 2.

Operator's call. Path (3) is implicit in this PR's canon update; paths (1) and (2) would land separately.

### H-019 — Document widget-ID-to-cfg-key mapping (closes session-1 O-003)
Without this, `define` is a guess-and-check tool the agent can't rely on. Resolution paths:
- Run PTXprint locally with the runtime introspection flag (session-1 O-003 mentioned `-I`) and capture the dump.
- Read PTXprint's GTK Glade XML (UI definitions) and correlate to cfg setters.
- Ask Martin (PTXprint dev) for an authoritative listing.

Until then, agents reading canon should be told: edit `config_files` content directly when you need to change a cfg setting. `define` is for cases where the widget ID is known (rare).

### H-020 — Fix `HEAD /r2/outputs/<key>` → 404 in Worker
One-line route handler addition or a single `serveR2` shape change. Tracks with O-038. Not urgent.

### H-021 — Investigate XDV → PDF page-count discrepancy
2 pages in XDV, 1 page in final PDF. Probably the underfilled second page got dropped by pdfinish. Test on a longer fixture to confirm the pattern. Tracks with O-037. Not urgent.

---

## Empirical evidence ledger

### Successful smoke (job_id `6f37b42b...`)

- **Submit**: `submit_typeset` returned `{job_id, submitted_at, predicted_pdf_url, cached: false, payload_hash}` immediately. `cached: false` here genuinely means "first run of this hash".
- **Status timeline**:
  - `queued` → `running` (phase=`typesetting`) at 2026-04-29T00:59:56Z
  - `succeeded` at 2026-04-29T01:00:00Z (4.1s wall-clock from started_at)
- **Final state**:
  ```
  state: succeeded
  exit_code: 0
  failure_mode: success
  errors: []
  overfull_count: 2
  pdf_r2_key: outputs/6f37b42b.../minitest_Default_JHN_ptxp.pdf
  log_r2_key: outputs/6f37b42b.../minitest_Default_JHN_ptxp.log
  ```
- **PDF retrieval**: `GET https://ptxprint-mcp.klappy.workers.dev/r2/outputs/6f37b42b.../minitest_Default_JHN_ptxp.pdf` returned 66966 bytes, valid PDF v1.3, "PTXprint 3.0.20 (Default)" in metadata.

### Failed smoke runs (drift isolation)

| job_id (prefix) | Variant | Outcome |
|---|---|---|
| `bacb8ff9` | All 5 config_files, no font override | Drift 7 fatal: Gentium Plus not loadable. Confirms drift 6 closed. |
| `9abcd522` | + `define` font overrides | Identical Gentium Plus error → D-019. |
| `6f37b42b` | cfg-edit Charis substitution | **Succeeded.** 2-page XDV → 1-page PDF. |

### Drift status after session 10

| Drift | Origin session | Status |
|---|---|---|
| 1 (argv layout) | 4 | ✅ closed (PR #8) |
| 2 (canon doctrinal: USFM-only payload) | 8 | ⏳ this PR's H-016 update closes it |
| 3 (canon doctrinal: minimal cfg example) | 8 | ⏳ remains open (H-013) |
| 4 (TeX macros not bundled in pip install) | 8 | ✅ closed (PR #9) |
| 5 (Source Code Pro hardcoded) | 8 | ✅ closed (PR #10) |
| 6 (ptxprint-mods.sty missing) | 9 | ✅ closed by payload completeness; H-016 canon update locks the lesson |
| 7 (Gentium Plus not bundled) | 10 | ⏳ open; mitigation via cfg-edit demonstrated; H-018 enumerates surgical options |

---

## Cross-Reference Summary

| Session 1–9 item | Session 10 outcome |
|---|---|
| O-001 (validation gap) | Closed: end-to-end PDF generation verified |
| O-003 (UI introspection mode → cfg key mapping) | Re-opened explicitly via H-019 |
| O-open-P1-002 (font dependency for headless) | Empirically confirmed; bifurcated into drift 7 + H-018 |
| C-001 (headless contract) | Verified: input is project + config + sources, output is PDF + log URLs |
| H-014 (add ptxprint-mods.sty, re-smoke for first PDF) | ✅ Done; produced first PDF |
| H-016 (canon update for minimum config_files) | ✅ Done in same PR (`canon/articles/phase-1-poc-scope.md` revision) |
| Phase 1 DoD step 5 (PDF in R2 OUTPUTS) | ✅ Satisfied |

---

*End of session 10 encoding. Next session inherits: clean handoff at `canon/encodings/handoffs/2026-04-29-after-first-pdf.md` (this PR), drift 7 surgical-PR triage in H-018, widget-ID mapping work in H-019.*
