# TICKET — titus-study-bible-ptxprint-spa

**What this is:** The Titus study bible again, in Spanish — *Aquifer Spanish Bible Reference Text*
in two columns, the 41 Aquifer Open Study Notes in their Spanish localization as footnotes on the
page of their verses — through the same `build-ptx.mjs` pipeline, as a second edition.
**Why now:** Captain, 2026-09-04 ~22:30 ET: "Can we do another language for Titus?" → "Yes 🙌" to
Spanish. Every part is on the shelf: 41/41 notes localized (`AquiferOpenStudyNotes/spa/json/56`),
Titus USFM published (`AquiferSpanishBibleReferenceText/spa/usfm/56TITASBRT.SFM`, CC BY-SA 4.0,
review completed Aug 2026), Gentium covers the script.
**Your move:** look at the PDF when it plates.

Class: entrée. Risk: STANDARD (open-licence content only — ASBRT CC BY-SA 4.0, AOSN CC BY-SA 4.0;
licence printed in the front matter, in Spanish). Owner: Auggie. Promise: 1 h (R6). Depends:
`2026-09-05-titus-study-bible-ptxprint` (plated). Meal: none. driver-seat: DELTA beside this ticket.

Gate 10 — recipe observed: ptxprint canon `study-notes-and-footnotes` (whole recipe, incl. §Why a
full book fails — the 6×9 / 9.5 / 7.2 study layout is now the default in `build-ptx.mjs`). Gate 11 —
house prior art: `poc/build.mjs` (eng→spa id mapping by passage range, friction F2), PASS-0003.

Ingredients (pinned at order): `BibleAquifer/AquiferSpanishBibleReferenceText@449610f7`
`spa/usfm/56TITASBRT.SFM` (6 243 B, 46 verses, no source footnotes); `BibleAquifer/AquiferOpenStudyNotes@d355583a`
`spa/json/56.content.json` (41 notes, `review_level: None` — disclosed on the licence page) mapped
from the eng articles (Aquifer MCP `search`/`get`) by passage range.

Declared product (cookbook `pass/0004`, PR):
1. `build-ptx.mjs titus-es` — an *edition* entry: source USFM, notes language, licence text, labels.
2. `poc/ptx/out/titus-es.{payload.json,changes.txt,pdf,manifest.json}`.
3. PLAN §Slice 4; PASS-0004; STATE; cursors; README.
4. Kitchen: DELTA, FIRE-CHECK-RUN, DEBRIEF, journal rows.

Done-means: the captain opens `titus-es.pdf` and sees Tito 1–3 in two columns, Spanish notes as
footnotes on their verses' pages, a Spanish front-matter licence block naming ASBRT and AOSN (both
CC BY-SA 4.0, Tyndale adaptation notice, localization review level); manifest `cached: false`.

## Failure Modes / Required Response
- A Spanish note has no eng counterpart by range (or vice-versa) → render what maps, list the
  misses in the manifest and on the licence page; never silently drop.
- Accented/quoted text breaks a `changes.txt` rule → same `”` substitution as eng; `¿¡` are plain.
- Notes overflow a page (`! Dimension too large`) → bisect with `PTX_ONLY`, then shrink per canon;
  Spanish runs ~15 % longer than English, so this is the likely first failure.
- Source USFM carries markers the fixture stylesheet lacks → read the log tail; add to mods.sty.
