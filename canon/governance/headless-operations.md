---
title: "PTXprint Headless Operations — Knowledge Base for AI Agents and Assistants (Overview)"
audience: agent
exposure: nav
voice: instructional
stability: working
tags: ["ptxprint", "headless", "mcp", "agent-kb", "operations", "v1.2-aligned", "non-canonical", "overview", "map"]
derives_from: "canon/governance/headless-operations.md (pre-2026-04-28 monolith), transcript-encoded-session-6.md (H-011)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
generator: "claude-opus-4.7 (interactive session)"
created_at: 2026-04-28T02:50:00Z
updated_at: 2026-04-28T20:30:00Z
canonical_status: non_canonical
intended_consumer: "AI agent submitting jobs to the PTXprint MCP server, or AI assistant helping a user create configs and produce PDFs conversationally via the MCP server"
---

# PTXprint Headless Operations — Overview

> **What this KB is.** Operational knowledge for an AI working with PTXprint through the v1.2 MCP server — not through the GUI. Two audiences share it: (1) an autonomous agent that submits jobs to the MCP server to produce PDFs, and (2) an AI assistant guiding a human user conversationally through MCP-mediated config creation. Both touch the same surface; both need the same knowledge.

> **What this KB is not.** Not the MCP server's API specification (that lives in `klappy://canon/specs/ptxprint-mcp-v1-2-spec`). Not the catalog of all 400+ settings (that lives in canon, derived from the running tooltip dump). Not the user-facing training manual. This document is the operational layer between the spec and the user.

> **Architecture context.** The PTXprint MCP server is a stateless content-addressed build system. The agent does not edit files inside a sandboxed project tree on the server — it reads project state from wherever the user keeps it (Claude Desktop's filesystem access, Git, DBL, the user's Paratext server) and constructs a payload describing one typesetting job. The payload is submitted to the server, which dispatches it to an ephemeral worker container that materializes the inputs, runs PTXprint, and uploads the PDF to R2. The agent receives a job_id and polls for status.
>
> Iterative editing in this model means re-submitting an updated payload, not editing files in place. Each typesetting run is fully reproducible from its payload; outputs are content-addressed by sha256 of the payload, so re-submitting an unchanged build returns the cached result for free.

> **Containment.** Non-canonical. Where this disagrees with the running PTXprint product, the product wins. Where this disagrees with canon, canon wins. Verify settings names against the running UI before encoding into production code.

---

## How to use this KB

This document is an **index**. Detail lives in chapter articles under `canon/articles/`. Fetch the chapter that answers your immediate question via `oddkit_get`.

The articles are designed for progressive disclosure — read what you need, ignore the rest. Cross-references between articles use `klappy://` URIs.

## Chapter map

### Building and submitting jobs

| Chapter | Use when |
|---|---|
| `klappy://canon/articles/payload-construction` | Building a `submit_typeset` payload from scratch |
| `klappy://canon/articles/file-system-map` | Choosing relative-path keys in `config_files` |
| `klappy://canon/articles/output-naming` | Interpreting `pdf_url`/`log_url` and the filename convention |
| `klappy://canon/articles/cli-reference` | Understanding what the worker invokes; mapping payload → flags |

### Configuration

| Chapter | Use when |
|---|---|
| `klappy://canon/articles/config-construction` | Modifying or creating a `ptxprint.cfg` |
| `klappy://canon/articles/config-inheritance-and-overrides` | Walking `[import]` chains; debugging override files |
| `klappy://canon/articles/settings-cookbook` | Translating user intent to specific cfg keys |

### Supporting file formats

| Chapter | Use when |
|---|---|
| `klappy://canon/articles/font-resolution` | Building the `fonts` array; sourcing font URLs |
| `klappy://canon/articles/adjlist-format` | Writing paragraph adjustments per book |
| `klappy://canon/articles/piclist-format` | Placing pictures via `<PRJ>-<Config>.piclist` |
| `klappy://canon/articles/changes-txt-format` | Regex USFM transforms |
| `klappy://canon/articles/stylesheet-format` | Marker style declarations in `.sty` |
| `klappy://canon/articles/usfm-markers-headless` | USFM book codes, markers, PTXprint `\z*` extensions |
| `klappy://canon/articles/frt-local-and-cover-periphs` | Front matter content; cover periphs |

### Running, diagnosing, recovering

| Chapter | Use when |
|---|---|
| `klappy://canon/articles/failure-mode-taxonomy` | Interpreting `failure_mode: hard \| soft \| success` |
| `klappy://canon/articles/diagnostic-patterns` | Reading XeTeX logs; common error signatures; recovery loop |
| `klappy://canon/articles/workflow-recipes` | End-to-end flows (draft, NT, diglot, lockdown, recovery) |

### Scope

| Chapter | Use when |
|---|---|
| `klappy://canon/articles/phase-1-poc-scope` | What's in/out for hackathon week (USFM-only payload) |

## Authorship and updates

This overview replaces the prior monolithic `headless-operations.md` (68kb, single document). The split into chapter articles was H-011 from session 6, motivated by progressive-disclosure ergonomics — agents fetch only the chapter they need rather than the whole KB.

Source content for the chapters comes from the prior monolith (sessions 1–5 derivation), the v1.2 spec, the master deck, and session 6 transcript encoding. Each chapter cites `derives_from` in its frontmatter.

When adding new operational knowledge, add it to the most-relevant chapter article — not back into this overview. This overview stays a map; chapters are the single source of truth for their topic, per `klappy://canon/principles/dry-canon-says-it-once`.

## Open gaps

Items not yet covered by any chapter article. Surface to the user honestly when their request lands here.

1. **Exact widget-identifier names for `define` overrides.** The deck shows examples (`s_linespacing`, `c_fighiderefs`) but doesn't enumerate them. A tooltip-dump-derived index belongs in canon.

2. **The 400+ settings catalog.** Chapters name sections and give intent-keyed pointers. A complete per-key article set requires the running tooltip dump as source.

3. **Picture catalogue and download workflows.** The high-res download lifecycle (request → wait → email → download → don't-unzip) doesn't have a clean MCP path yet — it's a project-state concern that happens before payload construction.

4. **Cover-wizard equivalents in headless.** The agent constructs cover periphs directly in `FRTlocal.sfm`. The deck's 6-step wizard has no documented headless analogue.

5. **TeX-macro injection (`*-mods.tex`, `*-premods.tex`).** v1.2 defers as too risky for automation. Until canon documents validation patterns, the agent shouldn't include these in payloads.

6. **Programmatic PDF Compare.** Available in GUI; not exposed via MCP yet.

7. **Diglot two-config concurrency.** When editing a diglot setup, two project-config pairs are in play simultaneously. Constructing payloads that reference both correctly is the agent's responsibility — and not yet documented in a single chapter.

8. **Project state read/write mechanism.** The agent needs read/write access to the user's project storage (filesystem, Git, Paratext server) but the typesetting MCP doesn't provide it. Implicit for Claude Desktop with native FS access; needs documentation per host elsewhere.

9. **Payload history persistence.** Whether the agent maintains payload history in volatile memory, persistent agent state, or external storage — and how to surface that history for rollback purposes.

10. **Cache-hit observability.** When to surface "this PDF was returned from cache" vs. "this PDF was just generated" in user-facing messaging.

11. **Hackathon-week preset templates** (session 6 D-022 / H-012). The 3–4 presets the agent picks from haven't been enumerated. Operator + Martin own this.

12. **Zip-payload vs structured-payload tension** (session 6 O-open-P1-005 / H-014). Martin pushed for zip-payload during session 6; v1.2 D-021 chose structured. Resolution required before next spec rev.

When the user's request lands in one of these gaps: surface honestly, recommend canon search or the running tooltip, and proceed only with explicit user direction.

## Provenance

- **Source materials:** `ptxprint-master-slides.surface.json`, `ptx2pdf.surface.json`, `transcript-encoded.md` (sessions 1–7), `ptxprint-mcp-v1.2-spec.md`, the operator's PDF deck extraction.
- **Generated:** 2026-04-28T02:50:00Z by claude-opus-4.7 (monolith).
- **Updated:** 2026-04-28T04:06:00Z (v1.2 alignment).
- **Restructured:** 2026-04-28T20:30:00Z (split into chapter articles per session 6 H-011).
- **Human review status:** not reviewed.
- **Recommended next passes:** resolution of the open gaps in companion canon articles; canon-seeding from the running tooltip dump; v1.2 spec rev addressing session 6 O-open-P1-005 (zip vs structured) and rescope of §10 DoD per session 6 D-022 (hackathon = 3–4 presets, not canon-driven generation).
