---
title: "Governance — Placeholder"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["governance", "placeholder", "v1.2-pending"]
canonical_status: non_canonical
---

# `canon/governance/` — Agent-facing operational knowledge

This directory is currently a placeholder. The substantive content — a multi-thousand-word governance document covering the headless operating contract, CLI reference, file system map, configuration model, override mechanism, settings cookbook, supporting files, USFM in headless context, workflow recipes, diagnostic patterns, conversational patterns, and special-handling settings — was authored by the operator from the PTXprint MASTER SLIDES deck PDF and currently exists outside the repo.

## Status

The authored governance document is aligned with v1.0/v1.1 of the MCP spec (filesystem-based, 7 tools) and needs to be updated to v1.2 (stateless content-addressed build system, 4 tools) before landing here.

The update handoff lives at [`../handoffs/governance-update-handoff.md`](../handoffs/governance-update-handoff.md) — a section-by-section edit script that another session can apply mechanically.

## What lands here once the update is applied

- **`headless-operations.md`** — the main agent-facing governance document, post-v1.2-update.

The existing handoff doc names the gating canon articles for the v1.2 build:

- `payload-construction.md` (gating for end-to-end smoke test)
- `output-naming.md` (gating)
- `config-construction.md`
- `font-resolution.md`
- `failure-mode-taxonomy.md`

Some of these will be derived directly from sections of the headless-operations doc; others need fresh authoring. The split between one big `headless-operations.md` and several smaller topic-specific articles is a near-term design decision — both options are viable; the bigger doc is faster to land, the smaller articles are easier for an agent to retrieve atomically.

## Working note for whoever does the next pass

The authored governance document carries substantial agent-facing content that is architecturally neutral (settings cookbook, USFM reference, diagnostic patterns, conversational patterns, special-handling settings). Most of it survives the v1.2 transition with cosmetic edits. The handoff doc names the surgical changes; estimated effort is 30–60 minutes for a careful single-session pass.

After the update, this README should be replaced with a real index of governance articles.
