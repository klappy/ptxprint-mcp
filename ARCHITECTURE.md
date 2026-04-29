---
title: "PTXprint MCP — Architecture Overview"
audience: project
exposure: public
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "architecture", "overview"]
canonical_status: non_canonical
companion_to: "canon/specs/ptxprint-mcp-v1.2-spec.md"
---

# Architecture Overview

> Quick orientation. For the full specification, see [`canon/specs/ptxprint-mcp-v1.2-spec.md`](canon/specs/ptxprint-mcp-v1.2-spec.md).

## The system in one diagram

```
Agent (Claude Desktop / BT Servant / etc.)
  │
  │ MCP/HTTP — 3 tools
  ▼
┌─────────────────────────────────────────────────────────┐
│ Cloudflare Worker          (the only Worker)            │
│  • submit_typeset(payload) → job_id (or cached URL)     │
│  • get_job_status(job_id)  → state, progress, URLs      │
│  • cancel_job(job_id)      → SIGTERM via DO flag        │
└─────────────────────────────────────────────────────────┘
  │
  │ Service binding · ctx.waitUntil(fetch(...))
  ▼
┌─────────────────────────────────────────────────────────┐
│ Cloudflare Container       (the only Container image)   │
│  Instance: standard-2 (1 vCPU, 6 GiB, 12 GB disk)       │
│  sleepAfter: 45m                                        │
│  Stack: PTXprint + XeTeX + fontconfig + Python HTTP     │
│                                                         │
│  Per job:                                               │
│   1. Materialize scratch dir from inline config_files   │
│   2. Parallel-fetch sources, fonts, figures             │
│      (verify sha256 as bytes arrive)                    │
│   3. Run PTXprint subprocess (poll DO for cancel flag); │
│      payload fonts in <project>/shared/fonts/ are       │
│      discovered by PTXprint's own startup logic         │
│   4. Classify exit (hard/soft/success)                  │
│   5. Upload PDF + log to R2                             │
│   6. Update DO with state, URLs, log_tail               │
└─────────────────────────────────────────────────────────┘
  │                                    │
  │ DO state R/W                       │ R2 PUT
  ▼                                    ▼
┌──────────────────────┐    ┌─────────────────────────────┐
│ Durable Objects      │    │ Cloudflare R2               │
│ (one DO per job_id)  │    │  • outputs/<hash>/...       │
│                      │    │    (content-addressed PDF   │
│                      │    │     + log; long retention)  │
└──────────────────────┘    └─────────────────────────────┘
```

## Core ideas

**PTXprint as a pure function.** The system treats `PTXprint(config, sources, fonts, figures)` as deterministic. Same inputs → same output. Output is content-addressed by `sha256(canonical_payload)`. Re-submitting an unchanged payload returns the cached R2 URL with no PTXprint run.

**Stateless workers.** No project tree on the server. Every job is a self-contained submission; the Container materializes a scratch directory at job start, runs, and the disk is wiped on Container sleep. This makes any Container instance interchangeable with any other — true horizontal autoscaling.

**Project state is the agent's responsibility.** The user's working configs, USFM sources, fonts — wherever those live (local filesystem, Git, DBL, Paratext server) — are accessed by the agent through whatever its environment provides (Claude Desktop file access, a separate filesystem MCP, etc.). The typesetting MCP only sees the payload.

**Inline text, URL'd binaries.** The payload contains config files (cfg, sty, changes.txt, FRTlocal.sfm, AdjLists, piclists, override files) inline as text. USFM sources, fonts, and figures are referenced by URL with sha256 verification. Hosting those URLs is the agent's concern, not the server's — the MCP surface does not stage or upload input files.

**Two-step async.** Every typesetting call returns a `job_id` immediately. Status is polled via `get_job_status`. No MCP call blocks for more than a few seconds.

**Three failure modes, not two.** Exit code zero plus a PDF is necessary but not sufficient for success — soft failures (degraded PDFs from canonicalisation errors, missing pictures, etc.) are detected by structural checks and surfaced in `get_job_status.failure_mode ∈ {hard, soft, success}`.

## Why Cloudflare

The 30-minute autofill workload exceeds Worker CPU budgets but fits cleanly in Cloudflare Containers (verified: standard-2 instances handle 512MB peak with massive headroom; HTTP-triggered Container requests have no inherent duration limit). R2 is the natural content-addressed output store. Durable Objects provide the per-job state machine. Service bindings let the Worker dispatch to the Container without queue infrastructure.

The whole system is one Worker + one Container image + DO bindings + R2 buckets. No second container, no separate queue worker, no dispatcher service. **One MCP. One image. One repo.**

## Why one repo for code and governance

Drift. A tool surface change requires a governance update; a governance pattern change may shift what the tools should expose. Splitting them across repos creates synchronization burden that compounds. Co-locating them keeps the contract honest — the spec, the code, and the agent-facing operational knowledge all evolve together under one set of commits.

## Where to read next

- [`canon/specs/ptxprint-mcp-v1.2-spec.md`](canon/specs/ptxprint-mcp-v1.2-spec.md) — the full v1.2 specification
- [`canon/governance/`](canon/governance/) — agent-facing operational knowledge (populated by applying [`canon/handoffs/governance-update-handoff.md`](canon/handoffs/governance-update-handoff.md))
- [`canon/encodings/`](canon/encodings/) — DOLCHEO+H session encodings tracking decisions and observations across sessions

For the upstream PTXprint project, see [`sillsdev/ptx2pdf`](https://github.com/sillsdev/ptx2pdf) and the [official site](https://software.sil.org/ptxprint/).
