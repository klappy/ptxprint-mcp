---
status_note: "Aligned with PTXprint MCP v1.0/v1.1 conventions. Pending update to v1.2 per canon/handoffs/governance-update-handoff.md. Until updated, treat references to specific MCP tools (read_file, write_file, set_config_values, resolve_config, predict_output_paths, get_config, describe_setting, .bak rollback) as historical."
title: "PTXprint Headless Operations — Knowledge Base for AI Agents and Assistants"
audience: agent
exposure: working
voice: instructional
stability: pending_v1.2_alignment
tags: ["ptxprint", "headless", "mcp", "agent-kb", "operations", "non-canonical", "pre-v1.2"]
derives_from: "ptxprint-master-slides.surface.json, ptx2pdf.surface.json, transcript-encoded.md, ptxprint-mcp-v1-spec.md"
generator: "claude-opus-4.7 (interactive session)"
created_at: 2026-04-28T02:50:00Z
canonical_status: non_canonical
intended_consumer: "AI agent operating the PTXprint MCP server directly, or AI assistant helping a user create configs and produce PDFs conversationally via the MCP server"
---

> **STATUS — PENDING v1.2 ALIGNMENT.** This document was authored against PTXprint MCP server v1.0/v1.1 conventions (filesystem-based, 7 tools). The current spec is v1.2-draft (stateless content-addressed build system, 4 tools). An edit script for aligning this document to v1.2 lives at [`canon/handoffs/governance-update-handoff.md`](../handoffs/governance-update-handoff.md) — apply that handoff to overwrite this file. Until applied, references herein to specific MCP tools (`read_file`, `write_file`, `set_config_values`, `resolve_config`, `predict_output_paths`, `get_config`, `describe_setting`, `.bak` rollback) are historical.

# PTXprint Headless Operations — KB for AI Agents and Assistants

> **What this KB is.** Operational knowledge for an AI working with PTXprint through the headless CLI or the MCP server — not through the GUI. Two audiences share it: (1) an autonomous agent that runs the MCP server directly to produce PDFs, and (2) an AI assistant guiding a human user conversationally through MCP-mediated config creation. Both touch the same surface; both need the same knowledge.

> **What this KB is not.** Not the MCP server's API specification (that lives in `ptxprint-mcp-v1-spec.md`). Not the catalog of all 400+ settings (that lives in canon, derived from the running tooltip dump). Not the user-facing training manual (that lives in `ptxprint-user-support.md`). This document is the operational layer between the spec and the user.

> **Containment.** Non-canonical. Where this disagrees with the running PTXprint product, the product wins. Where this disagrees with canon, canon wins. Verify settings names against the running UI before encoding into production code.

---

## Part 0 — The Headless Operating Contract

### What "headless" means here

A headless PTXprint run is a subprocess invocation that takes a project directory plus a named configuration plus optional book and setting overrides, and produces a PDF plus a log. No GUI process starts. No user interaction is possible during the run.

The contract is exactly:

| | |
|---|---|
| Inputs | A project on disk (`<projects_root>/<prjid>/`) containing at minimum `shared/ptxprint/<config>/ptxprint.cfg`, USFM source files, and any required fonts and figures |
| Inputs (optional) | A book-list override (`-b "JHN ROM"`), runtime setting overrides (`-D key=value`), a timeout |
| Outputs (success) | A PDF at `<project>/local/ptxprint/<PRJ>_<Config>_<bks>_ptxp.pdf` and a log at `<project>/local/ptxprint/<Config>/<PRJ>_<Config>_<bks>_ptxp.log` |
| Outputs (failure) | Either no PDF (exit code 1, 3, or 4) or a PDF that exists but is degraded — pictures missing, ToC missing, layout malformed |
| Side effects | Tmp files in `<project>/local/ptxprint/<Config>/` (cleaned up on success); a `.bak` backup of `ptxprint.cfg` if the agent wrote to it |

### Three failure modes, not two

Headless typesetting has three outcomes, not the two an agent might expect:

1. **Hard failure** — exit code non-zero AND no PDF produced. The XeTeX log usually has `^!` lines naming the cause.
2. **Soft failure** — exit code 0, PDF exists, but the PDF is incomplete or degraded. Pictures missing, ToC blank, footnotes dropped, sections collapsed. The log may show warnings but no fatal errors.
3. **Success** — exit code 0, PDF exists, no degradation. The log may still contain dozens of overfull-box warnings; that is normal.

An agent that checks only exit code or only PDF existence will report soft failures as success. The validation layer must check **both** the exit code AND the PDF's structural soundness against expectations (e.g. "I asked for pictures; are pictures present?"). See Part 9.

### What headless cannot do that the GUI can

- **Interactive paragraph adjustment via right-click on the preview pane.** The agent's substitute is to write AdjList files (see Part 7).
- **Right-click on a verse to send the reference back to Paratext.** No equivalent in headless.
- **Right-click on a picture to manage placement and selection.** The agent's substitute is to edit the piclist file directly.
- **The settings search box.** The agent's substitute is to query canon (`oddkit_search`) or, if a tooltip-dump tool is exposed by the MCP server, query that.
- **The Help tab and embedded chatbot.** The agent's substitute is canon retrieval and external documentation links.
- **The Typesetting Report's interactive UI.** The agent reads the same data from the log file.
- **Live preview pane.** The agent must produce a PDF and inspect it (or its log) — there is no continuous-feedback loop.
- **The Cover Wizard's 6-step UI.** The agent must edit cover-related cfg keys and the FRTlocal.sfm cover periphs directly.
- **The Style Editor's interactive font browser.** The agent must edit `ptxprint.sty` directly.
- **The DC Cook permission Google Form prefill.** The agent must direct the user to the GUI or the standalone web form.
- **Send/Receive of configurations.** The agent works with files on disk; cluster sync requires the user to run Paratext.

### Where this knowledge lives at runtime

When the agent does not know what a setting does:

1. Search this KB for an intent-keyed recipe (Part 6).
2. Search canon (`oddkit_search`) for the section, key, or the user's intent phrase.
3. If the MCP server exposes a `describe_setting` tool, query it for the running tooltip and the cfg-key mapping.
4. If still unknown, surface the gap to the user with: "I don't have documented behaviour for this; would you like to look it up in the running tooltip?"

Never fabricate a settings name. Cfg keys with plausible-looking names that don't exist will be silently ignored by PTXprint, leaving the user with output that did not change in the way they expected — and the agent unable to explain why.

---

## Part 1 — The CLI Reference

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
| `-P <prjid>` | yes | Paratext project ID (the folder name under `<projects_root>`) |
| `-c <config>` | no (defaults to `Default`) | Named configuration to use |
| `-b "<codes>"` | no | Space-separated USFM book codes; overrides the cfg's `[project] booklist` value for this run only |
| `-p <path>` | no | Projects root directory; repeatable for multi-root setups |
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

`-D key=value` is the agent's most useful flag for parameterised runs. It accepts any PTXprint widget identifier and value, applied at runtime without persisting to `ptxprint.cfg`.

Example from the existing MCP spec:

```
ptxprint -P WSG -c Default -D s_linespacing=14 -D c_fighiderefs=True
```

Widget identifier conventions:

- `s_<name>` — string or numeric setting
- `c_<name>` — checkbox / boolean setting
- `r_<name>` — radio / enum setting
- `t_<name>` — text-area setting
- Prefixes are not 100% consistent; verify against the tooltip-dump source.

When to use `-D` instead of writing to `ptxprint.cfg`:

- The override is for this run only (e.g. "produce a draft with 13pt spacing" while the saved config stays at 14pt)
- The user is exploring options and you don't want to pollute the config history
- The run is parameterised by an external system (e.g. quarterly auto-generation with rotating output formats)

When to write to `ptxprint.cfg` instead:

- The change should persist across runs
- Other team members will use this configuration via Send/Receive
- The change is part of a finalised config the user is committing to

### The relationship to the Python module

PTXprint's headless entry point is `python/lib/ptxprint/runjob.py` in the upstream `sillsdev/ptx2pdf` repo (per `ptx2pdf.surface.md` L2). The CLI binary above wraps this module. An MCP server can either:

- Invoke the CLI binary as a subprocess (the v1 path; simpler, more isolated, slower startup).
- Import the Python module and call its entry function directly (faster but requires the server to share the PTXprint dependency tree, including PyGObject/GTK imports that may not run cleanly without an X server).

The v1 spec uses subprocess invocation. Stay there until profiling justifies the switch.

---

## Part 2 — File System Map

### The two trees per project

Every PTXprint-aware project has two parallel subtrees under its root:

```
<projects_root>/<prjid>/
├── shared/                          team-visible, Send/Receive-replicated
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
│           ├── ptxprint.cfg.bak     auto-backup of previous cfg
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
└── local/                           machine-local, NOT replicated
    └── ptxprint/
        ├── <PRJ>_<Config>_<bks>_ptxp.pdf      output PDF
        └── <ConfigName>/
            └── <PRJ>_<Config>_<bks>_ptxp.log  XeTeX log
```

The `shared/` vs `local/` split is intentional: settings travel with the team via Paratext Send/Receive; outputs do not. An agent writing into `local/` is writing to a machine-specific cache; the user will need to re-run typesetting on each machine that needs the PDF.

### Output filename convention

```
<PRJ>_<Config>_<bks>_ptxp.pdf
```

Where `<bks>` is:

- A single USFM code: `JHN`
- `<first>-<last>` for multiple books: `MAT-REV`

The agent can predict the output path before running by reading `[project] bookscope`, `book`, and `booklist` from the cfg, plus any `-b` override, plus the project ID and config name. The MCP server's `predict_output_paths` tool exists for this.

### What the agent reads vs. writes

**Read-only sources:**

- USFM source files (the scripture text)
- Bundled XeTeX macros and fonts (inside the PTXprint install)
- The Paratext project's settings file (for project metadata)

**Write-only outputs:**

- The PDF and log under `<project>/local/ptxprint/`

**Read-write surfaces (the agent's main edit zone):**

- `<project>/shared/ptxprint/<config>/ptxprint.cfg`
- `<project>/shared/ptxprint/<config>/ptxprint.sty` and `ptxprint-mods.sty`
- `<project>/shared/ptxprint/<config>/changes.txt` (and the project-level one)
- `<project>/shared/ptxprint/<config>/AdjLists/*.adj`
- `<project>/shared/ptxprint/<config>/<PRJ>-<Config>.piclist`
- `<project>/shared/ptxprint/<config>/FRTlocal.sfm`

**Read-with-extreme-caution surfaces:**

- `<project>/shared/ptxprint/ptxprint_project.cfg` — locks settings across all configs
- `<project>/shared/ptxprint/<config>/ptxprint_override.cfg` — locks settings for one config

These override files can silently override the agent's writes to `ptxprint.cfg`. If a write to a key has no effect, suspect an override file. See Part 4.

---

## Parts 3–12 — PENDING UPLOAD

> **Honest status:** Parts 0–2 reproduced above are the only sections preserved in this bootstrap commit. The full original document (Parts 3 through 12 plus Provenance) was authored by the operator from a PDF extraction of the PTXprint MASTER SLIDES deck and uploaded as an attachment to a previous Claude session. That attachment did not persist into the bootstrapping session that wrote this file, so the remaining ~25KB of authored content cannot be reconstructed faithfully here.
>
> **Action required from the operator (or the session that has the original):** paste the original Parts 3–12 + Provenance into this file at this insertion point. See [`canon/PENDING_UPLOADS.md`](../PENDING_UPLOADS.md) for the full list of files needing upload.
>
> **After the full document is in place,** apply [`canon/handoffs/governance-update-handoff.md`](../handoffs/governance-update-handoff.md) to the complete text to align it with v1.2 conventions. The handoff doc names every section-level edit needed.
>
> **Authored sections that need to land:**
> - Part 3 — The Configuration Model
> - Part 4 — The Override Mechanism
> - Part 5 — Settings Cookbook (by user intent)
> - Part 6 — Supporting Files
> - Part 7 — USFM in Headless Context
> - Part 8 — Workflow Recipes
> - Part 9 — Diagnostic Patterns
> - Part 10 — Conversational Patterns
> - Part 11 — Settings That Need Special Handling
> - Part 12 — Open Gaps in This KB
> - Provenance

---

*Status: incomplete. Parts 0–2 are bootstrap context only. The complete authored document needs to be pasted in by the operator before this file is useful for the v1.2 build's smoke test.*
