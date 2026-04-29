# Contributing

> The MCP server is live and Phase-1-demonstrated; canon is actively grown alongside the running system. Contribution patterns are still loose. What follows is the minimum.

## What lives where

- **Top-level Markdown** (`README.md`, `ARCHITECTURE.md`, this file) — project-facing documentation. Casual frontmatter.
- **`canon/`** — knowledge base. Every file requires structured frontmatter so [`oddkit`](https://github.com/klappy/oddkit) MCP can retrieve it. See [`canon/README.md`](canon/README.md) for the conventions.
- **`src/`** — Worker, Container DO classes, and shared TypeScript code. `container/` holds the Python FastAPI handler that runs inside the Cloudflare Container. Both live with the docs that govern them; do not split into another repo.

## Frontmatter for canon documents

Every `canon/**/*.md` file should carry frontmatter like:

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

These conventions follow the broader klappy canon's DOLCHEO frontmatter pattern. The fields are not strictly enforced today; they will be once oddkit retrieval is wired up.

## Pull requests

- Spec changes (`canon/specs/`) are versioned. Don't edit a published version; create a new one (`v1.3-draft.md`) and supersede.
- Governance changes (`canon/governance/`) edit in place; the doc is meant to evolve with the running system. Significant changes should reference the relevant session encoding.
- Code changes need accompanying spec or governance changes if they affect the contract.

## Issues

File issues for:
- Bugs in the running MCP server (once deployed)
- Spec ambiguities you found while implementing or using
- Governance gaps the agent runs into

For questions about PTXprint itself rather than this MCP, the upstream forum at [support.bible/ptxprint](https://support.bible/ptxprint/) is the right venue.

## License

Contributions are accepted under the project's [MIT License](LICENSE).
