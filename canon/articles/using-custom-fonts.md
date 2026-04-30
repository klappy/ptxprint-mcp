---
title: "Using Custom Fonts — Step-by-Step Recipe for Agents"
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
  - fonts
  - custom-fonts
  - font-swap
  - font-family
  - font-recipe
  - level-2
  - level-3
  - config_files
  - fontregular
  - fontbold
  - fontitalic
  - fontbolditalic
  - cfg-document-section
  - sha256
  - google-fonts
  - lff
  - sil-ofl
  - ofl
  - comic-neue
  - im-fell-dw-pica
  - howto
  - recipe
  - quickstart
companion_to:
  - canon/articles/font-resolution.md
  - canon/articles/progressive-customization.md
  - canon/articles/bundled-default-cfg.md
  - canon/articles/payload-construction.md
  - canon/articles/agent-faq-customization.md
canonical_status: non_canonical
date: 2026-04-30
status: draft_for_operator_review
---

# Using Custom Fonts — Step-by-Step Recipe for Agents

> 🟢 **Live-validated 2026-04-30.** This recipe was end-to-end tested against the deployed `https://ptxprint-mcp.klappy.workers.dev` worker on BSB James (`60JASBSB.usfm`) with two distinct font families: **Comic Neue** (6-variant OFL family from Google Fonts) and **IM FELL DW Pica** (2-variant OFL family from Google Fonts). Both produced clean A5 PDF/X-4 output (5 pages each, 0 errors, 0 overfull boxes, jobs completed in 4.5 s and 6.3 s respectively). Embedded font subsets were verified via `pdffonts`. **The pattern in this article is what actually works on the live server.** If you find guidance elsewhere in canon that contradicts the recipe below for current-phase behavior, this article wins.
>
> **What this answers.** A user wants the rendered Bible in a custom font — Gentium, Andika, a different language-specific font, or just an aesthetic choice. The agent has font URLs and sha256 hashes in hand. What payload does the agent send?
>
> **What this is not.** This is not the contract reference for how fonts reach the worker (that's `klappy://canon/articles/font-resolution`). This is the practical recipe — copy-paste commands, the Level-1 trap to avoid, and two worked examples drawn from real runs.

---

## TL;DR

To swap fonts on the bundled default cfg you need two payload fields:

1. **`fonts: [...]`** — one entry per `.ttf`, each with `family_id`, `version`, `filename`, `url`, `sha256`. (Level 3 on the ladder.)
2. **`config_files: { "shared/ptxprint/Default/ptxprint.cfg": "<full cfg text>" }`** — start from the bundled default cfg verbatim, then override the four font keys in `[document]`. (Level 2 on the ladder.)

You **cannot** swap fonts via `define` alone. The `define` map turns into `-D key=value` CLI flags, and font values like `Comic Neue||false|false|` contain spaces and pipe characters that the flag parser silently mangles, producing a 0-exit-code with no PDF. **Level 2 cfg replacement is the right tool here.**

---

## The four cfg keys you must set

Inside `[document]` of `ptxprint.cfg`:

```ini
[document]
fontregular    = <Family Name>||false|false|
fontbold       = <Family Name>|Bold|false|false|
fontitalic     = <Family Name>|Italic|false|false|
fontbolditalic = <Family Name>|Bold Italic|false|false|
```

The pipe-delimited value is `family|subfamily|<feature flags>`. The first segment is the **display family name as it appears in the TTF's `name` table (NameID 1)**, not your `family_id` slug. Subfamily values are typically `Regular` (empty), `Bold`, `Italic`, `Bold Italic`. Get them from the TTF directly — see step 4 of the recipe below.

If a font ships fewer variants than the four keys want, see the "Handling missing variants" section below.

---

## The recipe (7 steps)

### 1. Pick a font you can legally distribute

The worker fetches font binaries by URL on every cache-miss job. Whatever URL you provide must serve a font you have the right to redistribute (or that's already publicly licensed for redistribution). **Fonts that are NOT safe:** Comic Sans MS (Microsoft proprietary), Papyrus (Linotype/Monotype proprietary), Times New Roman (Monotype proprietary), and most foundry fonts. **Fonts that ARE safe:** SIL OFL fonts (Charis SIL, Andika, Gentium Plus, Doulos SIL), Google Fonts under OFL or Apache 2.0, and any font whose license explicitly permits redistribution. Apple System Font, Helvetica from macOS, Arial — all proprietary.

If a user asks for a proprietary font, either (a) the user has licensed it and is hosting the binary on a URL the worker can reach, or (b) the agent suggests an OFL lookalike. Comic Neue → Comic Sans, Liberation Serif → Times, etc.

### 2. Find a stable URL

Best sources, in rough order of preference:

- **SIL Language Font Finder** (`lff.api.languagetechnology.org`) — versioned, content-addressed, the canonical source for SIL fonts. Already documented in `klappy://canon/articles/font-resolution`.
- **`raw.githubusercontent.com/google/fonts/main/ofl/<family>/<file>.ttf`** — Google Fonts has a strict no-rewrite policy on the `main` branch; URLs are effectively immutable.
- **Upstream foundry repo `raw.githubusercontent.com/<owner>/<repo>/<branch>/<path>.ttf`** — fine if the repo is dormant or release-tagged.
- **User-controlled HTTPS** — any URL the worker can reach without auth. The worker has no credential store, so URLs that 401 will fail.

Avoid presigned URLs that expire (the worker may not fetch immediately on a cache miss), CDNs that serve different bytes from different edges, or URLs that require auth.

### 3. Download and hash each TTF

```bash
curl -sSL -o ComicNeue-Regular.ttf \
  https://raw.githubusercontent.com/google/fonts/main/ofl/comicneue/ComicNeue-Regular.ttf
sha256sum ComicNeue-Regular.ttf
```

The sha256 goes in the payload as the `sha256` field on each `fonts[]` entry. The worker re-fetches and verifies on every cache-miss job; sha256 mismatch is a hard failure with a clear error (`sha256 mismatch on fonts[N]: <filename>`).

### 4. Extract the family/subfamily names from each TTF

The values you put in `fontregular`, `fontbold`, etc. must match what's in the TTF's `name` table. Get them with `fonttools`:

```python
from fontTools.ttLib import TTFont
tt = TTFont("ComicNeue-Regular.ttf", lazy=True)
nt = tt['name']
print("family:   ", nt.getDebugName(1))   # NameID 1: family name
print("subfamily:", nt.getDebugName(2))   # NameID 2: subfamily / style
print("fullname: ", nt.getDebugName(4))   # NameID 4: full font name
tt.close()
```

For a typical 4-style family you'll get something like:

```
ComicNeue-Regular.ttf     family: Comic Neue   subfamily: Regular
ComicNeue-Bold.ttf        family: Comic Neue   subfamily: Bold
ComicNeue-Italic.ttf      family: Comic Neue   subfamily: Italic
ComicNeue-BoldItalic.ttf  family: Comic Neue   subfamily: Bold Italic
```

Use the family value verbatim in the cfg keys. Don't lowercase, don't slugify. PTXprint matches via fontconfig at typeset time and is case-sensitive.

### 5. Build the cfg by starting from the bundle

The container ships with a publication-quality default cfg. Don't write a cfg from scratch; **start from the bundle and modify only the four font keys**. The bundle is documented at `klappy://canon/articles/bundled-default-cfg` — its full INI block lives at the bottom of that article and is the source of truth.

A simple sed-style modification works:

```python
import re
text = open("canon/articles/bundled-default-cfg.md").read()
ini_start = text.find("```ini") + 7
ini_end   = text.find("```", ini_start)
cfg = text[ini_start:ini_end]

def sub(rx, replacement, s):
    return re.sub(rx, replacement, s, flags=re.MULTILINE)

cfg = sub(r"^fontregular\s*=.*$",    "fontregular = Comic Neue||false|false|", cfg)
cfg = sub(r"^fontbold\s*=.*$",       "fontbold = Comic Neue|Bold|false|false|", cfg)
cfg = sub(r"^fontitalic\s*=.*$",     "fontitalic = Comic Neue|Italic|false|false|", cfg)
cfg = sub(r"^fontbolditalic\s*=.*$", "fontbolditalic = Comic Neue|Bold Italic|false|false|", cfg)
```

If the user is rendering a book other than John (the bundle's default), also override `[project] book = <CODE>` to keep PDF metadata coherent. Cosmetic but cleaner.

### 6. Assemble the payload

```json
{
  "schema_version": "1.0",
  "project_id": "BSB",
  "config_name": "Default",
  "books": ["JAS"],
  "config_files": {
    "shared/ptxprint/Default/ptxprint.cfg": "<full cfg from step 5, including your font overrides>"
  },
  "sources": [
    {
      "book": "JAS",
      "filename": "60JASBSB.usfm",
      "url": "https://...",
      "sha256": "<sha256 of usfm>"
    }
  ],
  "fonts": [
    {
      "family_id": "comicneue",
      "version": "2.5",
      "filename": "ComicNeue-Regular.ttf",
      "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/comicneue/ComicNeue-Regular.ttf",
      "sha256": "<from step 3>"
    },
    "...one entry per TTF, all variants the cfg references..."
  ]
}
```

### 7. Submit, poll, fetch the PDF

Same as any other job — `submit_typeset` returns a `job_id` and a `predicted_pdf_url`; `get_job_status` polls until `state ∈ {succeeded, failed, cancelled}`. On success the worker writes the PDF to R2 at the predicted URL. The full flow is documented in `klappy://canon/articles/payload-construction`.

---

## The Level-1 `define` trap

It is tempting to think a font swap is a trivial Level-1 override:

```json
{
  "define": {
    "fontregular": "Comic Neue||false|false|"
  }
}
```

This **does not work** for font values. It produces a hard failure that looks like success at exit-code level:

```
[container diagnostic] PTXprint exited 0 with no PDF and no log file.
[container diagnostic] argv: ptxprint -P BSB -b JAS ... -D fontregular=Comic Neue||false|false| ...
[container diagnostic] stderr_tail: (empty)
errors: ["PTXprint produced no output (silent exit). Likely cause: missing config_files or invalid project layout."]
```

(That diagnostic is from a real failed run on 2026-04-30 — job `833fd280…`.)

The cause: `define` keys are passed to the PTXprint CLI as `-D key=value` flags. Values containing **spaces** (`Comic Neue`) or **pipe characters** (`||false|false|`) — both of which are required for any font value — get tokenized incorrectly by the flag parser. PTXprint then sees malformed input, silently abandons the typeset, and exits 0 with no log file. The worker correctly reports this as a hard failure, but the agent's diagnostic point-of-view ("I just told it to use Comic Neue, what's wrong?") doesn't include the shell-tokenization step that broke the value.

**The bypass is Level 2.** The cfg goes through the payload as JSON, not the CLI, so spaces and pipes inside the cfg value are preserved verbatim. The worker writes the cfg to disk; PTXprint reads the cfg from disk; pipes and spaces survive intact.

(There is also a deeper issue: the `define` keys are nominally PTXprint **widget identifiers** — the GUI control names, like `s_linespacing`, not the cfg keys themselves. The widget-ID-to-cfg-key mapping is partially documented but incomplete. For values that are simple scalars and whose cfg key happens to coincide with a widget ID, `define` works. For font values, even if the widget mapping were perfect, the shell-tokenization issue would still bite. Use Level 2.)

---

## Worked example 1 — Comic Neue (Comic Sans surrogate)

Validated 2026-04-30. Job `7b434f262aa76256…` succeeded in 4.5 s producing a 5-page A5 PDF/X-4 with three Comic Neue subsets embedded (Regular, Bold, Italic).

```json
{
  "schema_version": "1.0",
  "project_id": "BSB",
  "config_name": "Default",
  "books": ["JAS"],
  "config_files": {
    "shared/ptxprint/Default/ptxprint.cfg": "<bundled default with these four lines replaced>"
  },
  "sources": [
    {
      "book": "JAS",
      "filename": "60JASBSB.usfm",
      "url": "https://raw.githubusercontent.com/usfm-bible/examples.bsb/main/60JASBSB.usfm",
      "sha256": "59cc6f5e7b2404926932c415f71eb6a376bcbb4423ca1b2cda0e00192df47a12"
    }
  ],
  "fonts": [
    { "family_id": "comicneue", "version": "2.5", "filename": "ComicNeue-Regular.ttf",
      "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/comicneue/ComicNeue-Regular.ttf",
      "sha256": "a0ee5a37c8b27c4db0700137d928598b1e23b0089e1546a8961909176b779360" },
    { "family_id": "comicneue", "version": "2.5", "filename": "ComicNeue-Bold.ttf",
      "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/comicneue/ComicNeue-Bold.ttf",
      "sha256": "3e7e5fccfd7e0788f317b43312151c1bd5cf058c9697a8d83eac3939050bd61e" },
    { "family_id": "comicneue", "version": "2.5", "filename": "ComicNeue-Italic.ttf",
      "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/comicneue/ComicNeue-Italic.ttf",
      "sha256": "e06bfd1552f5c9464c5665733ffd69239b0593885dbb9e059688a5900f78cf98" },
    { "family_id": "comicneue", "version": "2.5", "filename": "ComicNeue-BoldItalic.ttf",
      "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/comicneue/ComicNeue-BoldItalic.ttf",
      "sha256": "5c312c2a2fa64eee82f3b87fcfab8f3b12a5e59b043124401d322eb323cfbf16" }
  ]
}
```

The four cfg key overrides for this run:

```ini
fontregular    = Comic Neue||false|false|
fontbold       = Comic Neue|Bold|false|false|
fontitalic     = Comic Neue|Italic|false|false|
fontbolditalic = Comic Neue|Bold Italic|false|false|
```

Output: BSB James, two-column A5, body in Comic Neue Regular, parallel-passage refs in Comic Neue Italic, drop cap on chapter 1, footnote callers `a, b, c, …`. Identical layout to the bundled-default render — only the typeface changed.

---

## Worked example 2 — IM FELL DW Pica (textured/historical surrogate)

Validated 2026-04-30. Job `5ead41b366d6d17a…` succeeded in 6.3 s. Same 5-page A5 PDF/X-4, two embedded subsets (Roman + Italic).

This family illustrates **handling missing variants**. IM FELL DW Pica only ships Roman (Regular) and Italic — there is no native Bold and no Bold Italic in the family. PTXprint's cfg requires all four keys to be set; leaving them blank or omitting them produces unpredictable behavior. The pragmatic answer is to map missing weights to the closest available variant:

```ini
fontregular    = IM FELL DW Pica||false|false|
fontbold       = IM FELL DW Pica||false|false|
fontitalic     = IM FELL DW Pica|Italic|false|false|
fontbolditalic = IM FELL DW Pica|Italic|false|false|
```

Bold falls back to Roman; Bold Italic falls back to Italic. Visually this means bold passages don't appear bold, but the run completes cleanly and the PDF is valid. The alternative — letting PTXprint try to synthesize a faux-bold from Roman — is worse (smudgy artifacts) and not all XeTeX font setups support it.

If the user genuinely needs a bold weight, either (a) pick a different family that has one, or (b) source a Bold variant from a sibling family (e.g. the `imfellgreatprimer` family also has only Regular + Italic, but `imfelldoublepica` ships a slightly different aesthetic). There is no synthetic-bold escape hatch worth chasing.

The fonts payload:

```json
"fonts": [
  { "family_id": "imfelldwpica", "version": "2.000", "filename": "IMFePIrm28P.ttf",
    "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/imfelldwpica/IMFePIrm28P.ttf",
    "sha256": "f65e54016dfab4222ba552cfb82260b14a7df6527cce66430f5f66022addb052" },
  { "family_id": "imfelldwpica", "version": "2.000", "filename": "IMFePIit28P.ttf",
    "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/imfelldwpica/IMFePIit28P.ttf",
    "sha256": "e09a00654b5dd266aee743c0c43d129c8404a2d5e0ebf27e5a0e472bd1900b8d" }
]
```

---

## Handling missing variants — quick guide

| Situation | What to set in cfg |
|---|---|
| Family has all four (Regular/Bold/Italic/Bold Italic) | Use each in its own slot — the canonical case. |
| Family has only Regular + Italic | `fontbold` and `fontbolditalic` map to Regular and Italic respectively. |
| Family has only Regular | All four keys point at the same variant. The render won't show weight or slant variation, but it will complete. |
| Family has Light, Regular, Medium, Bold | Pick which weight is body. Common pattern: `fontregular = Family|Light` for a delicate look, or `fontregular = Family\|\|false\|false\|` for default Regular. |
| Family has italics-only or bolds-only siblings (display fonts) | These are rarely appropriate as Bible body fonts. Use them only for headings via custom stylesheet. |

---

## Cosmetic warnings to expect

These show up in the log but don't fail the job:

- **`Missing character: There is no Ê¼ (U+02BC) in font ...`** — many BSB and other modern Bible texts use U+02BC (Modifier Letter Apostrophe) for typographic apostrophes. Many display fonts (including Comic Neue and IM FELL DW Pica) don't include this glyph; the character drops silently from the rendered text. SIL Charis, Gentium Plus, and Andika cover U+02BC. If U+02BC matters for the user's edition, pick a font with the relevant Unicode coverage.
- **`Underfill[A]: [N] ht=...pt, space=...pt`** — page didn't fill its column. The bundled default cfg is conservative on line-spacing and font factor; pages with light content (start of a book, end of a chapter) underfill. Cosmetic in v1; the canonical fix is `mode: "autofill"` (deferred — see `klappy://canon/articles/agent-faq-customization`).
- **`IF CHECK mnote Failed. Entered at 2 != exit at 1`** — XeTeX margin-note rebalancing diagnostic. Cosmetic noise on first-pass typesetting; doesn't affect output.

If your `errors` array is empty and `failure_mode` is `success`, ignore log warnings of these classes.

---

## Pitfalls

1. **Don't put font cfg keys in `define`.** Per the trap section above. Use `config_files` for any value containing spaces, pipes, or special chars. `define` is for simple scalar values only (booleans, integers, single-token strings).
2. **Don't slugify the family name in the cfg.** `comicneue||false|false|` will silently fail to match; use `Comic Neue||false|false|` exactly as it appears in the TTF.
3. **Don't omit variants from the `fonts` array.** Every variant referenced in the cfg must be in the array. If `fontbold = Comic Neue|Bold|...`, then `ComicNeue-Bold.ttf` must be in `fonts`. PTXprint won't synthesize a missing weight; the run will fail with a clearer error than the Level-1 trap (the log will say font not found).
4. **Don't ship proprietary fonts via your URLs.** Comic Sans MS, Papyrus, Times New Roman, Arial, Helvetica — these are proprietary and you do not have the right to host them on a public URL. Either license + self-host (private), or use OFL lookalikes (Comic Neue, IM FELL DW Pica, Liberation Serif, Liberation Sans, Nimbus Sans).
5. **Don't trust upstream URL stability without checking.** Re-derive sha256 if your job fails on `sha256 mismatch`. Google Fonts `main` is stable in practice; smaller upstream repos may rewrite history. Pin to release tags (`?ref=v2.5`) when available.
6. **Don't include both `define: {fontregular: ...}` AND `config_files: { ptxprint.cfg: ...with fontregular set... }`.** The `config_files` value wins for the cfg key, but the `define` flag still gets passed to the CLI and may produce the silent-exit failure mode. Pick one path; for fonts, that's `config_files`.

---

## Sourcing patterns — a quick directory

| Source | URL pattern | Stability | Tested |
|---|---|---|---|
| SIL Language Font Finder | `https://lff.api.languagetechnology.org/...` | Versioned, stable | Charis SIL (production) |
| Google Fonts (OFL families) | `https://raw.githubusercontent.com/google/fonts/main/ofl/<family>/<file>.ttf` | `main` is no-rewrite policy | Comic Neue, IM FELL DW Pica (this article) |
| Google Fonts (Apache families) | `https://raw.githubusercontent.com/google/fonts/main/apache/<family>/<file>.ttf` | Same policy | not yet tested |
| Upstream foundry repos | `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/...` | Varies — pin tags when possible | Comic Neue Angular (from `crozynski/comicneue`) |
| User-controlled HTTPS | any | depends on host | Various — see `klappy://canon/articles/font-resolution` |
| R2-staged fixtures | `https://ptxprint-mcp.klappy.workers.dev/r2/outputs/fixtures/fonts/...` | Worker-controlled, very stable | Gentium Plus 6.200 (session 11) |

---

## See also

- `klappy://canon/articles/font-resolution` — the contract: how fonts reach the worker, sha256 verification semantics, what happens when a font is missing.
- `klappy://canon/articles/progressive-customization` — the full Level 0–5 ladder. Fonts are Level 3; cfg replacement is Level 2.
- `klappy://canon/articles/bundled-default-cfg` — the source of truth for the cfg you're starting from.
- `klappy://canon/articles/payload-construction` — payload schema reference.
- `klappy://canon/articles/agent-faq-customization` — FAQ on what's live vs deferred.
- `klappy://canon/articles/settings-cookbook` — for non-font cfg overrides (line spacing, page size, hide xrefs, etc.) — many of these *do* work via `define` because their values are simple scalars.

---

*Created 2026-04-30 from two empirically-validated end-to-end runs against the live deploy. Status `draft_for_operator_review` because same-session review is not valid canon per `klappy://canon/principles/verification-requires-fresh-context` — a fresh-session cross-check is owed before promoting to `status: working`.*
