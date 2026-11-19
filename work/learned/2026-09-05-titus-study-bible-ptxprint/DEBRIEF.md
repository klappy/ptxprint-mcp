# DEBRIEF — 2026-09-05-titus-study-bible-ptxprint
Auggie, in-seat, 2026-09-04 ~21:25 → ~22:45 ET (interleaved with docs v2 and two upstream fixes).

| Product | State |
|---|---|
| `poc/ptx/build-ptx.mjs` + `out/titus.{payload.json,changes.txt,pdf,manifest.json}` | ✅ cookbook `pass/0003`, PR [#4](https://github.com/klappy/aquifer-study-bible-cookbook/pull/4) @ `d754092b` |
| PLAN §Slice 3, PASS-0003, STATE, cursors | ✅ |
| The PDF | ✅ 7 pages, 6×9, two columns, 41 notes under their verses, licence page; 4.8 s in PTXprint; `cached: false` first run |
| Kitchen | ✅ DELTA, FIRE-CHECK-RUN, this, journal |

Found and fixed upstream tonight (their own PRs, own docs — R20): container instances never released (ptxprint-mcp 0.2.1, #55); docs could not surface `usechangesfile`, `\ef`, limits (0.3.0, #56 — and the canon article this cook wrote).
Open: `\ef` extended study notes unrendered (F9); note splitting for stacks longer than a page; localized Titus through the same script.

Lesson that binds: a fixture is a *reading* layout until proven otherwise — check `usechangesfile` and the page/note sizes before the first submit, and bisect by chapter on any TeX fatal.

**Correction (2026-09-05, from ticket `2026-09-05-titus-study-bible-ptxprint-spa`):** this debrief and the VERDICT said the PDF
carried a licence page in front. It did not — `iffrontmatter = False` in the fixture skipped `FRTlocal.sfm` silently; the
7 pages were all scripture. Fixed in cookbook PR #5 (both editions, 9 pages each). The claim was inferred from a page count,
not observed (Axiom 4). Journal f0003.
