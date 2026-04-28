---
title: "Canon Directory — Index and Conventions"
audience: project
exposure: public
voice: neutral
stability: working
tags: ["canon", "index", "oddkit", "conventions"]
canonical_status: non_canonical
---

# `canon/` — PTXprint MCP Knowledge Base

This directory holds the project's knowledge base. Every file is intended to be:

- **Human-readable** — the markdown is also clean documentation.
- **Agent-retrievable** — frontmatter and structure are compatible with [`oddkit`](https://github.com/klappy/oddkit) MCP, so an AI agent pointed at this repo via `knowledge_base_url` can search and retrieve any document.

## Layout

| Subdirectory | Purpose |
|---|---|
| [`specs/`](specs/) | Versioned PTXprint MCP server specifications. Don't edit published versions — create a new file and supersede. |
| [`governance/`](governance/) | Agent-facing operational knowledge: how to construct payloads, interpret results, handle the long tail of PTXprint operational concerns. The "user manual" for the AI. |
| [`handoffs/`](handoffs/) | Cross-session work-transfer documents. Not durable canon; describe what one session is asking the next session (or another collaborator) to do. |
| [`encodings/`](encodings/) | DOLCHEO+H session encodings — Decisions, Observations, Learnings, Constraints, Handoffs, Open questions captured per session. The project's running ledger. |

## Frontmatter convention

Every canon document carries a YAML frontmatter block at the top:

```yaml
---
title: "..."
audience: "agent | operator | project"
exposure: "working | public"
voice: "neutral | instructional"
stability: "working | stable"
tags: ["...", "..."]
canonical_status: "canon | canon_candidate | non_canonical"
created_at: "2026-04-28T00:00:00Z"
---
```

Fields:

- **`title`** — Human-readable title.
- **`audience`** — Who the document is written for. `agent` for AI-facing operational content; `operator` for the human running the system; `project` for cross-cutting docs.
- **`exposure`** — `public` for documents safe to publish; `working` for in-progress drafts.
- **`voice`** — `neutral` for reference material; `instructional` for how-to.
- **`stability`** — `stable` if the content has settled; `working` if active iteration is expected.
- **`tags`** — Keywords for retrieval. Agents search by tag; humans skim them.
- **`canonical_status`** — Per the broader klappy canon conventions: `canon` is binding, `canon_candidate` is being tested, `non_canonical` is reference / interpretive material that informs but does not bind.
- **`created_at`** — ISO 8601 timestamp.

Additional fields like `supersedes`, `companion_to`, `extends`, `applied_canon` are used where relevant.

## Reading order for a new contributor or agent

1. [`/README.md`](../README.md) — project overview
2. [`/ARCHITECTURE.md`](../ARCHITECTURE.md) — high-level architecture
3. [`canon/specs/`](specs/) — the current spec (latest version)
4. [`canon/governance/`](governance/) — once populated, the agent's operational manual
5. [`canon/encodings/`](encodings/) — historical decisions and rationale, newest session first

## Status of canon content

- **Specs**: v1.2-draft is the current build target. v1.0 (PoC) and v1.1 (filesystem-based first-principles refactor) are historical and not in the repo; v1.2 supersedes them.
- **Governance**: a substantial agent-facing governance document was authored from the PTXprint MASTER SLIDES deck PDF. It is currently aligned with v1.0/v1.1 and is being updated to v1.2 conventions per [`handoffs/governance-update-handoff.md`](handoffs/governance-update-handoff.md). Once updated it lands in [`governance/`](governance/).
- **Encodings**: session 5 captures the architectural pivot to v1.2. Earlier session encodings (1–4) are referenced but may not yet be in this repo.

## Promotion to broader klappy canon

This repo's canon is project-scoped (PTXprint-specific). Insights here that prove durable across the broader klappy work — for example, the principle that "stateless workers imply content-addressed everything" or "co-locating code and governance prevents drift" — should be promoted to the broader canon by direct edit there, not by reference from this repo.

The general rule (per `klappy://canon/principles/dry-canon-says-it-once`): cross-cutting principles live once, in the broader canon. Project-specific applications live here.
