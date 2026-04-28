---
title: "PTXprint MCP Server — Transcript Encoding Session 5 (2026-04-28 Late Night)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "transcript", "dolceho", "stateless", "session-5"]
extends: "transcript-encoded-session-4.md"
encoded_at: 2026-04-28T03:50:00Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/principles/kiss-simplicity-is-the-ceiling
  - klappy://canon/principles/dry-canon-says-it-once
  - klappy://canon/bootstrap/model-operating-contract
companion_artifacts:
  - "ptxprint-mcp-v1.2-spec.md"
  - "governance-update-handoff.md"
---

# PTXprint MCP Server — Transcript Encoding Session 5

> Continues sessions 1–4. Session 5 was a series of architectural pushbacks from the operator that took v1.1 (filesystem-based, 7 tools) → v1.2 (stateless content-addressed build system on Cloudflare Workers + Containers + DO + R2, 4 tools). Each pushback was a question; each question collapsed an unstated assumption in the prior spec.

---

## D — Decisions

### D-020 — v1.2 is a stateless content-addressed build system, not a filesystem facade
PTXprint is a deterministic function of (config, sources, fonts) → PDF. Prior spec versions treated filesystem incidence as server responsibility. v1.2 takes the function seriously: server accepts a payload, dispatches to ephemeral worker, output is content-addressed by sha256 of canonical payload. Re-submitting unchanged → cached return, no work.

**Operator quote:** *"I'd rather see stateless workers or containers be ephemeral. That would mean that the uri for fonts is merely passed with the job submission... Any number of autoscaling containers can pick up any job and not have to rely on what's on the file system. Essentially no fs tools needed. Just job queue tools."*

### D-021 — Binary inputs by URL+sha256; text inputs inline
USFM, fonts, figures are referenced by URL with sha256 verification. Config files (cfg, sty, changes.txt, FRTlocal.sfm, AdjLists, piclists, override files) are inline as text content. Split is by size and source: text artifacts are small and agent-constructed; binaries are large and hosted elsewhere.

**Operator quote:** *"let's assume usfm files are URLs just like font files. Then all we need are config files passed."*

### D-022 — Output stored in R2, content-addressed by payload hash
`r2://ptxprint-outputs/<sha256_of_canonical_payload>/<PRJ>_<Config>_<bks>_ptxp.pdf`. Naming convention follows the governance Part 2 deterministic pattern. Same payload → same path → cache hit; submit_typeset returns immediately if cached.

**Operator framing:** *"R2 to store output files and deterministic ways of name and sha hash."*

### D-023 — Single MCP server (one Worker, one Container image)
Operator's gut on architecture, validated by Cloudflare Container constraints. Worker hosts the four MCP tools; Container hosts PTXprint. No queue between them — Worker dispatches via service binding using `ctx.waitUntil`. No second container.

**Operator quote:** *"My gut says one MCP server, I don't think PTX print will run in a normal worker due to needing 512mb peak to run."* Followed by: *"Okay, they offer a container that isn't queue aware it just has the code preloaded. How do we architect a clean way to not have to create drift or yet another container?"*

### D-024 — Tool surface is 4 tools; project state is out-of-scope
- `submit_typeset(payload)` → job_id (returns immediately; cache hit returns URL synchronously)
- `get_job_status(job_id)` → state, progress, failure_mode, R2 URLs
- `cancel_job(job_id)` → SIGTERM via DO flag
- `get_upload_url(filename, content_type)` → presigned R2 PUT URL for staging local binaries

Project state (where the user's working configs and USFM live) is the agent's environment's concern — Claude Desktop's filesystem access, Git, DBL, Paratext server, etc. The MCP server is purely the build system.

**Operator quote:** *"The MCP server or tools may have to pass instructions to the container to manipulate fs to download files or upload output files."*

### D-025 — Cloudflare CF Containers verified as v1.2 runtime
Verified via `Cloudflare Developer Platform:search_cloudflare_documentation`:
- `standard-2` instance: 1 vCPU, 6 GiB memory, 12 GB disk — covers PTXprint's 512MB peak with massive headroom
- HTTP-triggered Container request duration: no hard limit while client connected — 30 min autofill is in-bounds
- `sleepAfter` configurable; 45m chosen as v1.2 default to cover max autofill plus buffer
- Concurrent capacity (post Feb 2026 increase): 1,000 standard-2 instances per account — far beyond hackathon needs
- Disk ephemeral on sleep — fine; outputs are in R2 by then

D-008 (fly.io for hackathon week) is now obsolete; CF Containers are the v1.2 runtime.

### D-026 — Spec-then-governance handoff cadence; KB repo created in another session
Operator chose to alternate: claude-this-session writes v1.2 spec; operator (or another session) updates the headless KB governance to align with v1.2; another concurrent session creates the public canon repo to host all governance.

**Operator selections:**
- Spec first, then governance handoff
- Public KB repo created in another session
- CF container limits verified now

---

## O — Observations

### O-016 — Refactor-style "vodka-isation" carries domain opinion across the boundary invisibly
Already noted in session 4 as O-015. Repeated here because session 5's deeper pushback proves it: v1.1's "first-principles" still carried filesystem-as-server-responsibility as an unexamined assumption. The honest first-principles answer was the stateless build system. Naming a thing "first-principles" is cheap; deriving it from the load-bearing question is not.

### O-017 — The slides ESE governance document is the most concrete canon material drafted to date
The operator's PDF-derived headless operations governance (received this session) is operator-authored and carries substantive agent-facing content (Parts 0, 1, 5, 7, 8, 9, 10, 11). Most of it is architecture-neutral and survives the v1.1 → v1.2 transition with cosmetic edits. It's effectively the canon repo's first published article, ready to land once the repo exists.

### O-018 — Cloudflare's "Worker dispatches, Container handles" model fits this workload exactly
Verified: Workers (128 MiB, no inherent HTTP duration limit) are perfect for the MCP API surface; Containers (up to 12 GiB, up to 30 min request handling, content-addressed output to R2) are perfect for the PTXprint workload. Single Worker + single Container image + DO + R2 = all-CF-native.

### O-019 — Content-addressed builds give snapshot/rollback/A-B-test for free
sha256(canonical_payload) → R2 path. Same payload → cache hit. Different payloads → distinct outputs, both cached. Rolling back is just resubmitting a prior payload; A/B testing two configs is just two submits, both cached after first run. The governance's `.bak` rollback mechanism becomes irrelevant — payloads are the rollback log.

---

## L — Learnings

### L-010 — "Stateless workers" implies content-addressed everything
Once workers are ephemeral and any worker takes any job, output naming has to be deterministic from input alone. Content-addressed (sha256 of canonical payload) is the natural answer. This collapses caching, snapshotting, and rollback into a single mechanism. Bazel/Nix have this property; v1.2 inherits it.

### L-011 — Verify platform constraints before designing against them
The architectural debate (sync vs async, queue or no queue, fly.io vs Cloudflare) was answered cleanly once Cloudflare Container limits were checked directly via `search_cloudflare_documentation`. Five minutes of verification removed a half-hour of speculation. Should be a default move, not a fallback.

---

## C — Constraints

### C-011 — Project state read/write is OUT of typesetting MCP scope
The agent must have access to project state through some other mechanism (Claude Desktop filesystem, Git MCP, Paratext API, etc.). The typesetting MCP cannot provide it without becoming stateful and breaking horizontal scaling. Documented in v1.2 spec §1 and the governance handoff.

### C-012 — Payload schema is versioned; Worker and Container both validate
`schema_version` is part of the payload. Worker validates at API boundary; Container revalidates on receipt (defense in depth). Schema lives in one source of truth, generates types for both languages (TS in Worker, Python in Container).

---

## H — Handoffs

### H-007 (carried from session 4) — Author the canon articles required for v1.2
Updated list per v1.2:
- `payload-construction.md` (gating)
- `output-naming.md` (gating)
- `config-construction.md`
- `font-resolution.md`
- `failure-mode-taxonomy.md`

### H-009 (from session 4, restated) — Pull session artifacts into project knowledge before tomorrow's run
- `transcript-encoded-session-4.md`
- `ptxprint-mcp-v1.1-spec.md` (now historical)
- `canon-ptxprint-config-inheritance.md` (subsumed into `config-construction.md`)
- `canon-ptxprint-cfg-safe-editing.md` (subsumed into `config-construction.md`)
- **(new)** `transcript-encoded-session-5.md`
- **(new)** `ptxprint-mcp-v1.2-spec.md`
- **(new)** `governance-update-handoff.md`

### H-010 — Apply the governance update handoff to the headless KB document
Operator (or delegated session) walks through `governance-update-handoff.md` and applies edits to the operator-authored governance document. Estimated 30–60 minutes. Output: a v1.2-aligned headless KB ready to land in the canon repo.

### H-011 — Public canon repo creation tracks separately
Per D-026, another concurrent session creates the public KB repo. When that lands, the v1.2-aligned governance document plus the canon articles per H-007 populate it.

### H-012 — Verify Worker `ctx.waitUntil` long-running fetch behavior at implementation time
The v1.2 spec relies on `ctx.waitUntil(fetch(containerEndpoint, ...))` to hold the dispatch open for 30+ minutes during autofill. Worker docs say `waitUntil` extends until the promise resolves, but actual platform behavior with multi-minute promises should be verified at implementation time. Fallback: have the Container periodically self-poke its own HTTP endpoint to keep its `sleepAfter` timer reset, decoupling Container lifetime from Worker `waitUntil`.

---

## Q-open — Open Questions

| ID | Question | Resolution path |
|---|---|---|
| Q-open-12 | Does Worker `ctx.waitUntil` reliably hold a 30-min fetch promise open? | Test at implementation time; fallback pattern documented in v1.2 §6 |
| Q-open-13 | Should the agent surface `cached: true` from `submit_typeset` to the user, or treat it as transparent? | Canon authoring decision |
| Q-open-14 | Payload history persistence — agent's responsibility, but how? Volatile memory? Persistent agent state? Git? | Per agent host; out of MCP scope but informs canon |
| Q-open-15 | R2 retention policy for outputs — 90 days default; long-term archival? | Operator decision per use case |
| Q-open-16 | Does the operator want the typesetting MCP to surface a "compose project state" helper for hosts without native filesystem access? | Defer to real usage |

---

## Cross-Reference Summary — Sessions 1–5

| Prior session item | Session 5 outcome |
|---|---|
| Session 1 D-001 (headless CLI is the agentic surface) | Reaffirmed — Container invokes CLI; agent submits payload |
| Session 2 D-005 (two-step async contract) | Reinforced — `submit_typeset` returns immediately, status polled |
| Session 2 D-008 (fly.io for hackathon week) | **Reversed** — CF Containers verified; fly.io no longer needed |
| Session 3 D-014 (`install_fonts` as one tool) | **Removed** — fonts are payload entries; Container fetches inline |
| Session 4 D-015 (v1.1 first-principles from PoC) | **Superseded by D-020** — v1.1's first-principles still carried unstated filesystem assumption |
| Session 4 D-016 (cfg helpers moved to canon) | Reaffirmed and broadened in v1.2 — agent constructs cfg from scratch each payload |
| Session 4 D-019 (override file read-only awareness) | Reaffirmed — overrides are payload entries; agent must check before mutating |

---

*End of session 5 encoding. Companion artifacts: `ptxprint-mcp-v1.2-spec.md`, `governance-update-handoff.md`.*
