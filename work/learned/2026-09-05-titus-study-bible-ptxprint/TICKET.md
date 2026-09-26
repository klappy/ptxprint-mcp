# TICKET — titus-study-bible-ptxprint

**What this is:** Typeset the book of Titus as a study bible through the PTXprint MCP — BSB text
in two columns, the 41 Aquifer Open Study Notes as footnotes under the text on the page they
belong to — from one payload the cookbook builds.
**Why now:** Captain, 2026-09-04 ~21:25 ET: "Once confirmed we order and cook the Titus render
through PTX print." Confirmed: ptxprint-mcp 0.2.0 live, `docs()` answering (and rendering on
the homepage), container proven by a fresh render (validation 2026-09-05). The cookbook's
Titus 3 PDF was a browser print; this is the real typesetter.
**Your move:** look at the PDF when it plates.

Class: entrée. Risk: STANDARD (open-licence content only — BSB CC0, AOSN CC BY-SA; licence
printed in the front matter). Owner: Auggie. Promise: 2 h (R6). Depends:
`2026-09-05-ptxprint-mcp-validate-and-fix` (plated), `2026-09-05-cookbook-open-study-notes-titus`
(plated). Meal: none. driver-seat: run before fire (`DELTA.md` beside this ticket).

Gate 10 — recipe observed: ptxprint canon `payload-construction` (sources by URL+sha256, text
inline), `changes-txt-format` (`at BKK c:v "pat" > "rep"`), fixture `smoke/bsb-jhn-empirical.json`
(A5, two columns, `includefootnotes = True`, Gentium Plus by payload). Gate 11 — house prior
art: cookbook `poc/build.mjs` (Aquifer notes for a slice), PASS-0002 census (41 Titus notes).

Ingredients (fetched live at order): BSB Titus USFM
`usfm-bible/examples.bsb@48a9feb7/57TITBSB.usfm` (6 312 B, sha256 `35df1607…`); AOSN Titus
notes eng via Aquifer MCP `search TIT 1/2/3` + `get`; the John fixture's config_files + fonts.

Declared product (cookbook `pass/0003`, PR):
1. `poc/ptx/build-ptx.mjs <slice>` — reads the notes (Aquifer MCP), writes a `changes.txt`
   that inserts `\f + \fr c:v \ft …\f*` at each note's first verse, assembles the payload from
   the fixture's config (A5, two columns, footnotes on), submits, polls, fetches the PDF.
2. `poc/ptx/out/titus.payload.json`, `titus.changes.txt`, `titus.pdf`, `titus.manifest.json`
   (job id, hash, timings, page count, licence block).
3. `poc/PLAN.md` §Slice 3; `harvest/passes/PASS-0003.md`; STATE; cursors.
4. Kitchen: DELTA, FIRE-CHECK-RUN, DEBRIEF, journal rows.

Done-means: the captain opens `titus.pdf` and sees Titus 1–3 in two columns with study notes as
footnotes on the pages their verses fall on, a front-matter licence block naming BSB (CC0) and
AOSN (CC BY-SA 4.0, Tyndale adaptation notice); `titus.manifest.json` shows `cached: false` on
first run and the PTXprint wall-clock; rerun hits the cache; lint green.

## Failure Modes / Required Response
- A note's regex matches the wrong verse (e.g. `\v 1 ` inside `\v 10`) → anchor on `\\v 1 ` with
  the trailing space and `at TIT c:v` scoping; verify count of `\f ` in the log equals notes.
- Footnote text carries HTML or cross-ref markup PTXprint cannot set → strip to plain text,
  keep refs as `(see 1 Tim 2:1–7)`; a note that still breaks is dropped and named in the manifest.
- Job fails silently (issue #40 shape) → the payload lacks config_files; use the fixture's.
- PDF renders but notes are not under their verses → PTXprint footnote placement is per page by
  design; check `includefootnotes`; if still wrong, TENSIONS on the cookbook, not a redesign.
