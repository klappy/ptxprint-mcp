---
title: "USFM Markers in Headless Context"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "usfm", "markers", "book-codes", "z-extensions"]
derives_from: "canon/governance/headless-operations.md (Part 7 USFM in Headless Context)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

# USFM Markers in Headless Context

> **What this answers.** What are the USFM book codes? Which markers will the agent encounter in source content and supporting files? What are the PTXprint-specific `\z*` extensions?
>
> **Related articles.** `klappy://canon/articles/changes-txt-format` · `klappy://canon/articles/payload-construction`

---

## USFM book codes

Three-letter codes for canonical books plus peripherals.

### Canonical (subset shown; standard 66)

| Code | Book | Code | Book |
|---|---|---|---|
| GEN | Genesis | MAT | Matthew |
| EXO | Exodus | MRK | Mark |
| LEV | Leviticus | LUK | Luke |
| NUM | Numbers | JHN | John |
| DEU | Deuteronomy | ACT | Acts |
| JOS | Joshua | ROM | Romans |
| JDG | Judges | 1CO | 1 Corinthians |
| RUT | Ruth | 2CO | 2 Corinthians |
| 1SA | 1 Samuel | GAL | Galatians |
| 2SA | 2 Samuel | EPH | Ephesians |
| ... | ... | PHP | Philippians |
| PSA | Psalms | COL | Colossians |
| PRO | Proverbs | 1TH | 1 Thessalonians |
| ECC | Ecclesiastes | 2TH | 2 Thessalonians |
| SNG | Song of Solomon | 1TI | 1 Timothy |
| ISA | Isaiah | 2TI | 2 Timothy |
| JER | Jeremiah | TIT | Titus |
| ... | ... | PHM | Philemon |
| MAL | Malachi | HEB | Hebrews |
|   |   | JAS | James |
|   |   | 1PE | 1 Peter |
|   |   | 2PE | 2 Peter |
|   |   | 1JN | 1 John |
|   |   | 2JN | 2 John |
|   |   | 3JN | 3 John |
|   |   | JUD | Jude |
|   |   | REV | Revelation |

For the full canonical list, including OT books not shown above, refer to USFM 3.0 documentation.

### Peripherals (used by PTXprint)

| Code | Book |
|---|---|
| FRT | Front matter |
| BAK | Back matter |
| GLO | Glossary |
| TDX | Topical index |
| NDX | Names index |
| CNC | Concordance |
| XXG | Generic appendix |
| XXS | Strong's index (auto-generated) |

## Building the `books` field of the payload

The payload's `books` field is an array of USFM codes:

```json
"books": ["JHN"]                                                // single
"books": ["MAT", "MRK", "LUK", "JHN"]                          // gospels
"books": ["MAT", "MRK", "LUK", "JHN", "ACT", "ROM", ..., "REV"]  // full NT
```

The worker translates this to PTXprint's `-b "MAT MRK LUK JHN"` argument. PTXprint also accepts ranges (`MAT-JHN`) but explicit codes are clearer.

## Standard USFM markers the agent will encounter

These are the core USFM 3.0 markers most relevant to typesetting. Used in source files, in `changes.txt` patterns, and in `FRTlocal.sfm` content.

| Marker | Purpose |
|---|---|
| `\id <CODE>` | Book identifier (first line of every book) |
| `\h <name>` | Running header text for the book |
| `\toc1` / `\toc2` / `\toc3` | ToC fields (long, short, abbreviated) |
| `\mt1` / `\mt2` / `\mt3` | Main title hierarchy |
| `\c <num>` | Chapter |
| `\v <num>` | Verse |
| `\p` | Paragraph |
| `\nb` | No-break paragraph (continuation) |
| `\m` | Margin paragraph (no first-line indent) |
| `\q1` / `\q2` / `\q3` | Poetry levels |
| `\s` / `\s1` / `\s2` | Section headings |
| `\r` | Parallel passage reference |
| `\f ... \f*` | Footnote |
| `\x ... \x*` | Cross-reference |
| `\fig ...\fig*` | Figure/picture (legacy; PTXprint prefers piclist) |
| `\w word\|target\w*` | Glossary word reference |
| `\ip` | Introduction paragraph |
| `\io1` / `\io2` | Introduction outline |
| `\b` | Blank line |

For complete USFM specification, refer to ubsicap.github.io/usfm.

## PTXprint extensions: the `\z*` markers

These are NOT standard USFM. They are PTXprint-specific extensions, recognized only by PTXprint's typesetting pipeline.

| Marker | Purpose | Example |
|---|---|---|
| `\zrule` | Decorative rule | `\zrule\|cat="ornaments3" width=".5" align="c" thick="8pt"\*` |
| `\zqrcode` | QR code | `\zqrcode\|pgpos="cr" size="1.2cm" data="https://..."\*` |
| `\zccimg` | Creative Commons logo | `\zccimg by-nd\|size="col" pgpos="p" scale="0.20"\*` |
| `\zvar` | Variable substitution from `[vars]` cfg section | `\zvar\|booktitle\*` |
| `\zbl` | Blank lines | `\zbl\|3\*` |
| `\zgap` | Vertical gap | `\zgap\|1.3cm\*` |
| `\ztoc` | Generate Table of Contents | `\ztoc\|main\*` |
| `\zglot` | Diglot side selector | `\zglot\|R\*` |
| `\zthumbtab` | Thumb tab definition | `\zthumbtab bookname` |
| `\zifvarset` | Conditional content (gate on `[vars]` value) | `\zifvarset\|var="varname"\*` |
| `\zlabel` / `\zpage` / `\zref` | Cross-references in front matter | `\zref\|id="uniquelabel" show="b_c:v"\*` |
| `\zcopyright` / `\zlicense` | Copyright/license blocks (no `\|` arg, no closing `\*`) | `\zcopyright` |
| `\zimagecopyrights[LANG]` | Image copyright block in language | `\zimagecopyrights[en]` |
| `\nopagenums` / `\dopagenums` / `\resetpagenums` | Page numbering control | `\resetpagenums -1` |

### `\ztoc` parameters

| Parameter | Effect |
|---|---|
| `\|main\*` | Default ToC of the publication's main books |
| `\|nt\*` | NT books only |
| `\|ot\*` | OT books only |
| `\|sortc\*` | Sort by `\toc1` short title alphabetically |
| `\|sorta\*` | Sort alphabetically by `\toc1` long title |

Used inside `FRTlocal.sfm`:

```
\ip \ztoc|main\*
```

### `\zvar` and the `[vars]` cfg section

The cfg's `[vars]` section defines variables the agent can reference from USFM:

```ini
[vars]
booktitle = New Testament
imprint_year = 2026
```

In `FRTlocal.sfm`:

```
\mt1 \zvar|booktitle\*
\ip Published \zvar|imprint_year\*
```

PTXprint substitutes the values at typeset time.

### `\zglot` for diglot column selection

In a diglot config, the same source USFM can mark which content goes in which column:

```
\zglot|L\* This text goes in the left column.
\zglot|R\* This text goes in the right column.
```

For most diglots, the L/R selection is implicit (each column has its own source project), but `\zglot` is available for inline overrides.

## TeX hooks (in `*-mods.tex`)

For low-level layout control:

| Hook | Pattern | Purpose |
|---|---|---|
| `\sethook{pos}{mrkr}{code}` | `pos` = `start`/`end` | Run code at marker boundaries |
| `\setcvhook{ref}{code}` | `ref` = `BOOK c.v` | Run code at a chapter:verse |
| `\setbookhook{pos}{book}{code}` | `pos` = `start`/`end`/`final` | Run code at book boundaries |
| `\setbetweenhook{m1}{m2}{code}` | | Run code between consecutive markers |

The deck lists dozens of snippet patterns using these hooks. **The v1.2 spec defers `*-mods.tex` editing** as too risky for automated use without deeper validation. Respect that boundary unless the user explicitly asks and accepts the risk.

## Cover periphs

Inside `FRTlocal.sfm` content (or as separate periph definitions):

```
\periph Front Cover|id="coverfront"
... content ...

\periph Back Cover|id="coverback"
... content ...

\periph Spine|id="coverspine"
... content ...

\periph Whole Cover|id="coverwhole"
... content ...
```

Each carries its own content. The Cover Wizard generates these in the GUI; in headless, the agent constructs them as USFM directly in the payload's `FRTlocal.sfm` content.

## Common patterns the agent will write or modify

### Add a ToC to FRTlocal.sfm

```
\id FRT
\mt1 New Testament
\ip \ztoc|main\*
```

### Add a copyright block

```
\zcopyright
\zlicense
```

### Insert a vertical gap before a verse

In `changes.txt`:

```
at MAT 5:1 "\\v 1" > "\\zgap|2cm\\*\\v 1"
```

### Variable substitution in headers

In cfg's `[vars]` section: `imprintyear = 2026`. In header text setting: `New Testament \zvar|imprintyear\*`.

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`. See also: `klappy://canon/articles/changes-txt-format` (USFM markers in regex patterns) and `klappy://canon/articles/frt-local-and-cover-periphs` (front matter content).*
