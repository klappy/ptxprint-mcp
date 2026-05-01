# PTXprint MCP

> **Stateless content-addressed build system for Bible typesetting via [PTXprint](https://software.sil.org/ptxprint/), exposed as an [MCP](https://modelcontextprotocol.io/) server, plus a governance knowledge base for AI agents that drive it.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status: Phase 1 demonstrated](https://img.shields.io/badge/status-phase%201%20demonstrated-green.svg)]()
[![Spec: v1.2-draft](https://img.shields.io/badge/spec-v1.2--draft-blueviolet.svg)](canon/specs/ptxprint-mcp-v1.2-spec.md)

---

## What this repo is

This repo serves two coupled purposes:

1. **An MCP server implementation** — Cloudflare Worker + Container + Durable Objects + R2, exposing a small set of tools that an AI agent uses to drive PTXprint headlessly. **Live and operational** at `https://ptxprint.klappy.dev`. The current tool surface is whatever the live deploy reports; ask the server (`/health` for a summary, MCP `tools/list` for the full schema) rather than trusting any hand-maintained list — README enumerations drift, the deploy is authoritative.

2. **A governance knowledge base** — markdown documents under [`canon/`](canon/), retrievable by any MCP client via the deploy's `docs` tool or directly via [`oddkit`](https://github.com/klappy/oddkit) MCP with `knowledge_base_url` set to this repo. Teaches AI agents how to construct typesetting payloads, interpret results, compose templates, and handle the long tail of PTXprint operational concerns.

The two are kept in one repo because they are tightly coupled: a tool surface change requires a governance update, and vice versa. Splitting them creates drift; co-locating them keeps the contract honest.

## Project status

**Phase 1 demonstrated.** The MCP server is deployed and produces real PDFs end-to-end. As of the most recent validation (2026-04-30, see [`canon/handoffs/open-items-validated-2026-04-30.md`](canon/handoffs/open-items-validated-2026-04-30.md)):

- ✅ **Phase 1 — typeset from a fixture** — first PDF in session 10 (2026-04-29). Charis-substitution mitigation for fixtures referencing unbundled fonts.
- ✅ **Phase 2 — payload-supplied fonts** — minitests fixture rendered with Gentium Plus 6.200 supplied entirely via the payload's `fonts` array; no system fonts, no cfg-edit substitution.
- ✅ **Real-content renders** — BSB Gospel of John (4s wall-clock, ~360 KB PDF) and BSB Psalms (13 s wall-clock, ~900 KB PDF, 184 pages with embedded Gentium Plus + SourceCodePro). Reproducibility verified: same payload → same `job_id` (content-addressed) on cache hit.
- ✅ **Agent-facing canon retrieval** — `docs` tool surfaces relevant canon articles via natural-language query; depth-2 returns the full top document.
- ⏳ **Reliable widget-ID overrides** (`-D` flag) — blocked on widget-ID-to-cfg-key mapping (open since session 1; tracked in latest handoffs).
- ⏳ **Day-2 features** — autofill mode, `cancel_job` SIGTERM enforcement, per-pass progress streaming. Specced; not yet built.
- ⏳ **Templates / composition pattern** — drafted as a downstream-agent bootstrap surface; see open PRs.

**Live deployment:** `https://ptxprint.klappy.dev` — `/health` returns `{ ok: true, service, version, spec, tools }`; `/mcp` accepts streamable-HTTP MCP. Worker version and spec version are reported live; the README does not duplicate them to avoid drift.

**Read the full spec:** [`canon/specs/ptxprint-mcp-v1.2-spec.md`](canon/specs/ptxprint-mcp-v1.2-spec.md).

**Read the architecture overview:** [`ARCHITECTURE.md`](ARCHITECTURE.md).

**Read the latest handoff:** browse [`canon/handoffs/`](canon/handoffs/) — handoff filenames are sorted by session and by date, and the most recent entry is the durable record of what state the system is in and what the next session should pick up. The same content is searchable via the `docs` tool.

## What PTXprint is

PTXprint is a typesetting tool maintained by SIL that produces print-ready PDFs from [Paratext](https://paratext.org/) Bible translation projects. It wraps a XeTeX macro engine in a Python/GTK GUI, with an extensive configuration surface (~400 settings across ~25 sections, plus stylesheets, picture lists, paragraph adjustments, and more).

This MCP server exposes PTXprint's headless run path (no GUI required) as an async job system, so AI agents can drive it conversationally on behalf of translation teams.

Upstream: [`sillsdev/ptx2pdf`](https://github.com/sillsdev/ptx2pdf). Pinned at `3.0.20` (released 2026-04-19) for reproducibility.

## Architecture in one paragraph

The agent constructs a payload describing one typesetting job (config files inline as text; USFM sources, fonts, and figures referenced by URL with sha256 verification) and calls `submit_typeset`. A Cloudflare Worker validates the payload, computes its sha256 (via JCS canonicalization), and either returns the cached output URL (if the same payload has been seen before) or dispatches to a Cloudflare Container that materializes a scratch directory, runs PTXprint, and uploads the resulting PDF to R2 at a content-addressed path. Per-job state is held in Durable Objects, polled via `get_job_status`. PTXprint itself is treated as a pure function from inputs to PDF — re-running an unchanged build is free.

## Trying it

### As an agent operator

Point your MCP-aware agent at `https://ptxprint.klappy.dev/mcp` (streamable-HTTP) or `/sse` (legacy SSE). The agent's reasoning loop becomes: **discover via `docs` → understand → construct payload → submit job → poll → handle result.** No additional knowledge base setup is required — the deploy's `docs` tool is a thin proxy over [`oddkit`](https://github.com/klappy/oddkit) configured against this repo's canon. Agents that already use oddkit can also point its `knowledge_base_url` at this repo directly for richer epistemic operations (orient, challenge, encode, validate).

The tightest path to a working PDF: ask the `docs` tool what it knows. For example:

```text
docs(query="phase 1 minimum payload", depth=2)
docs(query="payload construction", depth=2)
docs(query="english single book template", depth=2)   # post PR #23
```

The README does not list every available canon article — that catalog grows over time, and a hand-maintained list would lie in wait. The discovery surface is the tool; the filesystem under [`canon/articles/`](canon/articles/) is authoritative.

### Reproducing the smoke locally (no MCP client needed)

The repo ships a small set of reproducible test payloads under [`smoke/`](smoke/). Each `*.json` is a complete `submit_typeset` payload exercising a different facet — minimal Phase-1 floor, payload-supplied fonts, full BSB renders. Companion `*.README.md` files document what each fixture demonstrates and what was learned from it; [`smoke/docs-smoke.py`](smoke/docs-smoke.py) exercises the `docs` tool end-to-end.

To run a fixture against the live deploy, POST a JSON-RPC envelope to `/mcp`:

```bash
# Pseudocode — full reconstruction in canon/handoffs/session-11-fonts-payload-demo.md
1. POST initialize       → returns mcp-session-id
2. POST notifications/initialized
3. POST tools/call submit_typeset { payload }   → returns { job_id, predicted_pdf_url }
4. POST tools/call get_job_status { job_id }    → poll every 5 s until state ∈ {succeeded, failed}
5. GET predicted_pdf_url → PDF
```

Most fixtures finish in 5-15 seconds wall-clock; cache hits return in under a second.

### Verifying a known-good output

A reference PDF from session 11 — most recently re-confirmed live in the 2026-04-30 validation report — is retrievable directly:

```bash
curl -A "ptxprint-validate/0.1" \
  -o session11.pdf \
  "https://ptxprint.klappy.dev/r2/outputs/802e42e7d549cf9f827cbbcff69a6354e1b968a23084e5f2485f93cde52fc4bd/minitest_Default_JHN_ptxp.pdf"

pdfinfo session11.pdf      # Title="The Testcase", Subject="JHN", Creator="PTXprint 3.0.20 (Default)"
pdffonts session11.pdf     # Should show GentiumPlus, GentiumPlus-Bold, GentiumPlus-Italic
```

If the URL stops working, the OUTPUTS bucket lifecycle has reached this object. Re-submitting the same payload (in [`smoke/fonts-payload.json`](smoke/fonts-payload.json) or as composed via the templates pattern) regenerates an identical PDF — content-addressed by payload hash, so the same hash always lands at the same R2 path.

## Repository layout

Top-level structure (directory-level only — see the directories themselves for current contents, since the file lists evolve):

```
ptxprint-mcp/
├── README.md           (this file)
├── ARCHITECTURE.md     (architecture overview, one diagram)
├── BUILD.md            (deployment & operations notes)
├── CONTRIBUTING.md     (how to contribute)
├── LICENSE             (MIT)
├── Dockerfile          (PTXprint + XeTeX + fonts + FastAPI Container)
├── wrangler.jsonc      (Worker + DO + Container + R2 config)
├── package.json / tsconfig.json
├── src/                (TypeScript Worker — MCP tools, payload schema, job state DO, container DO wrapper)
├── container/          (Python FastAPI handler running inside the Container)
├── smoke/              (reproducible test payloads + per-fixture READMEs + docs-tool smoke)
└── canon/              (oddkit-readable knowledge base)
    ├── specs/          (versioned MCP server specifications)
    ├── articles/       (agent-facing operational knowledge — payloads, fonts, formats, recipes, templates)
    ├── handoffs/       (cross-session work transfer documents + validation reports)
    ├── encodings/      (DOLCHEO+H session encodings — one file per planning/build session)
    ├── governance/     (project-scoped governance constraints layered on top of klappy.dev canon)
    ├── surfaces/       (Epistemic Surface Extractions of upstream artifacts)
    └── derivatives/    (artifacts derived from canon for downstream use)
```

The repository tree does not enumerate individual files. The directories are authoritative; the `docs` tool indexes everything under `canon/`.

## License

[MIT](LICENSE) © 2026 klappy

## Acknowledgements

### Upstream

PTXprint is developed by [SIL Global](https://www.sil.org/). This project wraps and extends that work; it does not modify PTXprint itself. The PTXprint MASTER SLIDES deck (438 slides authored by Martin Hosken, Mark Penny, and David Gardner) and the upstream [`sillsdev/ptx2pdf`](https://github.com/sillsdev/ptx2pdf) repository were primary canon sources.

### Methodology and tooling

This project was scoped, designed, bootstrapped, and continues to be built using [klappy](https://github.com/klappy)'s [oddkit](https://github.com/klappy/oddkit) — an MCP-served knowledge base and discipline layer for **Outcomes-Driven Development (ODD)**. ODD treats exploration, planning, and execution as distinct epistemic modes with different rules: planning front-loads ambiguity (questions are the work product); execution does not (questions should be answered before code is written). The architectural conventions applied here — vodka architecture, KISS, DRY canon, mode discipline, verification-requires-fresh-context, no-lie-in-wait static indexes — come from the broader klappy canon.

### Discovery and build process

The pre-implementation phase ran across multiple conversational sessions, processing several sources before any spec was committed:

- **Planning meeting transcripts** with PTXprint's SME (Martin Hosken) and the project operator. Each transcript was encoded as **DOLCHEO+H** artifacts — Decisions, Observations, Learnings, Constraints, Handoffs, plus Open questions — so context survives across sessions and remains agent-searchable. Encodings live under [`canon/encodings/`](canon/encodings/), one file per session.
- **The PTXprint MASTER SLIDES deck** (438 slides) — processed via **Epistemic Surface Extraction (ESE)**, a lens-based pass over artifacts too large to ingest in one shot.
- **The `sillsdev/ptx2pdf` source repository** — same ESE method applied to a code repository, surfacing entry points, project shape, configuration model, failure modes, and deployment footprint.
- **The first-pass MCP server PoC and its specification** — analyzed against vodka-architecture principles to identify domain opinions that had drifted into server code, driving the v1.0 → v1.1 → v1.2 simplification (17 tools → 7 → 4) documented in the early-session encodings. The current surface is 6 tools — the simplified core of 4 (`submit_typeset`, `get_job_status`, `cancel_job`, `docs`) plus 2 transparency/governance tools added by the telemetry-feature planning ledger (`telemetry_public`, `telemetry_policy`).
- **The operator's ~1000 real PTXprint configurations** (private corpus) — used to validate that the proposed payload schema covers real-world variation across many translation projects.

The implementation phase has followed the same discipline: anchoring time, declaring mode, retrieving canon, preflighting before artifact work, validating against required outputs, and encoding decisions so each new session inherits the prior one's reasoning. Each session is a discrete handoff transfer; the durable record lives in [`canon/handoffs/`](canon/handoffs/) and [`canon/encodings/`](canon/encodings/).

### Going forward

oddkit continues at runtime. The AI agent driving this MCP server loads oddkit MCP separately and sets its `knowledge_base_url` to this repository, treating [`canon/`](canon/) as the project's knowledge base. The agent's reasoning loop becomes: **discover via `docs` → understand → construct payload → submit job → poll → handle result.** Each future autonomous coding run that builds, extends, or maintains this MCP server follows the same discipline — anchoring time, declaring mode, retrieving canon, preflighting before artifact work, validating against required outputs, and encoding decisions for the next session to inherit. Co-locating the code and the governance KB in this single repo prevents drift between what the system does and what the agent thinks it does.
