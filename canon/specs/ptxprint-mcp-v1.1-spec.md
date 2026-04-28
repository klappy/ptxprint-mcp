---
title: "PTXprint MCP Server — v1.1 Specification"
subtitle: "First-principles vodka layer; domain craft lives in canon"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "spec", "vodka-architecture", "v1.1", "first-principles"]
version: "v1.1-draft"
date: 2026-04-28
supersedes: "ptxprint-mcp-v1-spec.md (v1.0-draft, 2026-04-27 PM)"
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/principles/kiss-simplicity-is-the-ceiling
  - klappy://canon/constraints/oddkit-prompt-pattern
  - klappy://canon/principles/dry-canon-says-it-once
  - klappy://canon/principles/maintainability-one-person-indefinitely
governs: "the second-pass PTXprint MCP server build (hackathon week 2026-04-28+)"
status: draft_for_review
---

# PTXprint MCP Server — v1.1 Specification

> **What changed from v1.0.** v1.0 was an honest improvement on the 17-tool PoC but it was a refactor, not a first-principles derivation. Two domain-flavored helpers (`update_cfg_value`, `resolve_config`) survived the cut by being labeled "epistemic discipline" or "ergonomic." On reinspection both encode PTXprint-specific opinion in server code. v1.1 removes them and lets canon teach the agent the patterns. Tool count: **7** (was 10), with 3 file primitives, 3 job-lifecycle primitives, and 1 asset-fetch primitive. Net effect: the server is meaningfully smaller and the canon repo carries strictly more weight.

---

## 1. The Contract

### Origin

This spec is derived from first principles. It asks: *what is the minimum set of generic primitives an AI agent needs from a server in order to drive a stateful PTXprint installation toward a finished PDF, given that the agent has separate retrieval access to a PTXprint canon repo?*

The answer divides cleanly:

- **Filesystem operations** the agent uses to inspect and mutate project state (sandboxed).
- **Subprocess lifecycle** for the typesetting engine (async, observable, cancellable).
- **One asset-fetch primitive** that exists only because base64-shuttling multi-megabyte font binaries through MCP envelopes is operationally unworkable.

That's it. Three categories, seven tools.

### What this server is

A thin MCP server that gives an AI agent four kinds of action:

1. **Discover** what's on disk (projects, configs, files).
2. **Read** sandboxed files.
3. **Write** sandboxed files.
4. **Submit, observe, and cancel** typesetting jobs.

Plus one provisioning primitive (font installation) added post-discovery because no other primitive can do it.

### What this server is not

- **Not a PTXprint reference manual.** The 400+ cfg keys, file format specs, inheritance rules, INI safe-editing patterns, troubleshooting craft, and font/script requirements live in the canon repo, retrieved by agents through `oddkit` MCP.
- **Not synchronous.** Every typesetting call returns a job ID. No call blocks for more than a few seconds.
- **Not domain-aware.** The server knows nothing about USFM, piclists, adjlists, diglots, fonts-by-script, Paratext metadata, or what any cfg key means. Every file is opaque text. Every subprocess invocation is opaque action.

### The vodka boundary, restated

The server knows:
- Filesystem paths and sandboxing
- HTTPS download with sha256 verification
- Subprocess invocation, exit codes, log parsing for `^!` errors and overfull-box warnings
- Job lifecycle (submitted → running → succeeded/failed/cancelled) and per-job fontconfig isolation

The server does not know:
- That `ptxprint.cfg` is INI (it's an opaque text file)
- That `[import] config = X` means inheritance (canon teaches the agent the walk)
- That piclist / adjlist / changes.txt / FRTlocal.sfm have any structure (canon teaches the formats)
- What `c_fighiderefs`, `s_linespacing`, or any other cfg key does (canon teaches each section)
- That fonts have OpenType axes or that LFF is the SIL font registry (canon teaches the resolution loop)

The constraint test (`klappy://canon/principles/vodka-architecture`):

- **Has the server grown thick?** No — 7 tools, all generic in shape, projected ~400 lines of code.
- **Has the server acquired domain opinions?** No — the only PTXprint-specific code is the argv shape for `ptxprint -P ... -c ... -b ... -p ...` in the runner and the regex for `^!` and `Overfull` in log parsing. Both are mechanism, not opinion.
- **Can the server be removed without consequence?** No — sandboxed file IO + INI edit safety can be approximated by other servers; per-job fontconfig isolation + log-aware subprocess lifecycle + sha256-verified font fetch cannot. Load-bearing.

---

## 2. Companion: the PTXprint Canon Repo

The canon repo is a sibling artifact, not part of this server. It lives at a separate `klappy/` GitHub repo (parallel to `klappy/oral-theology-kb`). Agents access it through `oddkit` MCP by setting `knowledge_base_url` to point at it.

### Canon seed sources

1. `sillsdev/ptx2pdf/docs/documentation/` — markdown docs in the upstream repo (licence verification owed; H-005).
2. PTXprint UI tooltip dump — every UI control's tooltip, ID, and corresponding cfg setting name.
3. PTXprint MASTER SLIDES deck (438 slides) — ESE complete: `ptxprint-master-slides.surface.json` + `.surface.md`.
4. Operator's ~1000 real configs — private training corpus (C-006).

### Canon articles required for v1.1 to be agent-usable

Two articles are gated by v1.1's tool removal — without them, the agent cannot reproduce what `update_cfg_value` and `resolve_config` used to do server-side:

- `canon/articles/ptxprint-config-inheritance.md` — how to walk `[import] config = X` chains and compute effective settings (replaces v1.0's `resolve_config` tool).
- `canon/articles/ptxprint-cfg-safe-editing.md` — how to modify a single cfg key without losing other keys, sections, or load-bearing comments (replaces v1.0's `update_cfg_value` tool).

Sketches for both are companion artifacts to this spec.

Additional articles that v1.1 references but doesn't gate on:

- `canon/articles/ptxprint-project-layout.md` — the directory tree, what files matter, what the configurations folder contains.
- `canon/articles/ptxprint-config-discovery.md` — how to enumerate projects and configs over the generic `list_files` primitive (replaces v1.0's `list_projects` and `list_configs`).
- `canon/articles/ptxprint-output-paths.md` — the `<PRJ>_<Config>_<bks>_ptxp.pdf` naming convention and where logs live (replaces v1.0's `predict_output_paths`).
- `canon/articles/ptxprint-font-resolution.md` — the LFF lookup → manifest → install_fonts → lock-write loop (gates the font subsystem; cross-references the session-3 design doc).

The agent's reasoning loop becomes: search canon → understand the change or pattern → use the MCP server's primitives to apply it → submit typeset → observe.

---

## 3. Tools (7)

All file operations are sandboxed to `<projects_root>/<prjid>/`. Path-escape attempts return errors. The asset-fetch primitive is sandboxed to a managed-fonts subtree under the project.

### 3.1 File operations (3)

| Tool | Inputs | Returns | Notes |
|---|---|---|---|
| `list_files` | optional `project_id`, optional `relpath` | `[{name, type: file\|dir, size, mtime}]` | No args: lists projects-root contents. `project_id` only: lists the project root. Both: lists within sandbox. No filtering of `_*`/`.*` folders — canon describes the Paratext convention; agent applies it. |
| `read_file` | `project_id`, `relpath` | `{content, exists, mtime, size}` | Returns `exists: false` and `content: ""` if not found. |
| `write_file` | `project_id`, `relpath`, `content` | `{ok, path, bytes_written}` | Whole-file write. Creates parent dirs. |

`relpath` is sandbox-relative. Examples: `shared/ptxprint/Default/ptxprint.cfg`, `shared/ptxprint/Default/AdjLists/46ROMWSG-Default.SFM.adj`, `local/ptxprint/Default/WSG_Default_MAT_ptxp.log`.

`delete_file` is **deferred to v2.** Real-world usage will tell us whether it's needed; v1.1 ships without it.

### 3.2 Job lifecycle (3)

| Tool | Inputs | Returns | Notes |
|---|---|---|---|
| `submit_typeset` | `project_id`, optional `config_name` (default `"Default"`), optional `books`, optional `define` (`-D` overrides), optional `mode` (`simple\|autofill`, default `simple`), optional `timeout` | `{job_id, submitted_at, predicted_pdf_path}` | Returns immediately. Predicted PDF path computed from inputs; canon documents the naming convention. Performs Phase 2 font verification before launching XeTeX (see §4). |
| `get_job_status` | `job_id` | See schema below | Pollable; safe to call any time. |
| `cancel_job` | `job_id` | `{ok, was_running, cancelled_at}` | SIGTERM. Required for autofill (30 min jobs need a kill switch). |

#### `get_job_status` return schema

```json
{
  "job_id": "...",
  "state": "queued | running | succeeded | failed | cancelled",
  "submitted_at": "2026-04-28T03:09:55Z",
  "started_at": "2026-04-28T03:10:01Z",
  "completed_at": null,
  "progress": {
    "passes_completed": 3,
    "passes_total_estimate": null,
    "current_phase": "font_check | typesetting | autofill | finishing"
  },
  "font_check": {
    "lock_present": true,
    "files_present": [{ "family_id": "charissil", "filename": "CharisSIL-Regular.ttf", "ok": true }],
    "families_resolvable": [{ "family": "Charis SIL", "fc_match": "Charis SIL", "ok": true }],
    "blocked_typeset": false
  },
  "exit_code": null,
  "exit_meaning": null,
  "pdf_path": null,
  "log_path": "C:\\...\\WSG_Default_MAT_ptxp.log",
  "log_tail": "(last 100 lines of XeTeX log)",
  "errors": [],
  "overfull_count": 0,
  "human_summary": "Typesetting in progress. 3 passes completed. No errors yet."
}
```

`human_summary` is a one-line natural-language status — important for downstream agents that may relay over WhatsApp or chat (O-013).

`progress.passes_total_estimate` is `null` for simple typesetting (one pass) and a heuristic estimate for autofill (typically 5–10).

`font_check` is populated whenever Phase 2 verification has run. `blocked_typeset: true` means the job did not proceed to XeTeX because of a font issue; check `files_present` and `families_resolvable` for the specifics.

### 3.3 Asset provisioning (1)

| Tool | Inputs | Returns | Notes |
|---|---|---|---|
| `install_fonts` | `project_id`, `manifest: [{family_id, version, filename, url, expected_sha256}]` | `[{family_id, filename, status: ok\|failed, reason?, installed_path?}]` | Per-entry result. Fetches each URL, verifies sha256, places at `<projects_root>/<prjid>/shared/ptxprint/managed-fonts/<family_id>/<version>/<filename>`. Refreshes fontconfig (`fc-cache -f`). Idempotent — safe to re-run. |

The agent — guided by canon — does the LFF lookup, distributable/license check, manifest construction, and `fonts.lock.json` write (via `write_file`). This tool exists because URL fetch + sha256 verify + binary placement is the part the agent cannot do over `write_file`.

Sandboxing: URLs must be HTTPS. Filenames cannot contain path separators. `family_id` matches `^[a-z0-9-]+$`. Target paths are computed deterministically from `(project_id, family_id, version, filename)`; the agent cannot influence the path beyond those four fields.

---

## 4. Job Lifecycle and Runner

The MCP server hosts a tiny job table (sqlite on disk for vodka-correctness) and spawns PTXprint subprocesses with the appropriate flags:

```
ptxprint -P <prjid> -c <config> -b "<books>" -p <projects_dir> -q [-D key=value ...]
```

For autofill, the appropriate PTXprint flag is appended (TBD: confirm flag name from PTXprint source; canon will document).

### Phase 2 font verification (before XeTeX)

Before launching the XeTeX subprocess, `submit_typeset` performs three checks:

1. **Lock present?** `<project>/shared/ptxprint/fonts.lock.json` exists.
2. **All locked files present on disk?** Each file in the lock resolves to a real file in the managed-fonts tree.
3. **All locked families resolvable in job-scoped fontconfig?** `fc-match` against the job's fontconfig environment returns the expected family for each.

Any miss → state `failed`, `blocked_typeset: true`, hard error message naming what's missing. This closes the silent-fallback class of soft-failure PDFs (the `ptx2pdf` issue #212 analogue for fonts).

A passing Phase 2 is not a guarantee of glyph-completeness — that depends on whether the locked fonts actually cover the project's text. But it guarantees XeTeX sees the fonts the lock declared. Missing-glyph issues become content problems addressed by font selection upstream, not silent server failures.

### Per-job fontconfig isolation

Two projects pinning different versions of the same family (e.g. Charis SIL 6.x vs 7.x) must not collide. Before launching XeTeX, the runner constructs a job-scoped fontconfig environment that only sees:

- The current project's managed-fonts tree
- TeX-internal font directories (Computer Modern etc.) that XeTeX needs

Mechanism (in implementation-preference order):

1. `OSFONTDIR` env var (TeX-specific; simplest if it works)
2. `FONTCONFIG_FILE` env var pointing at a job-specific fontconfig XML (most precise)
3. Per-job `XDG_CONFIG_HOME` scoped to a tmpdir (heaviest)

Choice is implementation-detail; canon documents whichever is chosen.

### Progress reporting

Per-pass, not per-page (D-010). Runner tails the XeTeX log; each `Output written on ...` line or autofill-pass-complete marker bumps the pass counter. No fake percentage estimation.

### Cancellation

`cancel_job` sends SIGTERM. Job state moves to `cancelled`. Partial outputs preserved at their existing paths but not surfaced as `pdf_path` (which is reserved for `succeeded` jobs).

### Timeouts

Two layers:
- **Per-job timeout** (`submit_typeset` parameter, default 1800s for autofill, 300s for simple). Job state moves to `failed` with `exit_meaning: "timeout"`.
- **No platform timeout** is exposed to the caller. The MCP server takes responsibility for not blocking on long jobs.

---

## 5. Deployment

### Hackathon week (D-008)

- **Runner host:** fly.io. Container with PTXprint, XeTeX, and the MCP server. Configurable CPU count.
- **MCP transport:** stdio for local Claude Desktop testing; `streamable-http` for the deployed instance.
- **No Cloudflare adapter in v1.1.** Direct connection to fly.io endpoint.

### Container contents (per session 3 C-007)

- Python 3.11+
- PTXprint installed (Linux build)
- XeTeX via `texlive-xetex --no-install-recommends`
- fontconfig
- An empty managed-fonts tree at `/var/lib/ptxprint/managed-fonts/`
- A baked-in fontconfig include file pointing at the managed tree
- The MCP server itself (~400 lines of Python)

**Explicitly not included:** `fonts-sil-charis`, `fonts-noto-*`, `fonts-liberation`, or any other `fonts-*` apt package. The container fails loudly when font resolution hasn't run; no accidental fall-back to system fonts that masks broken locks.

TeX-internal Computer Modern / Latin Modern fonts arrive with `texlive-xetex` itself. They are TeX infrastructure, not fontconfig user fonts, and they are not "baked fonts" in the sense this rejects.

Total budget: well under 2 GB.

### Long-term shape (deferred)

Cloudflare Worker as MCP adapter + auth + rate limiting at the edge, forwarding to fly.io runner. Not v1.1.

---

## 6. What's Deferred (and Why)

| Deferred capability | Why deferred | When to revisit |
|---|---|---|
| **`delete_file`** | Rare in real workflows; can be added without spec churn when needed | When real usage shows it |
| **`update_cfg_value` as a server tool** | Domain opinion (configparser-correct INI editing); canon article teaches the pattern | Only if canon-driven approach proves insufficient |
| **`resolve_config` as a server tool** | Domain opinion (the `[import]` walk is PTXprint-specific); canon article teaches the algorithm | Only if canon-driven approach proves insufficient |
| **`list_projects` / `list_configs` as separate tools** | Both are listings; agent uses `list_files` plus a canon article on Paratext-folder filtering | Only if ergonomics suffer measurably |
| **`predict_output_paths`** | `submit_typeset` returns `predicted_pdf_path`; canon documents the naming convention; agent can also use `list_files` on `local/ptxprint/` | Only if agents need it pre-submit |
| **Knob fan-out for autofill** | ~1 month build effort (D-009); not needed for first useful demo | After v1.1 proven; potentially Q3 2026 |
| **WhatsApp / external messaging integration** | Out of MCP scope; downstream agent concern (O-013) | When BT Servant wires it |
| **Cover generation workflow** | Already deferred; no new pressure | When a user explicitly needs it |
| **TeX macro injection** (`*-mods.tex`, `*-premods.tex`) | High blast radius; needs validation surface canon doesn't yet have | After canon authors TeX-safety docs |
| **Per-page progress reporting** | PTXprint doesn't expose it useably in headless (O-009) | If/when PTXprint upstream surfaces it |
| **Multi-script font support** | Initial scope is English Bibles (D-002) | When first non-English target is committed |
| **Concurrent jobs per runner** | One run at a time keeps the state machine simple | When usage shows queueing isn't enough |
| **Auth on the HTTP transport** | Trusted internal use this week | Before public listing |
| **Cloudflare Worker MCP adapter** | Operationally premature | When public scale demands edge auth/rate-limiting |
| **`ptxprint_override.cfg` write surface** | Read-only awareness via `read_file` is sufficient for v1.1; writes need a validation story canon doesn't yet have | When users need write |

**Read-only awareness of override files** is in scope. The agent uses `read_file` to detect the presence and contents of `ptxprint_project.cfg` and `ptxprint_override.cfg`; canon teaches the agent how PTXprint resolves precedence so that `update_cfg_value`-pattern writes can warn the user when an override would silently shadow the change.

---

## 7. Migration

### From v1.0 to v1.1

| v1.0 tool | v1.1 disposition |
|---|---|
| `list_projects` | **Folded into `list_files`** + canon article on Paratext-folder filtering |
| `list_configs` | **Folded into `list_files`** (it's `list_files(project_id, 'shared/ptxprint')`) |
| `list_files` | **Kept** with widened semantics (also handles list_projects / list_configs cases) |
| `read_file` | **Kept** as-is |
| `write_file` | **Kept** as-is |
| `delete_file` | **Deferred to v2** (rare; can be added without churn) |
| `update_cfg_value` | **Moved to canon** as `ptxprint-cfg-safe-editing.md` |
| `resolve_config` | **Moved to canon** as `ptxprint-config-inheritance.md` |
| `submit_typeset` | **Kept** + Phase 2 font verification added |
| `get_job_status` | **Kept** + `font_check` field added to schema |
| `cancel_job` | **Kept** as-is |
| `install_fonts` | **Kept** (added in v1.0 from session 3) |

Net: 11 → 7. Two domain-flavored helpers shipped to canon; two listing tools collapsed into one generic primitive; one rarely-used tool deferred.

### From the original 17-tool PoC

The v1.0 spec already documented this. Net cumulative: **17 → 7**, with no functionality loss — every removed tool's functionality is reachable via either generic primitives or canon-described patterns.

---

## 8. Definition of Done for v1.1

The MCP server is "v1.1 done" when an agent connected to both this MCP server and oddkit MCP (pointing at the PTXprint canon repo, with at least the two gating canon articles authored) can:

1. Discover projects and configs by composing `list_files` calls per the canon discovery article.
2. Read any file in a project sandbox; understand its purpose by searching canon.
3. Modify a single cfg key safely — by following the canon safe-editing article over `read_file` + `write_file` — without losing other keys or load-bearing comments.
4. Compute effective settings across an inheritance chain by following the canon inheritance article over `read_file`.
5. Submit a typesetting job and receive a job ID immediately.
6. Poll job status and get a per-pass progress update plus Phase 2 font verification status.
7. Receive the resulting PDF path on success and a legible error summary on failure.
8. Cancel a long-running autofill job mid-way.
9. Resolve fonts via LFF, install them via `install_fonts`, write `fonts.lock.json` via `write_file`, and re-run typeset successfully.

A small smoke-test script driving an English-Bible test project end-to-end is the validation artifact.

---

## 9. Tomorrow's First Execution Scope

(For the autonomous coding run kicked off per H-003)

**In scope:**
- Implement the 7 tools listed in §3, sandboxed and tested.
- Implement Phase 2 font verification in `submit_typeset` per §4.
- Implement per-job fontconfig isolation per §4.
- Implement job lifecycle with sqlite state and per-pass progress parsing.
- Package as a fly.io-deployable container with the §5 minimums (no `fonts-*` packages).
- Smoke-test end-to-end on one English Bible (BSB or ULT) with the `cover` test config from `ptx2pdf/tests/`. Smoke test requires authoring the two gating canon articles in advance — see §2.

**Explicitly out of scope for the first run:**
- Full canon repo build (separate concurrent track; needs the slides-ESE artifacts integrated first)
- Knob fan-out (D-009)
- Cloudflare adapter
- Anything in §6's deferred list

**Validation gate** (per `klappy://canon/principles/verification-requires-fresh-context`):
The first-run agent does not validate its own output. A separate session (or human review) accepts or returns to iteration. Same-session "looks done" is not validation.

---

*End of v1.1 specification. Companions: `canon-ptxprint-config-inheritance.md` and `canon-ptxprint-cfg-safe-editing.md` (the two gating canon articles, sketched). Encoding: `transcript-encoded-session-4.md`.*
