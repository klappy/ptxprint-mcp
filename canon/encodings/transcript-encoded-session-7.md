---
title: "PTXprint MCP Server — Transcript Encoding Session 7 (2026-04-28 PM hackathon execution)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "transcript", "dolceho", "session-7", "phase-1-scope", "canon-authoring"]
extends: "transcript-encoded-session-6.md"
encoded_at: 2026-04-28T20:35:00Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/principles/kiss-simplicity-is-the-ceiling
  - klappy://canon/decisions/models-do-not-mutate-canon
  - klappy://canon/principles/dry-canon-says-it-once
companion_artifacts:
  - "18 chapter articles in canon/articles/ (H-011 from session 6 — completed)"
  - "canon/governance/headless-operations.md restructured as overview/map (H-011 — completed)"
  - "canon/articles/phase-1-poc-scope.md (new — D-025)"
  - "Three Phase 1 caveat sections in payload-construction, font-resolution, config-construction"
---

# PTXprint MCP Server — Transcript Encoding Session 7

> Continues sessions 1–6. Session 7 was a hackathon-execution conversation: encoded session 6, executed H-011 by splitting the 67kb governance monolith into 17 chapter articles + an overview map (14 written to disk, 4 + map delivered as inline markdown when file-creation tools became unavailable mid-session), then narrowed scope further with D-025 — Phase 1 ships a USFM-only payload with PTXprint defaults handling everything else. New IDs continue from session 6.

---

## D — Decisions

### D-025 — Phase 1 hackathon scope: USFM-only payload; PTXprint defaults handle the rest

For hackathon week, the agent submits a payload containing only `project_id`, `books`, and `sources` (USFM URLs + sha256). No `config_files`, no `fonts`, no `figures`, no `define`. The Container bundles SIL Charis system-wide; PTXprint runs with built-in defaults.

**Operator framing (this session):** *"So no config, no fonts we just pass the usfm file to the system and let it do defaults first. Then we later handle a few templates and testing the configuration building, then we resolve the whole zip stuff. All the discussion and tensions are real but deferred."*

**Three-phase plan:**

| Phase | Scope | Validates |
|---|---|---|
| 1 — now | USFM-only payload; PTXprint built-in defaults | Full pipeline: Worker → Container → PTXprint → R2 → presigned URL |
| 2 — next | 3–4 preset config templates | Configuration layer applies correctly |
| 3 — after | Resolve zip-vs-structured payload format | Long-term agent ergonomics for diglot/triglot |

**Rationale.** Validates the full pipeline against the simplest possible payload before introducing configuration complexity. Domain-expert (Martin) PTXprint knowledge confirms PTXprint runs with built-in defaults given just USFM source. The KISS principle (`klappy://canon/principles/kiss-simplicity-is-the-ceiling`) applied: ship the smallest thing that exercises the architecture, validate it, then add layers.

**Cross-ref:** *narrows* session 6 D-022 (3–4 presets) to a Phase 2 milestone. *Defers* session 6 O-open-P1-005, O-open-P1-006, H-014 to Phase 3. *Reaffirms* session 1 D-001, session 2 D-005, session 5 D-021 as Phase 1 pipeline contract.

---

## O — Observations (closed)

### O-020 — File-creation tooling availability changed mid-session

During the H-011 execution, the toolset shifted: the first several articles were written to disk via `create_file`; later articles had to be delivered as inline markdown in chat for the operator to commit manually. Both forms are equivalent in content; the difference is who runs `mkdir -p` and `git add`.

**Implication.** Canon authoring should not be silently dependent on a particular tooling slate. When the agent's tools shift mid-task, surface honestly rather than continuing as if nothing happened. Per `klappy://canon/decisions/models-do-not-mutate-canon`, the operator commits regardless of how the artifact arrived.

---

## L — Learnings

### L-011 — Three-step scope reduction in two days isn't drift; it's calibration

The hackathon DoD trajectory:

| Stage | Scope | When |
|---|---|---|
| Original v1.2 §10 | Agent constructs valid payload from canon | Session 5 (D-021) |
| Session 6 D-022 | Agent picks from 3–4 preset templates | Session 6 |
| Session 7 D-025 | Agent submits USFM-only payload; defaults handle rest | Session 7 (this session) |

Each step is a ~10x reduction in agent-side complexity. Each is anchored in a concrete observation (BT Servant latency budget; pipeline must be validated before configuration layer; smallest viable thing first).

**Pattern recognized:** scope reduction in this direction is generally a sign of healthier planning, not drift. The original scope was correct as the *full v1.2 vision*; the narrower scopes are correct as *what ships when*. The 18 chapter articles authored in this session retain their value — they describe the full surface; Phase 1 just doesn't use most of them yet.

**Cross-ref:** *related to* `klappy://canon/principles/kiss-simplicity-is-the-ceiling`.

---

## H — Handoffs

### H-015 — Add Phase 1 caveat sections to three canon articles

Paste the caveat blocks (delivered in session 7 inline) at the top of:

- `canon/articles/payload-construction.md`
- `canon/articles/font-resolution.md`
- `canon/articles/config-construction.md`

Each block is a single blockquote that declares the article's content as Phase 2/3 reference and points at the Phase 1 minimum payload. The article body stays unchanged.

**Owner:** operator. Five-minute paste-and-commit task.

### H-016 — Commit `canon/articles/phase-1-poc-scope.md`

New article authored this session. Single source of truth for what Phase 1 is and isn't. Becomes the article the agent reads first when starting a Phase 1 job.

**Owner:** operator. Paste-and-commit.

### H-017 — Update v1.2 spec §10 DoD item 2

Rescope from session 6 D-022 ("agent picks from 3–4 presets") to session 7 D-025 ("agent submits USFM-only payload"). Suggested patch language delivered in session 7 inline.

**Owner:** spec author. Single-section edit.

### H-018 — Container image: bundle SIL Charis

For Phase 1, the Container image needs SIL Charis pre-installed (apt package `fonts-sil-charis`). This is an explicit reversal — for Phase 1 only — of session 3 C-007's "Container excludes system fonts" stance. Phase 2/3 may revert to the strict no-system-fonts model.

**Owner:** Container build / coding agent.

### H-019 — Phase 1 smoke test plan

Once the Container ships and the Worker accepts the minimum payload, run the smoke test from session 6 H-013: Claude (this conversation, or Claude Code) drives a payload submission of John in the BSB or ULT project, observes job status polling, and confirms the returned PDF renders correctly.

**Owner:** operator + agent (Claude). Pre-condition: Container deployed.

---

## Cross-Reference Summary — Earlier sessions ↔ Session 7

| Earlier session item | Session 7 outcome |
|---|---|
| Session 1 D-001 (headless CLI is the agentic surface) | Reaffirmed; Phase 1 is exactly this — no config layer at all yet |
| Session 1 D-002 (English Bibles initial scope) | Reaffirmed by Phase 1's Charis-only Container |
| Session 2 D-004 (action-only; canon via oddkit) | Reaffirmed; 18 chapter articles enable progressive disclosure |
| Session 3 C-007 (Container excludes system fonts) | **Reversed for Phase 1 only** by H-018; Phase 2/3 may revert |
| Session 5 D-021 (structured payload with URLs) | Phase 1 uses the structured payload form (`sources[]` array of URL+sha256); zip-vs-structured stays open for Phase 3 |
| Session 6 D-022 (3–4 presets for hackathon) | **Demoted to Phase 2** by D-025 |
| Session 6 D-023 (split governance doc into chapters) | **Completed in this session** as H-011 — 17 chapter articles + overview map |
| Session 6 D-024 (no pre-flight validator; log is the recovery channel) | Reaffirmed; Phase 1 relies on the same recovery loop |
| Session 6 O-open-P1-005 (zip vs structured tension) | **Sequenced to Phase 3**; not silently changed |
| Session 6 O-open-P1-006 (preset templates unspecified) | **Sequenced to Phase 2**; H-012 carries forward |
| Session 6 H-011 (split monolith) | **Completed**: 14 articles to disk, 4 articles + overview as inline markdown for paste |
| Session 6 H-012 (specify 3–4 presets) | Reframed as **Phase 2 work**, not hackathon-week |
| Session 6 H-013 (smoke-test with Claude before BT Servant) | Reframed as Phase 1 smoke test — H-019 above |
| Session 6 H-014 (resolve zip vs structured) | **Sequenced to Phase 3** |
| v1.2 spec §10 DoD item 2 | **Rescoped** by D-025; H-017 names the patch |

---

*End of session 7 encoding. Companion artifacts: 18 chapter articles in `canon/articles/`, restructured `canon/governance/headless-operations.md`, new `canon/articles/phase-1-poc-scope.md`, three caveat sections to be pasted at the top of payload-construction / font-resolution / config-construction.*
