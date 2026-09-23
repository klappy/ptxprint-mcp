# DEBRIEF — 2026-09-05-ptxprint-docs-v2-progressive-disclosure
Auggie, in-seat, 2026-09-04 ~22:05 → ~22:40 ET. Fired on "Docs first."

| Product | State |
|---|---|
| `docs {}` / `{uri}` / `{uri, section}` / `{query}` with `covered:false`, `served_from`, `next`; `depth` alias | ✅ ptxprint-mcp PR #56 → main `7e9c7cbb`, 0.3.0 live 30 s after merge |
| Canon: `study-notes-and-footnotes`; changes-txt callout; real cfg keys; taxonomy 3a/3b; spec §3 + §5 Limits; handoff addendum | ✅ same PR (R20) |
| Tests | ✅ 110/110 incl. the six Titus-cook questions and an uncovered one |
| Site | ✅ index first, pointers, click-through article |
| Production check | ✅ `docs {}` 48 articles; "study notes as footnotes" covered; "how many jobs at once" covered (spec Limits); section fetch returns the section |

Deviations: two articles lack a "What this answers" line — the bundler names them; index text falls back to their first paragraph. Not fixed here (their authors' voice).
Lesson: the index *is* the product. Search over 48 articles is a pointer finder; the honesty floor matters more than the ranking.
