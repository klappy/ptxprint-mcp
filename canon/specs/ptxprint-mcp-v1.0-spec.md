---
title: "PTXprint MCP Server — v1 Specification"
subtitle: "Action-only vodka layer over the PTXprint canon"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "spec", "vodka-architecture", "v1"]
version: "v1.0-draft"
date: 2026-04-27
supersedes: "PTXprint_MCP_SPEC.md - First Pass (17-tool spec, 2026-04-27 AM)"
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/constraints/oddkit-prompt-pattern
  - klappy://canon/principles/dry-canon-says-it-once
  - klappy://canon/principles/maintainability-one-person-indefinitely
governs: "the second-pass PTXprint MCP server build (hackathon week 2026-04-28+)"
status: draft_for_review
---

# PTXprint MCP Server — v1 Specification

> Action-only vodka layer. Ten generic tools over a stateful PTXprint canon. The server has no PTXprint domain opinions; the canon repo (separate) carries them. Async by default. Deployable on fly.io for v1, Cloudflare-compatible adapter possible later. Supersedes the 17-tool first-pass spec.

---

## 1. The Contract

### What this server is

A thin MCP server that gives an AI agent four kinds of action over a PTXprint installation:

1. **Discover** projects and configurations on disk.
2. **Read and write** sandboxed files inside project trees.
3. **Edit** `ptxprint.cfg` keys safely without losing the rest of the file.
4. **Submit and observe** typesetting jobs (simple typesetting + autofill).

### What this server is not

- **Not a PTXprint reference manual.** The 400+ cfg keys, file format details (piclist, adjlist, changes.txt), inheritance semantics, troubleshooting craft, and font/script requirements live in a separate canon repo, retrieved by agents through `oddkit` MCP.
- **Not synchronous.** Every typesetting call returns a job ID immediately. No call blocks for more than a few seconds.
- **Not a full PTXprint UI replacement.** Cover generation, advanced TeX macro injection, archive handling — all out of v1 scope.
- **Not a knowledge-base server.** Retrieval is the canon repo's concern, served by oddkit. The PTXprint MCP doesn't reimplement search, get, or any retrieval surface.

### Vodka boundary

The server holds **zero PTXprint domain opinions** in its code. It knows about:
- Filesystem paths and sandboxing
- INI files (the structural format of `ptxprint.cfg`) — generic Python `configparser`, not section-aware logic
- Subprocess invocation, exit codes, log parsing for `^!` errors and overfull-box warnings
- Job lifecycle (submitted → running → succeeded/failed/cancelled)

It does **not** know about: piclist syntax, adjlist line format, USFM book codes, what `c_fighiderefs` does, how diglot column fractions interact, what fonts are needed for which scripts, what the cfg sections mean, naming conventions for output PDFs. All of those live in the canon repo and are retrieved by the agent on demand.

The constraint test (`klappy://canon/principles/vodka-architecture`):
- **Has the server grown thick?** No — 10 generic tools, ~500 lines of code projected.
- **Has the server acquired domain opinions?** No — every tool is generic file IO, INI safe-edit, or subprocess action.
- **Can the server be removed without consequence?** No — it provides sandboxed file access, INI edit safety, and async job lifecycle that no off-the-shelf MCP gives. Load-bearing.

---

## 2. Companion: the PTXprint Canon Repo

The canon repo is a sibling artifact to this MCP server, **not part of it**. It lives at a separate `klappy/` GitHub repo (final name TBD) parallel to `klappy/oral-theology-kb`. Agents access it through their existing `oddkit` MCP by setting `knowledge_base_url` to point at the canon repo.

### Canon seed sources (initial)

1. **`sillsdev/ptx2pdf/docs/documentation/`** — existing markdown files in the upstream repo (licence verification pending; mirror vs. link decision pending H-005).
2. **PTXprint UI tooltip dump** — captures every UI control's tooltip, ID, and corresponding cfg setting name. Resolves the "which key does what" gap.
3. **450-slide PTXprint deck** — ESE pass in flight (separate Claude session); output integrated as canon docs when it lands.
4. **Operator's ~1000 real configs** — private training corpus (C-006); used to seed canon authoring and validate agent reasoning, not mirrored publicly.

### Canon content shape (target)

- One markdown article per `ptxprint.cfg` section (`paper`, `document`, `notes`, etc.) with key descriptions, valid values, and effect.
- One article per supporting file format (piclist, adjlist, changes.txt, FRTlocal.sfm, ptxprint.sty).
- Craft articles: "fixing overfull hboxes," "diglot setup," "font requirements per script," "creating a new config," "common autofill failures."
- Schema documents the agent searches before any cfg-edit reasoning step.

The agent's reasoning loop becomes: search canon → understand the change → use the MCP server's action tools to apply it → submit typeset → observe result.

---

## 3. Tools (10)

All tools are sandboxed to `<projects_root>/<prjid>/shared/ptxprint/` and `<projects_root>/<prjid>/local/ptxprint/`. Path-escape attempts return errors.

### 3.1 Discovery (3)

| Tool | Inputs | Returns | Notes |
|---|---|---|---|
| `list_projects` | — | `[{id, config_count, configs[]}]` | Scans projects root; excludes `_*` and `.*` folders |
| `list_configs` | `project_id` | `[config_name, ...]` | Sorted alphabetically (caseless) |
| `list_files` | `project_id`, optional `config_name`, optional `subpath` | `[{name, type: file\|dir, size, mtime}]` | Generic directory listing within sandbox |

### 3.2 File IO (3)

| Tool | Inputs | Returns | Notes |
|---|---|---|---|
| `read_file` | `project_id`, `relpath` | `{content: string, mtime, size}` | Returns `""` if not found (with `exists: false` flag) |
| `write_file` | `project_id`, `relpath`, `content` | `{ok, path, bytes_written}` | Whole-file write; creates parent dirs as needed |
| `delete_file` | `project_id`, `relpath` | `{ok, deleted: bool}` | Idempotent; missing file returns `deleted: false` without error |

`relpath` is interpreted relative to the project root and must resolve inside the sandbox. Examples: `shared/ptxprint/Default/ptxprint.cfg`, `shared/ptxprint/Default/AdjLists/46ROMWSG-Default.SFM.adj`, `local/ptxprint/Default/WSG_Default_MAT_ptxp.log`.

### 3.3 INI safe-edit (1)

| Tool | Inputs | Returns | Notes |
|---|---|---|---|
| `update_cfg_value` | `project_id`, `config_name`, `section`, `key`, `value` | `{ok, previous_value, new_value}` | Section-key edit preserving the rest of the file |

Backed by Python `configparser`. Preserves all other keys; comment preservation is best-effort (configparser limitation). For complex multi-key edits, agents can read → reason → write_file the whole modified content if comment fidelity matters.

The agent finds out **what** to edit by searching canon. The server only offers the **how**.

### 3.4 Inheritance resolution (1)

| Tool | Inputs | Returns | Notes |
|---|---|---|---|
| `resolve_config` | `project_id`, `config_name` | `{section: {key: value}}` (effective merged) plus `inheritance_chain: [base, ..., self]` | Walks `[import] config = X` chain, merges parent → child |

This tool is in v1 because:
- It's pure epistemic discipline (compute the transitive closure of the import chain), **not** PTXprint domain knowledge.
- Without it, every agent reasoning step that needs effective settings has to re-derive them — wasteful and error-prone.
- The implementation is ~30 lines of generic INI + dict-merge code.

If first-week experience shows agents don't actually need it (they read the chain manually via `read_file`), this tool gets dropped in v2 — but the cost of including it now is small.

### 3.5 Typesetting jobs (3)

| Tool | Inputs | Returns | Notes |
|---|---|---|---|
| `submit_typeset` | `project_id`, optional `config_name` (default `"Default"`), optional `books`, optional `define` (`-D` overrides), optional `mode` (`simple\|autofill`, default `simple`), optional `timeout` | `{job_id, submitted_at, predicted_pdf_path}` | Returns immediately. Predicted PDF path computed from inputs (canon documents the naming convention). |
| `get_job_status` | `job_id` | See schema below | Pollable; safe to call any time |
| `cancel_job` | `job_id` | `{ok, was_running, cancelled_at}` | Sends SIGTERM; required for autofill (30 min jobs need a kill switch) |

#### `get_job_status` return schema

```json
{
  "job_id": "...",
  "state": "queued | running | succeeded | failed | cancelled",
  "submitted_at": "2026-04-27T21:09:55Z",
  "started_at": "2026-04-27T21:10:01Z",
  "completed_at": null,
  "progress": {
    "passes_completed": 3,
    "passes_total_estimate": null,
    "current_phase": "typesetting | autofill | finishing"
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

`human_summary` is a one-line natural-language status — important for downstream agents that may relay over WhatsApp or chat (D-013-deferred but the field is reserved now).

`progress.passes_total_estimate` is `null` for simple typesetting (one pass) and a heuristic estimate for autofill (typically 5–10).

---

## 4. Job Lifecycle and Runner

The MCP server hosts a tiny job table (in-memory or sqlite in the container — TBD; sqlite is more vodka-correct because it's stateful-on-disk rather than stateful-in-process) and spawns PTXprint subprocesses with the appropriate flags:

```
ptxprint -P <prjid> -c <config> -b "<books>" -p <projects_dir> -q [-D key=value ...]
```

For autofill, the appropriate PTXprint flag is appended (TBD: confirm flag name from PTXprint source — operator/Martin can fill in tomorrow).

### Progress reporting

Per D-010: progress increments by completed passes, not by pages. The runner tails the XeTeX log; each `Output written on ...` line or autofill-pass-complete marker bumps the pass counter. No fake percentage estimation.

### Cancellation

`cancel_job` sends SIGTERM to the PTXprint subprocess. Job state moves to `cancelled`. Partial outputs (if any) are preserved at their existing paths but not surfaced as `pdf_path` (which is reserved for `succeeded` jobs).

### Timeouts

Two layers:
- **Per-job timeout** (`submit_typeset` parameter, default 1800s = 30 min for autofill, 300s = 5 min for simple). Job state moves to `failed` with `exit_meaning: "timeout"`.
- **No platform timeout** is exposed to the caller — the MCP server takes responsibility for not blocking on long jobs. (Why D-005 exists.)

---

## 5. Deployment

### Hackathon week (D-008)

- **Runner host:** fly.io. Container with PTXprint, XeTeX, SIL Charis, and the MCP server. Configurable CPU count.
- **MCP transport:** stdio for local Claude Desktop testing; `streamable-http` for the deployed instance.
- **No Cloudflare adapter in v1.** Direct connection to fly.io endpoint.

### Long-term shape (post-hackathon, deferred)

A possible future split:
- **Cloudflare Worker** = thin MCP adapter + auth + rate limiting at the edge.
- **fly.io / dedicated container** = the actual typesetter runner.
- Worker forwards MCP calls to runner; runner replies; Worker streams response back.

This is **not** v1. The split adds operational complexity and only pays off at scale.

### Container contents

- Python 3.11+
- PTXprint installed (Linux build) — installed from upstream Docker image if available, otherwise built from `ptx2pdf` source per `python/readme.md`
- XeTeX (`texlive-xetex`)
- SIL Charis font (sufficient for English Bibles per D-002)
- The MCP server itself (~500 lines of Python)

Total budget: well under 2 GB per fly.io constraints.

---

## 6. What's Deferred (and Why)

| Deferred capability | Why deferred | When to revisit |
|---|---|---|
| **Knob fan-out for autofill** (multiple attempts on same book) | ~1 month build effort (D-009); not needed for first useful demo | After v1 proven; potentially Q3 2026 |
| **WhatsApp / external messaging integration** | Out of MCP scope; downstream agent concern (O-013) | When a downstream agent (BT Servant) wires it |
| **Cover generation workflow** | Already deferred in first-pass spec; no new pressure | When a user explicitly needs it; canon may cover the manual path first |
| **TeX macro injection** (`*-mods.tex`, `*-premods.tex`) | High blast radius; needs validation surface canon doesn't yet have | After canon has authored TeX-safety docs |
| **Per-page progress reporting** | PTXprint doesn't expose it useably in headless (O-009) | If/when PTXprint upstream surfaces the GUI's "dot thing" |
| **Multi-script font support** | Initial scope is English Bibles (D-002) | When first non-English target is committed |
| **Concurrent jobs** | One run at a time per runner instance keeps the state machine simple | When real usage shows queueing isn't sufficient |
| **Auth on the HTTP transport** | Trusted internal use; no public exposure in hackathon week | Before any public listing |
| **Cloudflare Worker MCP adapter** | Operationally premature; fly.io alone is simpler | When public scale demands edge auth/rate-limiting |

---

## 7. Migration from the First-Pass Spec

The first-pass 17-tool spec is now reference scaffolding, not the build target. Mapping:

| Original tool | v1 disposition |
|---|---|
| `list_projects` | **Kept** as-is |
| `list_configs` | **Kept** as-is |
| `get_config` | **Removed** — agent uses `read_file` + canon (raw) or `resolve_config` (effective) |
| `get_config_inheritance` | **Removed** — `resolve_config` returns the chain in its response |
| `set_config_values` | **Replaced by** `update_cfg_value` (single key/value, simpler interface) |
| `create_config` | **Removed** — agent uses `write_file` with a minimal-cfg template documented in canon |
| `get_project_file` / `set_project_file` | **Replaced by** generic `read_file` / `write_file` with sandbox |
| `list_adjlists` | **Removed** — agent uses `list_files` on the AdjLists/ directory |
| `get_adjlist` / `set_adjlist` | **Replaced by** `read_file` / `write_file`; canon documents the format |
| `delete_adjlist` | **Replaced by** generic `delete_file` |
| `get_piclist` (parsed) | **Replaced by** `read_file`; canon documents piclist format |
| `set_piclist` (parsed) | **Replaced by** `write_file`; canon documents piclist format |
| `predict_output_paths` | **Removed** — `submit_typeset` returns `predicted_pdf_path`; canon documents naming convention; or agent uses `list_files` on `local/ptxprint/` |
| `run_typeset` | **Replaced by** `submit_typeset` (async) |
| `get_job_log` | **Replaced by** `get_job_status.log_tail` |

Net: 17 tools → 10 tools, with no functionality loss (only re-housed into either canon or generic operations).

---

## 8. Definition of Done for v1

The MCP server is "v1 done" when an agent connected to both this MCP server and oddkit MCP (pointing at the PTXprint canon repo) can:

1. List projects and configs, discover what's available.
2. Read any file in a project sandbox; understand its purpose by searching canon.
3. Modify a single cfg key (e.g., margins, line spacing) safely without breaking other keys or losing comments worth keeping.
4. Submit a typesetting job and receive a job ID immediately.
5. Poll job status and get a meaningful per-pass progress update.
6. Receive the resulting PDF path on success and a legible error summary on failure.
7. Cancel a long-running autofill job mid-way.

A small smoke-test script driving an English-Bible test project end-to-end is the validation artifact.

---

## 9. Tomorrow's First Execution Scope

(For the autonomous coding run kicked off per H-003)

**In scope:**
- Implement the 10 tools listed in §3, sandboxed and tested.
- Implement job lifecycle (§4) with sqlite state and per-pass progress parsing.
- Package as a fly.io-deployable container.
- Smoke-test end-to-end on one English Bible (BSB or ULT) with the `cover` test config from `ptx2pdf/tests/`.

**Explicitly out of scope for the first run:**
- Building the canon repo (separate concurrent track; needs the Google Slides ESE first).
- Knob fan-out (D-009).
- Cloudflare adapter (deferred per §5).
- Any of §6's deferred items.

**Validation gate (per `klappy://canon/principles/verification-requires-fresh-context`):** 
The first-run agent does not validate its own output. A separate session (or human review) accepts or returns to iteration. Same-session "looks done" is not validation.

---

*End of v1 specification. Companion artifact: `transcript-encoded-session-2.md` (the OLDC+H ledger this spec converges from). Open questions tracked there as Q-open-1 through Q-open-7.*
