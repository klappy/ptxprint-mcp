---
title: "File System Map — What the Worker Materializes"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "filesystem", "directory-tree", "config-files"]
derives_from: "canon/governance/headless-operations.md (Part 2 File System Map)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

# File System Map

> **What this answers.** What directory tree does PTXprint expect? Which paths in the payload's `config_files` map are valid? Where does the worker put outputs?
>
> **Related articles.** `klappy://canon/articles/payload-construction` · `klappy://canon/articles/output-naming` · `klappy://canon/articles/config-inheritance-and-overrides`

---

## Why this matters

The agent does not operate against a real filesystem on the server. It builds a payload. But the payload's `config_files` map keys are **relative paths** that the worker materializes inside its scratch directory before invoking PTXprint. Knowing the expected tree tells the agent which paths are valid.

PTXprint expects a Paratext-style project layout. The worker reproduces that layout from the payload, runs PTXprint, then discards the directory.

## The tree

```
<projects_root>/<prjid>/
├── shared/                          team-visible part (origin in the user's project store)
│   └── ptxprint/
│       ├── ptxprint.sty             project-wide stylesheet (often blank)
│       ├── ptxprint-premods.tex     project-wide TeX pre-processing (rarely modified)
│       ├── changes.txt              project-wide regex transforms
│       ├── picInfo.txt              project-wide picture clearance
│       ├── picChecks.txt            project-wide picture approvals
│       ├── hyphen-<prj>.tex         hyphenation exceptions
│       ├── hyphenation.pkl          compiled hyphenation cache (auto-generated)
│       ├── ptxprint_project.cfg     PROJECT-LEVEL OVERRIDE FILE
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
│           ├── merge-chapter.cfg    diglot chapter-merge strategy (auto-generated)
│           ├── merge-normal.cfg     diglot normal-merge strategy (auto-generated)
│           ├── merge-verse.cfg      diglot verse-merge strategy (auto-generated)
│           └── AdjLists/            paragraph adjustment files
│               └── <num><BOOK><prj>-<Config>[.SFM|-diglot].adj
└── local/                           machine-local; the worker's PDF output staging
    └── ptxprint/
        ├── <PRJ>_<Config>_<bks>_ptxp.pdf      output PDF
        └── <ConfigName>/
            └── <PRJ>_<Config>_<bks>_ptxp.log  XeTeX log
```

`<prjid>` is uppercased Paratext project ID (`WSG`, `BSB`, `ULT`).
`<ConfigName>` is the config name in the case the user named it (`Default`, `FancyNT`, `JournalEdition`).

## Two trees: `shared/` and `local/`

| Tree | Origin | What lives here | Agent involvement |
|---|---|---|---|
| `shared/` | user's project store (Paratext, Git, etc.) | configs, stylesheets, supporting files | Agent reads from project state, includes in payload's `config_files` |
| `local/` | machine-local | PTXprint's PDF and log output | Agent does not touch — outputs are surfaced via R2 presigned URLs |

The agent's `config_files` map keys all start with `shared/`. The `local/` tree is created by the worker as part of running PTXprint and never appears in payload submissions.

## Mapping payload entries to paths

Every key in the payload's `config_files` is a relative path under `<prjid>/`. The most common keys, in order of how often they appear:

```
shared/ptxprint/<config>/ptxprint.cfg                primary settings (always)
shared/ptxprint/<config>/ptxprint.sty                style overrides (often)
shared/ptxprint/<config>/changes.txt                 regex transforms (sometimes)
shared/ptxprint/<config>/FRTlocal.sfm                front matter (when ToC/cover needed)
shared/ptxprint/<config>/<PRJ>-<config>.piclist      picture placements (when figures present)
shared/ptxprint/<config>/AdjLists/<num><BOOK><PRJ>-<config>.SFM.adj
                                                     paragraph adjustments (rare, per-book)
shared/ptxprint/<config>/ptxprint_override.cfg       config-level overrides (admin)
shared/ptxprint/ptxprint_project.cfg                 project-level overrides (admin)
shared/ptxprint/changes.txt                          project-wide regex transforms (rare)
shared/ptxprint/ptxprint.sty                         project-wide stylesheet (rare)
```

Note `<PRJ>` (uppercase project id) and `<config>` (case-as-named) appear in some filenames. Get them right or PTXprint won't find the file.

### AdjList filename composition

```
<num><BOOK><prj>-<config>[.SFM|-diglot].adj
  │     │      │        │     │
  │     │      │        │     └─ `.SFM.adj` for monoglot, `-diglot.adj` for diglot
  │     │      │        └────── lowercase config name (no, actually case-as-named)
  │     │      └─────────────── lowercase project id? actually case-as-named
  │     └────────────────────── three-letter USFM book code, uppercase
  └──────────────────────────── two-digit book number, zero-padded
```

Examples:
- `46ROMWSG-FancyNT.SFM.adj` — Romans (book 46), project WSG, config FancyNT, monoglot
- `41MATWSG-Diglot-diglot.adj` — Matthew (book 41), project WSG, config Diglot, diglot

The book number is the canonical USFM book number — `01` for GEN through `66` for REV plus peripheral codes. The agent should use the exact zero-padded number; PTXprint matches on filename.

## Where USFM source files go

`sources` array entries don't appear in `config_files`. The worker writes them to a per-project directory derived from `project_id` and PTXprint's expected source layout. The agent only specifies `book` and `filename` in each `sources` entry; the worker handles placement.

The standard USFM book filename pattern is `<num><BOOK><prj>.SFM` (same number+book+project pattern as AdjList filenames). Examples: `41MATWSG.SFM`, `66REVWSG.SFM`. The agent provides this in the `sources[].filename` field.

## Where fonts and figures go

Same principle: the worker handles placement. Fonts are installed into a per-job fontconfig directory; figures are placed where PTXprint's piclist resolution looks for them. The agent specifies URL+sha256+filename; the worker materializes.

## Where outputs go

The worker stages outputs in `local/ptxprint/` (PDF) and `local/ptxprint/<ConfigName>/` (log) inside its scratch directory, then uploads them to R2 at:

```
ptxprint-outputs/<payload_hash>/<PRJ>_<Config>_<bks>_ptxp.pdf
ptxprint-outputs/<payload_hash>/<PRJ>_<Config>_<bks>_ptxp.log
```

The agent never reads from `local/`. It receives presigned URLs in `get_job_status.pdf_url` and `log_url`. See `klappy://canon/articles/output-naming`.

## Things in the tree the agent does NOT include in the payload

| Path | Why excluded |
|---|---|
| `hyphenation.pkl` | Compiled cache; PTXprint regenerates from `hyphen-<prj>.tex` |
| `local/...` | Output tree, not input |
| `merge-*.cfg` | Auto-generated by PTXprint when diglot config is set up — agent doesn't author |
| `picChecks.txt` | Picture approval state usually managed by GUI; agent may include if user has explicitly authorized |
| `ptxprint-premods.tex` | TeX macro injection — v1.2 defers as too risky for automation |
| `*.bak` files | Backups |

If the agent has read these files from project state and is uncertain whether to include them, the rule is: **include only what's needed.** Smaller payloads hash differently when something irrelevant changes; larger payloads cache-miss more often.

## Things in the tree that ARE optional inputs

The agent **may** include these when relevant:

| Path | When to include |
|---|---|
| `shared/ptxprint/changes.txt` | Project-wide transforms — usually contains `include` directives to a `PrintDraftChanges.txt` file the user maintains |
| `shared/ptxprint/<config>/changes.txt` | Config-specific transforms (this run only) |
| `shared/ptxprint/<config>/ptxprint-mods.sty` | Additional style modifications layered on top of `ptxprint.sty` |
| `shared/ptxprint/<config>/picInfo.txt` | Picture copyright/clearance metadata, when the agent has the data |

When in doubt, include text artifacts that exist in project state and are non-empty. They cost little; their absence may cause rendering differences the agent can't predict.

## What about the `<prjid>` value?

`<prjid>` in the payload's `project_id` field should match what PTXprint expects: the Paratext project ID, uppercased, no extension. Examples: `WSG`, `BSB`, `ULT`, `WEB`. This becomes the directory name the worker creates and uses to construct USFM source paths.

If the user's project store uses a different name, the agent normalizes to the Paratext ID before constructing the payload.

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`. See also: `klappy://canon/articles/payload-construction` for how this tree maps into a JSON payload.*
