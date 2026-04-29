---
title: "PTXprint MCP Server — Transcript Encoding Session 13 (2026-04-29 docs tool)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "transcript", "dolceho", "session-13", "docs-tool", "vodka-architecture"]
extends: "canon/handoffs/session-10-after-first-pdf-handoff.md"
encoded_at: 2026-04-29T18:30:00Z
session_window: 2026-04-29T16:35Z–2026-04-29T19:00Z (session 13; ~2.5h wall-clock through PR)
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
---

# PTXprint MCP Server — Transcript Encoding Session 13

> Continues sessions 1–12. Session 13 added a fourth tool, `docs(query, audience?, depth?)`, to the PTXprint MCP server — a thin proxy to oddkit MCP that lets downstream agents (BT Servant, others) get PTXprint canon retrieval without separately wiring up oddkit. Direct reversal of session-2 D-004. Source artifact: a 2026-04-29 morning operator/colleague phone call transcript (BT Servant integration planning) plus this session's planning + execution exchange.

---

## D — Decisions

### D-026 — Reverse session-2 D-004: add `docs` tool to PTXprint MCP server (Shape A)

Original D-004 said no retrieval in MCP server; agents should bring oddkit separately. That decision was correct in session 2 because canon did not yet exist and downstream agents were not yet a concrete deadline. Both have changed: canon is ~50 docs and BT Servant is the Wednesday deliverable. Adding `docs(query, audience?, depth?)` as a thin proxy to oddkit's HTTP MCP with `knowledge_base_url` pinned to this repo. Server holds zero retrieval logic; oddkit does the BM25 work. Vodka boundary preserved — the new file knows two URLs and one tag bias, no PTXprint domain semantics.

**Operator quote (transcript):** *"the docs are tightly coupled to the MCP server. Yeah. So since it's so tightly coupled, it makes no sense to keep it separate."*

**Cross-ref:** *reverses* `transcript-encoded-session-2.md#D-004` *with explicit justification*.

### D-027 — Shape A (thin oddkit proxy) chosen over Shape B (local index) and Shape C (guided Q&A)

Three shapes were evaluated in planning. Shape A ships fastest, holds vodka, and is forward-compatible with Shape C (Shape C wraps Shape A's primitives later). Shape B (bundle canon + bring own BM25) was rejected as needless duplication of oddkit's work. Shape C (domain-flavored Q&A taxonomy) was deferred — that taxonomy belongs in canon governance docs that oddkit retrieves, not in this server's code.

**Operator decision quote:** *"shape A gets us live quickest and forward compatible with shape C. I love it!"*

### D-028 — `docs` ships before drift-7 (Gentium Plus) mitigation

Drift 7 already has a workable cfg-edit pattern documented in `canon/articles/phase-1-poc-scope.md`. The docs tool is the higher-leverage Wednesday move because it unblocks BT Servant's PoC entirely, whereas drift 7 is currently a non-blocker with a known workaround. Drift 7 work continues on its own surgical-PR cadence post-this-PR.

---

## O — Observations (closed)

### O-040 — oddkit MCP HTTP shape spike confirmed

POST to `https://oddkit.klappy.dev/mcp` with `action: "search"` and `knowledge_base_url: "https://github.com/klappy/ptxprint-mcp"` returns SSE-framed JSON-RPC. Top hit for *"what fonts does the container bundle"* was `canon/articles/font-resolution.md` with snippet mentioning Charis SIL — exactly the smoke-test answer the docs tool needs to be useful for BT Servant. SSE frame: `event: message\ndata: {<json-rpc envelope>}`. Inner content is `result.content[0].text` containing the oddkit response as a JSON string.

### O-041 — Two TypeScript errors on main are pre-existing and unrelated to this PR

Verified by checking out main and running `npm run tsc`:
1. `src/index.ts: Property 'server' in type 'PtxprintMcp' is not assignable to the same property in base type 'McpAgent<...>'` — caused by nested `@modelcontextprotocol/sdk` installs (one direct dependency, one inside `agents/`). Cosmetic; doesn't affect runtime.
2. `src/job-state-do.ts: Property '_env' is declared but its value is never read` — leftover from a refactor.

This PR adds zero new type errors. Both should be filed as separate cleanup PRs.

---

## L — Learnings

### L-013 — Shape A is forward-compatible with Shape C

The "guided Q&A" UX from the session-13 plan can later wrap the existing depth-based tool — the underlying retrieval brain stays in oddkit, and the wrapper becomes a domain-flavored prompt over the same primitives. This means Shape A is not a stopgap; it is the foundation Shape C builds on top of. The cost of starting with Shape A and growing into Shape C is strictly lower than the cost of starting with Shape C directly (which would mean designing a taxonomy before observing usage patterns).

### L-014 — Audience-bias as additive bonus, not hard filter

The `audience` parameter (`headless` vs `gui`) re-ranks oddkit hits with a small per-tag bonus rather than filtering them out. This means a clearly-better non-matching hit (high BM25 score) still wins over a weak audience-matching hit. Filtering would have been brittle: many docs are relevant to both audiences and tag coverage is incomplete. Bias-as-tiebreaker degrades gracefully.

---

## C — Constraints

### C-013 — `docs` failure mode is graceful degradation, never throw

On oddkit unreachable (5s search timeout, 10s get timeout) or on no-hit, the tool returns `{ answer: null, sources: [], governance_source: "minimal", error: "..." }`. The agent can degrade and surface the error textually rather than seeing the MCP call blow up. This matches the broader contract that MCP tools should return structured failure information rather than exceptions whenever possible.

---

## H — Handoffs

### H-022 — README usage example for `docs` tool

Add a one-paragraph "for downstream agents like BT Servant" usage example to `README.md`, showing the MCP tool call shape and expected response. Defer to a follow-up commit to keep this PR's surface tight; the spec already documents the contract.

### H-023 — Project-journaling-as-TSVs (long-tail vision)

Out of scope for this PR. Filed as a Phase 2 track. The TSV format from the transcript would let `oddkit_search` answer *"why was X changed and what alternatives were rejected"* by SQL-shape filters over the encoding stream. Worth designing once the basic encoding cadence has stabilized for a few more sessions.

### H-024 — Validation of this PR requires a fresh-context session

Per `klappy://canon/principles/verification-requires-fresh-context`. This session built the docs tool; it cannot also validate the docs tool. The next session's first move (or the operator's review) is the validation pass. Smoke harness at `smoke/docs-smoke.py` is the structural artifact; a "go/no-go" against the live deploy is the verdict.

### H-025 — Detangle the BSB-JHN configuration discoveries from session 12 + last night's autonomous run

Per the morning transcript: *"detangle what Claude figured out that we can make BT servant not have to figure it [out]."* Specifically: which configs, which fixtures, which fonts, the cfg-edit Charis substitution pattern, BSB sourcing. These belong in canon (probably as updates to `canon/articles/phase-1-poc-scope.md` or a new `canon/articles/bt-servant-integration.md`) so the docs tool can surface them when BT Servant asks. Separate PR.

---

## Cross-Reference Summary — Sessions 1–13

| Item | Resolution |
|---|---|
| Session-2 D-004 (no retrieval in MCP) | **Reversed** by D-026 with explicit justification |
| Session-2 D-006 (canon lives in separate repo) | Still holds — canon repo IS this repo; `docs` tool retrieves from same |
| Session-10 H-018 (drift 7 triage) | Continues on its own PR cadence; D-028 deprioritizes vs `docs` for Wednesday |
| Session-1 O-003 (widget-ID-to-cfg-key mapping) | Still open; H-019 not yet addressed |

---

*End of session 13 encoding. Companion artifact: this PR's diff (src/docs.ts, src/index.ts changes, spec update, smoke harness).*
