---
title: "Piclist Format — Picture Placement Files"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "piclist", "pictures", "figures", "supporting-files"]
derives_from: "canon/governance/headless-operations.md (Part 6 piclist subsection)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

# Piclist Format

> **What this answers.** What's a piclist? How does it work with the payload's `figures` array? What are the line fields?
>
> **Related articles.** `klappy://canon/articles/payload-construction` · `klappy://canon/articles/file-system-map`

---

## What a piclist is

A piclist is a per-config plain-text file that places pictures into the typeset output. Each line anchors one picture to a USFM reference (book + chapter + verse) and specifies how PTXprint should size, position, and caption it.

The piclist is text content in the payload's `config_files` map. The actual binary image files referenced by the piclist live in the payload's `figures` array (URL + sha256). The two are coordinated: each piclist line's `src` matches a `filename` in `figures`.

## File location and name

```
shared/ptxprint/<config>/<PRJ>-<Config>.piclist
```

Examples:
- `shared/ptxprint/Default/WSG-Default.piclist`
- `shared/ptxprint/FancyNT/WSG-FancyNT.piclist`

One piclist per config. Note `<PRJ>` is uppercase, `<Config>` is case-as-named, separated by a hyphen.

## Line syntax

```
BOOK c.v caption text|src="filename" size="col|span" pgpos="<position>" ref="c:v" [scale="<n>"] [copy="<text>"]
```

Anatomy:
- Everything before `|` is the **anchor and caption text** (visible in the rendered output's caption).
- Everything after `|` is **key=value attributes** (controlling rendering).

Worked example:

```
JHN 3.16 God so loved the world|src="AB01234.tif" size="col" pgpos="br" ref="3:16"
```

Reads as: at John 3:16, place the image `AB01234.tif`, size `col` (column-width), position `br` (bottom-right), with caption "God so loved the world" referenced as "3:16".

## Fields

| Field | Required | Common values | Meaning |
|---|---|---|---|
| `BOOK c.v` | yes | `JHN 3.16` | Book code + chapter.verse anchor (text before the `\|`) |
| caption | yes | "God so loved the world" | Caption text shown under the picture (may be vernacular Unicode) |
| `src` | yes | `"AB01234.tif"` | Image filename (must match a `figures[].filename` in the payload) |
| `size` | yes | `"col"` or `"span"` | Column-width or page-width |
| `pgpos` | yes | `"tl"`, `"tr"`, `"bl"`, `"br"`, `"t"`, `"b"`, `"h"`, `"p"` | Page position (see below) |
| `ref` | yes | `"3:16"` | Caption reference in `c:v` format |
| `scale` | no | `"0.8"`, `"1.2"` | Scale factor relative to default size |
| `copy` | no | `"Image © Copyright Holder Name"` | Copyright attribution string |

### `pgpos` values

| Code | Position |
|---|---|
| `tl` | top-left |
| `tr` | top-right |
| `bl` | bottom-left |
| `br` | bottom-right |
| `t` | top, full-width (only with `size="span"`) |
| `b` | bottom, full-width (only with `size="span"`) |
| `h` | here (inline, in flow) |
| `p` | full-page |

Some PTXprint versions accept additional 1-2 letter codes; verify against the running tooltip dump for the project's PTXprint version.

### `size` values

| Value | Width |
|---|---|
| `col` | one column of the layout (most common) |
| `span` | spans all columns (full text width) |

For single-column layouts, `col` and `span` produce the same width.

## Worked examples

### Single picture in John 3

```
JHN 3.16 God so loved the world|src="AB01234.tif" size="col" pgpos="br" ref="3:16"
```

### Full-page picture at the start of Matthew

```
MAT 1.1 The Genealogy of Jesus|src="genealogy.png" size="span" pgpos="p" ref="1:1"
```

### Multiple pictures in Genesis

```
GEN 1.1 The creation of the heavens and earth|src="creation.tif" size="span" pgpos="t" ref="1:1"
GEN 3.6 Adam and Eve eat the forbidden fruit|src="fall.tif" size="col" pgpos="br" ref="3:6"
GEN 6.13 Noah builds the ark|src="ark.tif" size="col" pgpos="tr" ref="6:13"
```

### With scale and copyright

```
LUK 2.7 The birth of Jesus|src="nativity.tif" size="col" pgpos="bl" ref="2:7" scale="0.85" copy="© Sweet Publishing / FreeBibleimages.org"
```

## Coordination with the `figures` array

Every `src` value in the piclist must correspond to a `filename` in the payload's `figures` array:

```json
"figures": [
  {
    "filename": "AB01234.tif",
    "url": "https://r2.../uploads/abc/AB01234.tif",
    "sha256": "<sha256>"
  },
  {
    "filename": "creation.tif",
    "url": "https://r2.../uploads/abc/creation.tif",
    "sha256": "<sha256>"
  }
]
```

The worker fetches each URL, verifies the sha256, and places the file where PTXprint can find it via the piclist's `src` reference.

A piclist line referencing a `src` that has no matching `figures` entry produces a soft failure ("image not found") — the PDF renders without that picture.

## Reading an existing piclist

Most piclists are generated by the GUI's picture-list editor. The agent reads from project state, modifies as needed, and includes the new content in the next payload. Don't reorder lines arbitrarily — line order matters for some tools that diff against earlier versions.

For an unfamiliar piclist, parse line by line:
- Split on the first `|` to separate anchor+caption from attributes
- Parse attributes as `key="value"` pairs (quoted strings, separated by whitespace)
- Validate `src` against the `figures` array

## Hiding pictures globally

To suppress all pictures for a run without modifying the piclist, use `define`:

```json
"define": { "c_fighiderefs": "True" }
```

This is a runtime-only override. The piclist content stays in `config_files` and re-enables on the next run that doesn't set the override.

## Picture clearance metadata

Two related files (`picInfo.txt` and `picChecks.txt`) carry copyright and approval metadata for pictures. They live in:

```
shared/ptxprint/picInfo.txt              project-wide
shared/ptxprint/picChecks.txt            project-wide
shared/ptxprint/<config>/picInfo.txt     config-level (override)
shared/ptxprint/<config>/picChecks.txt   config-level (override)
```

The agent typically doesn't modify these — the GUI's picture management UI tracks clearances. Include them in the payload's `config_files` if they exist in project state and the user has explicitly authorized; omit otherwise.

## When picture rendering fails

The seven-point checklist for "PDF was produced but pictures are missing" — see `klappy://canon/articles/diagnostic-patterns` for the full diagnostic flow. Common causes:

1. Piclist entry references a `src` not in `figures`.
2. `figures[].sha256` doesn't match the bytes at the URL.
3. URL is unreachable from the worker.
4. `pgpos` invalid for the given `size`.
5. Anchor reference (BOOK c.v) doesn't match a verse in the source USFM.
6. Picture too large for the target position.
7. Too many pictures on one page (PTXprint pushes some off).

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`. See also: `klappy://canon/articles/adjlist-format` for the related single-file-per-config pattern.*
