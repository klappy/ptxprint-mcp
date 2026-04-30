---
title: "Config Construction — Building a ptxprint.cfg from Scratch or Existing State"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "ptxprint-cfg", "config-construction", "ini"]
derives_from: "canon/governance/headless-operations.md (Part 3 Configuration Model, Part 1 -D mechanism)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

> **When this article applies.** The Container ships with a publication-quality default cfg (see `klappy://canon/articles/bundled-default-cfg`), so a payload of `{books, sources}` produces a finished A5 two-column Bible book without the agent authoring any cfg content at all. Read this article when the user wants something the bundled cfg does not give them — a different page size, a different layout, multi-book mode, or any change that requires the agent to construct or replace `config_files["shared/ptxprint/<config>/ptxprint.cfg"]`. That is **Level 2** of the customization ladder (`klappy://canon/articles/progressive-customization`); the levels below (`define`-only tweaks, font swaps) do not require the content below. The cfg-replacement contract this article describes is live, not a future target.

# Config Construction

> **What this answers.** What's in `ptxprint.cfg`? Which sections do I touch most? How do I create a new config? When do I use `define` vs editing the cfg?
>
> **Related articles.** `klappy://canon/articles/payload-construction` · `klappy://canon/articles/config-inheritance-and-overrides` · `klappy://canon/articles/settings-cookbook` · `klappy://canon/articles/cli-reference`

---

## What `ptxprint.cfg` is

A standard sectioned INI file (Python `configparser`-compatible) with about 25 sections and ~400 keys. Multi-line values use tab/space continuation. The agent constructs or modifies this content as text and includes it in the payload's `config_files` map at the appropriate path.

A minimal `ptxprint.cfg` looks like:

```ini
[config]
name = Default

[paper]
pagesize = 148mm, 210mm (A5)
margins = 12

[paragraph]
linespacing = 14
```

PTXprint fills in defaults for everything not specified. Most user-facing changes touch a small subset of sections.

## Sections the agent touches most often

| Section | What it controls | Common user asks |
|---|---|---|
| `[project]` | Book scope, copyright, plugins, scripts | "Print only Romans"; "Add my project's copyright line" |
| `[paper]` | Page size, margins, column gutters | "Make it A5"; "Wider margins" |
| `[document]` | Body fonts, columns, diglot mode, figures, TOC, script direction | "Bigger text"; "Two columns"; "Right-to-left" |
| `[paragraph]` | Hyphenation, justification, line spacing | "Tighter line spacing"; "Disable hyphenation" |
| `[notes]` | Footnote and cross-reference placement and formatting | "Footnotes at end of chapter"; "Cross-refs in centre column" |
| `[header]` | Header content, chapter/verse range display | "Custom header text"; "Show chapter range" |
| `[footer]` | Footer content and layout | "Page numbers in footer" |
| `[fancy]` | Page borders, ornaments, verse decorators | "Decorative border on cover" |
| `[finishing]` | PDF imposition, booklet output, spot colour | "Make a booklet"; "Black-and-white output" |
| `[vars]` | User-defined substitution variables for `\zvar\|name\*` | "Add a variable for the imprint year" |
| `[diglot_L]` / `[diglot_R]` / `[diglot_A]` / `[diglot_B]` | Diglot/polyglot column settings | "Set up the secondary text column" |
| `[import]` | Config inheritance | (see config-inheritance-and-overrides) |

For specific intent → setting mappings, see `klappy://canon/articles/settings-cookbook`.

## Sections to leave alone unless you know exactly what you're doing

| Section | Reason for caution |
|---|---|
| `[texpert]` | Expert XeTeX settings; bad values produce silent layout breakage |
| `[scripts]` | Script-specific features for CJK, Indic, Arabic, Myanmar; need script knowledge |
| `[strongsndx]` / `[strongsvars]` | Strong's index generation; complex interactions with Biblical Terms data |
| `[studynotes]` | Study Bible sidebar layout; high blast radius |
| `[grid]` | Layout debugging grid; only useful interactively |
| `[thumbtabs]` | Thumb tab layout; under-documented |

If the user explicitly asks for one of these, walk them through the change carefully and test on a single short book before committing.

## Key settings in `[project]`

| Key | Values | Meaning |
|---|---|---|
| `bookscope` | `single` \| `booklist` \| `module` | What to print |
| `book` | USFM code e.g. `JHN` | Used when `bookscope = single` |
| `booklist` | Space-separated codes e.g. `MAT MRK LUK` | Used when `bookscope = booklist` |
| `plugins` | Comma-separated plugin names | Optional plugins to activate |
| `selectscript` | Path to a `.py` file | Python pre/post-processor script |
| `when2processscript` | `before` \| `after` | Whether script runs before or after `changes.txt` |

Note: the payload's top-level `books` field overrides `[project] book` / `[project] booklist` for the run. The agent typically sets `books` in the payload and leaves `[project]` alone unless the user wants the change to persist in the saved config.

## Creating a new config

In v1.2, creating a new config is an agent-side operation against project state, not a server operation:

1. **Update the working representation of the project** to include a new config folder under `shared/ptxprint/<NewName>/`.

2. **Write a minimal `ptxprint.cfg` for the new config:**
   ```ini
   [config]
   name = NewName

   [import]
   config = Default
   ```
   That's it. PTXprint inherits everything else from the parent.

3. **When the user wants to typeset using the new config**, construct a payload with `config_name = "NewName"` and include both the new config's files and the parent config's files in `config_files`:
   ```json
   "config_files": {
     "shared/ptxprint/NewName/ptxprint.cfg": "[config]\nname = NewName\n[import]\nconfig = Default\n[paper]\npagesize = ...\n",
     "shared/ptxprint/Default/ptxprint.cfg": "<existing parent content>",
     "shared/ptxprint/Default/ptxprint.sty": "<existing parent content>"
   }
   ```
   The worker materializes both; PTXprint resolves inheritance.

4. **After successful typesetting**, the agent persists the new config back to project state (Git commit, file write via Claude Desktop, etc.) so it's available next session.

### What to avoid

- **Full copies of the parent.** Defeats inheritance. Becomes unmaintainable.
- **Configs for one-time tweaks.** That belongs as a `define` runtime override.
- **Names like `Default-12pt-spacing`.** Name configs after their **purpose** (`DraftReview`, `FinalNT`, `JournalingEdition`), not their settings.

## When to use `define` (runtime override) vs. editing `config_files`

The payload's `define` field maps to PTXprint's `-D key=value` flags — runtime overrides applied without persisting to `ptxprint.cfg`.

| Use `define` | Use `config_files["...ptxprint.cfg"]` |
|---|---|
| Producing a one-off draft with different spacing | Committing to a finalised configuration |
| Exploring options without persisting | The change should round-trip back to the user's project store |
| Parameterised runs (rotating output formats) | The change is part of the user's saved working state |
| The user is unsure and wants to compare | The user has decided |

Common pattern: explore with `define`, then promote to `config_files` once committed.

`define` keys are PTXprint widget identifiers, not cfg keys directly:

- `s_<name>` — string or numeric setting (`s_linespacing`, `s_fontsize`)
- `c_<name>` — checkbox / boolean (`c_fighiderefs`, `c_disablehyphen`)
- `r_<name>` — radio / enum (`r_outputformat`)
- `t_<name>` — text-area (`t_headertext`)

Prefixes are not 100% consistent. Verify against the running tooltip dump (canon-seeded) before relying on a specific name.

## Modifying an existing config

The standard flow:

1. **Read** the current `ptxprint.cfg` content from project state (the user's filesystem, Git, etc.).
2. **Check** both override files (`ptxprint_project.cfg` and `ptxprint_override.cfg`) for the key being changed. If locked there, surface to user — see `klappy://canon/articles/config-inheritance-and-overrides`.
3. **Modify** the relevant section in working memory.
4. **Include** the modified content in the payload's `config_files` at the same relative-path key.
5. **Submit** and observe.
6. **Persist** the change back to project state if the user is happy with the result.

Do not skip the override-file check. A silent override is the most common cause of "I changed it but nothing happened."

## Common cfg-construction mistakes

### 1. Misspelled keys

PTXprint silently ignores unknown keys. The agent's change appears to do nothing. Fix: verify keys against canon's cfg-key index (seeded from the tooltip dump) before relying on a name. Never invent.

### 2. Wrong section

Same effect — unknown-key-in-section is also silent. The cfg key index identifies which section each key lives in.

### 3. Wrong value type

A boolean key set to `yes` instead of `True` may be ignored or misinterpreted. Common types:
- Booleans: `True` / `False` (capitalized)
- Numbers: bare digits, no quotes (`14`, not `"14"`)
- Strings with units: `12mm`, `0.5in`, `1.2cm`
- Page sizes: `<width>, <height> (label)` — example: `148mm, 210mm (A5)`

When uncertain, verify a known-working value from an existing project's cfg.

### 4. Multi-line values without continuation

`configparser` requires tab or space indent to continue a value across lines. The cfg-key index notes which keys take multi-line values; most don't.

### 5. Trying to set things that aren't cfg keys

Some PTXprint behaviour is set via supporting files (changes.txt, AdjLists, piclist), not via cfg keys. If the agent can't find a cfg key for the user's intent, the answer may be in another file. See `klappy://canon/articles/payload-construction` for the full set of supporting files.

## When a config is "ready to share"

Before the user pushes a config back to their project store (Paratext Send/Receive, Git commit, etc.), check:

- The config has a meaningful name (purpose, not settings).
- The view level the user wants the recipient to see is set (Mini/Basic/Full in `[config]`).
- Any settings the user does not want changed are locked via the override mechanism.
- The cfg has no broken inheritance (the `[import] config` actually exists in project state).
- A test PDF has been produced and looks correct.

This is project-state hygiene, not MCP-server work. The agent guides; the user (or BT Servant) commits.

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`. See also: `klappy://canon/articles/config-inheritance-and-overrides` for how multiple cfg files compose at runtime.*
