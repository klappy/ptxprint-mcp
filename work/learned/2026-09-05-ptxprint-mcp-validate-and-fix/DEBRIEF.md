# DEBRIEF — 2026-09-05-ptxprint-mcp-validate-and-fix
Auggie, in-seat, 2026-09-04 ~21:00–21:25 ET. Fired on "Fire. Then we test it." Promise 4 h; cooked in ~25 min.

| Product | State | Where |
|---|---|---|
| A. Validation, docs only | ✅ 15 rows, every tool, one **fresh** render (61-page PDF, 10.9 s, hash never seen); findings F1–F5 | ptxprint-mcp PR #51 `validate/2026-09-05` — CI green |
| B. Fix for the one failed row (D1, `docs`) | ✅ canon bundled into the worker (46 docs, 652 KB), in-process BM25, `served_from` on every answer; 8 new tests (README's three queries answer; no network); CI staleness check | PR #52 `fix/2026-09-05-docs-self-served` @ `31b571bc` — CI green, Workers build green (version uploaded, **not** deployed until merge) |
| Issue #40 | ✅ reproduced with today's bytes, comment left | issue #40 |
| C. Kitchen | ✅ DELTA, FIRE-CHECK-RUN, this DEBRIEF, journal c0001–c0006 | rail |
| Deploy + re-test of D1 on production | 🔴 owed on merge (Workers Builds deploys `main`) | this ticket stays at 3-pass until the row is written |

Cause, in one line: `src/docs.ts` read oddkit's `result.hits`; oddkit's retrieval-disclosure contract moved results to `result.data`; the proxy reported "knowledge_base, nothing found" instead of "upstream changed shape."

Deviations, named: one CI failure of my own on the fix branch (bundle stamped with git sha → never reproducible; re-stamped with a content hash, same commit series); my first fresh-render payload broke its own XML (DELTA #1) — not counted against the server.

Next (captain's stated plan): with `docs` answering, cook a Titus Aquifer study bible through this server — the cookbook's Titus 3 notes + BSB as a PTXprint payload. Needs its own ticket; the study-notes-as-footnotes layout is the open design question.
