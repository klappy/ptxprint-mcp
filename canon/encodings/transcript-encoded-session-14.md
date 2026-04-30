---
title: "PTXprint MCP Server — Transcript Encoding Session 14 (2026-04-29 BSB Psalms render)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "transcript", "dolceho", "session-14", "bsb-psalms", "render-quality"]
extends: "canon/encodings/transcript-encoded-session-13.md"
encoded_at: 2026-04-29T20:18:00Z
session_window: 2026-04-29T20:10Z–2026-04-29T20:20Z (session 14; ~10 min wall-clock)
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
---

# PTXprint MCP Server — Transcript Encoding Session 14

> Continues sessions 1–13. Session 14 was a single dogfood request: render BSB Psalms via the production pipeline. Worked first try by transforming the JHN payload template. Surfaced three render-quality observations and one cache-correctness observation worth carrying forward as iteration backlog.

---

## Job artifact

- **PDF:** `https://ptxprint-mcp.klappy.workers.dev/r2/outputs/197a5ceba40a3e86a1939f0098f695cf2a530231029f06ee6d65d37ece2f7a13/bsbref_Default_PSA_ptxp.pdf` (911 KB, 192 pages, all 150 Psalms)
- **Log:** `https://ptxprint-mcp.klappy.workers.dev/r2/outputs/197a5ceba40a3e86a1939f0098f695cf2a530231029f06ee6d65d37ece2f7a13/bsbref_Default_PSA_ptxp.log`
- **Job ID:** `197a5ceba40a3e86a1939f0098f695cf2a530231029f06ee6d65d37ece2f7a13`
- **Wall-clock:** 35.2 s (`exit_code=0`, `failure_mode=success`, `errors=0`, `overfull_count=0`)
- **Source USFM:** `usfm-bible/examples.bsb` @ `48a9feb71f0a66f9b8f418b11ae25b7ad2e49a0d` / `19PSABSB.usfm` (sha256 `c8b6a88d2661549231f8028fac6dfb6c9356940812f365200c3066b52f319844`)
- **Smoke fixture (this PR):** `smoke/bsb-psa-empirical.json`
- **Worker version at submit:** `0.1.0` (main HEAD `e642e62…`, post-session-13 merge)

---

## O — Observations

### O-042 — BSB Psalms rendered end-to-end on first try by transforming the JHN payload template

Job `197a5ceba40a3e86…` completed in 35.2 s, `exit_code=0`, `failure_mode=success`, 192 pages, 911 KB PDF.

Only payload changes from the working JHN smoke (`smoke/bsb-jhn-empirical.json`):
- `books: ["PSA"]`
- New `sources[]` entry (PSA filename + URL + sha256)
- Cosmetic `[vars] maintitle` swap (John → Psalms) for nicer document metadata

Container, fonts-payload pattern (Gentium Plus from R2), cfg structure, sty overrides — all carried over unchanged. The Phase-2 fonts-payload approach is now empirically demonstrated for two distinct books, not just JHN. Consequence: the BT Servant integration story for "render any BSB book" is essentially a templating exercise over the JHN fixture, not a per-book engineering task.

### O-043 — PSA log reports 177 of 192 pages "underfilled" (~92%)

Psalms is poetry: many short `\q1` / `\q2` lines per verse plus stanza breaks produce visible vertical whitespace at page bottoms. This is a property of poetry-heavy books rendered without autofill, not a defect in the pipeline. The PDF is valid and readable; pages just have uneven bottom margins.

Autofill (v1.2 deferred feature) is the canonical solution per the headless-operations canon. Until autofill ships, three cfg-level mitigations are worth experimenting with (see H-026): `hangpoetry`, `preventwidows`, `preventorphans`.

Worth measuring against JHN's underfill rate in a future session to confirm the poetry-vs-prose hypothesis empirically — session 14 attempted this but the JHN cache had been evicted (see O-045) and a fresh JHN render wasn't justified for this filing.

### O-044 — PSA log emits "IF CHECK mnote Failed. Entered at 2 != exit at 1" repeatedly

Looks like an internal footnote-balancing assertion in the PTX2PDF macros. Triggers on essentially every footnote callout throughout the run — PSA has many because of selah notes and section refs.

XeTeX still produced a valid PDF and reports zero errors / one warning. The message is noisy but non-fatal. Worth filing upstream against `sillsdev/ptx2pdf` (see H-027); maintainer would know whether this is a known-noisy assertion or a real bug.

### O-045 — Re-submitting the JHN smoke payload returned `cached=false` with a new job_id

Session-14 attempted to look up the session-11 JHN job for an underfill comparison. Re-submitting the same `smoke/bsb-jhn-empirical.json` payload produced `cached=false` with job_id `611700a05fe3…`, distinct from the session-11 job_id.

Two possible explanations:
1. The cfg embedded in the smoke fixture has been edited since session 11 (changing the canonical payload hash → fresh job_id).
2. R2 outputs lifecycle policy pruned the original output (HEAD on the expected key returns 404 → cache-miss path runs).

Either explanation is worth nailing down (see H-028). The "free re-runs of unchanged builds" cache promise from the v1.2 spec depends on both the payload-hash stability AND the R2 lifecycle window.

---

## H — Handoffs

### H-026 — Iteration backlog for Psalms render quality (P2)

Three steps to improve the Psalms render, ordered by leverage:

1. **Re-render with autofill once it ships** (v1.2 deferred feature). Measure underfill reduction. This is the canonical solution; cfg-knob workarounds are interim.
2. **Compare PSA underfill count against a fresh JHN baseline** to confirm the poetry-vs-prose hypothesis empirically. Would need a fresh JHN render too (see O-045).
3. **Experiment with cfg knobs that affect poetry layout** — likely candidates from the headless-operations canon:
   - `cloptimizepoetry` (already True in PSA cfg)
   - `hangpoetry` (currently False — try True)
   - `preventwidows` / `preventorphans` (both False — try True for both)
   
   Each knob change is a separate payload submit; the content-addressed cache means each variation gets a fresh job_id and the comparison is cheap.

### H-027 — File upstream issue against sillsdev/ptx2pdf for the "IF CHECK mnote Failed" log noise (P3)

Repro: any `submit_typeset` that includes footnotes appears to trigger it. PSA is a clean repro because every Psalm has selah notes and footnote refs.

Issue payload should include:
- The PSA log excerpt showing the message pattern
- The public PDF URL as evidence the output is still valid
- The job_id and worker version
- Question: is this a known-noisy assertion (just suppress in headless mode?) or a real bug indicating broken footnote balancing somewhere?

Maintainer Martin would know the answer in 30 seconds.

### H-028 — Verify R2 output lifecycle policy (P3)

Session 10's handoff mentioned 90-day retention for `outputs/`. Session 14's empirical observation contradicts that for the 6-day-old session-11 JHN output. Resolution path:

1. Check the smoke fixture file's git history — has `bsb-jhn-empirical.json` been edited since session 11? If yes, payload-hash drift explains the cache miss; lifecycle is not the issue.
2. If the fixture is unchanged, check R2 lifecycle config in the CF dashboard. Either the documented 90-day retention is wrong, or it was never applied.

The cache-hit promise is downstream-agent-facing surface area. Wrong assumptions here mean BT Servant builds redundantly.

---

## Cross-Reference Summary — Sessions 1–14

| Item | Resolution |
|---|---|
| Session-13 D-026 (`docs` tool) | Deployed; used in session 14 indirectly (pipeline context retrieved via search-canon) |
| Session-12 BSB-JHN empirical fixture | Reused as the template for PSA — first non-JHN proof the pattern transfers |
| Session-11 H-018 path 2 (fonts-payload) | Empirically demonstrated for a second book |
| Session-1 O-003 (widget-ID-to-cfg-key) | Still open; H-019 not yet addressed |
| v1.2 deferred: autofill | Now has a concrete first use case waiting on it (H-026) |

---

*End of session 14 encoding. Companion artifact: `smoke/bsb-psa-empirical.json` (this PR).*
