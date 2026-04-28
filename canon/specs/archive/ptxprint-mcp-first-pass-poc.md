# PTXprint MCP Server — Design Specification

**Version:** 0.1  
**Date:** 2026-04-27  
**Status:** Draft — for colleague review

---

## 1. Purpose

This document specifies an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that enables an AI agent to manage PTXprint Bible typesetting configurations and trigger headless typesetting runs on a server, without any GUI.

PTXprint is a GUI tool (built on XeTeX) that typesets Paratext Bible translation projects into print-ready PDFs. The MCP server wraps its file-based configuration system and command-line interface so that an AI agent can:

- Discover available projects and configurations
- Read and modify typesetting settings
- Manage supporting files (stylesheets, text transforms, picture lists, paragraph adjustments)
- Trigger typesetting runs and retrieve results

---

## 2. Technology

| Concern | Choice |
|---|---|
| Language | Python 3.11+ |
| MCP framework | [FastMCP](https://github.com/modelcontextprotocol/python-sdk) 1.27+ |
| Transport | `stdio` (default) or `streamable-http` |
| Config parsing | Python `configparser` (standard library) |
| PTXprint invocation | `subprocess` (synchronous, blocking) |

---

## 3. PTXprint Configuration Structure

Understanding the file layout is essential background for the tool design.

### 3.1 Project tree

PTXprint stores all its configuration inside the Paratext project folder hierarchy:

```
<projects_root>/
└── <prj_id>/                          e.g.  WSG/
    ├── shared/
    │   └── ptxprint/                  ← shared (team-visible) configuration root
    │       ├── ptxprint.sty           project-wide USFM stylesheet (often blank)
    │       ├── ptxprint-premods.tex   project-wide TeX pre-processing
    │       ├── changes.txt            project-wide regex USFM transforms
    │       ├── picInfo.txt            picture copyright / clearance data (INI)
    │       ├── picChecks.txt          picture approval status (INI)
    │       ├── hyphen-<prj>.tex       hyphenation exceptions
    │       ├── hyphenation.pkl        compiled hyphenation cache
    │       └── <ConfigName>/          ← named configuration (profile)
    │           ├── ptxprint.cfg       primary settings file (INI, 400+ keys)
    │           ├── ptxprint.cfg.bak   auto-backup of previous cfg
    │           ├── ptxprint.sty       config-level USFM stylesheet
    │           ├── ptxprint-mods.sty  additional style overrides
    │           ├── changes.txt        config-specific USFM transforms
    │           ├── FRTlocal.sfm       front matter USFM content
    │           ├── <PRJ>-<Config>.piclist  picture placement list
    │           ├── picInfo.txt        config-level picture copyright (INI)
    │           ├── picChecks.txt      config-level picture approvals (INI)
    │           ├── merge-chapter.cfg  diglot chapter-merge strategy
    │           ├── merge-normal.cfg   diglot normal-merge strategy
    │           ├── merge-verse.cfg    diglot verse-merge strategy
    │           └── AdjLists/          paragraph adjustment files
    │               └── <num><BOOK><prj>-<Config>[.SFM|-diglot].adj
    └── local/
        └── ptxprint/                  ← output root (machine-local)
            ├── <PRJ>_<Config>_<bks>_ptxp.pdf    output PDF
            └── <ConfigName>/
                └── <PRJ>_<Config>_<bks>_ptxp.log    XeTeX log
```

A project can have any number of named configurations. The `Default` configuration is the standard baseline. Configurations in active use on a large project can number 30–50.

### 3.2 ptxprint.cfg

The primary settings file is a standard INI file (Python `configparser`-compatible). It contains 400+ keys across ~25 sections. Multi-line values use tab/space continuation (standard INI).

#### Sections

| Section | Content |
|---|---|
| `[import]` | Config inheritance — `config = Default` declares the parent config |
| `[color]` | Spot colour range |
| `[config]` | Name, version, UI display preferences |
| `[cover]` | Cover page spine / bleed settings |
| `[covergen]` | Cover border / image / shading generation |
| `[document]` | Body: fonts, columns, diglot mode, figures, TOC, script direction |
| `[fancy]` | Page borders, ornaments, verse decorators |
| `[finishing]` | PDF imposition, booklet output, spot colour |
| `[footer]` | Footer content and layout |
| `[grid]` | Layout debugging grid |
| `[header]` | Header content, chapter/verse range display |
| `[notes]` | Footnote and cross-reference placement and formatting |
| `[paper]` | Page size, margins, column gutters |
| `[paragraph]` | Hyphenation, justification, line spacing |
| `[poly]` | Polyglot column fraction |
| `[project]` | Book/scope selection, copyright, colophon, plugins |
| `[scripts]` | Script-specific features (CJK, Indic, Arabic, Myanmar) |
| `[slice]` | Verse-slice output settings |
| `[snippets]` | Shortcut flags (diglot, fancy, output format) |
| `[strongsndx]` | Strong's concordance generation |
| `[strongsvars]` | String variables for Strong's index headings |
| `[studynotes]` | Study notes sidebar and layout |
| `[texpert]` | Expert XeTeX settings (river threshold etc.) |
| `[thumbtabs]` | Thumb tab layout |
| `[vars]` | User-defined substitution variables (used in USFM via `\zvar|name\*`) |
| `[viewer]` | PDF quality-check flags (rivers, collisions, whitespace) |
| `[diglot_L]` | Left-column diglot settings (project, config, fraction, font size) |
| `[diglot_R]` | Right-column diglot settings |
| `[diglot_A]` / `[diglot_B]` | Additional diglot column settings (polyglot) |

#### Key settings in `[project]`

| Key | Values | Meaning |
|---|---|---|
| `bookscope` | `single` \| `booklist` \| `module` | What to print |
| `book` | USFM code e.g. `JHN` | Used when `bookscope = single` |
| `booklist` | Space-separated codes e.g. `MAT MRK LUK` | Used when `bookscope = booklist` |
| `plugins` | Comma-separated plugin names | Optional plugins to activate |
| `selectscript` | Path to a `.py` file | Python pre/post-processor script |
| `when2processscript` | `before` \| `after` | Whether script runs before or after `changes.txt` |

### 3.3 Config inheritance

When a config contains:
```ini
[import]
config = Default
```
PTXprint loads the parent config first, then applies the child's settings as overrides. The child `ptxprint.cfg` stores **only the keys that differ from the parent** — it is not a full copy. There is no reset step; the parent values persist for any key the child does not specify.

Inheritance can be chained (e.g. `MySpecial → FancyNT → Default`). The MCP server resolves the full chain when `merge_with_base = True`.

### 3.4 Output filename convention

Derived from PTXprint source (`view.py: baseTeXPDFnames`):

```
<PRJ>_<Config>_<bks>_ptxp.pdf
```

Where `<bks>` is:
- A single USFM code for a single book: `JHN`
- `<first>-<last>` for multiple books: `MAT-REV`

**PDF location:** `<prj>/local/ptxprint/<PRJ>_<Config>_<bks>_ptxp.pdf`  
**XeTeX log location:** `<prj>/local/ptxprint/<Config>/<PRJ>_<Config>_<bks>_ptxp.log`

### 3.5 AdjList format

AdjList files fine-tune paragraph line counts after typesetting. Located in `AdjLists/` within each config folder. Filename convention: `<num><BOOK><prj>-<config>[.SFM|-diglot].adj`.

```
% comment lines start with %

# Basic — shrink/grow paragraph at a reference by N lines
ROM 2.6 -1
MAT 1.1 +1

# With paragraph index [P] — target the Pth paragraph at that verse
MAT 1.1 +1[4]

# With hints (after %) — current adj is +0; paras 2 and 3 are candidates
MAT 1.1 +0% +[2] +[3]

# Extended format — adjust lines AND scale paragraph text
ISA 6.11 -1 % mrk=q expand=98     shrink 1 line; scale \q text to 98%
ISA 7.23 +1 % mrk=p expand=103    grow 1 line; scale \p text to 103%

# Diglot — L and R suffixes target left / right columns
MRKL 1.1 +0
MRKR 1.1 +2

# Glossary — keyword-based reference
GLOR k.Adam 0
```

### 3.6 Piclist format

One entry per line:

```
BOOK c.v caption text|src="filename" size="col|span" pgpos="tl|tr|bl|br|..." ref="c:v" [scale="n"] [copy="..."]
```

Example:
```
JHN 3.16 God so loved the world|src="AB01234.tif" size="col" pgpos="br" ref="3:16"
```

### 3.7 changes.txt

A project-specific regex-based USFM transformation language applied before typesetting. Supports:
- Global regex substitutions: `"pattern" > "replacement"`
- Book-scoped substitutions: `at MAT; MRK "pattern" > "replacement"`
- Verse-scoped: `at JHN 3:16 "pattern" > "replacement"`
- File includes: `include "../../../PrintDraftChanges.txt"`

---

## 4. PTXprint CLI Interface

### 4.1 Command

```bash
ptxprint -P <prjid> [-c <config_name>] [-b "<books>"] [-p <projects_dir>] [-q] [-D key=value ...]
```

| Flag | Meaning |
|---|---|
| `-P` / `--print` | Trigger headless print (required) |
| `<prjid>` | Positional: Paratext project ID |
| `-c <name>` | Named configuration to use (defaults to `Default`) |
| `-b "<codes>"` | Space-separated USFM book codes; overrides the cfg value |
| `-p <path>` | Projects root directory (repeatable) |
| `-q` / `--quiet` | Suppress splash screen and GUI |
| `-D key=value` | Override any individual UI setting at run time (repeatable) |
| `--timeout <s>` | XeTeX timeout in seconds (default: 1200) |

### 4.2 Exit codes

| Code | Meaning |
|---|---|
| `0` | Success — PDF was produced |
| `1` | Startup failure (project not found, bad config path, missing dependency) |
| `3` | XeTeX ran to completion but no PDF was produced |
| `4` | XeTeX itself returned a non-zero exit code (typesetting errors) |

### 4.3 The `-D` flag

`-D` accepts any PTXprint UI component name and value, e.g.:

```bash
ptxprint -P WSG -c Default -D c_fighiderefs=True -D s_linespacing=14
```

This allows any setting to be overridden at run time without modifying the stored `ptxprint.cfg`. Keys correspond to GTK widget names used in the PTXprint UI.

---

## 5. Server Architecture

### 5.1 Module layout

```
ptxprint-mcp/
├── server.py       FastMCP entry point; all 17 tool definitions
├── project.py      Project/config discovery; output path computation
├── cfgfile.py      ptxprint.cfg read/write (configparser wrapper)
├── files.py        Supporting files: changes.txt, stylesheets, piclist, picInfo
├── adjlist.py      AdjList folder management and format parsing
├── jobs.py         Subprocess invocation, exit code handling, log parsing
└── pyproject.toml  Package metadata
```

### 5.2 Configuration

The server reads one environment variable:

| Variable | Default | Meaning |
|---|---|---|
| `PTXPRINT_PROJECTS_DIR` | `C:\My Paratext 9 Projects` | Root of the Paratext project tree |

It can also be set via the `--projects-dir` CLI argument.

### 5.3 Transports

| Mode | How to run | Use case |
|---|---|---|
| `stdio` (default) | `python server.py` | Claude Desktop, local MCP clients |
| `streamable-http` | `python server.py --transport streamable-http --port 8000` | Remote server deployment |

### 5.4 Security model

All file read/write operations are path-sandboxed: paths are normalised and checked to ensure they remain within `<projects_root>/<prjid>/shared/ptxprint/` or `<prjid>/local/ptxprint/`. No operation can escape the project tree.

Only a fixed set of filenames may be read or written via the file tools (see §6.7).

---

## 6. Tools Reference

### 6.1 `list_projects`

**Purpose:** Discover all Paratext projects that have PTXprint configurations.

**Parameters:** none

**Returns:** `list[dict]`

```json
[
  { "id": "WSG", "config_count": 45, "configs": ["Default", "FancyNT", "Long", "..."] },
  ...
]
```

---

### 6.2 `list_configs`

**Purpose:** List the named configurations for a single project.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `project_id` | string | yes | Paratext project ID |

**Returns:** `list[string]` — config names sorted alphabetically.

---

### 6.3 `get_config`

**Purpose:** Read all settings from a configuration's `ptxprint.cfg`.

**Parameters:**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `project_id` | string | yes | — | Paratext project ID |
| `config_name` | string | yes | — | Named configuration |
| `merge_with_base` | boolean | no | `true` | If true, merge with inherited configs before returning |

**Returns:** `dict` — nested `{ section: { key: value } }`.

When `merge_with_base` is true the returned values reflect the **effective** settings after full inheritance resolution. When false, only the keys explicitly stored in this config's `ptxprint.cfg` are returned (the raw file contents).

---

### 6.4 `get_config_inheritance`

**Purpose:** Show the inheritance chain for a configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `project_id` | string | yes | Paratext project ID |
| `config_name` | string | yes | Named configuration |

**Returns:** `list[string]` — ordered from base to most specific.

Example: `["Default", "FancyNT"]` means `FancyNT` inherits from `Default`.

---

### 6.5 `set_config_values`

**Purpose:** Update specific key-value pairs in one section of `ptxprint.cfg`.

All other sections and the `[import]` inheritance link are preserved. A `.bak` backup is written before any modification.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `project_id` | string | yes | Paratext project ID |
| `config_name` | string | yes | Named configuration |
| `section` | string | yes | INI section name (e.g. `paper`, `document`, `vars`) |
| `values` | dict | yes | Key-value pairs to write into the section |

**Returns:**
```json
{ "ok": true, "config": "FancyNT", "section": "paper", "updated_keys": ["pagesize", "margins"] }
```

**Notes:**
- Creates the section if it does not already exist.
- String-coerces all values before writing (configparser requirement).
- Does **not** validate keys against a schema — unknown keys are accepted and stored; PTXprint will silently ignore them.

---

### 6.6 `create_config`

**Purpose:** Create a new named configuration folder with a minimal `ptxprint.cfg`.

**Parameters:**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `project_id` | string | yes | — | Paratext project ID |
| `config_name` | string | yes | — | Name for the new configuration |
| `base_config` | string | no | `"Default"` | Config this one will inherit from |

**Returns:**
```json
{ "ok": true, "path": "C:\\...\\WSG\\shared\\ptxprint\\MyNew", "inherits_from": "Default" }
```

**Notes:**
- Fails (raises `ValueError`) if the config already exists.
- The minimal `ptxprint.cfg` written contains only `[config] name` and `[import] config`. PTXprint populates effective defaults from the parent at run time.
- The caller is responsible for subsequently writing any non-default settings via `set_config_values`.

---

### 6.7 `get_project_file` / `set_project_file`

**Purpose:** Read or write a supporting text file, either at the project level or inside a named configuration.

**Parameters:**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `project_id` | string | yes | — | Paratext project ID |
| `filename` | string | yes | — | One of the allowed filenames (see below) |
| `config_name` | string | no | `""` | If given, accesses the config-level file; otherwise the project-level file |
| `content` | string | yes (`set` only) | — | Full file content to write |

**Allowed filenames — config level:**

| Filename | Purpose |
|---|---|
| `changes.txt` | Regex USFM text transforms (config-specific) |
| `ptxprint.sty` | USFM stylesheet overrides |
| `ptxprint-mods.sty` | Additional style modifications |
| `FRTlocal.sfm` | Front matter USFM content |
| `picInfo.txt` | Picture copyright / clearance data |
| `picChecks.txt` | Picture approval status |

**Allowed filenames — project level:**

| Filename | Purpose |
|---|---|
| `changes.txt` | Project-wide USFM transforms (often contains `include` to `PrintDraftChanges.txt`) |
| `ptxprint.sty` | Project-wide stylesheet |
| `ptxprint-premods.tex` | Project-wide TeX pre-processing |
| `picInfo.txt` | Project-wide picture clearance data |
| `picChecks.txt` | Project-wide picture approvals |

`get_project_file` returns `""` (empty string) when the file does not yet exist.

---

### 6.8 `list_adjlists`

**Purpose:** List all AdjList files present for a configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `project_id` | string | yes | Paratext project ID |
| `config_name` | string | yes | Named configuration |

**Returns:** `list[dict]`

```json
[
  { "book": "MAT", "filename": "41MATWSG-FancyNT.SFM.adj", "entry_count": 84 },
  { "book": "ROM", "filename": "46ROMWSG-FancyNT.SFM.adj", "entry_count": 8 },
  ...
]
```

`entry_count` is the number of non-comment, non-blank lines.

---

### 6.9 `get_adjlist`

**Purpose:** Read an AdjList file for a specific book.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `project_id` | string | yes | Paratext project ID |
| `config_name` | string | yes | Named configuration |
| `book` | string | yes | USFM book code (e.g. `ROM`, `MAT`) |

**Returns:** string — raw file content, or `""` if no file exists.

**AdjList line syntax** (see §3.5 for full description):

```
BKK c.v ±N[P] [% hints | mrk=<marker> expand=<pct>]
```

- `BKK` — 3-letter USFM book code; append `L` or `R` for diglot left/right column
- `c.v` — chapter.verse reference (e.g. `3.16`) or keyword ref for glossary (e.g. `k.Adam`)
- `±N` — integer line adjustment; `+0` means no adjustment (hint-only)
- `[P]` — optional paragraph index within the verse
- `% hints` — candidate paragraphs as `+[2] +[3]` (auto-generated by PTXprint)
- `mrk=<m>` — USFM marker whose paragraph text should be scaled (extended format)
- `expand=<pct>` — text scale percentage, e.g. `98` = 98% of normal (extended format)

---

### 6.10 `set_adjlist`

**Purpose:** Write an AdjList file for a specific book. Creates `AdjLists/` directory if needed; overwrites any existing file for that book.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `project_id` | string | yes | Paratext project ID |
| `config_name` | string | yes | Named configuration |
| `book` | string | yes | USFM book code |
| `content` | string | yes | Full file content |

**Returns:**
```json
{ "ok": true, "path": "C:\\...\\AdjLists\\46ROMWSG-FancyNT.SFM.adj" }
```

**Notes:**
- The server locates an existing file by scanning for a matching book code prefix. If none is found, a new file is created using the canonical naming convention: `<num><BOOK><prj>-<config>.SFM.adj`.
- The caller is responsible for providing syntactically valid AdjList content; the server writes it verbatim.

---

### 6.11 `delete_adjlist`

**Purpose:** Delete the AdjList file for a specific book.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `project_id` | string | yes | Paratext project ID |
| `config_name` | string | yes | Named configuration |
| `book` | string | yes | USFM book code |

**Returns:**
```json
{ "ok": true, "message": "deleted" }
```
or `{ "ok": false, "message": "file not found" }` if no file existed.

---

### 6.12 `get_piclist`

**Purpose:** Read the picture placement list for a configuration, parsed into structured entries.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `project_id` | string | yes | Paratext project ID |
| `config_name` | string | yes | Named configuration |

**Returns:** `list[dict]`

```json
[
  {
    "reference": "JHN 3.16",
    "caption": "God so loved the world",
    "src": "AB01234.tif",
    "size": "col",
    "pgpos": "br",
    "ref": "3:16",
    "scale": "",
    "copy": ""
  },
  ...
]
```

Returns `[]` if no piclist file exists.

---

### 6.13 `set_piclist`

**Purpose:** Write the picture placement list for a configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `project_id` | string | yes | Paratext project ID |
| `config_name` | string | yes | Named configuration |
| `entries` | list[dict] | yes | Picture entries (schema below) |

**Entry schema:**

| Field | Required | Description |
|---|---|---|
| `reference` | yes | `"BOOK c.v"` e.g. `"JHN 3.16"` |
| `caption` | yes | Caption text (may be vernacular Unicode) |
| `src` | yes | Image filename |
| `size` | yes | `"col"` or `"span"` |
| `pgpos` | yes | Page position: `tl`, `tr`, `bl`, `br`, `t`, `b`, `h`, `p` |
| `ref` | yes | Verse reference in `c:v` format e.g. `"3:16"` |
| `scale` | no | Scale factor, e.g. `"0.8"` |
| `copy` | no | Copyright attribution string |

**Returns:**
```json
{ "ok": true, "entry_count": 42 }
```

---

### 6.14 `predict_output_paths`

**Purpose:** Compute the expected output PDF and log paths for a typesetting run, without invoking PTXprint.

Useful for checking whether a previous run's output still exists, or for constructing download URLs before a run.

**Parameters:**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `project_id` | string | yes | — | Paratext project ID |
| `config_name` | string | no | `"Default"` | Named configuration |
| `books` | string | no | `""` | Space-separated USFM codes. If empty, reads from ptxprint.cfg |

**Returns:**
```json
{
  "pdf":     "C:\\...\\WSG\\local\\ptxprint\\WSG_FancyNT_MAT-REV_ptxp.pdf",
  "log":     "C:\\...\\WSG\\local\\ptxprint\\FancyNT\\WSG_FancyNT_MAT-REV_ptxp.log",
  "workdir": "C:\\...\\WSG\\local\\ptxprint\\FancyNT"
}
```

---

### 6.15 `run_typeset`

**Purpose:** Invoke PTXprint to typeset a project configuration. Blocks until completion.

**Parameters:**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `project_id` | string | yes | — | Paratext project ID |
| `config_name` | string | no | `"Default"` | Named configuration |
| `books` | string | no | `""` | Space-separated USFM codes; overrides the cfg value |
| `define` | dict | no | `{}` | UI key-value overrides passed via `-D` (see §4.3) |
| `timeout` | integer | no | `1200` | Maximum seconds to wait for XeTeX |

**Returns:**
```json
{
  "exit_code":      0,
  "exit_meaning":   "success",
  "succeeded":      true,
  "pdf_path":       "C:\\...\\WSG_FancyNT_MAT_ptxp.pdf",
  "log_path":       "C:\\...\\FancyNT\\WSG_FancyNT_MAT_ptxp.log",
  "pdf_exists":     true,
  "errors":         [],
  "overfull_count": 12,
  "log_tail":       "Output written on WSG_FancyNT_MAT_ptxp.pdf (312 pages)..."
}
```

**`succeeded`** is `true` only when `exit_code == 0` AND the PDF file exists on disk.

**`errors`** contains lines extracted from the XeTeX log matching `^!` (TeX fatal errors). Supplemented by stderr output if the log is not yet available.

**`overfull_count`** is the number of `Overfull \hbox` / `Overfull \vbox` warnings in the log. Non-zero is normal; very high counts (hundreds) may indicate layout problems.

**Notes on the `-D` flag:**  
The `define` parameter allows any PTXprint UI setting to be overridden without modifying the stored `ptxprint.cfg`. Key names are PTXprint's internal widget identifiers, which correspond directly to keys in `ptxprint.cfg` sections (though the naming convention may differ slightly from cfg keys). This is the intended mechanism for one-off run-time overrides.

---

### 6.16 `get_job_log`

**Purpose:** Read the XeTeX log from the most recent typesetting run for a configuration.

**Parameters:**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `project_id` | string | yes | — | Paratext project ID |
| `config_name` | string | no | `"Default"` | Named configuration |
| `books` | string | no | `""` | Used to construct the log filename |
| `last_n_lines` | integer | no | `100` | How many trailing lines to return |

**Returns:**
```json
{
  "content":       "...(last N lines of XeTeX log)...",
  "errors":        ["! Undefined control sequence."],
  "overfull_count": 5,
  "exists":        true
}
```

Returns `{ "exists": false, ... }` if no log file is found (run has not yet occurred, or output was cleared).

---

## 7. Error Handling

All tools raise Python exceptions on invalid input; FastMCP converts these to MCP error responses.

| Condition | Exception | Message pattern |
|---|---|---|
| Unknown project | `ValueError` | `"Project 'XYZ' not found or has no ptxprint folder"` |
| Unknown config | `ValueError` | `"Config 'Foo' not found in project 'XYZ'"` |
| Disallowed filename | `ValueError` | `"'foo.txt' is not a supported config file. Allowed: [...]"` |
| Path escape attempt | `ValueError` | `"Filename '...' escapes the allowed directory"` |
| Config already exists | `ValueError` | `"Config 'Foo' already exists in project 'XYZ'"` |
| PTXprint not found | Returned in `run_typeset` result | `errors: ["ptxprint executable not found"]` |
| Run timeout | Returned in `run_typeset` result | `errors: ["PTXprint timed out after N seconds"]` |

Run-time failures (wrong books, XeTeX errors, missing fonts) are not exceptions — they are reported via the `exit_code`, `errors`, and `log_tail` fields of the `run_typeset` return value.

---

## 8. Design Decisions and Rationale

### 8.1 Synchronous run_typeset

`run_typeset` blocks until PTXprint completes. An async job-queue approach was considered but rejected for v1 because:

- PTXprint runs typically complete in 10–120 seconds; timeouts are configurable up to 1200s.
- MCP clients generally handle long-running tools better than managing job IDs across separate calls.
- The server is single-user in the intended deployment; parallelism is not a requirement.

A future version could expose `submit_typeset` / `poll_job` if concurrent runs become necessary.

### 8.2 Inheritance resolution in get_config

`get_config` with `merge_with_base=true` traverses the inheritance chain and merges all parent configs. This gives the AI agent a complete picture of effective settings rather than a sparse override file — which is almost always what's needed for reasoning about layout.

The raw (unmerged) view is available via `merge_with_base=false` for callers that need to know exactly what the config file contains vs. what it inherits.

### 8.3 File tools are raw-content, not structured

`get_project_file` / `set_project_file` return and accept raw text for `changes.txt`, `ptxprint.sty`, and `FRTlocal.sfm`. Structured APIs for these were considered but rejected because:

- `changes.txt` has a complex regex grammar that is best treated as a text artifact.
- `ptxprint.sty` uses SFM syntax that the AI can read and write directly.
- `FRTlocal.sfm` is USFM which the AI handles well as text.

Only the piclist (`get_piclist` / `set_piclist`) is parsed into structured objects, because its line-oriented key=value format is repetitive and error-prone to generate as raw text.

### 8.4 create_config writes a minimal cfg

The new config's `ptxprint.cfg` contains only `[config] name` and `[import] config`. This mirrors how PTXprint itself creates configs: the defaults live in the parent, and the child stores only intentional overrides. Writing a full copy of all 400+ defaults would create a maintenance burden (every key would appear as an explicit override, defeating inheritance).

### 8.5 Piclist location

The canonical piclist location is `<config_dir>/<PRJ>-<Config>.piclist`. An older convention placed piclists at the project root (`<prj>/shared/ptxprint/<PRJ>-<Config>.piclist`). The server ignores the project-root location entirely and uses only the config-folder location.

### 8.6 The -D override mechanism

The `define` parameter in `run_typeset` maps directly to PTXprint's `-D key=value` CLI flag. This allows any UI setting to be overridden at run time without touching the stored configuration — essential for parameterised server runs (e.g. "print this config but with line spacing 13 instead of 14"). The key names are PTXprint's internal widget identifiers.

### 8.7 Projects directory scanning

`list_projects` scans the entire projects root. Folders beginning with `.` or `_` are excluded (Paratext uses `_Modules`, `_Resources`, etc. for non-project folders).

---

## 9. Running the Server

### 9.1 Prerequisites

- Python 3.11+
- `pip install mcp` (MCP SDK 1.27+)
- PTXprint installed and on PATH (or at a standard Windows location)
- Access to the Paratext projects directory

### 9.2 Stdio (Claude Desktop / local MCP client)

```bash
python c:/ptxprint-mcp/server.py --projects-dir "C:\My Paratext 9 Projects"
```

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "ptxprint": {
      "command": "python",
      "args": ["c:/ptxprint-mcp/server.py", "--projects-dir", "C:\\My Paratext 9 Projects"]
    }
  }
}
```

### 9.3 HTTP (remote server)

```bash
python c:/ptxprint-mcp/server.py \
  --transport streamable-http \
  --projects-dir "C:\My Paratext 9 Projects" \
  --host 0.0.0.0 \
  --port 8000
```

### 9.4 Environment variable alternative

```bash
set PTXPRINT_PROJECTS_DIR=C:\My Paratext 9 Projects
python c:/ptxprint-mcp/server.py
```

---

## 10. Out of Scope (v1)

The following are explicitly deferred:

- **`ptxprint-mods.tex` / `ptxprint-premods.tex`** — advanced TeX macro injection; too risky to expose for automated use without deeper validation.
- **Cover generation** — the `[cover]` / `[covergen]` sections are readable via `get_config` / `set_config_values` but no dedicated cover-workflow tools are provided.
- **Archive (`.zip`) handling** — PTXprint can unpack `.zip` archives as project sources; not needed for the server use case.
- **Concurrent jobs** — one run at a time; see §8.1.
- **Authentication** — the HTTP transport has no auth in v1; intended for trusted internal deployment.
- **`ptxprint_project.cfg.override`** — may be deprecated upstream; not exposed.
- **`/base/` subfolders** — legacy mechanism; ignored entirely.
- **`/shared/` subfolders inside config folders** — created in error; ignored.

---

*End of specification.*