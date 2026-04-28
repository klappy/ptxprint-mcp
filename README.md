# PTXprint MCP

> **Stateless content-addressed build system for Bible typesetting via [PTXprint](https://software.sil.org/ptxprint/), exposed as an [MCP](https://modelcontextprotocol.io/) server, plus a governance knowledge base for AI agents that drive it.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status: Pre-implementation](https://img.shields.io/badge/status-pre--implementation-orange.svg)]()
[![Spec: v1.2-draft](https://img.shields.io/badge/spec-v1.2--draft-blueviolet.svg)](canon/specs/ptxprint-mcp-v1.2-spec.md)

---

## What this repo is

This repo serves two coupled purposes:

1. **An MCP server implementation** — Cloudflare Worker + Container + Durable Objects + R2, exposing four tools (`submit_typeset`, `get_job_status`, `cancel_job`, `get_upload_url`) that an AI agent uses to drive PTXprint headlessly.

2. **A governance knowledge base** — markdown documents under [`canon/`](canon/) that teach AI agents how to construct typesetting payloads, interpret results, and handle the long tail of PTXprint operational concerns.

The two are kept in one repo because they are tightly coupled: a tool surface change requires a governance update, and vice versa. Splitting them creates drift; co-locating them keeps the contract honest.

## Project status

**Pre-implementation.** The v1.2 specification is drafted and under review. No Worker, Container, or deployment code exists yet. The first autonomous coding run is planned for hackathon week starting 2026-04-28.

Read the spec: [`canon/specs/ptxprint-mcp-v1.2-spec.md`](canon/specs/ptxprint-mcp-v1.2-spec.md).

Read the architecture overview: [`ARCHITECTURE.md`](ARCHITECTURE.md).

## What PTXprint is

PTXprint is a typesetting tool maintained by SIL that produces print-ready PDFs from [Paratext](https://paratext.org/) Bible translation projects. It wraps a XeTeX macro engine in a Python/GTK GUI, with an extensive configuration surface (~400 settings across ~25 sections, plus stylesheets, picture lists, paragraph adjustments, and more).

This MCP server exposes PTXprint's headless run path (no GUI required) as a job queue, so AI agents can drive it conversationally on behalf of translation teams.

Upstream: [`sillsdev/ptx2pdf`](https://github.com/sillsdev/ptx2pdf).

## Architecture in one paragraph

The agent constructs a payload describing one typesetting job (config files inline as text; USFM sources, fonts, and figures referenced by URL with sha256 verification) and calls `submit_typeset`. A Cloudflare Worker validates the payload, computes its sha256, and either returns the cached output URL (if the same payload has been seen before) or dispatches to a Cloudflare Container that materializes a scratch directory, runs PTXprint, and uploads the resulting PDF to R2 at a content-addressed path. State is held in Durable Objects, polled via `get_job_status`. PTXprint itself is treated as a pure function from inputs to PDF — re-running an unchanged build is free.

## Quick start

**For agent operators:** Once deployed, point your MCP-aware agent at the server URL and load the canon repo via [`oddkit`](https://github.com/klappy/oddkit) MCP for governance retrieval. The agent's reasoning loop becomes: search canon → construct payload → submit job → poll → handle result.

**For developers:** Implementation is forthcoming. The spec in `canon/specs/` is the build target; deployment uses Cloudflare's `wrangler` CLI.

## Repository layout

```
ptxprint-mcp/
├── README.md                       (this file)
├── LICENSE                         (MIT)
├── ARCHITECTURE.md                 (architecture overview)
├── CONTRIBUTING.md                 (how to contribute)
├── canon/                          (oddkit-readable knowledge base)
│   ├── README.md                   (canon directory index + frontmatter conventions)
│   ├── specs/                      (versioned MCP server specifications)
│   ├── governance/                 (agent-facing operational knowledge)
│   ├── handoffs/                   (cross-session work transfer documents)
│   └── encodings/                  (DOLCHEO+H session encodings)
└── (src/, wrangler.toml — added when implementation begins)
```

## License

[MIT](LICENSE) © 2026 klappy

## Acknowledgements

PTXprint is developed by SIL Global. This project wraps and extends that work; it does not modify PTXprint itself. The PTXprint training deck (438-slide MASTER SLIDES authored by Hosken, Penny, and Gardner) and the upstream `ptx2pdf/docs/documentation/` markdown were primary sources for the governance knowledge base.

The architectural conventions (vodka architecture, ESE method, OLDC+H encoding, oddkit retrieval pattern) come from the broader klappy canon.
