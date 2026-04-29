---
title: "Settings Cookbook — Intent-Keyed Reference"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "settings", "cookbook", "intent", "by-task"]
derives_from: "canon/governance/headless-operations.md (Part 5 Settings Cookbook)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

# Settings Cookbook

> **What this answers.** "User said X — what setting controls that?" Quick lookup table by user intent.
>
> **Related articles.** `klappy://canon/articles/config-construction` · `klappy://canon/articles/cli-reference` · `klappy://canon/articles/workflow-recipes`

---

## How to use this article

Sections are by **user intent**, not by INI section. For each intent, the table lists the relevant cfg section, the typical key, common values, and what to watch for. Treat as starting points; verify exact key names against canon's tooltip-derived index before relying on a name.

When a key name is uncertain (the deck doesn't always name them consistently), this article says so. Don't fabricate.

## "Make the page a different size"

| Section | Key | Common values | Notes |
|---|---|---|---|
| `[paper]` | `pagesize` | `148mm, 210mm (A5)`, `210mm, 297mm (A4)`, `5.5in, 8.5in (Half Letter)` | Format is `width, height (label)`. Confirm with printer before committing. |

Watch for: page-size change usually invalidates margin and column tuning; user may need to re-tune. Booklet output formats constrain physical paper separately.

## "Wider/narrower margins"

| Section | Key | Common values | Notes |
|---|---|---|---|
| `[paper]` | `margins` | `12` (mm), `0.5` (in) | Often a single value applied to all four sides; some configs split top/bottom/inner/outer |

Watch for: binding gutter is usually separate; tight margins collide with header/footer space.

## "Bigger / smaller body text"

| Section | Key | Common values | Notes |
|---|---|---|---|
| `[document]` | (font-size key — verify) | `9.5`, `10.5`, `12` (pt) | Deck doesn't name the exact key consistently; query canon |
| `[paragraph]` | `linespacing` | font size × 1.2–1.3 | Adjust together with font size |

Watch for: font changes can introduce missing-glyph problems in non-Latin scripts; if page count was optimised, font-size change throws off line counts.

## "Tighter / looser line spacing"

| Section | Key | Common values |
|---|---|---|
| `[paragraph]` | `linespacing` | typically 1.2–1.3 × the font size |

Watch for: Layout tab has three "Optimize Lines Per Page" options the agent can probe by submitting candidate payloads with different `define` values. A 5% body-text shrink often resolves overfull-box issues without touching line spacing.

## "Two columns / one column / different gutter"

| Section | Key | Common values |
|---|---|---|
| `[document]` | `columns` (or similar) | `1`, `2`, `3` |
| `[paper]` | column-gutter key | mm or em |

Watch for: per-book column toggles override the global value (Psalms, Glossary, Strong's index commonly invert). Column count change affects every other layout decision.

## "Hide / show footnotes"

| Section | Key | Common values |
|---|---|---|
| `[notes]` | footnote-enabled key | `True` / `False` |
| `[notes]` | footnote-placement key | `page-bottom`, `chapter-end`, `column` |

Footnote `\f` style (in `ptxprint.sty`) controls caller appearance independently.

## "Add cross-references"

| Section | Key | Notes |
|---|---|---|
| `[notes]` | xref-list-source key | `Standard`, `Comprehensive`, `Alphabetical`, project-internal |
| `[notes]` | xref-placement key | `below-footnotes`, `side-aligned`, `inner-aligned`, `centre-column`, `column-aligned` |
| `[notes]` | xref-filter-to-published key | `True` / `False` |

External cross-reference lists are powerful. Walk filter + placement + alignment as three orthogonal choices.

## "Show / hide parallel-passage references"

> **Disambiguation.** This is a different concept from "Add cross-references" above. The recipe above controls the `\x` cross-reference marker (footnote-style verse-to-verse links built from an external xref list). This recipe controls the `\r` marker (the parallel-passage line that sits under a section heading, like *(Genesis 1:1–2; Hebrews 11:1–3)*). Both are sometimes informally called "cross-references" in English; the underlying USFM markers and rendering paths are distinct. See `klappy://canon/articles/usfm-markers-headless` for the `\r` marker definition.

| Section | Key | Common values | Notes |
|---|---|---|---|
| `[document]` | `parallelrefs` | `True` / `False` | When `True`, `\r` lines render as italic centered text under the preceding section heading. When `False`, `\r` content is silently dropped from output (no warning, no error). |

Watch for: `parallelrefs = False` is the canon-grounded cause of the most-common "my section headings lost their cross-references" symptom. Easy to flip off accidentally during a config cleanup pass — once flipped, the regression is invisible without visual comparison against a known-good render. Confirmed empirically in session 12 (see `canon/encodings/transcript-encoded-session-12.md` H-026 / O-046) where the v3 → v4 → v5 cleanup iteration spent four versions trying stylesheet hacks before diff'ing the cfg and finding the one cfg-key change that mattered.

The `\r` marker's appearance (italic, centered, etc.) is controlled separately by the `\Marker r` block in `ptxprint.sty`. To suppress the marker entirely, set `parallelrefs = False`. To show it but restyle, leave `parallelrefs = True` and edit the `\Marker r` block.

## "Hide / show pictures globally"

Use the payload's `define` field for run-time-only override:

```json
"define": { "c_fighiderefs": "True" }
```

For per-picture control, modify the piclist content in `config_files`. See `klappy://canon/articles/piclist-format`.

## "Custom header text"

| Section | Key | Notes |
|---|---|---|
| `[header]` | header-text key | Often supports `\zvar` substitution |
| `[vars]` | user-defined variables | Define `headertext = MyTitle` and reference in header settings |

For diglot or RTL-mixed headers, additional code-snippet patterns exist; refer the user there.

## "Generate a Table of Contents"

Two parts:

1. Enable front matter in the configuration (so FRT gets included; add `FRT` to the payload's `books`).
2. Add the ToC marker to `FRTlocal.sfm` content:

```
\ip \ztoc|main\*
```

The `|main\*` parameter accepts variants: `|nt\*`, `|ot\*`, `|sortc\*`, `|sorta\*`. See `klappy://canon/articles/usfm-markers-headless`.

## "Make a draft (low-quality, fast)"

| Approach | What it does |
|---|---|
| `mode: "simple"` in the payload | One-pass typesetting; skips multi-pass autofill |
| `define: { "output_format": "Screen-Quickest" }` | Skips post-processing for fastest preview |

Use for fast iteration; don't use for final output.

## "Output as black-and-white / colour / spot-colour"

| Section | Key | Common values |
|---|---|---|
| `[finishing]` | output format key | `Print-CMYK`, `Print-Gray`, `Print-Spot`, `Screen-Quickest`, `Digital-RGB`, `Digital-CMYK` |

Print-CMYK = full-colour offset; Print-Gray = B/W; Print-Spot = two-colour. Screen formats are faster; switch to print formats only for final.

## "Add a watermark"

The deck mentions a Watermark setting but doesn't surface the exact key in plain text. Query canon's tooltip-dump-derived index, or surface to user as a known gap.

## "Booklet pagination"

| Section | Key | Common values | Notes |
|---|---|---|---|
| `[finishing]` | booklet-up key | `2-up`, `4-up`, `8-up` | |
| `[finishing]` | booklet-flip key | `short-edge`, `long-edge` | Depends on imposition |
| `[finishing]` | fold-first key | `True` / `False` | For some bind orders |

Test pattern: 16-page PDF, 4-up, A3 paper, fold top-to-bottom then left-to-right, staple, trim.

## "Set up a diglot"

Multi-step workflow, not a single setting. See `klappy://canon/articles/workflow-recipes` (Recipe: Set up a diglot publication) for the axes and order.

## "Lock down a setting for a cluster"

See `klappy://canon/articles/config-inheritance-and-overrides`. The agent edits `ptxprint_project.cfg` (project-wide) or `ptxprint_override.cfg` (config-specific) in project state, with cluster-propagation implications spelled out to the user before changes.

## When the cookbook doesn't have it

The escalation ladder:

1. Search canon for the user's intent or the suspected setting name.
2. Check the running tooltip dump (canon-seeded).
3. Look at an existing project that does the thing the user wants — settings can be reverse-engineered from working configs.
4. Recommend the user check the running PTXprint UI (the tooltip is canonical).
5. Recommend the community forum at `support.bible/ptxprint` for project-specific questions.
6. Acknowledge the gap honestly: "I don't have this in my reference. Here's where to look."

Never fabricate settings names.

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`.*
