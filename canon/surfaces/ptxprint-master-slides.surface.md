---
title: "Epistemic Surface Extraction — PTXprint: MASTER SLIDES"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ese", "ptxprint", "master-slides", "deck", "training-input", "surface", "non-canonical"]
subject_uri: "https://docs.google.com/presentation/d/1LOp7bHXQPMIxnyeiPqb5o4-n35pFulDJwBiQgaXeG4o/edit"
generator: "claude-opus-4.7 (interactive session, web_fetch /htmlpresent)"
created_at: 2026-04-27T21:11:00Z
canonical_status: non_canonical
ese_method_uri: klappy://canon/epistemic-surface-extraction
modality: slides
---

# Epistemic Surface Extraction — PTXprint: MASTER SLIDES

> **Purpose.** Surface what an AI-assisted training-manual author needs to know about the PTXprint MASTER SLIDES deck — its information architecture, the conceptual model it teaches, the hands-on exercises it embeds, and the open gaps it acknowledges. This is a surface extraction, not a manual and not a specification. Companion machine-readable file: `ptxprint-master-slides.surface.json`. Companion authored derivative: `ptxprint-training-manual.md`.

> **Containment.** This artifact is interpretive and non-canonical. Where it disagrees with the deck, the deck wins. Where it disagrees with the running PTXprint product, the product wins. Where it disagrees with canon, canon wins. If any part of this can be safely treated as instruction-to-execute, the surface has failed.

> **Modality note.** Canon ESE defines slide modality as `unit = page`, `anchor_type = page_number`, one segment per page. This artifact deviates by using lens-based grouping with `page_range` anchors — matching the precedent set by `ptx2pdf.surface.md` in this project, and avoiding the *Raw Dump* failure mode for a 438-slide deck. A `page_index` table at the bottom preserves per-page navigability.

---

## Subject artifact

| | |
|---|---|
| Title | PTXprint: MASTER SLIDES — Bible Layout For Everyone |
| Authors | Martin Hosken (Project Lead, System Architect, TeX macros), Mark Penny (UI Developer, Testing, Documentation), David Gardner (TeX Macro Coding, Diglot Specialist), and other contributors |
| Publisher | SIL International / WSTech |
| Total slides observed | 438 |
| Self-described status | Work-in-progress; slide 5 enumerates 13 sections still to be added |
| Presenter (final-slide credit) | Mark Penny, Language Technology Senior Consultant, SIL International |

---

## Global Surface

**One-sentence description.** PTXprint: MASTER SLIDES is a 438-slide working training deck maintained by the PTXprint development team that walks a Paratext-aware audience from product positioning, through install and first PDF, into the full settings universe (Mini/Basic/Full views, ~400 options), and out to advanced workflows (changes.txt, headless CLI, override files, diglot/polyglot, Strong's index, Arabic features).

**Key themes.**
- Three-tier UI surface — Mini, Basic, Full views — with explicit control counts on the Layout tab (5 / 14 / 27) that constitute a first-class progressive-disclosure pattern.
- Configuration-as-folder — every named configuration lives at `<project>/shared/ptxprint/<ConfigName>/`, shared via Paratext Send/Receive; output PDFs live at `<project>/local/ptxprint/`.
- Tooltip-first documentation philosophy — the deck repeatedly says the user may not need a manual because every UI control surfaces a tooltip; the deck positions itself as supplementary.
- USFM as the lingua franca — text transformations (changes.txt), styling (.sty), peripherals (FRT/BAK), AdjLists, and piclists are all USFM-adjacent text artifacts the user reads and writes directly.
- Beyond Paratext — projects do not require Paratext to be running; a folder of USFM plus PTXprint is a complete workflow, and DBL/Open.Bible bundles can be unpacked directly.
- Visual interactivity — right-click on the PDF preview pane is a primary editing surface (paragraph adjust, picture management, send-ref-to-Paratext).

**Forbidden moves.**
- Do not treat this surface as a PTXprint user manual. The deck itself is the authored teaching material; this surface is awareness extraction.
- Do not treat lens bullets as canonical statements about how PTXprint behaves. Behaviour comes from the running software, the bundled tooltips, and `PTXprintTechRef.pdf`.
- Do not treat page anchors as durable. The deck is actively edited; slide numbers can shift.
- Do not infer settings names, default values, or precise UI labels from this document. Verify against the running PTXprint UI before encoding into the MCP server's schema.
- Do not assume features described as "coming soon" or "experimental" have shipped. Slide 15 explicitly partitions the feature set into three tiers.

---

## L1 — Deck identity, authorship, work-in-progress posture

**Page range:** 1–5 · **Evidence:** Direct.

- Title page (slide 1) names the three primary developers and credits "many other contributors."
- The deck self-identifies as MASTER SLIDES — a source from which audience-specific decks are forked.
- Slide 5 is an explicit author's-list of 13 sections still to be written: configurations (pros/cons/naming), thumb tabs incl. single-sided, ornaments x2 + ptxprint-mods.sty, dynamic borders + section headings, Style Editor detail, ptxprint-mods.tex and special files, USFM auto-correct, header/footer language handling, Codelet buttons, `\zrules` / `\zqrcode` insertion, `.triggers` files, picture-set imports, many screenshot refreshes.
- Slides 2–4 are image-only navigation grids with "Click to jump" chips — the deck is meant to be read non-linearly.
- The final slide (438) credits Mark Penny, SIL International, distinct from the slide-1 "developed by" attribution.

**Constraint shown.** The deck's own gaps slide is a contract — anything in it should be treated as not-yet-canonically-taught material.

**Cross-ref:** *complements* `transcript-encoded.md#O-001`.

---

## L2 — Background, history, relationship to Paratext

**Page range:** 6–19 · **Evidence:** Direct.

- The framing motivation (slide 7): getting well-formatted scripture out of Paratext is too hard; PTXprint fills the missing-tool gap.
- Provenance (slide 11): a 48-year arc rooted in 1978-era TeX, a 2004–2013 PTX2PDF macro phase, then PTXprint as the GUI frontend from 2020 onward, led by SIL's WSTech.
- Stated values (slide 10): free, open source, community-driven, stand-alone, well-supported, scalable, deliberately "archaic" (XeTeX is old technology, and that is part of the value proposition).
- Goal (slide 12): shift day-to-day typesetting from professional typesetters to translation teams — zero-cost, hours not weeks of training.
- Ecosystem positioning (slide 16): PTXprint is integrated into the Paratext menu and uses Send/Receive to share saved configurations — but a boxed callout stresses that PTXprint can run on a folder of USFM files without Paratext at all.

**Constraint shown.** Independence-from-Paratext is a load-bearing claim; an MCP server that hard-requires Paratext is a regression.

---

## L3 — Comparison to PubAssist+InDesign

**Page range:** 20–41 · **Evidence:** Direct.

- Slides 38–40 stage the explicit comparison and link to https://software.sil.org/ptxprint/differences/ as the canonical version.
- PTXprint's named limitations (slide 38): no in-place text editing, formatting via styles + rules only, requires re-runs to update layout, longer books are cumbersome, and the tongue-in-cheek "you can't pay for it."
- PubAssist's named limitations (slide 39): no interlinear, dynamic borders are difficult, polyglot/Graphite/QR impossible, last-minute changes hurt, requires paid InDesign.
- Fundamental contrast (slide 40): PubAssist is a semi-automatic hands-on system; PTXprint is an automated repeatable pipeline — better for clusters with multiple similar projects.
- Slides 21–37 are mostly image-only example outputs; the deck shows layout variety before listing capabilities.

**Constraint shown.** Repeatability is a primary product virtue. A scriptable interface (MCP server) directly serves it.

---

## L4 — Getting Started: install, first PDF, view levels

**Page range:** 42–62 · **Evidence:** Direct.

- Discovery path (slide 44): software.sil.org/ptxprint, then Download → Install → Run.
- First-run behaviour (slide 47): if no Paratext projects exist, the Berean Standard Bible (BSB) auto-installs; users can also import scripture texts (DBL, etc.) via a 3-step wizard.
- View levels (slide 48 onward): Basic is sufficient for most starts; Mini exposes the fewest possible settings (and can be set as a final lockdown state); Full exposes everything.
- Tooltips are pushed early and often (slide 53): the deck repeatedly returns to "read the tooltip" as the primary documentation surface.
- Book selection flexibility (slide 54): 8 example specifications including ranges (`ROM 3-5`), spans (`JHN 21-ACT 3`), verse ranges (`EXO 20:12-17`), Hebrew canonical order, and full Bible-with-peripherals specs.

**Constraints shown.**
- The Mini/Basic/Full hierarchy is a published, durable surface contract — an MCP server can mirror it as a tool-detail-level parameter.
- BSB auto-install is a recoverable empty-state; an MCP server probing a fresh install should not assume project absence is fatal.

**Cross-ref:** *extends* `transcript-encoded.md#O-open-P1-001`.

---

## L5 — Help architecture: tooltips, search, errors, community

**Page range:** 63–79 · **Evidence:** Direct.

- Built-in help (slides 64–67): a Help tab, an experimental support chatbot, and contextual tooltips on every option (slide 66 claims "over 400 options to customize").
- Settings search (slide 69) addresses the 400-option discoverability problem; the deck's exercise asks the reader to find Refresh captions, Underline thickness, Stretch a font, Watermark, Strong's Numbers, Sidebars, Thumb tabs, and Spine.
- Error-handling guidance (slides 70–72): pay attention to status-bar messages, read the typesetting Report, scan diagnostic error messages from top down, look at hints at the end of error blocks, send an archive when stuck.
- Update cadence (slide 73): a new version ships several times a month; the "new version available" icon at column-top alerts the user.
- Community support (slides 74–78): the forum migrated to community.scripture.software.sil.org/c/ptxprint/27 (also support.bible/ptxprint); Vimeo training showcases at /showcase/9331905 and /showcase/10946202.

**Constraint shown.** "Read the tooltip" is the documented first-resort answer; an MCP server's `describe_setting` tool should source from those tooltip strings, not invent them.

**Cross-ref:** *extends* `transcript-encoded.md#O-003`.

---

## L6 — Configurations: storage layout, naming, import/export

**Page range:** 80–90 · **Evidence:** Direct.

- A configuration is a folder of settings at `<project>/shared/ptxprint/<ConfigName>/` (slide 83); the local/ptxprint folder holds tmp folders and PDFs that are cleaned up.
- Send/Receive shares configurations because they live in /shared (slide 82); the deck explicitly warns the reader to think before creating and naming a new one.
- Copy-Configuration-to-other-projects (slide 84) assumes Send/Receive edit access on the destination — flagged as "rather rare" (slide 85).
- Import Settings (slides 86–89) is the inverse: pull settings from any PTXprint-produced PDF or PTXprintArchive.zip without project access; best practice is to create a new config and import into it.
- A public gallery aspiration (slide 86, http://tiny.cc/jamesgallery) lets users submit sample PDFs for cloning via Import Settings.

**Constraint shown.** Settings inheritance and config import are first-class authoring surfaces; the existing `create_config` MCP tool should preserve the "create new, import into it" idiom.

**Cross-ref:** *compresses* `PTXprint_MCP_SPEC.md_-_First_Pass#section-3.3-config-inheritance`.

---

## L7 — Layout: page geometry, fonts, scripts, hyphenation, paragraph adjustment

**Page range:** 91–130 · **Evidence:** Direct.

- Layout view-tier control counts (slide 99): Mini = 5, Basic = 14, Full = 27. The most precise progressive-disclosure number-set in the deck.
- Pre-layout decision checklist (slide 97) instructs the user to start from the end product backward — printer, page size, margins (incl. gutter), font size and leading, single/double column, hyphenation availability, footnotes/cross-refs/glossary markup.
- Guides, baselines, and graph paper (slides 100–102) are layout debugging surfaces; the graph overlay does not appear on the final PDF.
- Optimisation buttons (slide 104) auto-compute optimal line spacing to reduce wasted paper. Variable line spacing (slide 106) is flagged as a situational quick-fix, not a default.
- Hyphenation (slides 126–127) distinguishes Paratext's wordlist file from PTXprint's `hyphen.tex` file; complex-script support: `mymr`, `thai`, `arab`, `sinh`, `mlym`, `taml`, `telu`, `knda`, `orya`. Beyond 63,929 words, PTXprint picks the most-likely-to-hyphenate words by length and frequency.
- Paragraph shrink/expand (slides 116–124): right-click on the preview pane gives line and text shrink/expand. A typesetter testimonial (slide 122) describes Galatians/Ephesians/1-John typeset in three minutes each via the interactive surface.

**Constraint shown.** The paragraph-adjust contract has shipped UI affordances; an MCP server's `set_adjlist` tool should produce content that round-trips through the same right-click adjustment surface.

---

## L8 — Body, glossary, marginal verses, columns

**Page range:** 131–154 · **Evidence:** Direct.

- Introductory outlines (slides 134–136): `\io1` / `\io2` / `\ior … \ior*` markers, right-aligned by default.
- Configurable marginal verses (slides 141–143): position-on-page is now selectable; the feature is older but newly-positionable.
- Glossary markup (slides 145–147): floor styles plus `None` (which removes `\w word|...\w*` markup); `\zglm` and `\w` character styles are the user-facing styling hooks.
- Column toggling per book (slides 149–150): in a 2-column publication, books like Psalms or Glossary commonly need 1-column overrides; treated as a Body-tab setting rather than a per-book hack.
- Hanging poetry verse numbers (slide 153) is a separate body feature, called out by name.

---

## L9 — Cross-references and footnotes

**Page range:** 155–171 · **Evidence:** Direct.

- Footnotes are described as "easy" (slide 156): the user picks whether they appear and where; `\f` styling controls caller appearance and size.
- External cross-reference lists (slides 160–161) are framed as one of the more powerful tools — "thousands of references without adding to your USFM text."
- Placement options (slides 162–169) include side-aligned columnar, inner-aligned, centre-column for 2-column layouts, and column-aligned variants.
- The "why so many lists?" question is named but not exhaustively answered — filter + placement + alignment are the three orthogonal axes.
- A practice exercise (slide 170) walks adding an external Standard list filtered to JHN/1-3JN/REV, placed below footnotes, with the project's existing references suppressed.

**Constraint shown.** Cross-reference list selection is a config-level decision with downstream layout implications; an MCP server should expose these as a coherent group.

---

## L10 — Pictures: sources, placement, copyright, sensitivity

**Page range:** 172–206 · **Evidence:** Direct.

- Image-search order (slide 175): Paratext project Figures folder → project local/figures (high-res, NOT Send/Recv shared) → user AppData imagesets → custom shared folder.
- Per-illustration controls (slides 177–183): Anchor Ref (distinct from Caption Ref) is the white-space-fix lever; multi-row selection allows bulk Scale changes; known illustration series (CN, CO, AB, etc.) carry automatic copyright attribution.
- Sensitivity handling (slide 187) and image mirroring (slides 181–182) are first-class workflows for adapting culturally inappropriate images.
- Copyright generation (slides 185–186): automatic credits in `en, hu, ro, fr, es, id` via `\zimagecopyrights` variants; series codes `ab/cn/co/hk/lb/bk/ba/dy/gt/dh/mh/mn/wa/dn/ib`.
- David C. Cook permissions (slides 190–195): a pre-filled Google Form generated from project metadata; the high-res download workflow (slides 197–200) goes request → wait under 24h → email → download → DO-NOT-UNZIP loop.

**Constraint shown.** Image copyright is an automated workflow with policy hooks (Get Permission, Request Access). An MCP server handling images must preserve the request/wait/download lifecycle.

---

## L11 — Styles, sidebars, Style Editor

**Page range:** 207–215 · **Evidence:** Direct (with deck-author-flagged gaps).

- The Styles tab is repeatedly described as "overwhelming" (slide 208); the recommended first move is the Filter button to limit the view to styles in use.
- Style identifiers can be qualified (slide 211): `mt1` is the basic main-title style, but `cat:coverfront|mt1` targets the cover, `cat:coverspine|mt1` the spine, `id:GLO|mt1` the GLOssary book.
- Sidebars (slides 213–214) carry settings beyond ordinary styles: position-on-page, width-relative-to-page, background shading, borders, FG/BG colours, transparency.
- Slide 5 explicitly notes the Style Editor needs more deck coverage — caller beware that this lens is necessarily light.
- The deck author embedded a self-note (slide 208) requesting a future slide explaining the right-hand-side font-description controls — undocumented in deck form at this version.

---

## L12 — Diglot, polyglot, versification, DBL ingestion

**Page range:** 216–239 · **Evidence:** Direct.

- Diglot is positioned as a gateway (slides 216–219): two-column primary/secondary, then "di-script", "di-...imagine!", finally polyglot. The deck names a referenced best-practices document by John Nystrom.
- Diglot challenges enumerated (slide 218): merging strategy choice, balancing line spacing with column size, dual-caption pictures, custom alignment tools, AdjLists + changes.txt interaction, two-config concurrency limits, front/back matter complexity.
- Polyglot configurability (slide 227) and right-click context (slide 226) are the editing surfaces; polyglot is pitched as "now possible," suggesting recent first-class status.
- Versification (slides 228–229): nobody worries about it until two texts placed side-by-side don't line up. The deck shows synchronisation tooling.
- DBL ingestion (slides 230–236) is a 3-step pipeline: pick a text on Open.Bible, locate the bundle, assign a project name; PTXprint unzips, creates a settings file, opens the project — end-to-end onboarding for users without an existing Paratext project.

**Constraint shown.** Diglot configurations engage two project-config pairs simultaneously; an MCP server modelling diglot must preserve both as first-class targets.

---

## L13 — Special layouts: Reader, Journaling, Study, Pastor's, QR, Concordance

**Page range:** 240–254 · **Evidence:** Direct.

- Six named layout patterns (slide 241): Reader edition (no inline ch/vs, no notes), Journaling (single-column, very wide outer margins), Conventional Study Bible, Pastor's Study Bible (cross-refs + Strong's index), Interactive QR-coded content (still experimental), and module-derived publications.
- Reader edition (slide 243) uses faint marginal verses showing only the first verse of each paragraph, achieved via a TeX snippet linked on GitHub (sillsdev/ptx2pdf docs/documentation/snippets.md).
- Study Bible layout (slide 245) is presented as a 3-click setup but relies on `\ef … \ef*` extended-footnote markup in source USFM rather than ordinary `\f`.
- QR codes (slides 250–253): `\zqrcode` markers with size/position/data attributes; a `\setcvhook` pattern binds QR codes to specific verse references; a spreadsheet-driven `.trigger` file is the recommended bulk method — explicitly NOT editing USFM directly.
- Concordance layout (slide 254) is a 3-column pattern; setup steps are not enumerated in this version.

---

## L14 — Modules: derivative scripture products

**Page range:** 255–269 · **Evidence:** Direct.

- Modules are scripture selections with optional bridging material (slide 256). Examples: Christmas Story Harmony, Proverbs by Topic, OT Stories from PNG, Lives of the Prophets from Indonesia, BSI Children's Bible, Power-to-Save key verses.
- Repository (slide 257): lingtran.net/Bible-Module-Repository or tiny.cc/modules.
- Custom-module creation by AI (slide 257): scripturemodulemaker-10015268.chipp.ai is the named tooling.
- Workflow (slides 259–260): download a custom module, print it via the same Bible Module selector used for repository modules.
- Slides 263–268 are image-only example outputs.

---

## L15 — Strong's Numbers: generation from Paratext Biblical Terms

**Page range:** 270–282 · **Evidence:** Direct.

- The framing problem (slide 272): Biblical Terms data in Paratext is "gold" historically locked inside the project; PTXprint's Strong's Index feature exposes it as a printable reference.
- A single dialog (slide 274) is the assembly point; the typeset index appears in the XXS book alongside other generated peripherals.
- In-text markup (slide 277) relies on Biblical Terms Renderings already in Paratext — the index surfaces work the team has already done, not new fabrication.
- Greek and Hebrew indexes can be separated (slide 280); `\links` style controls element formatting; `\xts` styles the 4-digit Strong's cell.
- The deck makes an explicit value argument (slide 281): the Strong's index takes under ten minutes to generate, costs nothing extra, gives translation communities back the data they have already created — framed as "why wouldn't you do this?"

**Constraint shown.** The index reads from Paratext data and writes into a generated USFM book (XXS). An MCP server must preserve that read-from-Paratext / write-to-XXS boundary.

---

## L16 — Interlinear, including on-the-fly TECkit

**Page range:** 283–294 · **Evidence:** Direct.

- Interlinear precondition (slide 284): if Paratext's interlinear window shows red/blue/black glosses, PTXprint's interlinear will not work — the user must Approve Glosses first.
- Interlinear diglot (slide 287) combines interlinear stacking with two-column diglot.
- On-the-fly interlinear via TECkit (slides 290–293): wrap every Hebrew word in `\zb ... \zb*` via a regex change, then use an `int|zb` style with a `YiddishPasekh2Latin` TECkit map to romanise during typesetting.
- Setup is described as advanced (slide 293): three-level glossing using TECkit + Paratext interlinear data + ruby glossing markers; the deck explicitly says users should not expect to set this up alone.
- The deck flags this lens as a "support-required" workflow rather than self-serve, matching slide 15's "coming soon: Complex on-the-fly interlinear."

---

## L17 — Ornaments: rules, borders, page borders

**Page range:** 295–304 · **Evidence:** Direct (with deck-flagged gaps).

- Decorative rules (slides 296–300): `\zrule` markers with `width / align / thick / cat` parameters; the deck shows changes.txt patterns to inject ornamental rules under `\mt1`.
- Ornament definition (slide 300) lives in the .sty file as a Marker block (e.g. `cat:ornaments3|zrule` with `BorderColour`, `BorderStyle` (e.g. `VectorianRule1`), `BorderLineWidth`, `TextProperties`).
- Front-page ornaments (slides 301–302) use `\esb ... \esbe` sidebar blocks with `cat=frontpage` and `BorderStyle=ornaments`, plus `BorderPatternTop/Bot/Left/Right` specifications — a complete Telugu front-page example is shown.
- Page borders (slide 303) split into "dynamically generated" vs static; the dynamic variant is named but its details are deferred (slide 5 lists "How to set up dynamic borders and section headings" as a known gap).
- This lens is necessarily incomplete in deck form; slide 5 calls out ornaments-x2 and ptxprint-mods.sty population as still-to-add.

---

## L18 — Table of Contents and Thumb Tabs

**Page range:** 305–318 · **Evidence:** Direct.

- ToC insertion (slides 307–308) uses `\ip \ztoc|<order>\*` in front-matter peripheral; `<order>` can be `main / ot / nt / dc / pre / post / heb / sorta / sortb / sortc / bible / biba / bibb / bibc`.
- Sorting variants (slide 310) trade canonical book order against alphabetical (`\toc1`), short-name (`\toc2`), or abbreviated (`\toc3`) column ordering.
- Column alignment across multiple ToC tables (slides 311–312) is solved by editing `cat:toc|tc1` / `tc2` Space-Before Factor at the project level.
- Diglot ToC (slides 313–315) uses `|mainL` / `|mainR` suffixes to split primary/secondary languages and `\zglot|R\*` / `\zglot|L\*` to handle RTL/LTR mixing inside the table.
- Thumb tabs (slides 316–317) bleed off the page (cropped at trim) and rely on `\toc1/2/3` fields for labels; slide 5 lists thumb-tab single-sided handling as a known gap.

---

## L19 — Peripheral matter, front matter, covers (basic + wizard)

**Page range:** 319–345 · **Evidence:** Direct.

- Peripherals tab order (slide 321): pre-PTXprint PDFs imported, then ToC, then PTXprint-generated FRT (driven by View+Edit), then variables, then a colophon (auto-disabled when front matter is enabled), then post-PTXprint PDFs.
- Front-matter generation modes (slide 322): Basic (front + verso + ToC), Advanced (whole-NT/Bible material), Paratext (local copy of FRT book that the user can modify).
- Special front-matter codes (slides 324–325): `\zcopyright` / `\zlicense` / `\zimagecopyrights` have no `|variable` or closing `\*`; built-in CC logos via `\zccimg by-nd|...\*`; layout helpers `\zbl|N\*`, `\zgap|1.3cm\*`, `\nopagenums` / `\dopagenums` / `\resetpagenums`.
- Cover wizard (slide 336) is described as work-in-progress, replacing the older Cover tab with a 6-step wizard supporting foreground/background images with cropping, resizable elements, optional spine, instant preview — the deck flags "wishful thinking" on the precise-positioning claim.
- Cover composition (slides 334–342): single-sheet front+back+spine+whole, shading, borders, image(s), crop/trim marks, bleed, title, subtitle, ISBN with barcode generation; the practice exercise (slide 343) walks B/W minimum then full-colour with ISBN.

---

## L20 — Finishing: reports, error detection, output formats, booklet, diff

**Page range:** 346–377 · **Evidence:** Direct.

- Typesetting Report (slides 347–349) is reachable from an info button on the preview pane or the Help tab; it carries summary information, highlights warnings/errors, includes diagnostic hints.
- Whitespace and collision detection (slides 350–352) flag vertical rivers, horizontal-spacing problems, and element collisions; both are default-on-but-tunable.
- Booklet pagination (slides 356–360): 2-up, 4-up (with 16-page test pattern), and 8-up impositions; back-to-back printing requires flipping on short or long side depending on imposition; a Fold-First option supports some bind orders.
- Compare PDFs (slides 361–366) generates a `*_diff.pdf` showing pixel differences (red = removed, blue = new, gray = identical); recommended settings: Only-Show-Pages-with-Differences and a low Max-Diff-Pages.
- PDF output formats (slides 367–371): Print-CMYK / Print-Gray / Print-Spot for paper, Screen-Quickest for fastest preview, Digital-RGB / Digital-CMYK for screen distribution; Spot-color is a 2-color option distinct from full CMYK.
- Printer quotations (slides 374–376): a Printers tab integrates cost-comparison across Pretore, Print_Gallery, and Pothi.

**Constraint shown.** PDF Compare is a validation surface PTXprint already ships; an MCP server's "did this layout change" question can call this rather than reinventing pixel-diff.

---

## L21 — Extras: Unicode, code snippets, autosave, internet/translate

**Page range:** 378–393 · **Evidence:** Direct.

- Alt-X in the View+Edit window displays Unicode codepoints for selected text (slide 379) — a built-in inspection tool.
- Code snippet libraries (slide 380) span Headers/Footers, Chapters, Verses, Hooks (`\sethook`, `\setcvhook`, `\setbookhook`, `\setbetweenhook`), Tweaks, Strong's, Notes, Other, and Tracing flags.
- Front-matter snippets (slide 384) cover Pages, Labels, Conditions (`\zifvarset`, `\ztruetext / \zfalsetext`, `\zifhooks`), Diglot helpers, Other layout primitives, Periph+Var, Image, Legal, ISBN+QR, Contents helpers — a much larger set than the front-matter UI exposes.
- Quick Run (slide 388) is one-pass typesetting that skips multi-pass refinement (chapter repositioning, cutout fitting, colophon credits, ToC generation) — fast iteration, not final output.
- Internet-use settings (slides 390–392): web-link smart handling for non-English users (Google Translate auto-redirect), with toggles to disable Translate alone and a master switch to disable all internet use.

---

## L22 — Advanced: changes.txt, CLI/headless, deploy, Arabic

**Page range:** 394–426 · **Evidence:** Direct.

- changes.txt scoping levels (slides 396–397): unrestricted globals, book-restricted (`at MAT;ACT;GAL ...`), book+chapter (`at JHN 2 ...`), book+chapter+verse (`at MAT 7:23 ...`), and environment-restricted (`in '\f .+?\f\*': 'Syria' > 'Aram'`); combinable as `at LUK 3:10 in '\f .+?\f\*'`.
- Pre-processing scripts (slide 405): Windows .bat/.exe and Linux .sh/.py scripts can run before typesetting; the deck shows the program-infile-outfile contract.
- Multi-lingual headers (slides 403–404) auto-insert English book codes via a 1-line regex from a Resources2Share file.
- Headless CLI (slide 417): `ptxprint.exe -b ROM -c SingleSpaceDraft -P XYZ` runs the named config; `-h` lists all arguments; the deck calls out batch-mode operation (e.g. digitalbible.org auto-generation) — directly relevant to the MCP server work.
- Silent install (slide 418): `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART` deploys without user interaction and auto-starts after install — relevant for container/server deployment.
- Arabic features (slides 419–425): Tatweel/Kashida insertion via Ctrl-grave (only affects typesetting, not source USFM), RTL-aware viewer navigation, end-of-Ayah verse decorators, coloured diacritics, contextual spaces, font-feature toggles.

**Constraint shown.** The CLI signature on slide 417 is the deck's own statement of the headless contract; the MCP server's `run_typeset` tool should mirror it.

**Cross-refs:** *extends* `ptx2pdf.surface.json#L2`, `transcript-encoded.md#O-001`.

---

## L23 — Setting Overrides: project-level and config-level lockdowns

**Page range:** 427–433 · **Evidence:** Direct.

- Two override files exist (slide 429):
  - `<project>/shared/ptxprint/ptxprint_project.cfg` — locks settings across all configs in the project.
  - `<project>/shared/ptxprint/<config>/ptxprint_override.cfg` — locks settings for a single named config.
- Override semantics (slide 432): an entry in either file disables the corresponding UI control; a `*` prefix means "set this default but allow the user to change it temporarily."
- Use-case framing (slide 428): cluster administrators want consistency (layout, wording, font) across many projects; overrides give that lockdown without rewriting individual configs.
- Authoring is currently manual (slide 432): open ptxprint.cfg in a text editor, Save-As to the appropriate override filename, delete lines that should NOT be overridden — there is no UI for creating these in this version.
- The existing PTXprint MCP spec (§10) defers `ptxprint_project.cfg.override` as "may be deprecated upstream; not exposed" — slide 429 shows the override mechanism is alive and shipping. **The MCP spec needs revisiting.**

**Constraint shown.** Override files are an authoring surface that is documented in the deck and shipping in the product. The MCP server's `set_config_values` tool ignores them in v1; revisit before users lose data to silently-overridden writes.

**Cross-ref:** *contradicts* `PTXprint_MCP_SPEC.md_-_First_Pass#section-10-out-of-scope`.

---

## L24 — Open questions and acknowledged gaps

**Anchor:** self-audit + slide 5.

- The deck enumerates its own gaps on slide 5 — 13 items, listed in L1.
- Surface-level gaps the deck does not flag but an MCP-server author needs: precise mapping of all 400+ settings to UI control names (the runtime introspection `-I` flag is the canonical source per `transcript-encoded.md#O-003`); precise output-filename collision behaviour when `-b` overrides match no books in the config.
- Authorial divergence: deck attribution is "Mark Penny / SIL International" (slide 438); credit list is Hosken+Penny+Gardner (slide 1). Slide-5 gap claims should be treated as Mark Penny's editorial declaration.
- The deck links externally to seven resources (software.sil.org/ptxprint, vimeo.com/showcase/9331905, vimeo.com/showcase/10946202, support.bible/ptxprint, lingtran.net/Bible-Module-Repository, github.com/sillsdev/ptx2pdf docs/documentation/snippets.md, scripturemodulemaker-10015268.chipp.ai). None were independently verified in this surface pass.
- Visual-only slides (image-only screenshots) constitute roughly 20–30% of the deck (slides 2-4, 8-9, 21-37, 49, 51, 91-96, 131, 137, 158, 263-268, 332-333, 344-345, 389, 415, 434, 436); their content is indexed only by slide number in this surface and should be treated as lower-fidelity coverage.

---

## Page Index

| Page range | Lens |
|---|---|
| 1–5 | L1 — Identity, authorship, WIP posture |
| 6–19 | L2 — Background, history, Paratext relationship |
| 20–41 | L3 — Comparison to PubAssist+InDesign |
| 42–62 | L4 — Getting Started |
| 63–79 | L5 — Help architecture |
| 80–90 | L6 — Configurations |
| 91–130 | L7 — Layout |
| 131–154 | L8 — Body, glossary, marginal verses |
| 155–171 | L9 — Cross-references and footnotes |
| 172–206 | L10 — Pictures |
| 207–215 | L11 — Styles, Style Editor |
| 216–239 | L12 — Diglot, polyglot, versification, DBL |
| 240–254 | L13 — Special layouts |
| 255–269 | L14 — Modules |
| 270–282 | L15 — Strong's Numbers |
| 283–294 | L16 — Interlinear |
| 295–304 | L17 — Ornaments |
| 305–318 | L18 — ToC and Thumb Tabs |
| 319–345 | L19 — Peripheral matter, covers |
| 346–377 | L20 — Finishing |
| 378–393 | L21 — Extras |
| 394–426 | L22 — Advanced (changes.txt, CLI, Arabic) |
| 427–433 | L23 — Setting Overrides |

---

## Promotion Rule

Per `klappy://canon/epistemic-surface-extraction`, surfaces inform but do not become canon. Durable insights from this ESE — for example, the principle that progressive disclosure (Mini/Basic/Full) is a first-class UI contract that an MCP server can mirror as a tool-detail-level parameter — should be promoted by editing canon directly, not by linking this surface as authority. The companion training manual `ptxprint-training-manual.md` is itself a separately-authored derivative work and is also non-canonical.

---

## Provenance

- **Extraction method:** single-pass `web_fetch` on the `/htmlpresent` variant of the Google Slides URL after the `/export/pdf` variant returned a permissions error. Lenses derived from the deck's own thematic section breaks. Cross-references to `transcript-encoded.md`, `ptx2pdf.surface.json`, and the existing first-pass MCP spec made manually after reviewing project files.
- **Passes executed:** web_fetch full token pull → lens inventory from section headings → page-range anchoring per lens → cross-reference pass against transcript and MCP spec → self-audit for gaps and image-only slides.
- **Human review status:** not reviewed.
- **Recommended next passes:** image-only slide pass through visual surface for the named slide list; external-link verification for the seven cited URLs; tooltip cross-reference once an MCP `describe_setting` tool exists; slide-5 gap-closure tracking on each future deck version.
