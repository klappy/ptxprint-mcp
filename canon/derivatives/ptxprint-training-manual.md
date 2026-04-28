---
title: "PTXprint Training Manual"
audience: project
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "training", "manual", "derivative", "non-canonical"]
derives_from: "ptxprint-master-slides.surface.json"
generator: "claude-opus-4.7 (interactive session, separately authored from the surface)"
created_at: 2026-04-27T21:11:00Z
canonical_status: non_canonical
---

# PTXprint Training Manual

> **What this is.** A teaching artifact derived from the ESE of the official PTXprint MASTER SLIDES deck. The deck is the authoritative training material; this manual is a re-organisation into a single linear learning sequence with the surface as scaffolding. References in `[Lx · slides A–B]` form cite which lens of the surface and which slide range backs each section. Where the deck and this manual disagree, the deck wins. Where the running PTXprint product and this manual disagree, the product wins.

> **Who this is for.** Translation teams, language-tech consultants, and AI agents working with PTXprint who want a single linear path from "what is this thing" to "I can drive it from the command line and lock it down for a cluster."

> **What this manual does not replace.** The tooltips in the running PTXprint UI are the canonical answer to settings questions. The deck itself is the authoritative training material. The `PTXprintTechRef.pdf` bundled with the installer is the canonical technical reference. This manual is a teaching scaffold, not a substitute for any of those.

---

## Part 0 — Before You Start

### What PTXprint is

PTXprint is a desktop application that takes USFM-formatted scripture text from a Paratext project (or any folder of USFM files) and produces print-ready PDF output. The engine underneath is XeTeX, the same TeX descendant used in academic publishing. The Python/GTK UI on top is what most users see and touch. [L2 · slides 6–19]

The product was built because getting well-formatted scripture out of Paratext was historically too hard. The pitch from the deck: there was a tool missing from the typesetter's toolbox, and PTXprint fills that gap. [L2 · slide 7]

### What PTXprint is not

It is not an editor. You cannot retype the verse text inside PTXprint. Edits to the text happen in Paratext (or your text editor of choice). PTXprint reads, lays out, and outputs. [L3 · slide 38]

It is not a one-click typesetter for arbitrary content. It is opinionated about USFM. If your input does not look like Paratext output, expect friction.

It is not a replacement for InDesign-style hand-typesetting on prestige projects. The deck itself acknowledges PTXprint's limits: longer books are cumbersome, the layout updates by re-running rather than continuous reflow, and edits to text require round-tripping through Paratext. [L3 · slides 38–40]

### Three views, three audiences

PTXprint exposes its settings at three levels of detail, called Mini, Basic, and Full. The Layout tab gives a precise read on what each tier covers: 5 controls in Mini, 14 in Basic, 27 in Full. [L4 · slide 48; L7 · slide 99]

The view level is not a permission system. It is a discoverability tool. A team can build a configuration in Full view, then drop the view back to Mini before locking and sharing — the user receiving the configuration sees only the few controls intended for them.

This three-tier surface should drive how you read everything below. If you are new, stay in Basic. If you are comfortable, move to Full. If you are administering for a less-technical user, set up in Full and downgrade.

### Where the documentation lives

The deck repeatedly returns to one rule: **read the tooltip**. Hovering over any control surfaces the in-product description. The deck is supplementary; the running tooltips are the source of truth for what each setting does. [L5 · slide 53]

Beyond tooltips, there are four other documentation surfaces:

1. The Help tab inside PTXprint, including an experimental support chatbot.
2. The Settings search box, which lets you find a control by partial name.
3. The official site at software.sil.org/ptxprint with Learn pages and FAQs.
4. The community forum at support.bible/ptxprint (formerly community.scripture.software.sil.org).

Training videos live on Vimeo at /showcase/9331905 (general) and /showcase/10946202 (Paratext 9.4 official content).

---

## Part 1 — From Zero to First PDF

### Installation

Download the current installer from software.sil.org/ptxprint. Run it, accept the defaults, finish the wizard. The deck does not document Linux or Mac steps in detail beyond noting that PTXprint runs on Linux; the canonical installation path is the Windows installer. [L4 · slides 44–46]

For deployment without user interaction (e.g. classroom labs, container builds), the silent install flags are `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART`. PTXprint auto-launches when the install finishes. [L22 · slide 418]

### First run

If a Paratext install is detected and projects exist, PTXprint shows them in the project picker. If no Paratext projects exist on the machine, PTXprint auto-installs the Berean Standard Bible (BSB) as a starter project. From the same Project ID selector you can also Import a scripture text from DBL or other sources via a 3-step wizard. [L4 · slide 47]

This means **PTXprint can run on a machine that has never had Paratext installed**. The Paratext integration is convenient when present; the dependency is on the USFM file format and the project folder layout, not on the Paratext app itself. [L2 · slide 16]

### Producing your first PDF

The minimum viable run is three actions:

1. Select a project.
2. Pick a book or several books.
3. Click Print.

The book selector accepts a flexible syntax. Single books (`JHN`), multiple books (`LUK ACT GLO BAK`), ranges within a book (`ROM 3-5`), spans across books (`JHN 21-ACT 3`), verse ranges (`EXO 20:12-17 MAT 5:3-11`), and end-of-book markers (`JHN 19:17-end`) all parse. The Hebrew canonical order can be specified explicitly as a book sequence. [L4 · slide 54]

The first PDF will appear in the preview pane. If something is wrong, an error or warning bar appears at the bottom of the window — read it before re-running.

### Reading the preview pane

The preview pane is interactive. Right-click on a paragraph to bring up paragraph adjustment (shrink, expand, scale). Right-click on a verse to send the reference back to Paratext for editing. Right-click on a picture to manage placement and selection. [L7 · slides 121–123; L4 · slides 60–61]

Treat the preview pane as a primary editing surface, not just an output viewer. The interactive paragraph adjustment is what makes PTXprint usable for fast layout iteration. The deck quotes a typesetter testimonial of three minutes per epistle for Galatians, Ephesians, and 1 John. [L7 · slide 122]

### The file layout you just produced

After your first run, the project folder contains two PTXprint-relevant subtrees:

- `<project>/shared/ptxprint/` — settings, stylesheets, and per-configuration folders. This is what Paratext Send/Receive shares.
- `<project>/local/ptxprint/` — output PDFs and per-config tmp folders. Not shared.

Inside `shared/ptxprint/` there is at minimum a `Default/` configuration folder. Each named configuration is a folder of settings; `ptxprint.cfg` is the primary settings file (the source of the ~400 controls); `ptxprint.sty` carries USFM stylesheet overrides. [L6 · slides 82–83]

This split between `shared/` and `local/` is intentional. Settings are version-controlled across teams; outputs are machine-specific.

---

## Part 2 — Configurations: The Unit of Layout Work

### Why configurations exist

A single project usually serves several output products: a draft for review, a diglot for the translation committee, a children's edition, a final NT, a wrap-around-cover full Bible. Each has different layout settings. Each lives in its own configuration. [L6 · slides 80–82]

Configurations are not the same as projects. A project is one scripture corpus. Configurations are layout variants of that corpus. The deck recommends consciously choosing names for configurations because, once shared via Send/Receive, those names propagate to the whole team. [L6 · slide 82]

### Naming and the rare-export problem

Three default configurations ship: `Default` is the standard baseline; `cover` is conventionally used for cover generation but has expanded into general layout-variant use (think of it as a slot people repurpose); and project teams typically build out from there. [L6 · slide 82]

PTXprint offers a Copy-Configuration-to-other-projects feature for exporting a config to peer projects. The deck flags this as useful only when you have Send/Receive edit access to those peer projects, which is "rather rare." [L6 · slides 84–85]

The more general workflow is **Import Settings**: pull a configuration from any PDF or PTXprintArchive.zip that PTXprint produced. This works even without project access to the source. The recommended best practice is:

1. Create a new (empty) configuration in the destination project.
2. Use Import Settings to pull the source layout into that new configuration.
3. Adjust as needed.

This pattern keeps your existing configurations untouched while you experiment. [L6 · slides 86–89]

### What gets stored where (mental model)

Every configuration folder, e.g. `<project>/shared/ptxprint/MyDiglotNT/`, contains at minimum:

- `ptxprint.cfg` — sectioned INI with the ~400 settings for this configuration.
- `ptxprint.sty` — USFM stylesheet overrides (often empty if defaults work).

Optionally it may also contain:

- `changes.txt` — config-specific text transformations.
- `FRTlocal.sfm` — front-matter USFM content.
- `<PRJ>-<Config>.piclist` — picture placement list.
- `AdjLists/` — per-book paragraph adjustments.
- `picInfo.txt` / `picChecks.txt` — picture clearance data.

Beyond settings, project-level files at `<project>/shared/ptxprint/` apply across all configs:

- A project-wide `changes.txt` that often `include`s `PrintDraftChanges.txt`.
- A project-wide `ptxprint.sty`.
- Hyphenation data: `hyphen-<prj>.tex` and the compiled cache.

Treat the configuration folder as your unit of work. Treat the project-level files as cross-cutting concerns that affect every configuration in the project.

### When to create a new configuration

Create a new one when the layout intent diverges enough that you would not want to undo the existing one. A draft proof and a final cover are different configurations. A 6pt-larger experimental layout is also a different configuration. A one-time tweak to fix a widow on page 47 is **not** — that is paragraph adjustment.

The trap is creating a new config for every tweak and ending up with a 30-config project that nobody can navigate. The trap on the other side is overwriting a working configuration with experimental changes and losing it. The Import Settings workflow above is the way out: experiment in a new config, import the proven settings back when you are happy.

---

## Part 3 — Page Geometry and Typography

### Decide from the end backward

The deck's pre-layout checklist is unusually concrete and worth following before opening the Layout tab [L7 · slide 97]:

1. Who is going to print this, and what page sizes do they offer?
2. What are their minimum margins? Including the binding gutter?
3. Have you tested font size and leading for legibility?
4. Single column or double column? Is hyphenation viable in the script?
5. Header layout? Footer layout? Gutter rule? Horizontal rule?
6. Where will footnotes, cross-references, and glossary entries appear?

Decide these before adjusting individual controls. The settings on the Layout tab interact, and Mini/Basic/Full views progressively expose more knobs (5 → 14 → 27). [L7 · slide 99]

### Margins, gutters, columns

The Layout tab's margin diagram is interactive: hover over a setting and the corresponding region of the page diagram highlights. This is the fastest way to learn what each control affects. [L7 · slide 103]

There are three optimisation buttons on the Layout tab that auto-compute optimal line spacing to reduce wasted paper. Use them as starting points; tune from there. [L7 · slide 104]

For most projects a 2-column layout works for narrative books, but Psalms, Proverbs, and the Glossary are often better in 1 column. Body tab has a per-book column-toggle for exactly this. [L8 · slide 150]

### Fonts across the three view tiers

The Fonts+Scripts tab adapts to the view level. In Mini view, you pick a base font and PTXprint fills in Bold/Italic/Bold-Italic automatically from the family. In Basic view, you can construct fake Bold/Italic from a single-face font (with the deck's caveat that fake faces are not as good as real ones). In Full view, you get digit-script mapping and many more options. [L7 · slides 111–114]

Inter-character spacing adjustment is on the Fonts+Scripts tab as a global setting. The deck warns this can have disastrous results in some situations. Use sparingly, never as a first resort for fitting text. [L7 · slide 115]

### Line spacing, shrink, and stretch

A 5% shrink across the body text often eliminates widow/orphan and column-balance problems with no visible quality loss. The deck shows a worked example. [L7 · slides 116–120]

The right-click paragraph adjustment in the preview pane gives you per-paragraph control over line shrink/expand and text shrink/expand. Combined per-paragraph shrink and expand are also available. This is your interactive layout-fix tool. [L7 · slides 121–124]

### Hyphenation

Two related but separate files govern hyphenation:

- Paratext's hyphenation wordlist file — the team's marked hyphenation points for vernacular words.
- PTXprint's `hyphen-<prj>.tex` — used for typesetting time decisions.

If your team has not invested in marking hyphenation points, complex-script hyphenation is impossible to do well. Roman scripts can hope-for-the-best with default break heuristics. The complex scripts with built-in syllable-based line-breaking support: Myanmar (`mymr`), Thai (`thai`), Arabic (`arab`), Sinhala (`sinh`), Malayalam (`mlym`), Tamil (`taml`), Telugu (`telu`), Kannada (`knda`), Oriya (`orya`). [L7 · slides 126–127]

PTXprint caps the wordlist at 63,929 words and selects the most-likely-to-hyphenate words by length and frequency above that limit. Plan around this if you have a giant wordlist.

---

## Part 4 — Body and Reference Apparatus

### Chapter and verse styling

On the Body tab, the most-tweaked controls are the Chapter `\c` and Verse `\v` number styles. Adjusting their size, colour, and spacing is one of the higher-impact ways to make a layout feel professional or amateur. The deck includes a practice exercise asking the reader to restyle these. [L8 · slide 133]

Marginal verses (verse numbers in the page margin instead of inline) are now positionable on the page — a long-standing feature whose configurability has been improved. Use them when inline verse numbers crowd a typographically dense layout. [L8 · slides 141–143]

### Glossary markup

USFM `\w word|gloss-target\w*` markers tag glossary words. PTXprint offers several rendering options for these markers: floor styles that decorate the word, plain styling, or `None` (which removes the markers entirely from the rendered output). Two character styles control appearance: `\zglm` for the markup decorator, `\w` for the glossary word itself. [L8 · slides 145–147]

### Footnotes and cross-references

Footnote rendering is straightforward in the Body tab: turn them on or off, choose where they go on the page, style the `\f` callers and the note text. [L9 · slides 156–157]

Cross-references work the same way for project-internal references. The more powerful feature is **External Cross-Reference Lists**: PTXprint ships several pre-built cross-reference databases that you can include without adding any markup to your USFM source. [L9 · slides 160–161]

Three orthogonal axes govern external cross-reference list rendering:

1. **Filter** — which references to include (e.g. only references whose target is in your published book set).
2. **Placement** — below footnotes, side-aligned, inner-aligned, centre-column, column-aligned.
3. **List source** — Standard, Comprehensive, etc.

The practice exercise on slide 170 walks through configuring an external Standard list filtered to JHN/1-3JN/REV, placed below footnotes, with the project's own cross-references suppressed.

### One-column-in-a-two-column publication

For per-book column overrides (e.g. Psalms, Glossary in 1 column when the rest is 2), the toggle is on the Body tab. Treat this as a per-book setting, not a styling hack. [L8 · slide 150]

---

## Part 5 — Pictures

### Where PTXprint looks

When PTXprint encounters a `\fig` marker, it searches for the image in this order [L10 · slide 175]:

1. `<project>/Figures/` — usually low-resolution JPGs, shared via Send/Receive.
2. `<project>/local/figures/` — high-resolution sources, **not** shared via Send/Receive.
3. `<user>/AppData/Local/SIL/ptxprint/imagesets/` — installed image sets.
4. A custom shared folder you configure (e.g. a network drive).

The deliberate exclusion of high-res images from Send/Receive matters: high-res files are large and binary, and version-controlling them across a team causes pain. Send/Receive carries the JPG previews; the printable high-res files are managed separately.

### Anchor refs vs caption refs

Each picture entry has two related references:

- **Caption Ref** — the verse number that appears in the caption.
- **Anchor Ref** — the verse near which PTXprint anchors the picture for layout.

Anchor Ref is the lever for fixing white-space problems. If a picture causes a column to run short, move the Anchor Ref up or down a few verses without changing the Caption. [L10 · slide 177]

In the picture details table, you can multi-select rows and bulk-change properties (e.g. Scale across all CN-series pictures). This is the right tool for batch operations.

### Sensitivity, mirroring, copyright

Image mirroring (left-handed Jesus becoming right-handed for cultures that write right-to-left, for example) is a first-class option per picture. Treat it as a layout decision, not a politeness. [L10 · slides 181–182]

Copyright attribution generates automatically for known illustration series — `ab/cn/co/hk/lb/bk/ba/dy/gt/dh/mh/mn/wa/dn/ib`. The generated credit text is available in multiple languages via `\zimagecopyrightsfr`, `\zimagecopyrightses`, etc. (Currently supported: en, hu, ro, fr, es, id.) [L10 · slides 185–186]

### David C. Cook permissions

For DC Cook illustrations specifically, you must obtain prior permission. PTXprint generates a pre-filled Google Form from project metadata: country, ethnologue code, language name, book title, kind of publication, number of copies, publishing entity. Fill in any missing values on the Peripherals tab before clicking Get Permission. [L10 · slides 190–195]

For high-resolution DC Cook downloads, the workflow is request → wait under 24 hours (the deck claims subsequent requests resolve in under 2 minutes) → email arrives → click link → download `.zip` → **do not unzip yourself**, PTXprint will handle that. [L10 · slides 197–200]

### Picture troubleshooting checklist

When pictures don't appear as expected [L10 · slide 189]:

1. Are they listed in the PicList for this configuration?
2. Are the files actually on this computer?
3. Can PTXprint see them (do they show in the preview)?
4. Are all of them missing, or just some?
5. Are the Anchor Refs valid (does the verse exist? Is it bridged?)
6. Are they too large?
7. Are too many on a single page?

Walk this list in order. The deck's experience is that "missing pictures" usually traces to one of these seven cases.

---

## Part 6 — Multi-Text Layouts

### Diglot fundamentals

A diglot publication shows two texts side by side: usually a primary translation and a secondary (often a Language of Wider Communication). PTXprint treats the two texts as separate Paratext projects with separate configurations, joined into a single output. [L12 · slides 216–219]

The deck explicitly references John Nystrom's diglot best-practices document. The named challenges:

- Choosing the merging strategy (chapter, paragraph, or verse merge) based on how closely the texts align.
- Balancing line spacing with column size — secondary text often needs different leading.
- Pictures with dual captions.
- Aligning pictures using custom Paratext USFM tools.
- Coordinating AdjLists and changes.txt across both sides.
- Handling two configurations at once — there are limits on what can be edited concurrently.
- Front matter and back matter (especially Glossary in diglot form).

### Versification

When two texts use different versification models, side-by-side alignment breaks. The deck's aphorism: nobody worries about versification until two texts are placed side-by-side and don't line up. PTXprint includes synchronisation tooling to align differing models. [L12 · slides 228–229]

### DBL/Open.Bible ingestion

If you do not have a secondary text in Paratext yet, PTXprint can ingest a DBL bundle directly:

1. Click one of the Open.Bible links inside the secondary-text wizard to open the source site and pick a text.
2. Locate the downloaded DBL bundle on your machine.
3. Assign a Project ID to the new project.

PTXprint then unzips the bundle, creates the appropriate settings file, and opens the new project. End-to-end onboarding for users who do not already have the relevant scripture in Paratext. [L12 · slides 230–236]

### Polyglot

Polyglot extends diglot to three or more texts. The right-click context menu on the polyglot column controls width and behaviour. Layout customisation goes deeper here than in diglot. The deck pitches polyglot as a recently-shipped first-class feature rather than an experimental add-on. [L12 · slides 224–227]

### Multi-script considerations

Right-to-left scripts (Arabic, Hebrew, Syriac) and complex scripts (Indic, Myanmar, Thai) interact with diglot and polyglot in ways that do not arise in monolingual layouts. The deck flags these as setup-intensive cases:

- RTL/LTR mixing in tables (especially the ToC, see Part 8).
- End-of-Ayah verse decorators for bordered Arabic text.
- Coloured diacritics for languages that use them pedagogically.

If you are setting up a multi-script project, plan to spend more time on Fonts+Scripts and on style-sheet tweaking than on Layout.

---

## Part 7 — Special Outputs

### Six named layout patterns

The deck enumerates six layout patterns that are not what most people think of as "Bible layout" but that PTXprint supports out of the box [L13 · slide 241]:

1. **Reader edition** — no inline chapter or verse numbers, no footnotes, no cross-references; faint marginal verses showing only the first verse of each paragraph. Achieved via a TeX snippet linked from the deck.
2. **Journaling Bible** — single-column layout with very wide outer margins for handwritten notes, including pre-printed note-lines.
3. **Conventional Study Bible** — for projects with merged study notes; uses `\ef … \ef*` extended-footnote markup in source USFM rather than ordinary `\f`.
4. **Pastor's Study Bible** — full external cross-reference list plus Strong's index, without inline study notes; positioned for serious lay study.
5. **Interactive QR-coded Bible** — generates QR codes beside chapter numbers (or at hooked points) linking to JESUS Film clips, audio, or other web content. Still flagged as experimental in this deck version.
6. **Modular publication** — an extracted scripture selection, with optional bridging material, packaged as a derivative product.

### Strong's index

The Strong's index feature surfaces Paratext's Biblical Terms Renderings as a printable concordance-style index. The data already exists in your Paratext project; PTXprint produces the typeset book.

A single dialog drives the entire feature. Output goes into the `XXS` book alongside other generated peripherals. Greek and Hebrew indexes can be split into separate sections. The `\xts` style controls the 4-digit Strong's cell, and `\links` controls element formatting within entries. [L15 · slides 273–280]

The deck's value argument: under ten minutes of setup, no extra cost, and it gives translation communities back the data they have already created in Biblical Terms. The phrase the deck uses is "why wouldn't you do this?" [L15 · slide 281]

### Interlinear

Interlinear is an advanced workflow with sharp preconditions [L16 · slides 283–294]:

- The Paratext interlinear data must be **all approved** (Approve Glosses must have been clicked) before PTXprint will use it. If your Paratext interlinear window shows red or blue glosses, fix that first.
- On-the-fly interlinear via TECkit (e.g. romanising Hebrew at typesetting time without storing the romanisation in the source) requires a regex change to wrap each script word in `\zb ... \zb*`, plus a `int|zb` style with a TECkit map applied. The deck explicitly says users should not expect to set this up without help.
- Three-level glossing (script + romanisation + gloss) combines TECkit, Paratext interlinear data, and ruby glossing markers. This is a "support-required" tier.

If you need interlinear and do not have a support consultant, plan time for back-and-forth on the community forum.

### Modules and derivative products

A module is a USFM specification of a scripture selection with optional bridging material — for example, a Christmas Story Harmony, a thematic Proverbs collection, or a Power-to-Save key-verse booklet. The Bible Module Repository at lingtran.net/Bible-Module-Repository (also tiny.cc/modules) hosts a community library. [L14 · slides 256–260]

To produce a module-based publication, download a module file, select it as the Bible Module in PTXprint's project picker, and Print. PTXprint handles the same way it would a normal book.

For custom-module creation, the deck names an AI-assisted tool: scripturemodulemaker-10015268.chipp.ai. Treat AI-generated modules with the same caution you would any AI output — review carefully before committing.

### QR codes

QR codes are inserted via `\zqrcode` markers with attribute parameters. The deck's recommendation is **not to edit your USFM text directly** to insert QR codes. Instead [L13 · slides 250–253]:

1. Build a spreadsheet listing the verses to QR-code and the URLs to encode.
2. Use a spreadsheet formula to generate a `.trigger` file with `\setcvhook` directives for each row.
3. Place the `.trigger` file in the configuration folder; PTXprint applies it at typesetting time.

This keeps the QR code metadata separate from the source text and reusable across configurations.

---

## Part 8 — Front Matter, Covers, Peripherals

### The Peripherals tab order

The Peripherals tab assembles content in this order at typesetting time [L19 · slide 321]:

1. Pre-PTXprint PDFs (one or more) imported as-is at the start.
2. Table of Contents (simple or complex).
3. PTXprint-generated Front Matter (driven by content in the View+Edit tab).
4. Variables substitution.
5. Colophon (auto-disabled when Front Matter is enabled).
6. Post-PTXprint PDFs imported as-is at the end.

Understanding this order makes it easier to debug missing-element problems. If your colophon is not appearing, it is probably because front matter is enabled.

### Generating front matter

Three modes [L19 · slide 322]:

- **Basic** — front page, verso page, ToC. The minimum for a publication that is not just bare scripture text.
- **Advanced** — material typical for whole-NT or whole-Bible publications: title, publication data, foreword, preface, ToC, alphabetical contents, and four cover-related periphs (coverback, coverfront, coverspine, coverwhole).
- **Paratext** — make a local copy of the project's FRT book and modify it freely without affecting the Paratext project.

### Special USFM codes for front matter

A handful of PTXprint-specific markers come up repeatedly in front matter [L19 · slides 324–325]:

- `\zcopyright`, `\zlicense`, `\zimagecopyrights` — no `|variable` parameter, no closing `\*`.
- `\zccimg by-nd|size="col" pgpos="p" scale="0.20"\*` — built-in Creative Commons logos.
- `\ztoc|main\*` — generate the main table of contents (or specify a different order; see Part 8).
- `\zvar|variablename\*` — insert a variable from the Peripherals tab table.
- `\zbl|3\*` — three blank lines.
- `\zgap|1.3cm\*` — vertical gap (also accepts mm, in, em, pt).
- `\nopagenums`, `\dopagenums`, `\resetpagenums -1` — page numbering controls.

The Shortcut Buttons on the View+Edit tab insert these codes for you, sparing copy-paste from the deck. Use them.

### Tables of Contents

The ToC marker is `\ztoc|<order>\*`. The order parameter accepts [L18 · slide 308]:

- `main` — all books in a single table.
- `ot` / `nt` / `dc` — Old Testament / New Testament / Deuterocanonical.
- `pre` / `post` — books that appear before scripture (introductions) / after scripture (glossary, indexes).
- `heb` — Hebrew canonical order (OT books only).
- `sorta` / `sortb` / `sortc` — sort by `\toc1` / `\toc2` / `\toc3` field.
- `bible` — all scripture (OT + NT + DC).
- `biba` / `bibb` / `bibc` — bible books sorted by `\toc1` / `\toc2` / `\toc3`.

Multiple ToC tables in the same publication (e.g. NT scripture + post-scripture peripherals) is the common pattern. To make their column widths match, edit the `cat:toc|tc1` style's Space-Before Factor at the project level. [L18 · slides 311–312]

For diglot ToCs, append `L` for primary or `R` for secondary: `\ztoc|mainL\*` and `\ztoc|mainR\*`. Use `\zglot|R\*` and `\zglot|L\*` to handle RTL/LTR mixing inside a single ToC.

### Thumb tabs

Thumb tabs are coloured tabs on the page edge that bleed off and get cropped at trim. They use the `\toc1`, `\toc2`, or `\toc3` field for their label. Slide 5 of the source deck flags single-sided thumb-tab handling as a known gap; if you need that, plan to ask in the community forum. [L18 · slides 316–317]

### Covers

The Cover Wizard (replacing the older Cover tab as of recent versions) walks you through six steps for foreground and background images, croppable layout elements, optional spine, and instant preview. [L19 · slide 336]

Cover composition options [L19 · slides 334–342]:

- Single sheet, with front + back + spine + whole layout.
- Shading, borders, image(s).
- Crop and trim marks, bleed.
- Title and subtitle.
- ISBN with auto-generated barcode.

The Cover Wizard is flagged as a work-in-progress. The deck author embedded "wishful thinking" against the precise-positioning claim — meaning the feature was being polished as the deck shipped. Expect rough edges; report bugs.

---

## Part 9 — Finishing

### The Typesetting Report

After every run, an information button on the preview pane (also accessible from the Help tab) opens the Typesetting Report. The Report carries [L20 · slides 347–349]:

- A summary of the run (pages produced, which books, etc.).
- Highlighted warnings and errors.
- Diagnostic hints for common problems.

Make reading the Report a habit. Most "why does this look wrong?" questions are answered there before they need to go to the community forum.

### Whitespace and collision detection

PTXprint flags vertical rivers (vertical white channels through justified text), horizontal-spacing problems (columns of identical line widths), and element collisions (text running into pictures, footnotes overlapping, etc.). Both detectors are default-on but tunable. [L20 · slides 350–352]

Treat these as warnings, not errors. A typeset page can have a few overfull boxes and still be acceptable. The Report is the source of truth on which warnings actually matter for your publication.

### Booklet pagination

For booklet output, the Finishing tab supports 2-up, 4-up (with a 16-page test pattern), and 8-up impositions. Back-to-back printing requires the user to flip on the short or long side depending on the imposition; the deck includes example diagrams. The Fold-First option supports certain bind orders. [L20 · slides 356–360]

### Comparing PDFs

The Compare PDFs feature generates a `*_diff.pdf` showing pixel differences between two runs:

- Red = removed (was in the older PDF, not in the newer).
- Blue = new (in the newer PDF, not in the older).
- Gray = identical.

Recommended settings: turn on Only-Show-Pages-with-Differences and set a low Max-Diff-Pages (the diff PDF can otherwise become enormous). [L20 · slides 361–366]

This is the right tool for the question "did my settings tweak break anything I didn't expect?" or "did the team's text update affect layout elsewhere?"

### Output formats

PDF output formats split into screen and print [L20 · slides 367–371]:

For paper:
- Print-CMYK — full colour for offset / digital colour press.
- Print-Gray — black and white only.
- Print-Spot — two-colour (black plus one spot colour).

For screen distribution:
- Screen (Quickest) — no post-processing, fastest preview.
- Digital-RGB — colour for screen viewing.
- Digital-CMYK (Transparency) — for hybrid screen/print workflows.

Choose the output format based on the destination. A Print-CMYK PDF emailed for review wastes everybody's time; a Screen-Quickest PDF sent to the printer wastes paper.

### Printer cost comparison

The Printers tab integrates per-quantity cost comparison across Pretore, Print_Gallery, and Pothi (print-on-demand services). The graph lets translation teams see at a glance which provider is most cost-effective for the page count and quantity at hand. Use this before committing to a print run. [L20 · slides 374–376]

---

## Part 10 — Going Beyond the GUI

### changes.txt: surgical text manipulation

`changes.txt` is a regex-based USFM transformation language that PTXprint applies before typesetting. It is the right tool for the temporary fix that should not pollute the source text in Paratext.

Five scoping levels [L22 · slides 396–397]:

1. **Unrestricted (global)** — `"Jesus" > "Yesu"` applies to every occurrence in every book.
2. **Book-restricted** — `at GLO "\\p \\k " > "\\ili \\k "` applies only inside the named book(s); multiple books separated by semicolons.
3. **Book + chapter** — `at JHN 2 "grape juice" > "wine"` — surgical replacement in a specific chapter.
4. **Book + chapter + verse** — `at MAT 7:23 "old text" > "new text"` — single-verse precision.
5. **Environment-restricted** — `in '\\f .+?\\f\\*': 'Syria' > 'Aram'` — only inside footnotes (or any other USFM environment matched by the regex).

These are combinable: `at LUK 3:10 in '\\f .+?\\f\\*': "old" > "new"` restricts both the verse and the environment.

Two important practical patterns:

- **Adding ornamental rules** — `"(\\mt1 .+?\n)" > '\1\\zrule |cat="ornaments3" width=".5" align="c" thick="8pt"\\*\n'` injects an ornament rule under every main title.
- **Multilingual headers** — `"(\\id (...).+\n)" > "\\1\\h1 \\2\r\n"` auto-inserts the 3-letter book code as the running header.

`changes.txt` lives in the configuration folder for config-specific changes, or at the project level (often as a thin file that `include`s `PrintDraftChanges.txt`) for cross-config rules.

### Pre-processing scripts

For transformations beyond regex, PTXprint can run an arbitrary script before typesetting:

- Windows: `.bat` (batch) or `.exe`.
- Linux/Mac: `.sh` (shell) or `.py`.

The contract is `program infile outfile`. Place the script path on the Advanced tab and select whether it runs before or after `changes.txt`. [L22 · slide 405]

### TeX hooks: the snippet library

For low-level layout control beyond Body-tab settings, PTXprint exposes XeTeX hooks:

- `\sethook{pos}{mrkr}{code}` — run code at start/end of a marker.
- `\setcvhook{ref}{code}` — run code at a chapter:verse reference.
- `\setbookhook{pos}{book}{code}` — run code at start/end of a book.
- `\setbetweenhook{mkr1}{mkr2}{code}` — run code between consecutive markers.

The deck's snippet libraries on slides 380–386 cover dozens of common hook patterns: bridged-verse handling, footnote caller styling, end-of-book decoration, marginal verses, hyphenation tweaks, ornaments, Strong's index formatting. Treat these as copy-paste-and-tweak templates rather than memorisation targets.

### The headless CLI

The shipping CLI signature, taken directly from slide 417 [L22]:

```
ptxprint.exe -b ROM -c SingleSpaceDraft -P XYZ
```

Flag mapping:

- `-P <prjid>` — Paratext project ID.
- `-c <name>` — named configuration (defaults to `Default`).
- `-b "<codes>"` — space-separated USFM book codes (overrides the cfg value).
- `-h` — list all arguments.

Use cases the deck names explicitly: batch-mode Bible production at digitalbible.org and similar pipelines.

For one-off settings overrides at run time, the `-D key=value` flag (documented in the existing PTXprint MCP spec, not visible on slide 417) lets you adjust any UI setting without modifying the stored configuration. This is the intended mechanism for parameterised server runs.

### Silent install for deployment

For container builds, classroom labs, or server deployment:

```
PTXprint-setup.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART
```

PTXprint auto-launches when the install completes. Combine with the headless CLI for a fully unattended workflow. [L22 · slide 418]

### Setting overrides for cluster administration

When you administer multiple translation projects and need consistent layout (e.g. a publishing cluster's house style), the override files give you lockdown without rewriting individual configurations [L23 · slides 427–433]:

- `<project>/shared/ptxprint/ptxprint_project.cfg` — locks settings across all configurations in this project.
- `<project>/shared/ptxprint/<config>/ptxprint_override.cfg` — locks settings for one named configuration.

An entry in either file disables the corresponding UI control (the user sees it greyed out). Prefix the value with `*` to set the default but allow temporary user changes.

Authoring is currently manual (no UI as of this deck version): open the working `ptxprint.cfg` in a text editor, Save-As to the override filename, delete lines that should not be locked, save. The remaining lines lock.

This is a powerful surface for cluster administrators and a useful one for MCP servers to be aware of — see the Appendix for the implication.

---

## Part 11 — When You Get Stuck

### The tooltip-first principle

Hovering over any control surfaces the in-product description. This is the documented first answer to "what does this setting do?" The deck repeats this on slide 53 and several others. It is the right answer most of the time. [L5 · slide 53]

### Check your version

PTXprint ships a new release several times a month. Old versions accumulate known bugs that have already been fixed. Before reporting a problem, confirm you are on the current version. The "new version available" icon at the top of the column tells you when you are not. [L5 · slide 73]

### Read the Report

The Typesetting Report (info button on the preview pane, or Help tab) catches most issues. The error messages have hints at the end. The diagnostic information at the top often points directly at the cause. [L5 · slides 70–72]

### The community forum

If the tooltip, the version, and the Report do not solve it, the community forum at support.bible/ptxprint is the next stop. Search the history first; many obscure questions have already been answered. The forum is faster than email because everyone benefits from the answer.

### When you do email

If you must send an email to the developers, include an archive of the project. PTXprint can generate a PTXprintArchive.zip with the embedded settings and a text snapshot. Without that, the developers cannot reproduce the problem.

### Alt-X for Unicode codepoints

In the View+Edit window, select a character or short string and press Alt-X. PTXprint displays the Unicode codepoints. This is the fastest way to check whether a glyph that looks wrong is actually wrong (mis-encoded, wrong combining order, etc.) or just rendered with the wrong font. [L21 · slide 379]

---

## Appendix A — Open Gaps

The deck explicitly enumerates 13 sections it intends to add but has not yet (slide 5 of the source). Until they ship, the following are inadequately covered by both the deck and this manual:

1. Multi-config strategy: pros, cons, and naming conventions.
2. Thumb tabs, especially single-sided.
3. Ornaments, including the two distinct kinds and how to populate `ptxprint-mods.sty`.
4. Dynamic borders and section headings.
5. Full Style Editor coverage.
6. `ptxprint-mods.tex` and other special advanced files.
7. USFM auto-correct.
8. Header and footer language combinations (especially two languages in the header).
9. Codelet buttons on the View+Edit tab.
10. Inserting `\zrules` and `\zqrcode` directly.
11. Creating and using `.triggers` files (sometimes called "inserts").
12. Downloading and importing from picture data sets.
13. Updated screenshots throughout.

For these topics, the canonical sources are: the running PTXprint UI tooltips, the `PTXprintTechRef.pdf` bundled with the installer, the snippets file at github.com/sillsdev/ptx2pdf docs/documentation/snippets.md, and the community forum.

## Appendix B — Implications for the PTXprint MCP Server

This manual was authored alongside the PTXprint MCP Server work documented in `PTXprint_README.md`, `PTXprint_MCP_SPEC.md_-_First_Pass`, `ptx2pdf.surface.md`, and `transcript-encoded.md`. Three implications for the MCP server emerged during ESE that are worth surfacing here:

1. **Mini/Basic/Full is a first-class progressive-disclosure surface.** The MCP server can mirror this by exposing a `view_level` parameter on tools that surface settings, returning only the controls relevant to that tier rather than dumping all 400+ keys. Slide 99 gives the precise control counts for the Layout tab (5/14/27); the same pattern almost certainly applies on other tabs and is worth verifying against the running UI.

2. **The override mechanism is alive and shipping.** The existing first-pass MCP spec defers `ptxprint_project.cfg.override` as "may be deprecated upstream; not exposed." Slide 429 of the deck documents both `ptxprint_project.cfg` and `ptxprint_override.cfg` as authoring surfaces with shipping semantics. The MCP server's `set_config_values` tool currently has no concept of these — a `set_config_values` write that a project-level override silently overrides will baffle users. Add override-awareness before it bites.

3. **The CLI signature on slide 417 is the deck's own statement of the headless contract.** The MCP server's `run_typeset` tool already follows this shape (`-P`, `-c`, `-b`). Validate that batch-mode operation (e.g. digitalbible.org auto-generation, slide 417) actually works through the server by replicating one of those pipelines as an integration test — the deck names this as a real existing use case, so a reference implementation should exist.

These are observations, not commands to canon. Promote them by editing the MCP spec directly if and when they prove durable in practice, per the canon promotion rule for ESE.

---

## Appendix C — How This Manual Was Made

This manual was authored by Claude Opus 4.7 in a single interactive session on 2026-04-27, using the Epistemic Surface Extraction (ESE) of the PTXprint MASTER SLIDES deck as scaffolding. The surface is in `ptxprint-master-slides.surface.json` and `ptxprint-master-slides.surface.md`.

The deck was retrieved via `web_fetch` on the `/htmlpresent` rendering of the publicly-shared Google Slides URL. The deck's authoritative URL is:

```
https://docs.google.com/presentation/d/1LOp7bHXQPMIxnyeiPqb5o4-n35pFulDJwBiQgaXeG4o/edit
```

Image-only slides were not visually processed in this pass and are flagged accordingly in the surface. The deck is actively edited; expect that some slide numbers cited here will shift in future versions.

This manual is non-canonical. Where it disagrees with the deck, the deck wins. Where it disagrees with the running PTXprint product, the product wins. Where it disagrees with `PTXprintTechRef.pdf`, that document wins. Treat this as a teaching scaffold, not a specification.
