---
title: "PTXprint Headless Operations — Knowledge Base for AI Agents and Assistants"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "headless", "mcp", "agent-kb", "operations", "v1.2-aligned", "non-canonical"]
derives_from: "ptxprint-master-slides.surface.json, ptx2pdf.surface.json, transcript-encoded.md (sessions 1–5), ptxprint-mcp-v1.2-spec.md, governance-update-handoff (2026-04-28)"
companion_to: "ptxprint-mcp-v1.2-spec.md"
generator: "claude-opus-4.7 (interactive session)"
created_at: 2026-04-28T02:50:00Z
updated_at: 2026-04-28T04:06:00Z
canonical_status: non_canonical
intended_consumer: "AI agent submitting jobs to the PTXprint MCP server, or AI assistant helping a user create configs and produce PDFs conversationally via the MCP server"
---

# PTXprint Headless Operations — KB for AI Agents and Assistants

> **What this KB is.** Operational knowledge for an AI working with PTXprint through the v1.2 MCP server — not through the GUI. Two audiences share it: (1) an autonomous agent that submits jobs to the MCP server to produce PDFs, and (2) an AI assistant guiding a human user conversationally through MCP-mediated config creation. Both touch the same surface; both need the same knowledge.

> **What this KB is not.** Not the MCP server's API specification (that lives in `ptxprint-mcp-v1.2-spec.md`). Not the catalog of all 400+ settings (that lives in canon, derived from the running tooltip dump). Not the user-facing training manual (that lives in `ptxprint-user-support.md`). This document is the operational layer between the spec and the user.

> **Architecture context.** The PTXprint MCP server is a stateless content-addressed build system. The agent does not edit files inside a sandboxed project tree on the server — it reads project state from wherever the user keeps it (Claude Desktop's filesystem access, Git, DBL, the user's Paratext server) and constructs a payload describing one typesetting job. The payload is submitted to the server, which dispatches it to an ephemeral worker container that materializes the inputs, runs PTXprint, and uploads the PDF to R2. The agent receives a job_id and polls for status.
>
> Iterative editing in this model means re-submitting an updated payload, not editing files in place. Each typesetting run is fully reproducible from its payload; outputs are content-addressed by sha256 of the payload, so re-submitting an unchanged build returns the cached result for free.

> **Containment.** Non-canonical. Where this disagrees with the running PTXprint product, the product wins. Where this disagrees with canon, canon wins. Verify settings names against the running UI before encoding into production code.

---

## Part 0 — The Headless Operating Contract

### What "headless" means here

A headless PTXprint run from the agent's perspective is a job submission. The agent constructs a payload containing the configuration files (inline text), URLs for the binary inputs (USFM source, fonts, figures), and the books to typeset. The payload is submitted via `submit_typeset` and returns a job_id immediately. An ephemeral Cloudflare Container worker picks up the job, materializes a working directory from the payload, runs PTXprint, and uploads the resulting PDF to R2. The agent polls `get_job_status` to track progress and retrieve the result URL.

The contract is exactly:

| | |
|---|---|
| Inputs | A payload (see the v1.2 spec for schema) containing: project_id, config_name, books, mode (`simple` \| `autofill`), inline `config_files` (cfg, sty, changes.txt, FRTlocal.sfm, AdjLists, piclist, override files), and URL+sha256 references to USFM sources, fonts, and figures |
| Outputs (success) | A presigned R2 URL to a PDF at `outputs/<payload_hash>/<PRJ>_<Config>_<bks>_ptxp.pdf` plus a presigned URL to the corresponding XeTeX log |
| Outputs (failure) | A `failure_mode: hard \| soft` classification, a log_tail, an `errors` list, and (if soft failure) a presigned URL to the degraded PDF |
| Side effects | None on the agent's side. Worker scratch dir is wiped when the Container sleeps. R2 outputs persist per the configured retention policy. |

### Three failure modes, not two

Headless typesetting has three outcomes, not the two an agent might expect:

1. **Hard failure** — exit code non-zero AND no PDF produced. The XeTeX log usually has `^!` lines naming the cause.
2. **Soft failure** — exit code 0, PDF exists, but the PDF is incomplete or degraded. Pictures missing, ToC blank, footnotes dropped, sections collapsed. The log may show warnings but no fatal errors.
3. **Success** — exit code 0, PDF exists, no degradation. The log may still contain dozens of overfull-box warnings; that is normal.

An agent that checks only exit code or only PDF existence will report soft failures as success. The validation layer must check **both** the exit code AND the PDF's structural soundness against expectations (e.g. "I asked for pictures; are pictures present?"). See Part 9.

### What headless cannot do that the GUI can

- **Interactive paragraph adjustment via right-click on the preview pane.** The agent's substitute is to include the AdjList content as part of the payload's `config_files` map at the appropriate relative path.
- **Right-click on a verse to send the reference back to Paratext.** No equivalent in headless.
- **Right-click on a picture to manage placement and selection.** The agent's substitute is to include the modified piclist content as part of the payload's `config_files` map at the appropriate relative path.
- **The settings search box.** The agent's substitute is to query canon (`oddkit_search`); the canonical tooltip dump is canon-seeded.
- **The Help tab and embedded chatbot.** The agent's substitute is canon retrieval and external documentation links.
- **The Typesetting Report's interactive UI.** The agent reads the same data from the log surfaced via `get_job_status.log_url` and `get_job_status.log_tail`.
- **Live preview pane.** The agent must submit a payload, await completion, and inspect the resulting PDF (or its log) — there is no continuous-feedback loop.
- **The Cover Wizard's 6-step UI.** The agent must compose the cover-related cfg content and the `FRTlocal.sfm` cover periphs as part of the payload's `config_files`.
- **The Style Editor's interactive font browser.** The agent must compose `ptxprint.sty` content as part of the payload's `config_files`.
- **The DC Cook permission Google Form prefill.** The agent must direct the user to the GUI or the standalone web form.
- **Send/Receive of configurations.** The agent works with payloads; cluster sync happens at the project-state layer (the user's Git, Paratext server, etc.), not at the typesetting MCP layer.

### Where this knowledge lives at runtime

When the agent does not know what a setting does:

1. Search this KB for an intent-keyed recipe (Part 6).
2. Search canon (`oddkit_search`) for the section, key, or the user's intent phrase.
3. Search canon for the cfg-key mapping (the tooltip dump is canon-seeded). If the operator has exposed the running tooltip dump as a separate canon document, retrieve that for authoritative current-version info.
4. If still unknown, surface the gap to the user with: "I don't have documented behaviour for this; would you like to look it up in the running tooltip?"

Never fabricate a settings name. Cfg keys with plausible-looking names that don't exist will be silently ignored by PTXprint, leaving the user with output that did not change in the way they expected — and the agent unable to explain why.

---

## Part 1 — The CLI Reference

> **In v1.2, the agent does not invoke this CLI directly.** The Container worker invokes it on behalf of the agent's submitted payload. This reference is here because the payload's `define`, `books`, `config_name`, and `project_id` fields map directly to PTXprint's CLI flags, and understanding the CLI surface helps the agent construct payloads that will work.

### Full signature

```
ptxprint -P <prjid> [-c <config_name>] [-b "<books>"]
                    [-p <projects_dir>] [-q]
                    [-D key=value ...]
                    [--timeout <seconds>]
```

Slide 417 of the master deck shows this exact pattern:

```
ptxprint.exe -b ROM -c SingleSpaceDraft -P XYZ
```

### Flags

| Flag | Required | Meaning |
|---|---|---|
| `-P <prjid>` | yes | Paratext project ID (the folder name the worker materializes from the payload) |
| `-c <config>` | no (defaults to `Default`) | Named configuration to use |
| `-b "<codes>"` | no | Space-separated USFM book codes; overrides the cfg's `[project] booklist` value for this run only |
| `-p <path>` | no | Projects root directory; the worker sets this to its scratch dir |
| `-q` | no | Quiet; suppresses splash and any GUI artifacts |
| `-D key=value` | no, repeatable | Override any UI setting at runtime without modifying the stored cfg. Key names are PTXprint widget identifiers; see Part 1.4 |
| `--timeout <s>` | no (defaults to 1200) | Maximum seconds to wait for XeTeX |
| `-h` | no | Print all arguments and exit |

### Exit codes

| Code | Meaning | Typical cause |
|---|---|---|
| 0 | Success | PDF was produced |
| 1 | Startup failure | Project not found, bad config path, missing dependency |
| 3 | XeTeX completed but produced no PDF | XeTeX errors prevented final write |
| 4 | XeTeX returned non-zero exit | Typesetting errors during macro processing |

A non-zero exit code is necessary but not sufficient evidence of failure. A zero exit code is necessary but not sufficient evidence of success. Always check both.

### The `-D` runtime override mechanism

`-D key=value` is the worker's mechanism for parameterised runs. It accepts any PTXprint widget identifier and value, applied at runtime without persisting to `ptxprint.cfg`. The agent populates the payload's `define` field with the same key/value pairs, and the worker translates them into `-D` flags when invoking the CLI.

Example payload `define` field:

```json
"define": {
  "s_linespacing": "14",
  "c_fighiderefs": "True"
}
```

Widget identifier conventions:
- `s_<name>` — string or numeric setting
- `c_<name>` — checkbox / boolean setting
- `r_<name>` — radio / enum setting
- `t_<name>` — text-area setting
- Prefixes are not 100% consistent; verify against the tooltip-dump source.

**When to use the payload's `define` field:**

- The override is for this run only (e.g., "produce a draft with 13pt spacing" without changing the working `ptxprint.cfg` state)
- The user is exploring options and the agent doesn't want to mutate the working config
- The run is parameterised (quarterly auto-generation with rotating output formats)

**When to include the change in `config_files["shared/ptxprint/<config>/ptxprint.cfg"]`:**

- The change should persist across iterations (the agent updates its working config state and includes the new content in subsequent payloads)
- The user is committing to a finalised configuration
- The change is part of a config the user will eventually push back to their project store (Git / Paratext / wherever they keep it)

---

## Part 2 — File System Map

> **In v1.2, this filesystem layout is what the Container worker materializes inside its scratch directory before running PTXprint.** The agent does not see this tree; it sees the payload (described in the v1.2 spec). The `config_files` map keys map directly to relative paths in this tree; the `sources` array entries become USFM files at appropriate locations; the `fonts` and `figures` arrays populate the worker's font and image directories. Understanding this layout helps the agent choose correct relative-path keys when constructing the payload's `config_files` map.

### The two trees per project (as materialized by the worker)

Every PTXprint-aware project has two parallel subtrees under its root:

```
<projects_root>/<prjid>/
├── shared/                          team-visible in the user's project store
│   └── ptxprint/
│       ├── ptxprint.sty             project-wide stylesheet (often blank)
│       ├── ptxprint-premods.tex     project-wide TeX pre-processing
│       ├── changes.txt              project-wide regex transforms
│       ├── picInfo.txt              project-wide picture clearance
│       ├── picChecks.txt            project-wide picture approvals
│       ├── hyphen-<prj>.tex         hyphenation exceptions
│       ├── hyphenation.pkl          compiled hyphenation cache
│       ├── ptxprint_project.cfg     PROJECT-LEVEL OVERRIDE FILE (see Part 4)
│       └── <ConfigName>/            named configuration folder
│           ├── ptxprint.cfg         PRIMARY SETTINGS (the ~400 keys)
│           ├── ptxprint.sty         config-level stylesheet overrides
│           ├── ptxprint-mods.sty    additional style modifications
│           ├── changes.txt          config-specific regex transforms
│           ├── FRTlocal.sfm         front matter USFM content
│           ├── <PRJ>-<Config>.piclist     picture placement list
│           ├── picInfo.txt          config-level picture clearance
│           ├── picChecks.txt        config-level picture approvals
│           ├── ptxprint_override.cfg     CONFIG-LEVEL OVERRIDE FILE
│           ├── merge-chapter.cfg    diglot chapter-merge strategy
│           ├── merge-normal.cfg     diglot normal-merge strategy
│           ├── merge-verse.cfg      diglot verse-merge strategy
│           └── AdjLists/            paragraph adjustment files
│               └── <num><BOOK><prj>-<Config>[.SFM|-diglot].adj
└── local/                           machine-local; the worker's PDF output staging
    └── ptxprint/
        ├── <PRJ>_<Config>_<bks>_ptxp.pdf      output PDF
        └── <ConfigName>/
            └── <PRJ>_<Config>_<bks>_ptxp.log  XeTeX log
```

The `shared/` vs `local/` split exists because PTXprint expects it; the worker stages outputs in `local/` and the upload step moves them from there to R2. The agent does not interact with `local/` at all — outputs are surfaced via presigned URLs.

### Output path convention

The PDF output appears at `r2://ptxprint-outputs/<payload_hash>/<PRJ>_<Config>_<bks>_ptxp.pdf` where `<payload_hash>` is the sha256 of the canonical payload. The Worker returns a presigned URL to this path. `submit_typeset` also returns a `predicted_pdf_url` field synchronously when the payload is submitted, computed before the typeset job runs — the agent can use it to construct download links in advance.

The filename pattern itself (`<PRJ>_<Config>_<bks>_ptxp.pdf`) is unchanged from the GUI:

- `<bks>` is a single USFM code for one book: `JHN`
- `<bks>` is `<first>-<last>` for multiple books: `MAT-REV`

### What the agent constructs in the payload

The agent's reasoning surface for "what files matter" maps onto payload slots:

- **`config_files`** map (inline text):
  - `shared/ptxprint/<config>/ptxprint.cfg` — primary settings
  - `shared/ptxprint/<config>/ptxprint.sty` — config-level stylesheet
  - `shared/ptxprint/<config>/ptxprint-mods.sty` — additional style mods (optional)
  - `shared/ptxprint/<config>/changes.txt` — config-level USFM transforms (optional)
  - `shared/ptxprint/<config>/FRTlocal.sfm` — front matter content (optional)
  - `shared/ptxprint/<config>/<PRJ>-<config>.piclist` — picture placements (optional)
  - `shared/ptxprint/<config>/AdjLists/<num><BOOK><PRJ>-<config>.SFM.adj` — paragraph adjustments (optional, one per book that has adjustments)
  - `shared/ptxprint/ptxprint_project.cfg` — project-level overrides (optional, see Part 4)
  - `shared/ptxprint/<config>/ptxprint_override.cfg` — config-level overrides (optional, see Part 4)
- **`sources`** array (URL + sha256): one entry per book being typeset
- **`fonts`** array (URL + sha256): one entry per font file the project references
- **`figures`** array (URL + sha256, optional): one entry per image file referenced by the piclist

---

## Part 3 — The Configuration Model

> **In v1.2, the agent reads existing configs from project state (wherever the user keeps it) and writes the resulting cfg content into the payload's `config_files` map at the right relative-path key. There is no edit-in-place against the server.**

### `ptxprint.cfg` is a sectioned INI

The primary settings file is a Python `configparser`-compatible INI file with about 25 sections and ~400 keys. Multi-line values use tab/space continuation.

The sections you will most often touch:

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
| `[snippets]` | Shortcut flags (diglot, fancy, output format) | Internal toggles surfaced by view-tier checkboxes |
| `[viewer]` | PDF quality-check flags (rivers, collisions, whitespace) | "Detect layout problems" |
| `[finishing]` | PDF imposition, booklet output, spot colour | "Make a booklet"; "Black-and-white output" |
| `[vars]` | User-defined substitution variables for `\zvar\|name\*` | "Add a variable for the imprint year" |
| `[diglot_L]` / `[diglot_R]` / `[diglot_A]` / `[diglot_B]` | Diglot/polyglot column settings | "Set up the secondary text column" |
| `[import]` | Config inheritance | (see below) |

Sections you should rarely touch directly without a specific reason:

| Section | Reason for caution |
|---|---|
| `[texpert]` | Expert XeTeX settings; bad values produce silent layout breakage |
| `[scripts]` | Script-specific features for CJK, Indic, Arabic, Myanmar; need script knowledge |
| `[strongsndx]` / `[strongsvars]` | Strong's index generation; complex interactions with Biblical Terms data |
| `[studynotes]` | Study Bible sidebar layout; high blast radius |
| `[grid]` | Layout debugging grid; only useful interactively |
| `[thumbtabs]` | Thumb tab layout; deck flagged this as under-documented |

### Config inheritance: the `[import]` section

A configuration whose `ptxprint.cfg` contains:

```ini
[import]
config = Default
```

declares that `Default` is its parent. PTXprint loads the parent's full settings first, then layers the child's settings on top. **The child stores only the keys that differ from the parent.**

Implications for the agent in v1.2:

- The agent walks the inheritance chain itself before constructing the payload. Canon's `config-construction.md` article describes the algorithm.
- The agent decides whether to include only the child config in the payload's `config_files` (relying on the worker to walk inheritance just like the GUI would) or whether to flatten the chain and include only the merged result. **Recommended: include the chain explicitly.** The worker materializes parent configs at their expected paths and PTXprint resolves the inheritance the way it always does. This preserves the user's intent and makes the payload roundtrip-able to a real project tree.
- There is no `resolve_config` server tool. If the agent needs effective settings for reasoning, it computes them from the payload's `config_files` content (or from project state before payload construction).
- Inheritance can chain: `MySpecial` → `FancyNT` → `Default`. The agent walks the full chain when building `config_files`.
- There is no reset mechanism. A key set in the parent persists in the child unless the child explicitly overrides it.

### Creating a new config

Creating a new config in v1.2 is an agent-side operation against project state, not a server operation:

1. The agent updates its working representation of the project to include a new config folder under `shared/ptxprint/<NewName>/`.
2. The agent writes a minimal `ptxprint.cfg` for the new config: only `[config] name = NewName` and `[import] config = Default` (or whichever parent makes sense).
3. When the user wants to typeset using the new config, the agent constructs a payload with `config_name = "NewName"` and includes both the new config's files and the parent config's files in `config_files` (so inheritance resolves correctly inside the worker).
4. After successful typesetting, the agent persists the new config back to project state (Git commit, file write via Claude Desktop, etc.) so it's available next session.

Avoid:
- Creating new configs that are full copies of the parent. They become unmaintainable.
- Creating new configs for one-time tweaks. That belongs as a `-D` runtime override.
- Naming new configs after the change you made (`Default-12pt-spacing`). Name them after the **purpose** (`DraftReview`, `FinalNT`, `JournalingEdition`).

### When a config is "ready to share"

Before the user runs Paratext Send/Receive (in their project state, not the typesetting MCP), walk this checklist:

- The config has a meaningful name.
- The view level the user wants the recipient to see is set (Mini/Basic/Full).
- Any settings the user does not want changed are locked via the override mechanism (Part 4).
- The cfg has no broken inheritance (the `[import] config` actually exists).
- A test PDF has been produced and looks correct.

---

## Part 4 — The Override Mechanism

> **In v1.2, override files are part of the payload.** When the agent's payload includes `shared/ptxprint/ptxprint_project.cfg` in `config_files`, the worker materializes it and PTXprint applies it as it always does. The override semantics described in this section are unchanged. The agent's responsibility shifts from "check override files on disk before writing" to "check override files in the payload (and in project state) before changing a setting in the payload's main config."

This is the part the existing v1.0 spec deferred. The deck (slide 429) shows it is alive and shipping. An agent that ignores it will be confused when its writes appear to do nothing.

### The two override files

```
shared/ptxprint/ptxprint_project.cfg          PROJECT-WIDE
shared/ptxprint/<config>/ptxprint_override.cfg    CONFIG-SPECIFIC
```

Both files are sectioned INI in the same shape as `ptxprint.cfg`. Their semantics:

- An entry in either file **disables the corresponding UI control** (the user sees it greyed out in the GUI). In headless terms: the value in the override file wins over the value in `ptxprint.cfg`.
- A `*` prefix on the value (`* 14`) means "set this default but allow the user to change it temporarily." After the user closes the project and reopens, the temp change is gone and the override default is back.
- Without `*`, the lock is hard — the user cannot change it at all.

### Resolution order

When PTXprint loads a configuration (inside the worker, after materialization), the effective value of a key is determined by:

1. The config-level override file (`ptxprint_override.cfg` in the config folder), if present and the key is set there.
2. The project-level override file (`ptxprint_project.cfg` in the shared/ptxprint folder), if present and the key is set there.
3. The config's own `ptxprint.cfg`, if the key is set there.
4. The parent config's `ptxprint.cfg` (recursively up the inheritance chain), if any.
5. PTXprint's built-in defaults.

### Why this matters for an agent

Three failure modes the agent must guard against:

**Failure mode 1: silent override.** The agent updates `ptxprint.cfg` content in the payload to change `[paper] pagesize`. The worker runs typesetting. The page size does not change. Cause: a project-level override file pinned the page size, and the agent included it (or the worker materialized it from project state) without updating it.

**Mitigation:** Before adding a setting to the payload's `config_files["shared/ptxprint/<config>/ptxprint.cfg"]`, check both override files in project state. If the key is locked there, surface that to the user: "I'm about to set `[paper] pagesize = A5`, but the project-level override at `ptxprint_project.cfg` has it locked to `Letter`. To change it for real, I'd need to update the override file too. Do you want me to?"

**Failure mode 2: breaking cluster lockdown.** The user is part of a publishing cluster whose administrator has locked house-style settings via override files. The agent edits the override file in project state to "fix" something. The next Send/Receive (in the user's Paratext / Git workflow) propagates the change to every project in the cluster.

**Mitigation:** Treat override files as administrator-controlled. The agent must not modify them in project state — and therefore must not include modified versions in the payload — without explicit user confirmation, with cluster propagation implications spelled out.

**Failure mode 3: orphaned override.** A previous payload (or the user's earlier work) left a value in an override file. Later, the agent updates the same key in the main `ptxprint.cfg` content of the payload, and tells the user the change is in effect. It is not — the override is still in the payload (and in project state).

**Mitigation:** When the agent's payload change does not produce the expected output, check both override files first.

### Authoring override files in headless context

The deck (slide 432) describes the manual workflow: copy `ptxprint.cfg` to the override filename, delete the lines that should NOT be locked, save. The agent does the same: read the relevant section of the working `ptxprint.cfg`, extract the keys to lock, write a new override file at the appropriate path in project state, and include both the modified main cfg and the new override file in subsequent payloads.

When to suggest creating an override file:
- The user is administering multiple projects and wants house-style consistency.
- The user wants to enforce a setting that team members cannot accidentally change.
- A specific setting has been "lost" multiple times because team members keep changing it.

When NOT to create an override file:
- The user is making a one-off layout decision for their own project.
- The user is exploring options and may want to revert.
- The user is not aware override files exist (introduce the concept first; do not silently create one).

---

## Part 5 — Settings Cookbook (by user intent)

This is the agent's reference for "user said X, agent should consider these settings." Sections are by user intent, not by INI section. For each, the table lists the relevant section, the typical key (verify against running tooltip dump), the common values, and what to watch for.

The agent should treat these as starting points, not authoritative. When in doubt, query canon for the current canonical answer.

### "Make the page a different size"

| Section | Key | Common values | Notes |
|---|---|---|---|
| `[paper]` | `pagesize` | `148mm, 210mm (A5)`, `210mm, 297mm (A4)`, `5.5in, 8.5in (Half Letter)` | Format is `width, height (label)`. Many printers have a fixed list — confirm with the user's printer before committing. |

Watch for:
- A page-size change usually invalidates the existing margin and column settings; the user may need to re-tune those.
- Some output formats (booklet pagination) constrain physical paper size separately.

### "Wider/narrower margins"

| Section | Key | Common values | Notes |
|---|---|---|---|
| `[paper]` | `margins` | `12` (mm), `0.5` (in), context-dependent | Often a single number applied to all four sides; some configs have separate top/bottom/inner/outer margins. |

Watch for:
- The binding gutter is usually separate; ask the user about printer requirements.
- Tight margins can collide with header/footer space.

### "Bigger / smaller body text"

| Section | Key | Common values | Notes |
|---|---|---|---|
| `[document]` | (font size key — verify against tooltip dump) | `9.5`, `10.5`, `12` (in pt) | The deck does not name the exact key consistently; query canon. |
| `[paragraph]` | `linespacing` | Typically font size × 1.2–1.3 | Adjust together with font size. |

Watch for:
- Font changes can introduce missing-glyph problems in non-Latin scripts.
- If the page count was already optimised, a font-size change throws off line-counts.

### "Tighter / looser line spacing"

| Section | Key | Common values |
|---|---|---|
| `[paragraph]` | `linespacing` | Typically 1.2–1.3 × the font size |

Watch for:
- The Layout tab has three "Optimize Lines Per Page" buttons that auto-compute; the agent can submit several candidate payloads with different `define` values and pick the best fit.
- A 5% body-text shrink (slide 116) often resolves overfull-box issues without needing to touch line spacing.

### "Two columns / one column / different gutter"

| Section | Key | Common values |
|---|---|---|
| `[document]` | `columns` (or similar) | `1`, `2`, `3` |
| `[paper]` | column-gutter key | mm or em |

Watch for:
- The Body tab has per-book column toggles (slide 150) — Psalms, Glossary, Strong's index commonly invert the project default. This is a different setting from the global column count.
- A column count change affects every other layout decision; treat as a major change requiring re-test.

### "Hide / show footnotes"

| Section | Key | Common values | Notes |
|---|---|---|---|
| `[notes]` | footnote-enabled key | `True` / `False` | |
| `[notes]` | footnote-placement key | `page-bottom`, `chapter-end`, `column` | |

The footnote `\f` style (in `ptxprint.sty`) controls caller appearance independently.

### "Add cross-references"

| Section | Key | Notes |
|---|---|---|
| `[notes]` | xref-list-source key | `Standard`, `Comprehensive`, `Alphabetical`, project-internal |
| `[notes]` | xref-placement key | `below-footnotes`, `side-aligned`, `inner-aligned`, `centre-column`, `column-aligned` |
| `[notes]` | xref-filter-to-published key | `True` / `False` |

The deck (slide 161) frames external cross-reference lists as one of the most powerful features. Walk the user through filter + placement + alignment as three orthogonal choices. The practice exercise on slide 170 is a good template.

### "Hide / show pictures globally"

Use the payload's `define` field for run-time-only override (`define: { "c_fighiderefs": "True" }`). For per-picture control, modify the piclist content in `config_files`.

### "Custom header text"

| Section | Key | Notes |
|---|---|---|
| `[header]` | header-text key | Often supports `\zvar` substitution |
| `[vars]` | user-defined variables | The user can define `headertext = MyBibleTitle` and reference it from the header settings |

For diglot or RTL-mixed headers, additional code-snippet patterns exist (slide 381). Refer the user to those if they need bilingual headers.

### "Generate a Table of Contents"

Two parts:

1. **Enable front matter** in the configuration (so the FRT book gets included).
2. **Add the ToC marker** to `FRTlocal.sfm` content (as part of the payload's `config_files`):
   ```
   \ip \ztoc|main\*
   ```

The `|main\*` parameter accepts the variants listed in Part 8 (USFM markers). Use `|nt\*` for NT-only, `|ot\*` for OT, `|sorta\*` to sort alphabetically by `\toc1`, etc.

For multiple ToCs in one publication (e.g. NT scripture + post-scripture peripherals), the column-alignment trick is to edit the `cat:toc|tc1` style's Space-Before Factor at the project level (slide 311).

### "Make a draft (low-quality, fast)"

Use Quick Run (slide 388):

| Approach | What it does |
|---|---|
| Set `mode: "simple"` in the payload | One-pass typesetting; skips multi-pass autofill |
| Set output format to Screen-Quickest in `define` | Skips post-processing for fastest preview |

Use for fast iteration. Do not use for final output.

### "Output as black-and-white / colour / spot-colour"

| Section | Key | Common values |
|---|---|---|
| `[finishing]` | output format key | `Print-CMYK`, `Print-Gray`, `Print-Spot`, `Screen-Quickest`, `Digital-RGB`, `Digital-CMYK` |

Slide 369 enumerates these. Print-CMYK for full-colour offset print; Print-Gray for B/W; Print-Spot for two-colour publications.

Watch for:
- Print formats are slower than screen formats; set Screen-Quickest during iteration, then switch to Print-CMYK for the final.

### "Add a watermark"

The deck mentions a Watermark setting and includes it in the Settings-search exercise (slide 69). The exact key is not surfaced in the deck text; query canon or the tooltip dump.

### "Booklet pagination"

| Section | Key | Common values | Notes |
|---|---|---|---|
| `[finishing]` | booklet-up key | `2-up`, `4-up`, `8-up` | |
| `[finishing]` | booklet-flip key | `short-edge`, `long-edge` | Depends on imposition |
| `[finishing]` | fold-first key | `True` / `False` | For some bind orders |

Slide 360 documents a 16-page test pattern: build a 16-page PDF, enable 4-up, set physical paper to A3, print back-to-back, fold top-to-bottom then left-to-right, staple and trim.

### "Set up a diglot"

This is a multi-step workflow, not a single setting:

1. Identify the two projects (primary, secondary).
2. Create a new configuration in the primary project for the diglot publication.
3. Configure `[diglot_L]` (typically the primary) and `[diglot_R]` (typically the secondary) with project, config, fraction (column width), font size.
4. Choose a merge strategy: chapter-merge, normal-merge, or verse-merge. The corresponding `merge-*.cfg` files are generated.
5. Address picture handling (single vs dual captions), versification mismatches (slide 228), font choices for both columns.

The deck (slide 218) names this as a multi-axis problem. Don't promise the user a quick setup. Walk them through each axis.

### "Lock down a setting for a cluster"

See Part 4. The agent edits `ptxprint_project.cfg` (project-wide) or `ptxprint_override.cfg` (config-specific) in project state, confirming with the user before doing so, and includes them in subsequent payloads.

---

## Part 6 — Supporting Files

> **In v1.2, the file paths described below are not paths the agent writes to on the server. They are relative-path keys in the payload's `config_files` map. The worker materializes these files at the corresponding paths in its scratch dir before running PTXprint. The agent reads the existing content from project state, modifies it as needed, and includes the new content in the next payload submission.**

The configuration is a folder, not a file. Six supporting files are common; the agent works with all of them.

### `changes.txt` — surgical text manipulation

The single most useful supporting file. A regex-based USFM transformation language applied before typesetting. Lives at:

- `shared/ptxprint/changes.txt` — project-wide (often `include`s `PrintDraftChanges.txt`).
- `shared/ptxprint/<config>/changes.txt` — config-specific.

Five scoping levels (slides 396–397):

```
"Jesus" > "Yesu"                                # global
at GLO "\\p \\k " > "\\ili \\k "                # book-restricted
at JHN 2 "grape juice" > "wine"                 # book + chapter
at MAT 7:23 "old text" > "new text"             # book + chapter + verse
in '\\f .+?\\f\\*': 'Syria' > 'Aram'            # environment-restricted
at LUK 3:10 in '\\f .+?\\f\\*': "old" > "new"   # combined
```

When to use:
- Temporary fix without round-tripping to Paratext.
- Cross-cutting change (e.g. all instances of a name).
- USFM markup adjustment (e.g. `\p` → `\nb` at specific locations).
- Inserting ornament rules under all main titles.
- Inserting page breaks at specific references.

Use `\\` for USFM markers in regex (the backslash is a regex metacharacter).

When NOT to use:
- The change should be permanent in source — let the team make it in Paratext.
- The agent is uncertain about the regex — test on a single book first; the failure mode is silent text corruption.

### `ptxprint.sty` — USFM stylesheet overrides

Lives at:

- `shared/ptxprint/ptxprint.sty` — project-wide (often blank).
- `shared/ptxprint/<config>/ptxprint.sty` — config-level.
- `shared/ptxprint/<config>/ptxprint-mods.sty` — additional modifications.

Contains marker-style declarations. Format:

```
\Marker mt1
\Color 333333
\FontSize 1.4
\Bold

\Marker cat:coverfront|mt1
\Color FFFFFF
\FontSize 2.0
```

The category-and-id qualifier (`cat:coverfront|mt1`) lets the same marker style differently in different contexts. Slide 211 documents this pattern.

When to edit:
- The user needs styling beyond what the GUI Styles tab exposes.
- Defining ornament categories (slide 300).
- Style overrides for specific peripheral books or cover sections.

When NOT to edit:
- The user is in the GUI; let them use the Style Editor.
- The change is generic styling that the GUI Styles tab covers — modify `ptxprint.cfg` content instead.

### AdjLists — paragraph adjustments without right-click

In the GUI, paragraph adjustment is a right-click affordance on the preview pane. In headless, it's a payload entry. AdjLists live at:

```
shared/ptxprint/<config>/AdjLists/<num><BOOK><prj>-<config>[.SFM|-diglot].adj
```

Filename example: `46ROMWSG-FancyNT.SFM.adj` — `46` is the book number for Romans, `ROM` is the book code, `WSG` is the project, `FancyNT` is the config.

Format:

```
% comment lines start with %

# Basic — shrink/grow paragraph at a reference by N lines
ROM 2.6 -1
MAT 1.1 +1

# With paragraph index [P]
MAT 1.1 +1[4]

# With hints
MAT 1.1 +0% +[2] +[3]

# Extended — adjust lines AND scale paragraph text
ISA 6.11 -1 % mrk=q expand=98
ISA 7.23 +1 % mrk=p expand=103

# Diglot — L and R suffixes target left / right columns
MRKL 1.1 +0
MRKR 1.1 +2

# Glossary — keyword reference
GLOR k.Adam 0
```

When to write:
- The user reports an overfull box, widow, or orphan at a specific reference.
- The user wants to shrink or expand a specific paragraph by N lines.
- The user is in headless context and cannot use the right-click GUI workflow.

When NOT to write:
- The user is in the GUI — direct them to right-click on the preview pane.
- The fix is layout-wide — adjust the paragraph or font settings, not individual paragraphs.
- The agent is guessing — adjustments that go in the wrong direction make the layout worse.

### `<PRJ>-<Config>.piclist` — picture placements

Lives at `shared/ptxprint/<config>/<PRJ>-<Config>.piclist`. One entry per line:

```
JHN 3.16 God so loved the world|src="AB01234.tif" size="col" pgpos="br" ref="3:16"
```

Fields:

| Field | Required | Common values |
|---|---|---|
| `BOOK c.v caption` | yes | The verse anchor (text before the `\|`) |
| `src` | yes | Image filename |
| `size` | yes | `col` or `span` |
| `pgpos` | yes | `tl`, `tr`, `bl`, `br`, `t`, `b`, `h`, `p` (1-2 letter codes) |
| `ref` | yes | Caption reference in `c:v` format |
| `scale` | no | e.g. `0.8` |
| `copy` | no | Copyright attribution |

The agent constructs the piclist content as text and includes it in the payload's `config_files` at the appropriate path. Canon's `payload-construction.md` documents the line format with examples.

### `FRTlocal.sfm` — front matter content

Lives at `shared/ptxprint/<config>/FRTlocal.sfm`. USFM source for the front matter. Three modes the user picks from (slide 322):

- **Basic** template: title page, publication data, ToC.
- **Advanced** template: title, pubdata, foreword, preface, ToC, alphabetical contents, four cover periphs (coverback, coverfront, coverspine, coverwhole).
- **Paratext copy**: a local copy of the project's FRT book the user can modify.

Special PTXprint codes in front matter (slide 324):

```
\zcopyright                             no |variable, no closing \*
\zlicense                               same
\zimagecopyrights[LANG]                 same; LANG: en, hu, ro, fr, es, id
\zccimg by-nd|size="col" pgpos="p" scale="0.20"\*
\ztoc|main\*                            generate ToC; |main, |ot, |nt, |sortc, etc.
\zvar|variablename\*                    insert from [vars] section
\zbl|3\*                                3 blank lines
\zgap|1.3cm\*                           vertical gap; mm/in/em/pt accepted
\nopagenums  \dopagenums  \resetpagenums -1
```

### Cover periphs (when generating wrap-around covers)

Inside `FRTlocal.sfm` content or as a separate periph definition:

```
\periph Front Cover|id="coverfront"
\periph Back Cover|id="coverback"
\periph Spine|id="coverspine"
\periph Whole Cover|id="coverwhole"
```

Each carries its own content. The Cover Wizard generates these in the GUI; the agent constructs them as USFM directly in the payload's `FRTlocal.sfm` content.

---

## Part 7 — USFM in Headless Context

The agent must be fluent in USFM markers, especially the PTXprint extensions.

### USFM book codes

Three-letter codes for all 66+ canonical books plus peripherals. Common ones:

| Code | Book | Code | Book |
|---|---|---|---|
| GEN | Genesis | MAT | Matthew |
| EXO | Exodus | MRK | Mark |
| LEV | Leviticus | LUK | Luke |
| NUM | Numbers | JHN | John |
| DEU | Deuteronomy | ACT | Acts |
| ... | ... | ROM | Romans |
| PSA | Psalms | 1CO | 1 Corinthians |
| PRO | Proverbs | ... | ... |
| ISA | Isaiah | REV | Revelation |

Peripherals:

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

For book-list strings (the payload's `books` field), separate codes with spaces: `"MAT MRK LUK JHN"`. PTXprint also accepts ranges (`MAT-JHN`) but the deck recommends explicit codes for clarity.

### Standard USFM markers the agent will encounter

| Marker | Meaning |
|---|---|
| `\id <CODE>` | Book identifier |
| `\h <name>` | Running header |
| `\toc1` / `\toc2` / `\toc3` | ToC fields (long, short, abbreviated) |
| `\mt1` / `\mt2` / `\mt3` | Main title hierarchy |
| `\c <num>` | Chapter |
| `\v <num>` | Verse |
| `\p` | Paragraph |
| `\nb` | No-break paragraph (continuation) |
| `\q1` / `\q2` | Poetry levels |
| `\s` / `\s1` / `\s2` | Section headings |
| `\r` | Parallel passage reference |
| `\f ... \f*` | Footnote |
| `\x ... \x*` | Cross-reference |
| `\fig ...\fig*` | Figure/picture |
| `\w word\|target\w*` | Glossary word |
| `\ip` | Introduction paragraph |
| `\io1` / `\io2` | Introduction outline |

### PTXprint extensions (the `\z*` markers)

These are not standard USFM; they are PTXprint-specific:

| Marker | Purpose | Example |
|---|---|---|
| `\zrule` | Decorative rule | `\zrule\|cat="ornaments3" width=".5" align="c" thick="8pt"\*` |
| `\zqrcode` | QR code | `\zqrcode\|pgpos="cr" size="1.2cm" data="https://..."\*` |
| `\zccimg` | Creative Commons logo | `\zccimg by-nd\|size="col" pgpos="p" scale="0.20"\*` |
| `\zvar` | Variable substitution from `[vars]` | `\zvar\|booktitle\*` |
| `\zbl` | Blank lines | `\zbl\|3\*` |
| `\zgap` | Vertical gap | `\zgap\|1.3cm\*` |
| `\ztoc` | Generate Table of Contents | `\ztoc\|main\*` |
| `\zglot` | Diglot side selector | `\zglot\|R\*` |
| `\zthumbtab` | Thumb tab definition | `\zthumbtab bookname` |
| `\zifvarset` | Conditional content | `\zifvarset\|var="varname"\*` |
| `\zlabel` / `\zpage` / `\zref` | Cross-references in front matter | `\zref\|id="uniquelabel" show="b_c:v"\*` |

### TeX hooks (in `ptxprint-mods.tex` or `*-mods.tex`)

For low-level layout control:

| Hook | Pattern | Purpose |
|---|---|---|
| `\sethook{pos}{mrkr}{code}` | `pos` = `start`/`end` | Run code at marker boundaries |
| `\setcvhook{ref}{code}` | `ref` = `BOOK c.v` | Run code at a chapter:verse |
| `\setbookhook{pos}{book}{code}` | `pos` = `start`/`end`/`final` | Run code at book boundaries |
| `\setbetweenhook{m1}{m2}{code}` | | Run code between consecutive markers |

The deck (slide 380) lists dozens of snippet patterns using these hooks. Treat them as copy-paste-and-tweak templates. The v1.2 spec defers `*-mods.tex` editing as "too risky for automated use without deeper validation"; respect that boundary unless the user explicitly asks and accepts the risk.

---

## Part 8 — Workflow Recipes

### Recipe: Help me create a draft PDF for review

**Context:** User has a project with USFM source. Wants to see what it looks like in print, fast.

```
1. List configurations of the project (from project state). If none beyond Default, use Default.
2. Ask user: which book(s)? (Suggest a single short book like JUD or 3JN if they don't know.)
3. Ask user: any specific concerns? (Page size, paper, print or screen?)
4. Construct payload with project_id, config_name="Default", books=[<book>],
   mode="simple", define={"output_format": "Screen-Quickest"}. Submit via submit_typeset.
   Receive job_id.
5. Poll get_job_status until state in {succeeded, failed}.
6. Read the log_tail and the errors list for warnings.
7. Surface the pdf_url to the user, plus any non-trivial warnings.
```

Optional refinements:
- If the user has multiple configs, walk them through which one to use.
- If overfull boxes are present in the log, mention them but don't block.
- If pictures should appear but don't, run the picture troubleshooting checklist (slide 189).

### Recipe: Create a print-ready New Testament

**Context:** User has a working draft and wants the full NT typeset for print.

```
1. Confirm: which configuration represents the production layout?
   If none, walk them through creating one (Recipe: Create a new config).
2. Confirm books: standard NT is "MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV".
3. Confirm output format: Print-CMYK for colour, Print-Gray for B/W, Print-Spot for two-colour.
4. Confirm page size and paper match the printer's requirements.
5. Construct payload at full quality (mode="autofill" if the team uses autofill,
   else mode="simple"; output_format set in define or in cfg). Submit.
6. Poll get_job_status with reasonable interval (autofill on an NT can take 30+ minutes;
   set timeout in payload accordingly).
7. On completion: check failure_mode classification, page count looks right (an NT typically
   250–500 pages depending on layout), overfull_count.
8. Check pictures rendered (if pictures expected) by inspecting the PDF or the log surface.
9. Surface pdf_url, page count, log_url, and any warnings.
```

This recipe takes longer (multi-pass typesetting plus autofill if enabled). Set the payload's timeout accordingly (1800s for an NT).

### Recipe: Modify a single setting and re-run

**Context:** User wants to change one thing in an existing config and see the result.

```
1. Read the current value of the setting from project state (or from the working
   payload state if the agent has been iterating).
2. Surface: "Current value is X. You want to change to Y?" If unclear, ask.
3. Check both override files (in project state and/or working state) for this key.
   If locked, surface that and stop.
4. Update the working ptxprint.cfg content — either modify project state (write to
   disk via Claude Desktop file access, or stage in working memory).
5. Construct a new payload with the updated config_files content. Submit.
6. Poll for completion. Receive new pdf_url.
7. Surface the change visually (compare against previous pdf_url, if available)
   or numerically (page count delta, overfull count delta).
```

For exploratory changes, use the payload's `define` field instead of mutating `config_files["...ptxprint.cfg"]` — preserves the saved state.

### Recipe: Set up a diglot publication

**Context:** User has two projects (primary, secondary) and wants them side by side.

```
1. Verify both projects exist in project state (the agent has access to both, via
   Claude Desktop file access or whatever mechanism the host provides).
2. Verify the secondary project has the books the user wants.
3. Discuss merge strategy: chapter / paragraph / verse merge depending on alignment quality.
4. Create a new configuration in the primary project (e.g. "DiglotEN-FR").
5. Set [diglot_L] to point at primary project + config + column fraction.
6. Set [diglot_R] to point at secondary project + config + column fraction.
7. Address font sizing: if scripts are different, the secondary may need different fontsize.
8. Submit a payload that includes both projects' configs and a small range (single chapter)
   of books to start. Iterate by submitting new payloads.
9. Diagnose alignment. If versification differs, address that next (slide 228).
10. Iterate by submitting new payloads with adjusted config_files content.
```

Diglot is multi-axis (slide 218). Don't promise the user a one-shot setup. Walk axes in order: project pair → merge strategy → fonts → fractions → versification → pictures → headers.

### Recipe: Lock down house style for a cluster

**Note: this recipe operates on project state (the user's filesystem, Git, Paratext server, etc.), not on the typesetting MCP server. The MCP server only sees the resulting payloads at typesetting time.**

**Context:** Cluster admin wants to enforce settings across multiple projects.

```
1. Confirm with the admin which settings should be locked.
2. For each setting, decide: hard lock (no user change at all) or soft lock (* prefix, user can change temporarily).
3. For project-wide settings: write to shared/ptxprint/ptxprint_project.cfg in project state.
4. For config-specific settings: write to shared/ptxprint/<config>/ptxprint_override.cfg
   in project state.
5. Construct a payload that includes the override files in config_files and submit a
   typesetting run to verify the settings take effect.
6. Run a regression: try to override one of the locked settings via the payload's define
   field and confirm the override file wins.
7. Document for the admin which keys are locked and where.
```

Repeat per project in the cluster. The admin propagates via their team's Send/Receive workflow (Paratext, Git, etc.) — not via the MCP server.

### Recipe: Diagnose "PDF was produced but pictures are missing"

**Context:** User reports a soft failure — PDF exists, pictures don't. The `failure_mode` field on the get_job_status response will be `soft` for this case.

Walk the seven-point checklist from the master deck (slide 189):

```
1. Are pictures listed in the piclist for this configuration?
   → Inspect the piclist content in the working payload's config_files; confirm
     entries for the books being typeset.

2. Are the picture files in the payload's figures array, with valid URLs and matching
   sha256 hashes?
   → Inspect the payload (the agent has the working copy). Verify that the figures
     referenced by the piclist are present in the array and that their URLs return
     content matching the declared hashes.

3. Can PTXprint see them?
   → Look for "image not found" warnings in the log surfaced via log_tail or log_url.

4. Are all missing or just some?
   → Diff the piclist's expected entries against the log's rendered count.

5. Are Anchor Refs valid (do those verses exist)?
   → Verify against the source USFM; bridged verses can confuse anchors.

6. Are pictures too large?
   → Check the scale values in the piclist; reduce if oversize.

7. Are too many on one page?
   → Spread them across more verses by adjusting Anchor Refs.
```

Surface the specific fix to the user. If multiple issues, fix one at a time and re-submit.

### Recipe: Recover from "I can't make this setting change take effect"

**Context:** User edited a setting (or the agent did) and the output didn't change.

```
1. Confirm the cfg key was actually changed in the payload that was submitted.
   Read it back from the working payload.
2. Check ptxprint_override.cfg in the payload's config_files (and in project state).
3. Check ptxprint_project.cfg in the payload's config_files (and in project state).
4. If neither override file has the key, the issue is elsewhere:
   - Was the most recent payload actually submitted? (Look at the payload_hash in the
     last submit_typeset response.)
   - Did the agent receive a cache hit on a stale payload? (The cached field on the
     submit_typeset response indicates this.)
   - Is the parent config's value being inherited and the child's value not overriding?
5. If an override file does have the key, surface that to the user; ask whether to
   edit the override.
```

---

## Part 9 — Diagnostic Patterns

### Reading the XeTeX log

The log is uploaded to R2 alongside the PDF and surfaced via `get_job_status.log_url` (presigned R2 URL) or trimmed to the last 100 lines in `get_job_status.log_tail`. For long jobs, use `log_tail` for incremental visibility during the run; fetch the full log via `log_url` after completion.

Useful patterns to grep:

| Pattern | Meaning |
|---|---|
| `^!` | TeX fatal error. Read the next 5–10 lines for the cause. |
| `Overfull \hbox` | Horizontal overfull (line too long). One per occurrence. |
| `Overfull \vbox` | Vertical overfull (page too long). One per occurrence. |
| `Underfull \hbox` | Line too short (typically with stretched spacing). |
| `Output written on ...` | Successful PDF write; the deck's "did it complete" marker. |
| `! Undefined control sequence.` | A USFM marker the macros don't recognise. Check `ptxprint.sty`. |
| `! Missing number, treated as zero.` | A setting expected a number and got something else. (Issue #20 in the upstream repo flags this exact pattern.) |
| `image not found` (or similar) | Picture file missing from the payload's figures or wrong URL. |
| `Output written on ... (0 pages)` | XeTeX completed but produced an empty PDF. Soft failure indicator. |

### Distinguishing failure modes

> **In v1.2, `get_job_status.failure_mode` carries the classification result (one of `hard | soft | success`). The truth table below describes how that field is computed inside the worker; the agent reads the field directly without re-deriving.**

```
exit_code == 0 and pdf_exists and overfull_count < 50           → success
exit_code == 0 and pdf_exists and overfull_count >= 50          → success-with-concerns
exit_code == 0 and pdf_exists and pdf_page_count < expected     → soft failure (degraded)
exit_code == 0 and pdf_exists and "image not found" in log      → soft failure (missing pictures)
exit_code == 0 and not pdf_exists                                → impossible (XeTeX bug); investigate
exit_code != 0 and pdf_exists                                    → partial: PDF exists from previous run; ignore
exit_code != 0 and not pdf_exists                                → hard failure; read log for cause
exit_code == 4                                                   → XeTeX errors; usually a USFM markup or font issue
exit_code == 3                                                   → XeTeX completed but didn't write PDF; rare, often a permissions issue
exit_code == 1                                                   → startup failed; project not found, bad config, missing executable
```

### Common error signatures and causes

| Error pattern | Likely cause | Suggested fix |
|---|---|---|
| `! Undefined control sequence \xyz` | Custom marker not declared in `.sty` | Add the marker to `ptxprint.sty` content in the payload, or remove from source |
| `! Font \xyz not loadable` | Font missing from the payload's fonts array | Add the font to the fonts array with a valid URL+sha256 |
| `! TeX capacity exceeded, sorry` | Document complexity exceeds XeTeX limits | Reduce complexity (fewer pictures per page, simpler styles) |
| Empty PDF / "0 pages" | Source USFM is empty or malformed | Check the source files; PTXprint 3.0.9+ has pre-flight checks for this |
| Long hang during run | Hyphenation cache rebuild, or first-time picture processing | Increase the payload's timeout; check progress in log_tail |
| Pictures all missing | Piclist wrong, or figures array mismatch | Run the seven-point checklist |
| Layout looks completely wrong | Override file silently overriding | Check `ptxprint_project.cfg` and `ptxprint_override.cfg` in the payload |

### When to surface partial results

When a job fails after producing some output (a partial log, a PDF from a previous payload, a half-written piclist), surface what exists with explicit caveats:

> "The run did not complete. There's a partial log at the log_url showing the last successful step was `<X>`. The pdf_url from a previous payload (`<earlier_payload_hash>`) is still available and dates to `<date>`; it does not reflect this attempt."

Do not silently return an earlier payload's pdf_url as if it were the new result.

### Overfull box count as a layout-quality proxy

The deck (slide 350) and the v1.2 spec both flag overfull-box counts as a layout-quality signal, surfaced via `get_job_status.overfull_count`. Rough thresholds for an NT-sized publication:

| Count | Interpretation |
|---|---|
| < 20 | Excellent; nothing to do |
| 20–50 | Normal; some justification stretching |
| 50–200 | Worth investigating; specific paragraphs may need adjustment |
| 200–500 | Layout has problems; review font size, line spacing, column count |
| > 500 | Likely a fundamental layout mismatch (e.g. text too large for column width) |

These are heuristics, not hard rules. A poetry-heavy book runs higher than a narrative book.

---

## Part 10 — Conversational Patterns

When the agent is helping a user (rather than running autonomously), the requirements-gathering rhythm matters as much as the technical execution.

### The audience-format-scope-look-printer ladder

Before producing output, walk this in order:

1. **Audience** — who reads this? Translation team? End readers? Children? Pastors?
2. **Format** — print or digital? Paperback or hardback? Booklet or perfect-bound? Trim size?
3. **Scope** — single book, NT, full Bible, derivative module?
4. **Look-and-feel** — minimalist? Decorative? Diglot? Large print?
5. **Printer** — who's printing? What page sizes do they offer? CMYK or spot?

Each answer constrains the next. The deck (slide 97) frames the same checklist for layout decisions; this is the conversational version.

When the user has already answered some of these in their initial message, skip those rungs. Do not re-ask what they've already told you.

### When to confirm vs. when to act

**Confirm before acting when:**
- The change is permanent (writing to `ptxprint.cfg` in project state rather than using `define`).
- The change might affect other users (override files, files the user pushes back to their Paratext / Git project store).
- The user's request is ambiguous (e.g. "make it look nicer" — too vague).
- The cost of a wrong action is high (an hour-long autofill run on a Bible).

**Act without confirming when:**
- The user's intent is clear and the change is reversible.
- The user is iterating fast and confirmation slows the rhythm.
- The action is read-only (querying canon, inspecting a previous payload, comparing pdf_urls).
- The user has explicitly said "just do it" or set a similar expectation.

### Surfacing complexity progressively

Mirror the Mini/Basic/Full pattern in your responses:

- **Mini (default)** — answer the user's immediate question with the minimum context. Don't volunteer the 27 related settings they could also change.
- **Basic (on follow-up)** — when the user asks a follow-up that suggests they want more depth, surface the related controls.
- **Full (on explicit request)** — when the user asks "what else can I change?" or "show me everything", expand fully.

The pattern's failure mode is dumping all 400 settings on the user's first question. Resist that. Answer the question, then offer to go deeper.

### The escalation ladder for "I don't know"

When the agent does not know:

1. **Search canon** (`oddkit_search`) for the user's intent or the setting name.
2. **Check the running tooltip** (canon should be seeded with the tooltip dump).
3. **Look at the existing project** — is there an example config that shows the setting in use?
4. **Recommend the user check the running PTXprint UI** — the tooltip is canonical.
5. **Recommend the community forum** at support.bible/ptxprint for project-specific questions.
6. **Acknowledge the gap honestly** — "I don't have this in my reference. Here's where to look."

Do not fabricate. Do not guess at settings names. Do not claim a feature exists without evidence.

### When the user is frustrated

Translation projects are long, and PTXprint is not the most-loved tool in their pipeline. Users sometimes describe problems with frustration. The right response posture:

- Acknowledge the frustration without dwelling on it.
- Move directly to diagnosis: "Let's look at the log together."
- Be specific about what you can and cannot do: "I can read the log and tell you what XeTeX is complaining about. I can't tell you whether the underlying USFM is correct without seeing it."
- If the issue is outside your scope, name that clearly: "This sounds like a font issue rather than a PTXprint issue. The PTXprint forum has a thread on this — would you like me to point you to it?"

### When the user is over-confident

Sometimes a user (or another AI) will assert a setting name or behaviour that is wrong. The right posture:

- Verify before agreeing.
- If the assertion contradicts what you know, say so: "I have this section as `[paper]`, not `[page]`. Let me verify before we write."
- Offer to look it up rather than argue.

The user and the agent are co-authoring the project's accumulated knowledge. Errors that ship as "confirmed by the AI" become harder to fix later than errors flagged as uncertain.

---

## Part 11 — Settings That Need Special Handling

### Never set without explicit confirmation

These have high blast radius or surprising side effects:

| Setting class | Reason |
|---|---|
| Inter-character spacing (Fonts+Scripts tab) | Slide 115 explicitly warns of disastrous results in some scripts |
| Hyphenation flags for projects without a wordlist | Will silently produce wrong breaks in vernacular text |
| Font changes for non-Latin scripts | Risk of missing-glyph tofu without warning |
| Script direction (RTL/LTR) | Affects layout globally; difficult to undo cleanly |
| Versification model | Side-by-side alignment depends on this |
| Output format final-stage decisions | CMYK vs RGB vs Spot affects downstream printer workflow |
| Override file additions | Cluster propagation via the user's Paratext / Git workflow |
| changes.txt rules using broad regex | Risk of unintended replacements |

### Test before committing

For any of the above, the agent should:

1. Make the change as a payload `define` field (transient) or by including a modified `ptxprint.cfg` in the payload (mutating only the working state, not yet persisted to project storage). Submit and observe.
2. Run typesetting on a single short book (JUD, 3JN, PHM are all under 1 chapter and good test cases).
3. Surface the result for user review.
4. Only after explicit user confirmation, persist the change to project state.

### Rollback patterns

Every payload submission produces a content-addressed result in R2. The agent maintains a small history of submitted payloads (in working memory or persisted, depending on the host environment). To roll back: re-submit the prior payload. The cached output URL returns immediately — no re-run.

For changes that span multiple files, the rollback unit is the payload, not individual files. Maintaining payload history is the agent's responsibility; canon's `payload-construction.md` recommends keeping the last N payloads keyed by user-meaningful labels (`before-margin-change`, `v1-final`, etc.).

---

## Part 12 — Open Gaps in This KB

Honest disclosure of what is not yet covered well:

1. **Exact widget-identifier names for `define` overrides.** The deck shows examples (`s_linespacing`, `c_fighiderefs`) but does not enumerate them. Canon will need a tooltip-dump-derived index for full coverage.

2. **The 400+ settings catalog.** This KB names sections and gives intent-keyed pointers but does not document every key. That belongs in canon, auto-generated from the running tooltip dump (see `transcript-encoded.md#O-003` and `O-open-P1-001`).

3. **Specific behaviour of PTXprint extensions to USFM.** The `\z*` markers are documented in the deck and in `sillsdev/ptx2pdf/docs/documentation/snippets.md`; verify against those before composing complex front-matter.

4. **Picture catalogue and download workflows.** The deck (slides 197–204) walks the GUI process. In v1.2, the agent uses LFF-equivalent or other URL-providing mechanisms to source images, then references them by URL+sha256 in the payload's `figures` array. The high-res download lifecycle (request → wait → email → download → don't-unzip) does not have a clean MCP path yet — it's a project-state concern that happens before payload construction.

5. **Cover-wizard equivalents.** The agent constructs cover periphs (coverback/coverfront/coverspine/coverwhole) directly in `FRTlocal.sfm` content and includes that in the payload's `config_files`. The deck's 6-step wizard does not have a documented headless analogue.

6. **TeX-macro injection (`*-mods.tex`, `*-premods.tex`).** The v1.2 spec defers these as too risky for automation. Until canon documents validation patterns for TeX injection, the agent should not include modified versions of these files in payloads.

7. **Validation surface — comparing produced PDF to expected output.** In v1.2, the worker performs the structural checks per the failure-mode taxonomy, and the agent receives the classification via `get_job_status.failure_mode`. Programmatic PDF Compare (the GUI feature) is not exposed via MCP yet.

8. **Diglot two-config concurrency.** When the agent is editing a diglot setup, two project-config pairs are in play simultaneously. Constructing payloads that reference both correctly is the agent's responsibility.

9. **Project state read/write mechanism.** The agent needs read/write access to the user's project storage (filesystem, Git, Paratext server, etc.) but the typesetting MCP does not provide it. For Claude Desktop users with native filesystem access, this is implicit. For other agent hosts, a separate mechanism is required and must be documented per host.

10. **Payload history persistence.** Whether the agent maintains payload history in volatile memory (current session only), persistent agent state, or external storage (Git, R2 itself, etc.) — and how to surface that history to the user for rollback purposes.

11. **Cache hit observability.** Whether the agent should distinguish "this PDF was just generated" from "this PDF was returned from cache" in user-facing messaging. `submit_typeset` returns a `cached: bool` flag; canon should describe when to surface it.

The approach for any of these: when the user's request lands in one of these gaps, surface the gap honestly, recommend canon search or the running tooltip, and proceed only with explicit user direction.

---

## Provenance

- **Source materials:** `ptxprint-master-slides.surface.json`, `ptx2pdf.surface.json`, `transcript-encoded.md` (sessions 1–5), `ptxprint-mcp-v1.2-spec.md`, the operator's PDF deck extraction. Updated 2026-04-28 to align with v1.2 stateless architecture.
- **Generated:** 2026-04-28T02:50:00Z by claude-opus-4.7 in interactive session.
- **Updated:** 2026-04-28T04:06:00Z to apply the governance update handoff (v1.2 alignment).
- **Human review status:** not reviewed.
- **Recommended next passes:** canon authoring of per-setting articles from a tooltip-dump source; integration tests for each Workflow Recipe in Part 8; a focused visual-extraction pass on dialog screenshots that show the UI grouping of settings (slides 99, 103, 113–114, 177–183, 274, 336–337) to validate the section-and-key mappings in Part 5; resolution of the new gaps in Part 12 (project state read/write mechanism, payload history persistence, cache hit observability) in companion canon articles.
