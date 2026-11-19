# DEBRIEF — titus-study-bible-ptxprint-spa
| Declared | Landed |
|---|---|
| `build-ptx.mjs titus-es` edition entry | ✅ cookbook `pass/0004`, PR [#5](https://github.com/klappy/aquifer-study-bible-cookbook/pull/5) @ `1c4e69ea` |
| `titus-es.{payload,changes,pdf,manifest}` | ✅ 9 pages, 5.3 s, job `8e6466dc`, 41/41 notes localized |
| PLAN §Slice 4, PASS-0004, STATE, cursors, README | ✅ in the PR |
| Kitchen paperwork | ✅ this folder; journal f0001–f0004 |

**Runs:** 3 for Spanish (wrong Paratext book number → traceback; renders without front matter; renders with it), 1 English rerun.

**Correction to a plated ticket.** `2026-09-05-titus-study-bible-ptxprint` (4-plated) reported "licence page in front". The
PDF merged in cookbook PR #4 has none: the fixture ships `iffrontmatter = False`, `FRTlocal.sfm` was silently skipped, and
I inferred the page from the count instead of opening page 1 (Axiom 4). Fixed in both editions in PR #5; that ticket's
DEBRIEF carries a correction note; journal f0003 records it. No blame, one rule: **open page 1 before claiming a page.**

**Learned (→ canon, next ptxprint-mcp PR):** Paratext numbers Titus 57 (Aquifer files say 56) and PTXprint finds the
book by that number (F10); `iffrontmatter` is a "setting you must flip" sibling of `usechangesfile` (F11).
**Open:** Portuguese/French editions; `\ef` (F9); note splitting; a reviewed Spanish localization for any publication.
