---
title: "FRTlocal and Cover Periphs — Front Matter Content"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "frt", "front-matter", "cover", "periph"]
derives_from: "canon/governance/headless-operations.md (Part 6 FRTlocal.sfm subsection, cover periphs)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

# FRTlocal and Cover Periphs

> **What this answers.** What goes in `FRTlocal.sfm`? How do covers work in headless? Which special markers does the agent need?
>
> **Related articles.** `klappy://canon/articles/usfm-markers-headless` · `klappy://canon/articles/payload-construction` · `klappy://canon/articles/stylesheet-format`

---

## What `FRTlocal.sfm` is

USFM source for the publication's front matter — title page, copyright block, foreword, ToC, alphabetical contents, and (when wrap-around covers are wanted) cover periphs. Lives at:

```
shared/ptxprint/<config>/FRTlocal.sfm
```

Included in the payload's `config_files` map. PTXprint typesets the FRT book using this content when the configuration's book scope includes FRT, or when the agent passes `FRT` in the payload's `books` array.

## Three modes

PTXprint's GUI offers three starting templates the agent can mirror in headless:

### Basic

Title page, publication data block, ToC. Minimal.

```
\id FRT
\mt1 \zvar|booktitle\*
\mt2 \zvar|booksubtitle\*

\ip \zcopyright

\ip \ztoc|main\*
```

### Advanced

Title, pubdata, foreword, preface, ToC, alphabetical contents, four cover periphs.

```
\id FRT

\periph Title Page|id="title"
\mt1 \zvar|booktitle\*
\ip Published \zvar|imprint_year\*

\periph Publication Data|id="pubdata"
\zcopyright
\zlicense

\periph Foreword|id="foreword"
\ip Content...

\periph Table of Contents|id="contents"
\ip \ztoc|main\*

\periph Front Cover|id="coverfront"
... cover content ...

\periph Back Cover|id="coverback"
... cover content ...

\periph Spine|id="coverspine"
... cover content ...

\periph Whole Cover|id="coverwhole"
... cover content ...
```

### Paratext copy

A local copy of the project's source FRT book the user customizes. The agent reads from project state and includes unchanged unless edits are requested.

## Special PTXprint codes in front matter

| Marker | Form | Purpose |
|---|---|---|
| `\zcopyright` | bare (no `\|arg`, no closing `\*`) | Copyright block from cfg |
| `\zlicense` | bare | License block from cfg |
| `\zimagecopyrights[LANG]` | bare with LANG suffix | Image copyrights (`en`, `hu`, `ro`, `fr`, `es`, `id`) |
| `\zccimg <license>\|size="..."\*` | takes args | Creative Commons logo |
| `\ztoc\|main\*` | takes scope arg | Generate ToC (`main`, `nt`, `ot`, `sortc`, `sorta`) |
| `\zvar\|name\*` | takes variable name | Substitute from `[vars]` cfg section |
| `\zbl\|N\*` | takes line count | N blank lines |
| `\zgap\|N<unit>\*` | takes length | Vertical gap (`mm`, `in`, `em`, `pt`, `cm`) |
| `\nopagenums` / `\dopagenums` / `\resetpagenums -1` | bare | Page numbering control |

See `klappy://canon/articles/usfm-markers-headless` for the full extension reference.

## Cover periphs

When the user wants wrap-around covers, four periphs go in `FRTlocal.sfm`:

```
\periph Front Cover|id="coverfront"
\mt1 \zvar|booktitle\*
\ip \zccimg by-nd\|size="col" pgpos="p" scale="0.20"\*

\periph Back Cover|id="coverback"
\ip Brief description of the publication.
\ip \zqrcode\|pgpos="cr" size="1.2cm" data="https://..."\*

\periph Spine|id="coverspine"
\mt1 \zvar|booktitle\*

\periph Whole Cover|id="coverwhole"
% Fallback content used when the cover layout collapses to one piece
\ip ...
```

Style cover content via the category-and-id qualifier in `ptxprint.sty`:

```
\Marker cat:coverfront|mt1
\Color FFFFFF
\FontSize 2.4
\Bold
```

See `klappy://canon/articles/stylesheet-format` for the full pattern.

## Variables: the `[vars]` cfg section + `\zvar`

Define variables in the cfg's `[vars]` section, reference them in FRT content:

```ini
[vars]
booktitle = New Testament
booksubtitle = First Edition
imprint_year = 2026
```

```
\mt1 \zvar|booktitle\*
\mt2 \zvar|booksubtitle\*
\ip Published \zvar|imprint_year\*
```

PTXprint substitutes at typeset time. Useful for keeping the title text in one place and reusing it in headers, footers, and front matter.

## Including in the payload

```json
"config_files": {
  "shared/ptxprint/Default/ptxprint.cfg": "...",
  "shared/ptxprint/Default/FRTlocal.sfm": "\\id FRT\n\\mt1 \\zvar|booktitle\\*\n\\ip \\ztoc|main\\*\n"
}
```

Make sure `FRT` is in the payload's `books` array if the FRT content should be typeset:

```json
"books": ["FRT", "MAT", "MRK", "LUK", "JHN"]
```

If `FRT` isn't listed, the front matter content is parsed but not output.

## Testing front matter changes

Front matter changes are visible only when FRT is in `books`. For fast iteration:

1. Set `books: ["FRT", "JUD"]` (FRT plus a single short book) and `mode: "simple"`.
2. Submit, inspect.
3. Once the front matter looks right, expand `books` to the full scope.

This avoids waiting for a full NT autofill while debugging cover layout.

## When NOT to use FRTlocal

- If the project's source FRT book in Paratext is the source of truth — the team maintains it there and the agent shouldn't fork it. Use Paratext-copy mode instead.
- For per-book introductions — those go in each book's `\imt`/`\ip` markers in source USFM, not in FRT.

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`.*
