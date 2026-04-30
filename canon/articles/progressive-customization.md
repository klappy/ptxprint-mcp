---
title: "Progressive Customization — From {books, sources} to Full Control"
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
  - progressive-customization
  - progressive-disclosure
  - default-behavior
  - override
  - ladder
  - bootstrap
  - quickstart
companion_to:
  - canon/articles/bundled-default-cfg.md
  - canon/articles/payload-construction.md
  - canon/articles/settings-cookbook.md
canonical_status: non_canonical
date: 2026-04-30
status: draft_for_operator_review
supersedes_partial: "canon/articles/phase-1-poc-scope.md (the Phase 1 minimum-payload guidance)"
---

# Progressive Customization

> **What this answers.** I'm an agent. I want to render a Bible book. What is the *smallest* thing I can send? And when I want to customize something, where do I go next?
>
> **The short answer.** Send `{books, sources}`. The Container's bundled default cfg produces a publication-quality A5 two-column Bible book in Charis. Add fields when you need them; this article is the map of which field unlocks which capability.

---

## The ladder

| Level | Add to payload | Unlocks | Where to learn |
|---|---|---|---|
| **0** | nothing — just `{schema_version, project_id, books, sources}` | Default render: A5 two-column, Charis, parallel refs, footnotes, mirror header | `klappy://canon/articles/bundled-default-cfg` |
| **1** | `define: {key: value, ...}` | One-shot tweaks (line spacing, hide xrefs, set title, etc.) without replacing the cfg | `klappy://canon/articles/settings-cookbook` |
| **2** | `config_files["shared/ptxprint/Default/ptxprint.cfg"]` | Full cfg replacement (different layout, multi-book mode, scope changes) | `klappy://canon/articles/config-construction` |
| **3** | `fonts: [...]` | Different typefaces (Gentium, Andika, language-specific fonts) | `klappy://canon/articles/font-resolution` |
| **4** | `config_files["shared/ptxprint/Default/ptxprint.sty"]`, `Settings.xml`, `*-mods.sty` | Custom styling, Paratext settings, stylesheet overrides | `klappy://canon/articles/stylesheet-format` · `klappy://canon/articles/file-system-map` |
| **5** | `figures: [...]` + `config_files[".../<PRJ>-<config>.piclist"]` | Pictures and illustrations | `klappy://canon/articles/piclist-format` |

Each level is purely additive. Level 1 doesn't require anything from Level 2. Level 3 doesn't require anything from Level 4. The bundle is the floor; you climb only the rungs you need.

---

## Level 0 — Default render

The smallest possible payload:

```json
{
  "schema_version": "1.0",
  "project_id": "BSB",
  "books": ["JHN"],
  "sources": [
    {
      "book": "JHN",
      "filename": "44JHNBSB.usfm",
      "url": "https://...",
      "sha256": "<hex64>"
    }
  ]
}
```

That's it. No `config_files`, no `fonts`, no `figures`, no `define`, no `mode` (defaults to `simple`). The Container stages its bundled cfg at the project's Default config path, runs PTXprint, returns a content-addressed PDF URL.

What the bundle produces is described in `klappy://canon/articles/bundled-default-cfg`. Empirically: BSB John → 37 pages, ~377 KB PDF, ~15 seconds container time, 0 errors.

**When Level 0 is the right answer:** the agent has a USFM file and just wants to see it as a book. No styling decisions, no font requirements beyond Latin script, no figures. Most "render this for me" intents start here.

---

## Level 1 — `define` for one-shot tweaks

When the agent wants to change one knob without touching the cfg:

```json
{
  "schema_version": "1.0",
  "project_id": "BSB",
  "books": ["JHN"],
  "sources": [...],
  "define": {
    "s_linespacing": "13",
    "c_iffighiderefs": "True",
    "vars_maintitle": "John"
  }
}
```

`define` keys are PTXprint UI widget identifiers (`s_linespacing`, `c_iffighiderefs`, `vars_maintitle`, etc.). The Container passes them as `-D key=value` flags to the PTXprint CLI. They override the cfg for this render only — nothing persists.

**When Level 1 is the right answer:** "change line spacing to 13"; "hide cross-references"; "set the title to John"; "use 14pt margins instead of 12pt"; any single-knob adjustment.

**How to find the right key.** Use `docs(query="<your intent>", depth=2)` against the settings cookbook:

| Intent | Likely query |
|---|---|
| "make text bigger" | `docs("body font size")` |
| "tighter line spacing" | `docs("line spacing")` |
| "hide cross-reference numbers" | `docs("hide cross references")` |
| "set the title" | `docs("title page title")` |
| "single column" | `docs("single column body")` |
| "different page size" | `docs("page size")` |

The cookbook (`klappy://canon/articles/settings-cookbook`) maps intents to widget IDs.

**Limit:** `define` can change cfg-key behavior, but it can't change the *file shape* of the project (e.g., it can't add a stylesheet, can't add a Settings.xml, can't add fonts). For those, climb to Level 2+.

---

## Level 2 — Replace the cfg

When the agent needs many cfg changes, or changes that don't fit the `define` model (e.g., `[vars]` section additions, multi-book layout decisions):

```json
{
  ...
  "config_files": {
    "shared/ptxprint/Default/ptxprint.cfg": "[paper]\npagesize = 210mm, 297mm (A4)\ncolumns = False\n[document]\nfontregular = Gentium Plus||false|false|\n..."
  }
}
```

The caller's cfg fully replaces the bundled default. The Container does not merge — it stages exactly what the caller sent.

**Reasoning principle:** if the caller supplies a cfg, they own it. Mixing the bundled default with a partial cfg would create silent surprises (which keys take precedence? which sections get filled in? what about typo'd section names?). Replace-only keeps the contract obvious.

**Workflow pattern:**
1. `docs(query="bundled default cfg")` to retrieve the bundle as a starting point
2. Modify the cfg in-place
3. Submit the modified cfg under `config_files`

For first-time cfg authors: `klappy://canon/articles/config-construction` walks through the structural anatomy of a working cfg.

**When Level 2 is the right answer:** "render with a 6×9 page size, single column, larger fonts" (multi-knob restructure); "render the whole NT" (needs `bookscope = multiple` and `booklist`); "add a custom `[vars]` block for a publication's title metadata"; "use a different versification".

---

## Level 3 — Different fonts

When the agent's content is non-Latin, or the publication style requires a specific typeface:

```json
{
  ...
  "fonts": [
    {
      "family_id": "gentiumplus",
      "version": "6.200",
      "filename": "GentiumPlus-Regular.ttf",
      "url": "https://lff.api.languagetechnology.org/.../GentiumPlus-Regular.ttf",
      "sha256": "<hex64>"
    },
    {
      "family_id": "gentiumplus",
      "filename": "GentiumPlus-Bold.ttf",
      "url": "...",
      "sha256": "..."
    }
  ]
}
```

**Coordination with Level 2:** the cfg's `[document] fontregular` (and `fontbold`, `fontitalic`, `fontbolditalic`) must name a font that's findable. Either:

- (a) name a font the Container has bundled (Charis, in current state) — no `fonts` array needed
- (b) name a font supplied via the `fonts` array — Container fetches via URL+sha256, places in font path, fontconfig finds it by family name

For (b), the cfg in `config_files` must reference the family name the font's metadata advertises. Use `klappy://canon/articles/font-resolution` for the URL/hash sourcing pattern via SIL's Language Font Finder (LFF).

**When Level 3 is the right answer:** non-Latin script (Arabic, Devanagari, CJK); specific style requirements (Gentium for academic publishing); language-tagged font fallback for vernacular content.

---

## Level 4 — Custom stylesheets, Settings.xml, mods

When the agent's publication needs custom paragraph styles, peripherals (sidebars, study notes), or non-default Paratext metadata:

```json
{
  ...
  "config_files": {
    "shared/ptxprint/Default/ptxprint.cfg": "...",
    "shared/ptxprint/Default/ptxprint.sty": "\\Marker s1\n\\Bold\n\\Justification Center\n...",
    "shared/ptxprint/Default/ptxprint-mods.sty": "...",
    "Settings.xml": "<ScriptureText>...</ScriptureText>"
  }
}
```

**Reference articles:**

- `klappy://canon/articles/stylesheet-format` — sty file syntax
- `klappy://canon/articles/file-system-map` — full project tree (where each file goes)
- `klappy://canon/articles/usfm-markers-headless` — what markers do and how styles target them
- `klappy://canon/articles/frt-local-and-cover-periphs` — front matter content
- `klappy://canon/articles/changes-txt-format` — regex USFM transforms

**When Level 4 is the right answer:** publication-specific styling (paragraph indents, drop-cap rules, peripheral box styling); diglot publishing; cross-references with custom layouts; front matter (TOC, copyright page); custom versification declarations.

---

## Level 5 — Figures

When the publication has illustrations, maps, or photos:

```json
{
  ...
  "config_files": {
    ...,
    "shared/ptxprint/Default/BSB-Default.piclist": "JHN 1.1 ...|src=\"jesus.tif\" size=\"col\" pgpos=\"tr\" ref=\"1:1\""
  },
  "figures": [
    {
      "filename": "jesus.tif",
      "url": "https://.../jesus.tif",
      "sha256": "<hex64>"
    }
  ]
}
```

The piclist (config-folder text file) declares placement; the `figures` array supplies the binaries. Both must agree on filenames.

**Reference articles:**

- `klappy://canon/articles/piclist-format` — piclist syntax
- `klappy://canon/articles/file-system-map` — where figures get materialized
- `klappy://canon/articles/payload-construction` — schema details for the `figures` array

**When Level 5 is the right answer:** the publication has any visual content — Bible illustrations, maps, charts, photos. Figures can be added to any earlier level.

---

## Composition: layering levels

Levels stack. A Level-3 payload (`fonts`) typically also includes Level-2 (`config_files` with a cfg that names the new font family). A Level-5 payload (`figures`) typically also includes Level-4 (`config_files` with a piclist). The `define` map (Level 1) can ride on top of any level.

What does NOT stack: `define` entries that contradict the cfg in `config_files` for the same key. The cfg wins for keys it explicitly sets; `define` wins for keys the cfg leaves at PTXprint's compiled default. To force a `define` value to override a cfg key, leave that key out of the cfg or comment it.

---

## What about partial cfg overlay?

A reasonable instinct: "I want to keep the bundle's `[paper]` and `[notes]` sections but change `[document] fontregular` only — can I send a cfg with just `[document]`?"

The current architectural answer: **no, the worker stages exactly what you send.** If you send a cfg with only `[document]`, PTXprint sees a cfg with only `[document]` — every other section reverts to PTXprint's compiled defaults (which differ from the bundle's defaults). The result is unpredictable layout drift.

Two clean paths instead:

1. **`define` for one or two cfg-key changes** (Level 1) — no cfg replacement at all.
2. **Full cfg replacement** (Level 2) — start from the bundle (retrieve via `docs("bundled default cfg")`), edit, send the whole thing.

Future option (deferred): PTXprint's native `[import] config = Parent` inheritance would allow a child cfg with only its overrides, with the bundle as parent. This requires the Container to keep the bundle accessible at a parent-config path AND callers to declare the import correctly. Tracked as a deferred enhancement; not active in current Container behavior.

---

## Discovery via docs

Most Level-0 → Level-1 → Level-2 transitions are agent-driven:

```
agent: "render BSB John"
→ Level 0 — submit {books, sources}
→ render succeeds, agent shows PDF to user

user: "but make the lines a bit tighter"
agent: docs("change line spacing", depth=2)
→ settings-cookbook returns: define = {"s_linespacing": "<value>"}
→ Level 1 — submit with define added

user: "and switch to 6x9 trim with single column"
agent: docs("page size", depth=2)
agent: docs("single column", depth=2)
→ multi-knob, doesn't fit cleanly in define
agent: docs("bundled default cfg", depth=2)
→ retrieve full cfg, edit [paper] columns/pagesize, climb to Level 2
```

The pattern: each customization request is a docs query. The query surfaces the right field; the agent climbs the ladder one level at a time, only when needed.

---

## See also

- `klappy://canon/articles/bundled-default-cfg` — what the bundle produces
- `klappy://canon/articles/payload-construction` — schema reference
- `klappy://canon/articles/settings-cookbook` — Level-1 intent-to-key map
- `klappy://canon/articles/config-construction` — Level-2 cfg authoring
- `klappy://canon/articles/font-resolution` — Level-3 font sourcing
- `klappy://canon/articles/stylesheet-format` — Level-4 sty authoring
- `klappy://canon/articles/piclist-format` — Level-5 figure placement
- `klappy://canon/articles/diagnostic-patterns` — when a level produces unexpected output

---

*The bundle is the floor. Climb only the rungs you need. Each rung has a docs query. Discovery is tool-driven; canon documents the patterns; the worker stays opinion-free.*
