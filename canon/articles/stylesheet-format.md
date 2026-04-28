---
title: "Stylesheet Format — ptxprint.sty and ptxprint-mods.sty"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "stylesheet", "sty", "marker-styles", "supporting-files"]
derives_from: "canon/governance/headless-operations.md (Part 6 ptxprint.sty subsection)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

# Stylesheet Format

> **What this answers.** What's a `.sty` file? When does the agent edit one? How do marker-style declarations work?
>
> **Related articles.** `klappy://canon/articles/usfm-markers-headless` · `klappy://canon/articles/payload-construction`

---

## What `.sty` files are

USFM stylesheets — text files that declare how PTXprint should render each USFM marker. Three locations:

```
shared/ptxprint/ptxprint.sty                 project-wide (often blank or minimal)
shared/ptxprint/<config>/ptxprint.sty        config-level overrides
shared/ptxprint/<config>/ptxprint-mods.sty   additional modifications layered on top
```

Each is included in the payload's `config_files` map at its respective path.

## Marker-style declarations

The basic form:

```
\Marker mt1
\Color 333333
\FontSize 1.4
\Bold

\Marker p
\FirstLineIndent 0.125
\SpaceBefore 0
\SpaceAfter 0

\Marker f
\TextProperties footnote
\FontSize 0.85
```

Each `\Marker <name>` block declares properties for one USFM marker. Properties depend on the marker type (paragraph, character, footnote, etc.).

## Common properties

| Property | Type | Example | Meaning |
|---|---|---|---|
| `\Color` | hex | `\Color 333333` | RGB color (no `#` prefix) |
| `\FontSize` | factor | `\FontSize 1.4` | Multiplier of body font size |
| `\Bold` | flag | `\Bold` | Bold weight |
| `\Italic` | flag | `\Italic` | Italic style |
| `\Underline` | flag | `\Underline` | Underline |
| `\Justification` | enum | `\Justification center` | `left` / `center` / `right` / `both` |
| `\FirstLineIndent` | length | `\FirstLineIndent 0.125` | First-line indent (often inches) |
| `\SpaceBefore` | length | `\SpaceBefore 0.5` | Vertical space before |
| `\SpaceAfter` | length | `\SpaceAfter 0` | Vertical space after |
| `\LeftMargin` | length | `\LeftMargin 0.5` | Left margin |
| `\RightMargin` | length | `\RightMargin 0` | Right margin |
| `\Endmarker` | name | `\Endmarker f*` | Closing marker for character styles |

The full property set is documented in PTXprint's stylesheet reference. For the agent, the listed properties cover the most common edits.

## Category-and-id qualifier

The same marker can style differently in different contexts using a category prefix:

```
\Marker mt1
\Color 333333
\FontSize 1.4
\Bold

\Marker cat:coverfront|mt1
\Color FFFFFF
\FontSize 2.0
```

The first block applies to `\mt1` everywhere. The second overrides `\mt1` only when it appears in the `coverfront` category (e.g., inside a `\periph Front Cover|id="coverfront"` block).

This pattern lets a cover use larger, white titles without affecting body-text titles.

## When to edit a stylesheet

- The user needs styling beyond what the GUI Styles tab exposes.
- Defining ornament categories (e.g., a custom rule pattern for chapter starts).
- Style overrides for specific peripheral books or cover sections.
- Declaring custom markers added via `changes.txt` or in source USFM.

## When NOT to edit a stylesheet

- The user is in the GUI — let them use the Style Editor (preserves UI integration).
- The change is generic styling that the GUI Styles tab covers — modify `ptxprint.cfg` content instead.
- Agent is uncertain about properties — verify against an existing `.sty` file or canon's marker reference before writing.

## Layering: `.sty` and `-mods.sty`

PTXprint reads `.sty` files in order:

1. Standard library defaults (built into PTXprint)
2. `shared/ptxprint/ptxprint.sty` (project-wide)
3. `shared/ptxprint/<config>/ptxprint.sty` (config-level)
4. `shared/ptxprint/<config>/ptxprint-mods.sty` (additional mods)

Later layers override earlier ones for matching marker declarations.

The `-mods.sty` file is typically used for layered modifications the user wants to keep separate from the main config-level stylesheet — e.g., one-off experiments that the user can remove cleanly.

## Stable order: don't reorder

Older PTXprint versions reordered marker declarations on save (the GUI Style Editor would re-sort). The agent should preserve order when reading and including existing stylesheets — diffs against earlier versions get confusing if order changes.

## Adding a custom marker

When the agent (or `changes.txt`) introduces a custom USFM marker not in the standard library, declare it:

```
\Marker mycustom
\TextProperties paragraph
\FontSize 1.0
\Bold
```

Without a declaration, PTXprint logs `! Undefined control sequence \mycustom` and the run fails hard.

## Including in the payload

```json
"config_files": {
  "shared/ptxprint/Default/ptxprint.cfg": "...",
  "shared/ptxprint/Default/ptxprint.sty": "\\Marker mt1\n\\Color 333333\n\\FontSize 1.4\n\\Bold\n\n\\Marker p\n\\FirstLineIndent 0.125\n",
  "shared/ptxprint/Default/ptxprint-mods.sty": "\\Marker s1\n\\FontSize 1.1\n\\Color 666666\n"
}
```

If `ptxprint.sty` already exists in project state, read and include it; modify only what's changing. Don't replace established declarations the user hasn't asked to change.

## Worked example: cover styling

```
% Standard mt1 in body
\Marker mt1
\Color 000000
\FontSize 1.6
\Bold
\SpaceBefore 1.0
\SpaceAfter 0.3

% Override mt1 on the front cover (white text on dark background)
\Marker cat:coverfront|mt1
\Color FFFFFF
\FontSize 2.4
\Bold
\SpaceBefore 2.0

% Override mt1 on the back cover (smaller, less prominent)
\Marker cat:coverback|mt1
\Color FFFFFF
\FontSize 1.2
\Bold
```

Three styles for one marker, selected by category. The cover periphs in `FRTlocal.sfm` set the category context.

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`. See also: `klappy://canon/articles/usfm-markers-headless` for the marker reference.*
