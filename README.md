# PTXprint MCP

> **Stateless content-addressed build system for Bible typesetting via [PTXprint](https://software.sil.org/ptxprint/), exposed as an [MCP](https://modelcontextprotocol.io/) server, plus a governance knowledge base for AI agents that drive it.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status: Phase 1 demonstrated](https://img.shields.io/badge/status-phase%201%20demonstrated-green.svg)]()
[![Spec: v1.2-draft](https://img.shields.io/badge/spec-v1.2--draft-blueviolet.svg)](canon/specs/ptxprint-mcp-v1.2-spec.md)

---

## What this repo is

This repo serves two coupled purposes:

1. **An MCP server implementation** — Cloudflare Worker + Container + Durable Objects + R2, exposing three tools (`submit_typeset`, `get_job_status`, `cancel_job`) that an AI agent uses to drive PTXprint headlessly. **Live and operational.**

2. **A governance knowledge base** — markdown documents under [`canon/`](canon/) that teach AI agents how to construct typesetting payloads, interpret results, and handle the long tail of PTXprint operational concerns.

The two are kept in one repo because they are tightly coupled: a tool surface change requires a governance update, and vice versa. Splitting them creates drift; co-locating them keeps the contract honest.

## Project status

**Phase 1 demonstrated.** The MCP server is deployed at `https://ptxprint-mcp.klappy.workers.dev` and produces real PDFs end-to-end. As of session 11 (2026-04-29), both Phase-1 paths and one Phase-2 capability (payload-supplied fonts) are working:

- ✅ **Phase 1 — typeset from a fixture.** First PDF: session 10 (job `6f37b42b…`, 2026-04-29T01:00Z, 4.1s, 66966 bytes). Charis-substitution mitigation for fixtures referencing unbundled fonts.
- ✅ **Phase 2 — payload-supplied fonts.** First demonstration: session 11 (job `802e42e7…`, 2026-04-29T01:51Z, 4.7s, 68111 bytes). Minitests fixture rendered faithfully with Gentium Plus 6.200 supplied entirely via the payload's `fonts` array — no system fonts, no cfg-edit substitution.
- ⏳ **Phase 2 — reliable widget-ID overrides** (`-D` flag): blocked on widget-ID-to-cfg-key mapping (open as session-1 O-003 / session-10 H-019).
- ⏳ **Day-2 features** — autofill mode, `cancel_job` SIGTERM, per-pass progress streaming. Specced; not yet built.

**Live deployment:** `https://ptxprint-mcp.klappy.workers.dev` — `/health` returns 200; `/mcp` accepts streamable-HTTP MCP. Worker version 0.1.0; spec v1.2-draft.

**Read the full spec:** [`canon/specs/ptxprint-mcp-v1.2-spec.md`](canon/specs/ptxprint-mcp-v1.2-spec.md).

**Read the architecture overview:** [`ARCHITECTURE.md`](ARCHITECTURE.md).

**Read the most recent handoff:** [`canon/handoffs/`](canon/handoffs/) — the latest entry is the durable record of what state the system is in and what the next session should pick up.

## What PTXprint is

PTXprint is a typesetting tool maintained by SIL that produces print-ready PDFs from [Paratext](https://paratext.org/) Bible translation projects. It wraps a XeTeX macro engine in a Python/GTK GUI, with an extensive configuration surface (~400 settings across ~25 sections, plus stylesheets, picture lists, paragraph adjustments, and more).

This MCP server exposes PTXprint's headless run path (no GUI required) as an async job system, so AI agents can drive it conversationally on behalf of translation teams.

Upstream: [`sillsdev/ptx2pdf`](https://github.com/sillsdev/ptx2pdf). Pinned at `3.0.20` (released 2026-04-19) for reproducibility.

## Architecture in one paragraph

The agent constructs a payload describing one typesetting job (config files inline as text; USFM sources, fonts, and figures referenced by URL with sha256 verification) and calls `submit_typeset`. A Cloudflare Worker validates the payload, computes its sha256, and either returns the cached output URL (if the same payload has been seen before) or dispatches to a Cloudflare Container that materializes a scratch directory, runs PTXprint, and uploads the resulting PDF to R2 at a content-addressed path. State is held in Durable Objects, polled via `get_job_status`. PTXprint itself is treated as a pure function from inputs to PDF — re-running an unchanged build is free.

## Trying it

### As an agent operator

Point your MCP-aware agent at `https://ptxprint-mcp.klappy.workers.dev/mcp` (streamable-HTTP) or `/sse` (legacy SSE). Load the canon repo via [`oddkit`](https://github.com/klappy/oddkit) MCP for governance retrieval — set `knowledge_base_url` to this repo. The agent's reasoning loop becomes: search canon → construct payload → submit job → poll → handle result.

The tightest path to a working PDF: start by reading [`canon/articles/phase-1-poc-scope.md`](canon/articles/phase-1-poc-scope.md) for the Phase-1 minimum payload (5 config_files + 1 USFM source) and [`canon/articles/payload-construction.md`](canon/articles/payload-construction.md) for the full schema.

### Reproducing the smoke locally (no MCP client needed)

The repo ships two smoke fixtures:

- [`smoke/minimal-payload.json`](smoke/minimal-payload.json) — Phase-1 floor: empty `config_files`, BSB Gospel of John as USFM source, fonts:`[]` (relies on container-bundled Charis SIL).
- [`smoke/fonts-payload.json`](smoke/fonts-payload.json) — Phase-2 demonstration: full minitests `config_files` with Gentium Plus referenced in the cfg, four Gentium Plus 6.200 TTFs supplied via the payload's `fonts` array.

To run either against the live deploy, POST a JSON-RPC envelope to `/mcp`:

```bash
# Pseudocode — full reconstruction in canon/handoffs/session-11-fonts-payload-demo.md
1. POST initialize       → returns mcp-session-id
2. POST notifications/initialized
3. POST tools/call submit_typeset { payload }   → returns { job_id, predicted_pdf_url }
4. POST tools/call get_job_status { job_id }    → poll every 5s until state ∈ {succeeded, failed}
5. GET predicted_pdf_url → PDF
```

Both smokes finish in 5-10 seconds wall-clock for a single chapter.

### Verifying a known-good output

A reference PDF from session 11 is retrievable directly:

```bash
curl -A "ptxprint-validate/0.1" \
  -o session11.pdf \
  "https://ptxprint-mcp.klappy.workers.dev/r2/outputs/802e42e7d549cf9f827cbbcff69a6354e1b968a23084e5f2485f93cde52fc4bd/minitest_Default_JHN_ptxp.pdf"

pdfinfo session11.pdf      # Title="The Testcase", Subject="JHN", Creator="PTXprint 3.0.20 (Default)"
pdffonts session11.pdf     # Should show GentiumPlus, GentiumPlus-Bold, GentiumPlus-Italic
```

If the URL stops working it's because the OUTPUTS bucket lifecycle has reached this object. The fixture in `smoke/fonts-payload.json` re-creates an identical PDF (content-addressed by payload hash; same hash → same R2 path).

## Repository layout

```
ptxprint-mcp/
├── README.md                       (this file)
├── LICENSE                         (MIT)
├── ARCHITECTURE.md                 (architecture overview, one diagram)
├── BUILD.md                        (deployment & operations notes)
├── CONTRIBUTING.md                 (how to contribute)
├── Dockerfile                      (PTXprint + XeTeX + fonts + FastAPI)
├── wrangler.jsonc                  (Worker + DO + Container + R2 config)
├── package.json / tsconfig.json
├── src/                            (TypeScript Worker)
│   ├── index.ts                    (Worker entry, MCP tools, internal routes)
│   ├── payload.ts                  (zod schema, JCS canonicalization, sha256)
│   ├── output-naming.ts
│   ├── job-state-do.ts             (JobStateDO class)
│   └── container.ts                (PtxprintContainer DO wrapper)
├── container/                      (Python FastAPI handler in the Container)
│   ├── main.py                     (POST /jobs; fetch_inputs; PTXprint subprocess)
│   └── requirements.txt
├── smoke/                          (reproducible test payloads)
│   ├── minimal-payload.json        (Phase 1 minimum — BSB JHN, no config)
│   └── fonts-payload.json          (Phase 2 demo — minitests + payload fonts)
└── canon/                          (oddkit-readable knowledge base)
    ├── README.md                   (canon directory index + frontmatter conventions)
    ├── specs/                      (versioned MCP server specifications)
    ├── articles/                   (agent-facing operational knowledge — payloads, fonts, formats, recipes, taxonomies)
    ├── handoffs/                   (cross-session work transfer documents)
    └── encodings/                  (DOLCHEO+H session encodings — sessions 1-11)
```

## License

[MIT](LICENSE) © 2026 klappy

## Acknowledgements

### Upstream

PTXprint is developed by [SIL Global](https://www.sil.org/). This project wraps and extends that work; it does not modify PTXprint itself. The PTXprint MASTER SLIDES deck (438 slides authored by Martin Hosken, Mark Penny, and David Gardner) and the upstream [`sillsdev/ptx2pdf`](https://github.com/sillsdev/ptx2pdf) repository were primary canon sources.

### Methodology and tooling

This project was scoped, designed, bootstrapped, and now built using [klappy](https://github.com/klappy)'s [oddkit](https://github.com/klappy/oddkit) — an MCP-served knowledge base and discipline layer for **Outcomes-Driven Development (ODD)**. ODD treats exploration, planning, and execution as distinct epistemic modes with different rules: planning front-loads ambiguity (questions are the work product); execution does not (questions should be answered before code is written). The architectural conventions applied here — vodka architecture, KISS, DRY canon, mode discipline, verification-requires-fresh-context — come from the broader klappy canon.

### Discovery and build process

The pre-implementation phase ran across five conversational sessions, processing multiple sources before any spec was committed:

- **Planning meeting transcripts** with PTXprint's SME (Martin Hosken) and the project operator. Each transcript was encoded as **DOLCHEO+H** artifacts — Decisions, Observations, Learnings, Constraints, Handoffs, plus Open questions — so context survives across sessions and remains agent-searchable. Sessions 1-11 are encoded under [`canon/encodings/`](canon/encodings/).
- **The PTXprint MASTER SLIDES deck** (438 slides) — processed via **Epistemic Surface Extraction (ESE)**, a lens-based pass over artifacts too large to ingest in one shot.
- **The `sillsdev/ptx2pdf` source repository** — same ESE method applied to a code repository, surfacing entry points, project shape, configuration model, failure modes, and deployment footprint.
- **The first-pass MCP server PoC and its specification** — analyzed against vodka-architecture principles to identify domain opinions that had drifted into server code, driving the v1.0 → v1.1 → v1.2 simplification (17 tools → 7 → 4) documented in [`canon/encodings/transcript-encoded-session-5.md`](canon/encodings/transcript-encoded-session-5.md).
- **The operator's ~1000 real PTXprint configurations** (private corpus) — used to validate that the proposed payload schema covers real-world variation across many translation projects.

The implementation phase (sessions 7-11) followed the same discipline: anchoring time, declaring mode, retrieving canon, preflighting before artifact work, validating against required outputs, and encoding decisions so each new session inherited the prior one's reasoning. Each session is a discrete handoff transfer; the durable record lives in [`canon/handoffs/`](canon/handoffs/).

### Going forward

oddkit continues at runtime. The AI agent driving this MCP server loads oddkit MCP separately and sets its `knowledge_base_url` to this repository, treating [`canon/`](canon/) as the project's knowledge base. The agent's reasoning loop becomes: **search canon → understand → construct payload → submit job → poll → handle result.** Each future autonomous coding run that builds, extends, or maintains this MCP server follows the same discipline — anchoring time, declaring mode, retrieving canon, preflighting before artifact work, validating against required outputs, and encoding decisions for the next session to inherit. Co-locating the code and the governance KB in this single repo prevents drift between what the system does and what the agent thinks it does.
