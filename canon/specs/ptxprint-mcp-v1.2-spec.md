---
title: "PTXprint MCP Server — v1.2 Specification"
subtitle: "Stateless content-addressed build system on Cloudflare Workers + Containers"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "spec", "vodka-architecture", "v1.2", "stateless", "cloudflare"]
version: "v1.2-draft"
date: 2026-04-28
supersedes: "ptxprint-mcp-v1.1-spec.md (v1.1-draft, 2026-04-28 early AM)"
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/principles/kiss-simplicity-is-the-ceiling
  - klappy://canon/principles/dry-canon-says-it-once
  - klappy://canon/principles/maintainability-one-person-indefinitely
governs: "the PTXprint MCP server build (hackathon week 2026-04-28+)"
status: draft_for_review
---

# PTXprint MCP Server — v1.2 Specification

> **What changed from v1.1.** v1.1 was filesystem-based — the MCP server pretended to be a project store, exposing read/write/list against a sandboxed tree. That bound the server to a single host and made horizontal scaling impossible. v1.2 inverts: project state lives wherever the agent has access to it (operator's filesystem, Git, DBL, R2), and the typesetting MCP becomes a stateless content-addressed build system. PTXprint is treated as a pure function of (config, sources, fonts) → PDF. The server is a job queue with autoscaling ephemeral workers. Tool count: **4** (was 7), with no file IO at all. Output is content-addressed in R2 — re-running an unchanged build is free. Deployable on Cloudflare with one Worker and one Container image.

---

## 1. The Contract

### Origin

PTXprint is a deterministic function: given a project directory containing config + USFM sources + fonts, it produces a PDF. The filesystem is incidental — it's just how PTXprint receives its inputs. Every prior spec version (PoC, v1.0, v1.1) treated that incidence as a server-side responsibility, exposing file IO over a sandboxed project tree. That coupled the server to a single host's filesystem and made true horizontal scaling impossible.

v1.2 takes the function seriously. The server accepts a **payload** (the function's inputs), dispatches it to a stateless worker, and produces output content-addressed by `sha256(payload)`. Re-submitting an unchanged payload returns the cached output for free. Project state — the user's evolving working set of configs, sources, and fonts — lives outside this server, managed by whatever the agent's environment provides.

### What this server is

A Cloudflare-native job queue for PTXprint typesetting:

1. **Accept** a fully-specified job payload (config inline, sources/fonts/figures by URL).
2. **Dispatch** to an ephemeral Container worker that materializes the inputs, runs PTXprint, uploads the PDF to R2.
3. **Report** state, progress, and result URLs back through Durable Object-backed status polling.
4. **Mint** R2 presigned upload URLs so the agent can stage local files into the URL-accessible world the workers operate in.

### What this server is not

- **Not a file system.** No `read_file`, `write_file`, `list_files`, or any project-state IO. The agent reads project state from wherever it lives — Claude Desktop's native filesystem access, a separate filesystem MCP, Git, the user's Paratext server, etc. — and constructs payloads.
- **Not a PTXprint reference manual.** All domain knowledge (cfg keys, file format details, override semantics, font resolution) lives in the canon repo and is retrieved via `oddkit` MCP.
- **Not synchronous.** Every typesetting call returns a job_id immediately; no MCP call blocks for more than a few seconds.
- **Not stateful with respect to project trees.** There are no projects on the server's filesystem. Workers materialize a scratch dir per job, run, and exit.

### Vodka boundary

The server knows:
- The payload schema (versioned, validated)
- How to dispatch a payload to a Container via Worker→Container service binding
- How to mint R2 presigned URLs
- How to track job state in Durable Objects
- How to detect cached outputs by payload hash

The server does not know:
- That `ptxprint.cfg` is INI, that piclist has a structure, that AdjList has a syntax, that USFM has markers — every text content in the payload is opaque
- What `c_fighiderefs` does or which font supports which script
- How configs inherit (`[import]` walks happen in the agent before payload submission)
- How to resolve overrides (override files are part of the payload; PTXprint inside the worker handles them as it always has)

The constraint test (`klappy://canon/principles/vodka-architecture`):

- **Has the server grown thick?** No — 3 tools, ~250 lines of Worker code + ~200 lines of Container HTTP handler + ~100 lines of DO state machine.
- **Has the server acquired domain opinions?** No — every tool is generic action over a schema-defined payload.
- **Can the server be removed without consequence?** No — content-addressed dispatch + DO state + R2 output is a coordinated primitive set no off-the-shelf alternative provides.

---

## 2. Companion: the PTXprint Canon Repo

The canon repo is a sibling artifact, not part of this server. Lives at a separate `klappy/` GitHub repo. Agents access it through `oddkit` MCP by setting `knowledge_base_url` to point at it.

### Canon seed sources

1. `sillsdev/ptx2pdf/docs/documentation/` — markdown docs in the upstream repo (licence verification owed; H-005).
2. PTXprint UI tooltip dump — every UI control's tooltip, ID, and corresponding cfg setting name.
3. PTXprint MASTER SLIDES deck — ESE artifacts already produced.
4. The headless operations governance document (operator-authored from the PDF deck) — the most concrete agent-facing canon material drafted to date.
5. Operator's ~1000 real configs — private training corpus.

### Canon articles required for v1.2 to be agent-usable

The agent must construct payloads. Canon teaches it how. Required articles:

- `payload-construction.md` — the payload schema explained, with worked examples for simple typesetting and autofill.
- `config-construction.md` — how to construct or modify a `ptxprint.cfg` from scratch or from a working state. Replaces v1.1's safe-edit and inheritance-walk articles by being broader.
- `font-resolution.md` — the LFF lookup loop, sha256 verification, manifest building.
- `output-naming.md` — the `<PRJ>_<Config>_<bks>_ptxp.pdf` convention and how to interpret R2 result URLs.
- `failure-mode-taxonomy.md` — hard / soft / success distinction, log grep patterns, overfull-count thresholds. Sourced from the governance document Part 9.

The agent's reasoning loop: search canon → understand the change or pattern → construct payload → submit job → poll → handle result. Iterative editing means re-submitting a new payload, not editing files.

---

## 3. Tools (3)

### `submit_typeset(payload)`

**Inputs:** the payload (schema in §4).

**Returns:**
```json
{
  "job_id": "...",
  "submitted_at": "2026-04-28T03:41:32Z",
  "predicted_pdf_url": "https://r2.../<payload_hash>/<PRJ>_<Config>_<bks>_ptxp.pdf",
  "cached": true
}
```

Behavior:
1. Validate payload against schema (versioned).
2. Compute canonical `payload_hash = sha256(canonical_json(payload))`.
3. HEAD the R2 expected output path. If exists → return `cached: true` with the URL. **No Container dispatched.**
4. If miss → create a Durable Object for `job_id`, state=`queued`. Dispatch payload to Container via service binding (using `ctx.waitUntil` to keep the dispatch fetch alive without blocking the Worker response). Return `job_id` immediately.

Cache is content-addressed. Same payload → same hash → same URL. Agent gets free re-runs of unchanged builds.

### `get_job_status(job_id)`

**Inputs:** `job_id`

**Returns:**
```json
{
  "job_id": "...",
  "state": "queued | running | succeeded | failed | cancelled",
  "submitted_at": "...",
  "started_at": "...",
  "completed_at": null,
  "progress": {
    "passes_completed": 3,
    "passes_total_estimate": null,
    "current_phase": "fetching_inputs | typesetting | autofill | uploading"
  },
  "exit_code": null,
  "failure_mode": null,
  "pdf_url": null,
  "log_url": null,
  "log_tail": "(last 100 lines of XeTeX log)",
  "errors": [],
  "overfull_count": 0,
  "human_summary": "Typesetting in progress. 3 passes completed."
}
```

`failure_mode` ∈ `{hard, soft, success}` (per the governance Part 0). Hard = exit_code != 0 AND no PDF. Soft = exit_code == 0 AND PDF exists AND structural check failed (e.g., expected pictures absent). Success = exit_code == 0 AND PDF exists AND structural checks pass.

`pdf_url` and `log_url` are R2 presigned GET URLs valid for the result-retention window (default: 7 days; configurable per-deployment).

Behavior: read DO state, return. Pure Worker work; never reaches the Container.

### `cancel_job(job_id)`

**Inputs:** `job_id`

**Returns:**
```json
{ "ok": true, "was_running": true, "cancelled_at": "..." }
```

Behavior: set `cancel_requested: true` in the DO. The running Container's PTXprint task polls the DO every 5–10 seconds (between progress markers) and on detecting the flag, sends SIGTERM to the PTXprint subprocess and updates state=`cancelled`. Worker doesn't need direct IPC to the Container; the DO is the cancellation channel.

Acknowledged latency: up to 10 seconds between cancel request and PTXprint actually stopping. Acceptable for v1.2.

### Why there is no upload tool

An earlier draft of this spec included a fourth tool, `get_upload_url`, that minted a presigned R2 PUT URL for agents to stage local files (USFM, fonts, figures) before referencing them in payloads. It was removed before any agent ever used it. The reasoning:

- The agent already has the file. Forcing a separate "mint URL → HTTP PUT megabytes → reference URL in payload" round-trip is pure friction and doubles the data transfer.
- Hosting input files is upstream of typesetting. Where USFM, fonts, and figures live (a Git repo, DBL, a Paratext server, a CDN, the user's own bucket) is the agent's environment concern, not the MCP server's.
- A presigned-URL minting tool is a piece of infrastructure plumbing leaking into the agent contract. The MCP surface is for typesetting actions, not storage management.

The contract: agents pass HTTPS URLs (with `sha256` for verification) directly in the payload's `sources`, `fonts`, and `figures` arrays. The Container fetches them at job start. If an agent's environment doesn't have a way to expose local files at a URL, that is a problem for the agent's host to solve — not for the typesetting MCP to absorb.

---

## 4. Payload Schema

Versioned. v1.2 ships with `schema_version: "1.0"`. Future spec versions can introduce `1.1`, `2.0`, etc.; the Container rejects versions it doesn't speak.

```json
{
  "schema_version": "1.0",

  "project_id": "WSG",
  "config_name": "FancyNT",
  "books": ["MAT", "MRK", "LUK", "JHN"],
  "mode": "simple",
  "define": { "s_linespacing": "13" },

  "config_files": {
    "shared/ptxprint/ptxprint_project.cfg": "...optional override file content...",
    "shared/ptxprint/FancyNT/ptxprint.cfg": "[paper]\npagesize = ...",
    "shared/ptxprint/FancyNT/ptxprint.sty": "\\Marker mt1\n\\FontSize 1.4\n...",
    "shared/ptxprint/FancyNT/ptxprint-mods.sty": "...optional...",
    "shared/ptxprint/FancyNT/changes.txt": "...optional...",
    "shared/ptxprint/FancyNT/FRTlocal.sfm": "...optional...",
    "shared/ptxprint/FancyNT/ptxprint_override.cfg": "...optional override...",
    "shared/ptxprint/FancyNT/WSG-FancyNT.piclist": "...optional...",
    "shared/ptxprint/FancyNT/AdjLists/46ROMWSG-FancyNT.SFM.adj": "...optional..."
  },

  "sources": [
    {
      "book": "MAT",
      "filename": "41MATWSG.SFM",
      "url": "https://example.com/sources/41MATWSG.SFM",
      "sha256": "..."
    }
  ],

  "fonts": [
    {
      "family_id": "charissil",
      "version": "7.000",
      "filename": "CharisSIL-Regular.ttf",
      "url": "https://lff.api.languagetechnology.org/...",
      "sha256": "..."
    }
  ],

  "figures": [
    {
      "filename": "AB01234.tif",
      "url": "https://example.com/figures/AB01234.tif",
      "sha256": "..."
    }
  ]
}
```

### Slot semantics

| Slot | Contents | Inline or URL? |
|---|---|---|
| `project_id`, `config_name`, `books` | identifiers used for PTXprint argv shape and PDF naming | inline (small) |
| `mode` | `"simple"` or `"autofill"` | inline |
| `define` | `-D` overrides applied at run time | inline |
| `config_files` | map of relative-path → text content | **inline** (small text artifacts) |
| `sources` | USFM book content | **URL + sha256** (multi-MB, often) |
| `fonts` | font binaries | **URL + sha256** (multi-MB) |
| `figures` | image binaries | **URL + sha256** (multi-MB) |

The split: text inline, binaries by URL. Canon's `payload-construction.md` documents this in detail with examples.

### Canonical hashing

`payload_hash` is computed over the JSON-canonicalized payload (RFC 8785 JCS or equivalent). This means logically-equivalent payloads (different key order, whitespace) produce the same hash. Same hash → same R2 path → cache hit. Reproducibility is intrinsic.

URLs in `sources`, `fonts`, `figures` are part of the hash. Two payloads pointing at the same content via different URLs hash differently (and both will fetch and verify against sha256, so cache effectiveness depends on URL stability). For best cache hit rates, agents should prefer stable URLs (R2 presigned GETs with long expiry, content-addressed CDNs, etc.) over volatile ones.

---

## 5. Architecture

```
Agent (Claude Desktop / BT Servant / etc.)
  ↓ MCP/HTTP
┌──────────────────────────────────────────────────┐
│ Cloudflare Worker (the only Worker)              │
│  - submit_typeset:                               │
│      validate, hash payload                      │
│      HEAD R2 for cached output                   │
│      cache hit  → return URL                     │
│      cache miss → create DO, dispatch via        │
│                   service binding using          │
│                   ctx.waitUntil(fetch(...)),     │
│                   return job_id                  │
│  - get_job_status: read DO, return               │
│  - cancel_job: set DO flag, return               │
└──────────────────────────────────────────────────┘
  ↓ Worker→Container service binding
┌──────────────────────────────────────────────────┐
│ Cloudflare Container (the only Container image)  │
│  Instance type: standard-2 (1 vCPU, 6 GiB, 12GB) │
│  sleepAfter: "45m" (covers max autofill + buffer)│
│  Image: PTXprint + XeTeX + fontconfig + tiny     │
│         Python HTTP server                       │
│  HTTP endpoint: POST /jobs                       │
│  Per request:                                    │
│     update DO state=running                      │
│     materialize scratch dir from config_files    │
│     download sources/fonts/figures (parallel,    │
│       sha256 verified as bytes arrive)           │
│     run ptxprint -P ... -c ... -b ... -p ... -q  │
│       (poll DO every 10s for cancel flag)        │
│     classify exit (hard/soft/success)            │
│     upload PDF + log to R2 at                    │
│       outputs/<payload_hash>/<PRJ>_<Config>_..   │
│     update DO with state, URLs, log_tail         │
│     return 200 (request closes)                  │
│  Container sleeps after sleepAfter timer         │
└──────────────────────────────────────────────────┘
  ↕ DO read/write           ↓ R2 PUT (content-addressed output)
Durable Objects        Cloudflare R2
(one DO per job_id)    One bucket:
                         ptxprint-outputs (content-addressed, long retention)
```

### The Worker

Single Worker handles the three MCP tools as separate routes. Implementation notes:

- Use `ctx.waitUntil(fetch(containerEndpoint, {method: 'POST', body: JSON.stringify(payload)}))` to dispatch to the Container without blocking the Worker's response to the agent. The Container request stays open as long as the Container is processing; the Worker has already returned to the agent.
- Container service binding: declare in `wrangler.toml` as `[[containers]] binding = "PTXPRINT_CONTAINER"`, then `env.PTXPRINT_CONTAINER` is callable from the Worker.
- DO binding for state: `[[durable_objects.bindings]] name = "JOB_STATE" class_name = "JobStateDO"`.
- R2 binding for outputs: `[[r2_buckets]] binding = "OUTPUTS"`.

### The Container

Single image. Built from a Dockerfile that installs:

- `python3.11`
- `texlive-xetex --no-install-recommends` (TeX engine without recommended fonts)
- `fontconfig`
- PTXprint (Linux build from `sillsdev/ptx2pdf` source — confirm Dockerfile availability per session 3 H-008)
- A small Python HTTP server (FastAPI / aiohttp / similar) exposing `POST /jobs`

**Explicitly excludes:** `fonts-sil-charis`, `fonts-noto-*`, any `fonts-*` package. Container fails loudly when font resolution hasn't run; no accidental fall-back. (Per session 3 C-007.)

The Python HTTP handler:

1. Parses payload from request body. Validates schema_version.
2. Acknowledges with 202 immediately if the dispatch model needs it; otherwise processes synchronously and returns 200 on completion.
3. Materializes scratch dir at `/tmp/<job_id>/projects/<project_id>/`. Writes inline `config_files` at their relative paths.
4. Parallel-fetches `sources`, `fonts`, `figures` URLs. Verifies sha256 as bytes arrive (hash the stream; abort on mismatch).
5. Sets up per-job fontconfig environment via `FONTCONFIG_FILE` pointing at a generated config that sees only the downloaded fonts.
6. Runs PTXprint subprocess. Tails its stdout/stderr and the log file; updates DO state on each pass-completion marker.
7. Polls DO for cancel flag every 10s (between progress markers).
8. Classifies exit per the failure-mode taxonomy.
9. Uploads PDF + log to R2 at the deterministic path.
10. Updates DO state=`succeeded` or `failed` or `cancelled`. Returns response.

`sleepAfter = "45m"` covers max autofill duration plus buffer. Container goes to sleep cleanly when no requests arrive for that interval. Disk is wiped on sleep — that's fine; everything important is in R2 or DO.

### State (Durable Objects)

One DO instance per `job_id`. Schema:

```typescript
{
  job_id: string,
  state: "queued" | "running" | "succeeded" | "failed" | "cancelled",
  submitted_at: ISO8601,
  started_at: ISO8601 | null,
  completed_at: ISO8601 | null,
  progress: {
    passes_completed: number,
    passes_total_estimate: number | null,
    current_phase: string | null
  },
  cancel_requested: boolean,
  exit_code: number | null,
  failure_mode: "hard" | "soft" | "success" | null,
  pdf_r2_key: string | null,
  log_r2_key: string | null,
  log_tail: string,
  errors: string[],
  overfull_count: number,
  payload_hash: string,
  human_summary: string
}
```

Worker reads/writes via DO methods. Container reads/writes via DO methods (Container has its own DO binding). Both sides see the same authoritative state.

DO storage is durable (SSD-backed); state survives Worker invocations and Container restarts.

### Output (R2)

Two buckets:

**`ptxprint-outputs`** — content-addressed:
```
outputs/<payload_hash>/<PRJ>_<Config>_<bks>_ptxp.pdf
outputs/<payload_hash>/<PRJ>_<Config>_<bks>_ptxp.log
```

Long retention (90 days default; tunable). Same payload → same path → cache hit on re-submission. Naming follows the governance Part 2 convention so users see filenames matching their existing mental model.

There is no separate uploads bucket. Agents bring their own URLs for sources, fonts, and figures; the server only stores outputs.

---

## 6. Cloudflare-specific verified facts (2026-04)

Anchored against `Cloudflare Developer Platform:search_cloudflare_documentation` lookups during v1.2 spec authoring:

| Fact | Source |
|---|---|
| Workers memory ceiling: 128 MiB | `/workers/platform/limits/#memory` |
| Workers HTTP duration: no hard limit while client connected | `/workers/platform/limits/#duration` |
| `ctx.waitUntil` extends Worker beyond response by up to 30s, or until promise resolves | `/workers/platform/limits/` |
| Container instance type `standard-2`: 1 vCPU, 6 GiB memory, 12 GB disk | `/containers/platform-details/limits/` |
| Container concurrent live limits (per account): 6 TiB memory, 1,500 vCPU, 30 TB disk | Feb 2026 changelog |
| Container disk is ephemeral — wiped on sleep | `/containers/platform-details/architecture/` |
| Container `sleepAfter` configurable; SIGTERM → 15min → SIGKILL on shutdown | `/containers/container-class/` |
| Container HTTP request handling has no hard duration limit (subject to Worker client connection) | `/workers/platform/limits/#duration` |
| Containers billed per 10ms of active running; charges stop when sleeping | `/containers/pricing/` |

Key implication: **a 30-minute autofill run is in-bounds.** The Worker dispatches via `ctx.waitUntil(fetch(...))`, the Container handles the request synchronously while running PTXprint, the Container's `sleepAfter = "45m"` covers the duration plus buffer.

Risk to verify at implementation time: whether a Worker's `waitUntil` actually keeps the dispatch fetch alive for 30+ minutes, or whether the platform terminates it sooner. If the latter, fallback pattern is for the Container to periodically self-poke (send itself a no-op HTTP request) to reset its own `sleepAfter` timer, decoupling the Container's lifetime from the Worker's `waitUntil`.

---

## 7. What's Deferred (and Why)

| Deferred capability | Why deferred | When to revisit |
|---|---|---|
| **fly.io fallback runner** | CF Containers verified to handle 30 min autofill; no need for a second host | If autofill exceeds CF Container request duration in production |
| **Knob fan-out for autofill** (parallel attempts on same book) | ~1 month build effort; not a v1.2 concern | Q3+ 2026 |
| **WhatsApp / external messaging** | Out of MCP scope; downstream agent concern | When BT Servant wires it |
| **Cover generation workflow** | Cover Wizard's UI doesn't have a clean headless equivalent; agent constructs cover periphs in `FRTlocal.sfm` directly via canon-described patterns | When canon authors the cover-construction article |
| **TeX macro injection** (`*-mods.tex`, `*-premods.tex`) | High blast radius | After canon authors TeX-safety docs |
| **Multi-script font support** | Initial scope is English Bibles | When first non-English target is committed |
| **Auth on the MCP HTTP transport** | Trusted internal use this week | Before public listing |
| **Result retention beyond 90 days** | R2 lifecycle policy default | When users need archival |
| **Cross-agent payload sharing (collaboration)** | Each agent submits its own payloads | When real users ask |

---

## 8. Migration

### From v1.1 to v1.2

| v1.1 tool | v1.2 disposition |
|---|---|
| `list_files` | **Removed.** Project state read from elsewhere (Claude Desktop file access, Git, etc.). |
| `read_file` | **Removed.** Same. |
| `write_file` | **Removed.** Same. Plus output is in R2, not on disk. |
| `submit_typeset` | **Kept** — same name, schema-redefined payload. |
| `get_job_status` | **Kept** — gains `failure_mode`, gains `pdf_url` / `log_url` (R2 presigned). |
| `cancel_job` | **Kept** — same. |
| `install_fonts` | **Removed.** Fonts are part of the payload; Container fetches and verifies at job start. |

Net: 7 → 3. The originally proposed `get_upload_url` tool was removed before deployment — see §3 "Why there is no upload tool."

### From the original 17-tool PoC

Cumulative simplification: **17 → 3**, with no functionality loss — every removed tool's functionality is reachable via either canon-described agent patterns or the three primitives.

---

## 9. Definition of Done for v1.2

The MCP server is "v1.2 done" when an agent connected to both this MCP server and oddkit MCP (pointing at the PTXprint canon repo, with at least the five gating canon articles authored — see §2) can:

1. Read project state from its environment (Claude Desktop file access for the operator's local Paratext directory, or equivalent).
2. Construct a valid payload by following canon's payload-construction article, referencing sources/fonts/figures by HTTPS URL with sha256 (hosting is the agent's environment concern, not the server's).
3. Submit the payload via `submit_typeset` and receive a job_id immediately.
4. Poll job status and observe per-pass progress, then receive a presigned PDF URL on success.
5. Cancel a long-running autofill job mid-way.
6. Re-submit an unchanged payload and receive the cached output URL without a new typeset run.
7. Receive a clear `failure_mode: hard | soft` classification on failures with actionable error info.

Smoke test: end-to-end on one English Bible (BSB or ULT) with the `cover` test config from `ptx2pdf/tests/`, using simple typesetting mode.

---

## 10. Tomorrow's First Execution Scope

(For the autonomous coding run kicked off per H-003)

**In scope:**
- Implement the 3 tools listed in §3 as a Cloudflare Worker.
- Implement the Container image with PTXprint + XeTeX + fontconfig + Python HTTP handler.
- Implement the JobStateDO Durable Object class.
- Configure the outputs R2 bucket with appropriate lifecycle policies.
- Deploy via `wrangler deploy` to a workers.dev subdomain.
- Smoke-test end-to-end on one English Bible test project.

**Explicitly out of scope for the first run:**
- Full canon repo build (separate concurrent track per the operator's setup).
- Knob fan-out (deferred).
- Auth.
- Anything in §7's deferred list.

**Critical-path canon work** (must exist before the smoke test runs end-to-end):
- `payload-construction.md` — without this the agent cannot build a valid payload.
- `output-naming.md` — the agent needs to interpret R2 result paths.

The other three canon articles (`config-construction.md`, `font-resolution.md`, `failure-mode-taxonomy.md`) can be drafted in parallel; the smoke test passes without them as long as the operator hand-constructs the test payload.

**Validation gate** (per `klappy://canon/principles/verification-requires-fresh-context`):
The first-run agent does not validate its own output. A separate session (or human review) accepts or returns to iteration. Same-session "looks done" is not validation.

---

*End of v1.2 specification. Companions: `governance-update-handoff.md` (operator-facing edits to the v1.0/v1.1-era governance document so it aligns with v1.2), `transcript-encoded-session-5.md` (session encoding).*
