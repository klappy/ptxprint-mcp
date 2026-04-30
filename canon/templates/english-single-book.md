---
title: "Template: English Single-Book Bible"
audience: agent
exposure: working
voice: instructional
stability: working
tags:
  - ptxprint
  - mcp
  - agent-kb
  - v1.2-aligned
  - non-canonical
  - template
  - english-bible
  - single-book
  - bootstrap
  - quickstart
type: template
template_id: english-single-book
template_version: "0.1"
applies_to: "Single English Bible book; A5 (148mm × 210mm); two-column justified body; parallel-passage references on; clean section headings; Gentium Plus 6.200 (Regular, Bold, Italic, BoldItalic) supplied via the payload's fonts array; SourceCodePro container-bundled; A5 page size; Charis-substitution mitigation NOT used (this template uses payload-supplied fonts, not container-bundled fonts)."
caller_supplies:
  - books
  - sources
  - vars.maintitle
caller_may_override:
  - vars.subtitle
  - vars.languagename
  - project_id
  - config_name
derived_from: "smoke/bsb-jhn-empirical.json (purified — caller-owned fields stripped)"
companion_to:
  - "canon/articles/composition-and-templates.md"
  - "canon/articles/composition-and-templates.md"
canonical_status: non_canonical
date: 2026-04-30
status: draft_for_operator_review
---

# Template: English Single-Book Bible

> **What this is.** A partial `submit_typeset` payload for rendering a single English Bible book with clean A5 layout, parallel-passage references intact, and Gentium Plus throughout. Empirically derived from `smoke/bsb-jhn-empirical.json` (which has rendered successfully across sessions 10, 11, 12, 14 with BSB John and BSB Psalms).
>
> **What this is not.** A full payload. The caller supplies `books`, `sources`, and `vars.maintitle` — see "Caller-supplied fields" below. Without those, this payload will not render.

---

## When to use

Use this template when:

- The source content is English-language USFM
- One book per render (the template's `[project] bookscope = multiple` plus a single-entry `books` array works fine)
- A5 page size is acceptable (148mm × 210mm)
- Two-column justified body, parallel-passage references on, decorations off — these are the defaults
- Gentium Plus is acceptable (or a font-compatible substitute the caller layers in)

Do **not** use this template when:
- Multi-book NT or whole Bible — needs a different template (one will land as `english-multi-book` or similar)
- Non-English content — fonts and language metadata defaults won't match
- Diglot or polyglot — needs a different template
- Poetry-heavy book where line spacing matters (Psalms etc. render but with significant page underfill — see "Known limitations" in the BSB-render iteration trail)

---

## Caller-supplied fields

The caller MUST supply these. The template is incomplete without them.

| Field | Type | Example | Notes |
|---|---|---|---|
| `books` | string array, top-level | `["JHN"]` | USFM 3-letter book code(s) |
| `sources` | object array, top-level | see below | URL + sha256 of the USFM file(s) |
| `vars.maintitle` | string, inside `config_files`'s `[vars]` section | `"John"` | Title-page text and PDF metadata title |

### `sources` shape

```json
[
  {
    "book": "JHN",
    "filename": "44JHNtest.usfm",
    "url": "https://raw.githubusercontent.com/.../44JHN....usfm",
    "sha256": "<hex64>"
  }
]
```

Three things to note about `sources`:

- The `filename` field needs the `test.usfm` suffix to match this template's `Settings.xml`'s `<FileNamePostPart>test.usfm</FileNamePostPart>` (a leftover from the minitests fixture lineage). Use any USFM-canonical book number prefix (`44JHN`, `19PSA`, `01GEN`, etc.) followed by `test.usfm`.
- The `url` is fetched by the worker. `raw.githubusercontent.com` works fine; so does any HTTPS-reachable URL.
- The `sha256` is verified on download. Mismatch fails the render with a clear error.

### `vars.maintitle` placement

This field lives **inside** the cfg INI text, which lives inside `config_files`'s `shared/ptxprint/Default/ptxprint.cfg` value. The cfg has a `[vars]` section near the bottom:

```ini
[vars]
maintitle = 
subtitle = Berean Standard Bible
languagename = English
```

The caller substitutes the empty `maintitle =` line with their value, e.g. `maintitle = John`. String substitution on the cfg INI text is sufficient (no INI parsing needed).

---

## Caller-may-override fields

Optional. Defaults are sensible for English-language content.

| Field | Default | When to override |
|---|---|---|
| `vars.subtitle` (cfg INI) | `Berean Standard Bible` | Non-BSB English source — set to the actual translation name |
| `vars.languagename` (cfg INI) | `English` | (Don't override; this template is English-only) |
| `project_id` (top-level) | `bsbref` | Caller's namespacing label; any 1–8 character string |
| `config_name` (top-level) | `Default` | Almost always leave as `Default` |

---

## What's in the template (don't change unless you know why)

**Layout** (in `[paper]`):
- A5 page size (148mm × 210mm), 12pt margins, 14.4pt bottom margin
- Two-column body, justified
- Header rule on, page number centered, reference range right

**Body** (in `[document]`):
- `parallelrefs = True` — parallel-passage references rendered. **This is the load-bearing setting for cross-references.**
- `cloptimizepoetry = True` — poetry layout optimized
- `bookintro = False`, `multibook = False` — single-book mode

**Decorations off** (in `[fancy]`, `[snippets]`, `[paper]`):
- `pageborder`, `pageborders`, `sectionheader`, `versedecorator` — all False/empty
- `cropmarks = False`, `ifverticalrule = False`, `ifgrid = False`
- `fancyborders = False`, `fancyintro = False`

**Fonts** (in `[document]` and the `fonts` array):
- Gentium Plus regular / bold / italic / bolditalic
- Supplied via the payload's `fonts` array (URLs + sha256 verified per `klappy://canon/articles/font-resolution`; no container apt-install dependency)

**Stylesheet** (in `config_files["shared/ptxprint/Default/ptxprint.sty"]`):
- Inherits from the minitests fixture
- Empirical neutralizations: `\Marker cat:headingsbox|esb` rewritten to remove the decorative box; `\Marker s/s1/s2/r` blocks added with neutralizing properties + Bold/Center on headings, Italic on `\r`
- Caveat: these stylesheet properties are not yet documented in `klappy://canon/articles/stylesheet-format` (tracked at `s12-H027`/`s12-H028`)

---

## Composition contract — how to merge

The merge is a shallow object merge for top-level fields, plus a string substitution inside the cfg INI for `vars.maintitle`.

Pseudocode:

```python
template = json.loads(extract_json_block_from_docs_response(...))

# 1. Top-level caller fields
template["books"] = ["JHN"]
template["sources"] = [
    {
        "book": "JHN",
        "filename": "44JHNtest.usfm",
        "url": "https://raw.githubusercontent.com/usfm-bible/examples.bsb/48a9feb71f0a66f9b8f418b11ae25b7ad2e49a0d/44JHNBSB.usfm",
        "sha256": "f6220aa81c8143cb66a86d775fa3cdfe10efcb52dad135dfc498baeac260103d",
    }
]

# 2. cfg INI substitution for vars.maintitle (and optionally subtitle)
cfg_path = "shared/ptxprint/Default/ptxprint.cfg"
template["config_files"][cfg_path] = template["config_files"][cfg_path].replace(
    "maintitle = \n",            # the placeholder line as it appears in the template
    "maintitle = John\n",
    1,
)

# 3. Submit
result = submit_typeset(payload=template)
```

That's it. No deep merge, no sty edits, no font munging.

---

## Validation contract

A merged payload submitted via `submit_typeset` should produce:

- `state: "succeeded"`, `failure_mode: "success"`, `exit_code: 0`
- Wall-clock: ~13 s container, ~16 s end-to-end (cold cache); <1 s cache hit
- PDF: ~360 KB for a Gospel-sized book (e.g. JHN), ~900 KB for Psalms
- Pages: varies by book length
- Embedded fonts: `GentiumPlus`, `GentiumPlus-Bold`, `GentiumPlus-Italic`, `SourceCodePro-Regular`
- Reproducibility: the same merged payload returns the same `job_id` (content-addressed)

Failure modes a caller should expect to handle:

- `sha256 mismatch on sources[N]` — caller's hash doesn't match the URL's content. Re-fetch and recompute.
- `failure_mode: "soft"` with high `overfull_count` — render succeeded but layout has issues. Inspect the log via `get_job_status`'s `log_tail`.
- Underfilled pages on poetry — known limitation (autofill is deferred). The PDF is valid; pages just have uneven bottom margins.

---

## Known limitations (carried forward from BSB iteration)

1. **Underfilled pages on poetry-heavy books** (Psalms ~92% of pages). Cause: single-pass typesetting + short `\q1`/`\q2` lines. Canonical fix is `mode: autofill` (deferred). Interim mitigations: experiment with `hangpoetry`, `preventwidows`, `preventorphans` cfg knobs.

2. **Footnote-balancing log noise** — `IF CHECK mnote Failed. Entered at 2 != exit at 1` repeats when footnotes are present. Output is valid; noise is upstream macro behavior. Tracked at `s14-H027`.

3. **Stylesheet edits are empirical** — the `\Border`, `\BorderWidth`, `\BgColor`, `\Alpha` neutralizations work but aren't yet in `klappy://canon/articles/stylesheet-format`. Tracked at `s12-H027`/`s12-H028`.

4. **Section-heading wrapping mechanism not fully understood** — why standard `\s1` markers in BSB USFM get `cat:headingsbox|esb` styling is opaque in current canon. The template's stylesheet neutralizes the styling but doesn't explain the trigger. Tracked at `s12-O-open-12-001`.

5. **Multi-book mode** — this template's `[project] bookscope = multiple` works for a single-book `books` array, but multi-book renders haven't been validated end-to-end. A dedicated `english-multi-book` template is the right path for that case.

---

## Provenance

Derived from `smoke/bsb-jhn-empirical.json` (which is itself the v6 of an iterative cleanup over the upstream `sillsdev/ptx2pdf/test/projects/minitests` fixture — see `klappy://canon/encodings/transcript-encoded-session-12` for the v3→v6 narrative). Caller-owned fields stripped:

- Removed top-level: `books`, `sources`
- Cleared cfg `[vars] maintitle`, `[project] booklist`, `[project] subject`, `[document] clabelbooks`
- Kept everything else verbatim

---

## Partial payload

Copy this block. Apply your `books`, `sources`, and `vars.maintitle` per the composition contract above. Submit via `submit_typeset(payload=...)`.

```json
{
  "schema_version": "1.0",
  "project_id": "bsbref",
  "config_name": "Default",
  "mode": "simple",
  "define": {},
  "config_files": {
    "Settings.xml": "<ScriptureText>\n  <StyleSheet>usfm.sty</StyleSheet>\n  <BooksPresent>111111111111010010110011001000000000001101111001000000000100011101000000000000000000000000000000000001000000100000000000000</BooksPresent>\n  <Versification>4</Versification>\n  <LanguageIsoCode>en</LanguageIsoCode>\n  <FileNameBookNameForm>41MAT</FileNameBookNameForm>\n  <FileNamePrePart />\n  <FileNamePostPart>test.usfm</FileNamePostPart>\n\n</ScriptureText>\n",
    "custom.sty": "\\Category pl2\n\\Position pl2\n\\Scale 2\n\\Alpha .5\n\\BgColour 1 .8 .8\n\\BoxVPadding 2\n\\BoxHPadding 2\n\\Border All\n\n\\Category hc\n\\Position hc\n\\BoxHPadding 3\n\\BoxVPadding 3\n\\Scale 0.6\n\\BgColour 0.8 1 0.8\n\\Alpha 1\n\\Border All\n\n\\Category hr\n\\Position hr\n\\BgColour 0.8 0.8 1\n\\Alpha 1\n\\Scale 0.7\n\\Border All\n\n\\Category page\n\\Position Pcc\n\\BorderPadding 15\n\\BorderWidth 1\n\\Border All\n\n\\Category inl   \n\\Position h      \n\\BgColour 0 1 0\n\\Alpha 0.2     \n\\Border Outer Top Bottom \n\\BoxPadding  0         \n\\BorderPadding 2             \n\\Scale 1       \n\\Marker p                                                   \n\\Justification center                                       \n                                                            \n\\Category top                                               \n\\Position t          \n\\BgColour 0 1 0    \n\\Alpha 0.2             \n\\Border Outer Top Bottom \n\\BoxPadding  0\n\\BorderPadding 2\n\\Scale 1 \n  \n\\Category foo\n%\\BgColour 1 0 0\n\\Scale 1\n\\Position tr\n\\Border left top right bottom\n\\BorderWidth 5\n\\BorderPadding -6\n\\BoxVPadding 8\n\\BoxHPadding 8\n\\BgColour 0 0 1\n\\BorderColour 0.2 0.3 0.6\n\\BorderFillColour 0.2 0.3 0.6\n\\BorderPatternTop 39|||2.5,0|||0.2,88||-,0||*A,39|h||2.5\n\\BorderPatternBot 39|v||2.5,0||*A,88|h|-,0||-,39|d||2.5\n\\BorderPatternLeft 0|||0.2,88|l|-,0|l|*A,-2|l|*A,0|l|*A\n\\BorderPatternRight 0|l|*A,-2|r|*A,0|r|*A,88|r|-\n\\BorderLineWidth 0.3\n\\BorderStyle ornaments\n\n\\Category pictest\n\\Position h\n\\Scale 1\n\\BgColour 0 0.5 0\n\\BorderColour 0 0 0\n\\SpaceBeside 3pt\n\\FgImage rose.jpg\n\\FgImageScale 0.25\n\\FgImagePos cr1\n\\BgImage SlithyToves.jpg\n%\\BgImageLow f\n\\BgImageScale x1\n\\BgImageAlpha 0.5\n\\BoxVPadding 15\n\\BoxHPadding 15\n\\BorderVPadding -7\n\\BorderHPadding -7\n\\BgImageOversize shrink\n\\Border Top Bottom left right\n\\BorderWidth 5 \n\\BorderPatternTop 39|||2.5,0|||0.2,88||-,0||*A,39|h||2.5\n\\BorderPatternBot 39|v||2.5,0||*,88|h|-,0||-,39|d||2.5\n\\BorderPatternLeft 0|||0.2,88|l|-,0|l|*A,-2|l|*A,0|l|*A\n\\BorderPatternRight 0|l|*A,-2|r|*A,0|r|*A,88|r|-\n\\BorderLineWidth 0.05\n\\BorderStyle double\n\\BorderFillColour 0 1 0\n\n",
    "shared/ptxprint/Default/ptxprint.cfg": "[document]\ndiglotsecprj = WEBorig\nbookintro = False\nch1pagebreak = False\nchapfrom = 1\nchapto = 999\nclabel = \nclabelbooks = \ncloptimizepoetry = True\ncolgutterfactor = 4\ncolumnshift = 16\ncustomfigfolder = C:/WSG/local/figures\ncustomfiglocn = False\ndiffcolayout = False\ndiffcolayoutbooks = FRT INT PSA PRO BAK GLO\ndiffpages = 20\ndiffpdf = \ndiglot2captions = False\ndiglotadjcenter = False\ndiglotcolour = rgb(255,255,255)\ndiglotheaders = False\ndiglotjoinvrule = False\ndiglotmergemode = doc\ndiglotnotesrule = False\ndiglotpicsources = pri\ndiglotprifraction = 50\ndiglotsecconfig = Default\ndiglotsecfraction = 50\ndiglotsecprjguid = f2fa3035ed38dbe51f52e599c12da64d1f073a10\ndiglotsepnotes = True\ndiglotserialbooks = FRT BAK GLO XXA XXB\ndiglotswapside = False\nelipsizemptyvs = False\nexclusivefolder = False\nfilterglossary = True\nfirstparaindent = True\nfontbold = Gentium Plus| Bold|false|false|\nfontbolditalic = Gentium Plus| Italic Bold|false|false|\nfontextraregular = ||false|false|\nfontitalic = Gentium Plus| Italic|false|false|\nfontregular = Gentium Plus||false|false|\nglossarydepth = 2\nglossarymarkupstyle = cb\nglueredupwords = False\nhangpoetry = False\nhidemptyverses = False\nifchaplabels = False\nifcolorfonts = True\nifdiglot = False\nifdiglotcolour = rgb(255,255,255)\niffigcrop = False\niffigexclwebapp = False\niffighiderefs = False\niffigplaceholders = False\niffigshowcaptions = False\niffigskipmissing = False\nifhidehboxerrors = False\nifinclfigs = False\nifletter = False\niflinebreakon = False\nifmainbodytext = True\nifndiglot = False\nifomitverseone = True\nifrtl = ltr\nifshow1chbooknum = False\nifshowchapternums = True\nifshowversenums = True\nifspacing = False\nifusepiclist = False\nimagetypepref = JPG TIF PNG PDF\nincludeimg = True\nindentunit = 1\nintrooutline = False\nkeepversions = 1\nlettershrink = 1\nletterspace = False\nletterstretch = 5\nlinebreaklocale = \nmarginalposn = left\nmarginalverses = False\nmultibook = False\nndiffcolor = rgb(26,95,180)\nnoblankpage = False\nnogrid = False\nodiffcolor = rgb(204,0,0)\nonlyshowdiffs = True\npagebreakallchs = False\nparallelrefs = True\npicresolution = \npreventorphans = False\npreventwidows = False\nprintarchive = False\nrulethickness = 0.4\nscript = Zyyy\nsectionheads = True\nsensitive = False\nsettingsinpdf = True\nshowxtrachapnums = False\nspaceshrink = 50\nspacestretch = 200\nstartpagenum = 1\nsubject = \ntoc = False\ntocleaders = 1\ntoctitle = \ntoptobottom = ltr\nusetoc1 = True\nusetoc2 = True\nusetoc3 = False\nvarlinespacing = False\n\n[import]\nproject = \naddnewpics = True\nadvanced = False\nbody = True\ncaptions = False\nconfig = (None)\ncopyright = True\ncover = True\ndeloldpics = False\neverything = False\nfontsscript = True\nfrontmatter = True\nheaderfooter = True\nimppics = entire\nimpsource = pdf\nimptarget = prjcfg\nlayout = True\nnotesrefs = True\nother = True\noverrideallstyles = False\noverwitefrtmatter = False\npictures = True\nsizeposn = True\nstyles = True\ntabsborders = False\ntgtconfig = Default\ntgtproject = \n\n[color]\nspotcolrange = 15\n\n[config]\nautosave = True\ndisplayfontsize = 12.098\nfilterpics = False\ngitversion = 2.6.8-gf3e1d82c\nlockui4layout = False\nlockxetexlayout = False\nname = Default\nnotes = \nprintcount = 69\npwd = \ntexperthacks = True\nversion = 2.20\n\n[cover]\ncoveradjust = 0.14\ncoverartbleed = 0\ncoverbleed = 0\ncovercropmarks = False\nincludespine = False\nmakecoverpage = False\nmakeseparatepdf = False\noverridepagecount = True\npapercalcunits = weight\nrotatespine = 270\nrtlbookbinding = False\nspineoverlapback = 0\nspineoverlapfront = 0\nspinewidth = 4.874mm\ntotalpages = 100\nweightorthick = 80\n\n[covergen]\nbordercolor = rgb(94,92,100)\nborderstyle = Vectorian3\nimagealpha = 0.7\noverwriteperiphs = False\nshadingalpha = 0.5\nshadingcolor = rgb(114,159,207)\ntextcolor = rgb(0,0,0)\ntextscale = 1.7\nuseborder = True\nuseimage = False\nuseshading = True\n\n[fancy]\nenableornaments = False\nendayah = False\nendofbook = False\nendofbookpdf = \npageborder = False\npageborderfullpage = False\npageborderpdf = \npageborders = False\npagebordertype = False\nsectionheader = False\nsectionheaderpdf = \nsectionheaderscale = 1\nsectionheadershift = 0\nversedecorator = False\nversedecoratorpdf = \nversedecoratorscale = 1\nversedecoratorshift = 0\nversedecoratortype = \n\n[finishing]\nextractinserts = False\nextraxdvproc = False\nfoldcutmargin = 0\nfoldfirst = False\ninclsettings = True\npgsperspread = 1\nrtlpagination = False\nscaletofit = False\nsheetsinsigntr = 0\nsheetsize = 210mm, 297mm (A4)\nspotcolor = rgb(28,113,216)\nspottolerance = 15\n\n[footer]\nftrcenter = -empty-\nftrcenterside = \nifftrtitlepagenum = True\nifprintconfigname = False\nnoinkinmargin = True\n\n[grid]\ndivisions = 0\ngridgraph = False\ngridlines = True\nmajorcolor = rgb(255,255,255)\nmajorthickness = 0\nminorcolor = rgb(255,255,255)\nminorthickness = 0\nunits = in\nxyadvance = 0\nxyoffset = margin\n\n[header]\nchvseparator = colon\nhdrcenter = Page Number\nhdrcenterside = \nhdrleft = -empty-\nhdrleftside = \nhdrright = Reference Range\nhdrrightside = \nifrhrule = True\nifshowbook = True\nifshowchapter = True\nifshowverse = False\nmirrorlayout = True\n\n[notes]\nabovenotespace = 9\nabovestudyspace = 9\nabovexrefspace = 0\naddcolon = False\nbelownoterulespace = 3\nbelowstudyrulespace = 3\nbelowxrefrulespace = 0\nfncallers = †,‡,§,∥,#\nfneachnewline = False\nfnomitcaller = True\nfnoverride = False\nfnpos = page\nfnresetcallers = False\nfnruleindent = 0\nfnrulelength = 100\nfnruleposn = 1\nfnrulethick = 0.4\nfrverseonly = False\nglossaryfootnotes = False\nhoriznotespacemax = 27\nhoriznotespacemin = 7\niffnautocallers = True\niffootnoterule = True\nifstudynoterule = True\nifxrautocallers = True\nifxrefrule = False\nifxrexternalist = False\nincludefootnotes = True\nincludexrefs = True\ninternotespace = 3.5\nkeepbookwithrefs = True\nshowextxrefs = False\nsnruleindent = 0\nsnrulelength = 100\nsnruleposn = 1\nsnrulethick = 0.4\nxrcentrecolwidth = 30\nxrcolalign = False\nxrcolbottom = False\nxrcolrule = False\nxrcolside = 3\nxreachnewline = False\nxrextlistsource = standard_2\nxrfilterbooks = all\nxrguttermargin = 0.1\nxrlistsource = standard_2\nxrlocation = page\nxromitcaller = True\nxroverride = False\nxrpos = page\nxrresetcallers = False\nxrruleindent = 0\nxrrulelength = 100\nxrruleposn = 1\nxrrulethick = 0.4\nxrverseonly = False\n\n[paper]\nallowunbalanced = False\nbottommargin = 14.4\ncolgutteroffset = -2\ncolumns = True\ncropmarks = False\nfontfactor = 11\nfooterpos = 13.657\ngutter = 10\nheaderpos = 10\nheight = 148mm, 210mm (A5)\nifaddgutter = True\nifgrid = False\nifoutergutter = True\nifverticalrule = False\nifwatermark = False\nlockfont2baseline = False\nmargins = 12\nnotelines = False\npagesize = 148mm, 210mm (A5)\nrulegap = 5\ntopmargin = 18\nwatermarkpdf = ${pdfassets}/watermarks\nwidth = 148mm, 210mm (A5)\n\n[paragraph]\nifhyphapproved = True\nifhyphenate = True\nifhyphlimitbks = False\nifjustify = True\nifnbhyphens = False\nifnothyphenate = True\nifomithyphen = False\nifsylhyphens = False\nifusefallback = False\nlinespacing = 15\nmissingchars = \n\n[project]\nautotaghebgrk = True\nbook = OTH\nbooklist = \nbookscope = multiple\ncanonicalise = True\ncolophontext = \\pc \\zcopyright\n\t\\pc \\zlicense\n\t\\b\n\t\\pc \\zimagecopyrights\ncopyright = \nid = minitests\nifcolophon = False\niffrontmatter = False\nifinclbackpdf = False\nifinclfrontpdf = False\nifusecustomsty = False\nifusemodssty = False\nifusemodstex = False\nifusepremodstex = False\ninclcoverperiphs = False\ninterlang = \ninterlinear = False\ninterpunc = False\nlicense = This work is licensed under a Creative Commons Attribution 4.0 International License.\nperiphpagebreak = False\npgbreakcolophon = False\nplugins = \nprocessscript = False\nrandompicposn = False\nruby = False\nsectintros = False\nselectxrfile = .\nuilevel = 6\nusechangesfile = False\nwhen2processscript = before\n\n[scripts]\narab/lrcolon = False\nindic/showhyphen = False\nindic/syllables = False\nmymr/syllables = False\n\n[snippets]\nadjlabelling = False\ndiglot = False\nfancyborders = False\nfancyintro = False\npdfoutput = Screen\n\n[strongsndx]\ndefinitions = False\nfallbackprj = \nkeyvrsrefs = True\nmajorlang = en\nndxbookid = XXS\nnocomments = False\nopenineditor = False\nraglines = 0\nrenderings = True\nshowall = False\nshowgreek = True\nshowhebrew = True\nshowindex = False\nshowintext = False\nshownums = True\nsourcelang = True\ntransliterate = False\ntwocols = True\nwildcards = keep\n\n[studynotes]\ncolgutterfactor = 4\ncolgutteroffset = 0\nfiltercats = False\nifverticalrule = False\nincludesidebar = True\nincludextfn = False\ninternote = 0\nshowcallers = False\ntxlinclquestions = False\ntxllangtag = en\ntxlnumbered = True\ntxloverview = False\ntxlshowrefs = False\n\n[thumbtabs]\nbackground = rgb(0,0,0)\ngroups = GAL EPH PHP COL; 1TI 2TI TIT PHM; JAS 1PE 2PE; 1JN 2JN 3JN JUD\nheight = 6\nifthumbtabs = False\nlength = 15\nnumtabs = 0\nrestart = False\nrotate = False\nrotatetype = 1\ntabsoddonly = False\nthumbtextmkr = toc3\n\n[vars]\nmaintitle = \nsubtitle = Berean Standard Bible\nlanguagename = English\n\n[strongsvars]\nindex_book_title = Strong's Number Index\nhebrew_section_title = Hebrew Words\ngreek_section_title = Greek Words\nreverse_index_title = Reversal Index\n\n[texpert]\nbottomrag = 0\n\n",
    "shared/ptxprint/Default/ptxprint.sty": "\n\\Marker b\n\\LineSpacing 0.5\n\n\\Marker cat:coverback|esb\n\\BorderWidth 1\n\\BorderVPadding 0\n\\BorderHPadding 0\n\\BorderColor 0.00 0.00 0.00\n\\BoxVPadding 0\n\\BoxHPadding 8\n\\BgColor 0.91 0.25 0.25\n\\Alpha 0.2\n\n\\Marker cat:coverfront|esb\n\\BgImageColor 0.00 0.00 0.00\n\\BgImageAlpha 0.5\n\\BgImageLow f\n\\BgImageOversize ignore\n\\BgImage \"/home/david/src/ptx2pdf/test/projects/minitests/figures/SlithyToves.jpg\"\n\\TextProperties publishable\n\\BorderStyle ornaments\n\\BorderRef Vectorian3\n\\BorderColor 0.00 0.00 0.00\n\\BorderWidth 15\n\\BorderVPadding -30\n\\BorderHPadding -30\n\\BoxVPadding 35\n\\BoxHPadding 35\n\\Border All\n\\SpaceAfter -0.24\n\\Alpha 0.45\n\n\\Marker cat:coverfront|mt1\n\\Color x000000\n\\NonJustifiedFill 0.5\n\n\\Marker cat:coverfront|mt2\n\\FontSize 27.2\n\\Color x000000\n\n\\Marker cat:coverspine|esb\n\\BorderWidth 1\n\\BorderVPadding 0\n\\BorderHPadding 0\n\\BorderColor 0.00 0.00 0.00\n\\BoxVPadding 1\n\\BoxHPadding 1\n\\Scale 1\n\\Border All\n\n\\Marker cat:coverspine|mt1\n\\FontSize 7.92\n\\Color xEDD400\n\\Justification Right\n\\SpaceAfter 1.2\n\n\\Marker cat:coverspine|mt2\n\\FontSize 7.2\n\\Color x000000\n\\Justification Center\n\n\\Marker cat:coverwhole|esb\n\\LineSpacing 0.97\n\\BgImageColor 0.00 0.00 0.00\n\\BgImageAlpha 0.5\n\\BgImageLow t\n\\BgImageOversize ignore\n\\BgImage \"F\"\n\\BgColor 0.45 0.62 0.80\n\\BorderWidth 1\n\\BorderVPadding 0\n\\BorderHPadding 0\n\\BorderColor 0.00 0.00 0.00\n\\BoxVPadding 0\n\\BoxHPadding 0\n\\LeftMargin -0.01\n\n\\Marker cat:headingsbox|esb\n\\TextProperties publishable\n\\BorderWidth 0\n\\Border None\n\\BgColor 1 1 1\n\\Alpha 0\n\n\\Marker cat:inline1|esb\n\\Name cat:inline1|esb - Peripherals - Category for putting material in an inline box\n\\TextType Other\n\\StyleType Paragraph\n\\FontSize 12\n\\FirstLineIndent 0\n\\LeftMargin 0\n\\RightMargin 0\n\\LineSpacing 1\n\\SpaceBefore 0\n\\SpaceAfter 0\n\\NonJustifiedFill 0.25\n\\Position h\n\\Scale 1\n\\BgColor 0.60 0.95 0.59\n\\Description inline1 sidebar\n\\Occursunder esb\n\n\\Marker cat:inline2|esb\n\\Name cat:inline2|esb - Peripherals - Category for putting material in an inline box\n\\TextType Other\n\\StyleType Paragraph\n\\FontSize 12\n\\FirstLineIndent 0\n\\LeftMargin 0\n\\RightMargin 0\n\\LineSpacing 1\n\\SpaceBefore 0\n\\SpaceAfter 0\n\\NonJustifiedFill 0.25\n\\Position h\n\\Scale 1\n\\BgColor 0.88 0.50 0.00\n\\Description inline2 sidebar\n\\Occursunder esb\n\n\\Marker cat:inline3|esb\n\\Name cat:inline3|esb - Peripherals - Category for putting material in an inline box\n\\TextType Other\n\\StyleType Paragraph\n\\FontSize 12\n\\FirstLineIndent 0\n\\LeftMargin 0\n\\RightMargin 0\n\\LineSpacing 1\n\\SpaceBefore 0\n\\SpaceAfter 0\n\\NonJustifiedFill 0.25\n\\Position h\n\\Scale 1\n\\BgColor 0.30 0.30 0.30\n\\Description inline3 sidebar\n\\Occursunder esb\n\n\\Marker cat:inline4|esb\n\\Name cat:inline4|esb - Peripherals - Category for putting material in an inline box\n\\TextType Other\n\\StyleType Paragraph\n\\FontSize 12\n\\FirstLineIndent 0\n\\LeftMargin 0\n\\RightMargin 0\n\\LineSpacing 1\n\\SpaceBefore 0\n\\SpaceAfter 0\n\\NonJustifiedFill 0.25\n\\Position h\n\\Scale 1\n\\BgColor 0.30 0.30 0.80\n\\Description inline4 sidebar\n\\Occursunder esb\n\\Border All\n\\BorderWidth 0.5\n\n\\Marker cat:sidebar|esb\n\\Name cat:sidebar|esb - Peripherals - Category for putting material in a box\n\\TextType Other\n\\StyleType Paragraph\n\\FontSize 12\n\\FirstLineIndent 0\n\\LeftMargin 0\n\\RightMargin 0\n\\SpaceBefore 0\n\\SpaceAfter 0\n\\NonJustifiedFill 0.25\n\\Position tr\n\\Occursunder esb\n\\Scale 1\n\\BgColor 0.60 0.95 0.59\n\\BorderWidth 1\n\\BorderVPadding 3\n\\BorderHPadding 3\n\\BorderColor 0.00 0.00 0.00\n\\BoxVPadding 2\n\\BoxHPadding 2\n\\BoxTPadding 1\n\\Border Top Left Right Bottom\n\n\\Marker loc:bX|fig\n\\Name loc:bX|fig - Auxiliary - Figure/Illustration/Map\n\\Description Illustration [Columns to span, height, filename, caption text]\n\\TextType Other\n\\StyleType Character\n\\FontSize 12\n\\Italic -\n\\FirstLineIndent 0\n\\LeftMargin 0\n\\RightMargin 0\n\\LineSpacing 1\n\\SpaceBefore 0\n\\SpaceAfter -0.48\n\\NonJustifiedFill 0.25\n\\Endmarker loc:bl|fig*\n\\Occursunder po tc1 q3 lim2 pm thr1 thr4 th4 lf li mi pi s3 thr3 phi ms2 qc tc4 li1 m qm1 pmc q4 ms tcr4 th3 qr qm NEST ph pi3 q2 li2 pmo th1 nb lim3 d lim1 tc2 tcr3 q1 tcr2 q lim4 pc th2 tc3 ip sp tcr1 li3 s1 tr pi2 li4 s lim lh pi1 qd qm2 pr p ms1 s2 pmr thr2 qm3\n\n\\Marker nd\n\\FontName Andika\n\\Color x009030\n\\Smallcaps \n\n\\Marker s\n\\SpaceBefore 4\n\n\\Marker s1\n\\SpaceBefore 4\n\n\\Marker s3\n\\Justification LeftBal\n\n\\Marker s3e\n\\Justification LeftBal\n\n\\Marker s4\n\\Justification LeftBal\n\n\\Marker s4e\n\\Justification LeftBal\n\n\\Marker sp\n\\Justification LeftBal\n\n\\Marker tcr1\n\\RightMargin 0.05\n\n\\Marker textborder\n\\TextProperties nonpublishable verse\n\n\n\\Marker s\n\\Border None\n\\BorderWidth 0\n\\BgColor 1 1 1\n\\Alpha 0\n\\Justification Center\n\\Bold\n\n\\Marker s1\n\\Border None\n\\BorderWidth 0\n\\BgColor 1 1 1\n\\Alpha 0\n\\Justification Center\n\\Bold\n\n\\Marker s2\n\\Border None\n\\BorderWidth 0\n\\BgColor 1 1 1\n\\Alpha 0\n\\Bold\n\n\\Marker r\n\\Border None\n\\BorderWidth 0\n\\BgColor 1 1 1\n\\Alpha 0\n\\Italic\n\\Justification Center\n",
    "shared/ptxprint/Default/ptxprint-mods.sty": "\\Category coverfront\n\\BorderStyle Vectorian3\n\\BoxBPadding 30\n\\BorderWidth 18\n\\BoxVPadding 45\n\\BoxHPadding 45\n\\Alpha 0.6\n\\BgColour F\n\\BgImageLow T\n%\\BgImage ../../../figures/SlithyToves.jpg\n\\BgImageAlpha 0.2\n%\\BgImageOversize distort\n\\BorderHPadding -40\n\\BorderVPadding -40\n\\BgImageScale inner|x0.8\n\\Border All\n\n\\Category coverback\n\\Alpha 0.4\n\\BgColour T\n\\BorderStyle double\n\\BorderFillColour None\n\\BorderLineWidth 0.5\n\\BorderPadding -15\n%\\BoxPadding 20\n%\\BoxLPadding 5\n\\BorderWidth 5\n\\BoxTPadding 2\n\\BoxHPadding 20\n\\BoxBPadding 10\n\\Border None \n\n\\Category coverwhole\n%\\SpaceBefore 10\n%\\BoxLPadding 30\n%\\BorderTPadding -30\n%\\BgImage ../../../figures/Background.jpg\n\\BgImageScale bleed|1.0x1\n\\BorderWidth 1.0\n\\BgColour F\n\\BgImageAlpha 0.8\n\\BoxTPadding 0\n\\BoxBPadding 0\n\\Border none \n\n\\Marker pc\n\\Color xff0000\n\\FontSize 24\n\n\\Marker p\n\\Color xff0000\n\n\\Category coverspine\n\\Border None\n\\Alpha 0.6\n\\Rotation r\n\n\\Marker pc\n\\FontSize 16\n\\Bold\n\n\\Category TitleBox\n\\Position hc\n\\Scale 0.3\n\\SpaceBefore 10\n\\SpaceAfter 20\n\\BgColour 1.0 0.9 0.9\n\\Border All\n\\BoxPadding 0\n\\BoxBPadding 10\n\\Alpha 1\n\n\\Category ISBNbox\n\\Position hr\n\\SpaceBefore 100\n\\SpaceAfter 0\n\\Border None\n\\BorderWidth 0.05\n\\BgColour 1 1 1\n\\BoxHPadding 5\n\\BoxVPadding 5\n\\BorderRPadding 10\n\\Scale 0.7\n\\Alpha 1\n\n\\Category footbox\n\\Position h\n\\SpaceBefore 10\n\\SpaceAfter 10\n\\Scale 0.25\n%\\Border All\n\\BgColour 0.8 0.8 1\n%\\BoxHPadding 0\n%\\BoxVPadding 0\n%\\BorderPadding 1\n%\\Scale 0.3\n%\\Alpha 1\n\\EndCategory\n\n\\Marker cat:headingsbox|esb\n\\SidebarGridding heading\n\\BorderPadding 1\n\\BoxPadding 0\n\\BorderStyle ornaments\n\\BorderRef  Han4\n\\BorderFillColour .5 .5 .5\n\n\\Marker cat:sidebar|esb\n\\SidebarGridding smart\n\\Marker cat:inline2|esb\n\\SidebarGridding normal\n\\Marker cat:inline3|esb\n\\SidebarGridding none\n\n\\Marker cat:inline4|esb\n\\SidebarGridding none\n"
  },
  "fonts": [
    {
      "family_id": "gentiumplus",
      "version": "6.200",
      "filename": "GentiumPlus-Regular.ttf",
      "url": "https://ptxprint-mcp.klappy.workers.dev/r2/outputs/fixtures/fonts/gentium-plus-6.200/GentiumPlus-Regular.ttf",
      "sha256": "2c27e7da23ba44d135685836056833b304a388d3da346813189c60656dc02019"
    },
    {
      "family_id": "gentiumplus",
      "version": "6.200",
      "filename": "GentiumPlus-Bold.ttf",
      "url": "https://ptxprint-mcp.klappy.workers.dev/r2/outputs/fixtures/fonts/gentium-plus-6.200/GentiumPlus-Bold.ttf",
      "sha256": "622ea9f2709d74f99d45c08d93cdf2a6d096406d3a1ec2939d02714f558b3dac"
    },
    {
      "family_id": "gentiumplus",
      "version": "6.200",
      "filename": "GentiumPlus-Italic.ttf",
      "url": "https://ptxprint-mcp.klappy.workers.dev/r2/outputs/fixtures/fonts/gentium-plus-6.200/GentiumPlus-Italic.ttf",
      "sha256": "fedc1acdd2f1080941ed998cabee9759456f0e486fbd8169ff4238b37d3ac60d"
    },
    {
      "family_id": "gentiumplus",
      "version": "6.200",
      "filename": "GentiumPlus-BoldItalic.ttf",
      "url": "https://ptxprint-mcp.klappy.workers.dev/r2/outputs/fixtures/fonts/gentium-plus-6.200/GentiumPlus-BoldItalic.ttf",
      "sha256": "960e0a58ce1d7849c7a3e49f4fbc1ac4a27b58ef19a2d013ce637fe364b0a1f0"
    }
  ],
  "figures": []
}
```

