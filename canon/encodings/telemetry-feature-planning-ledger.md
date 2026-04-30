---
title: "PTXprint MCP — Telemetry Feature Planning Ledger"
subtitle: "DOLCHEO+H encoding of the telemetry design conversation (2026-04-30)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "dolcheo", "telemetry", "analytics-engine", "vodka-architecture", "privacy", "governance", "planning"]
encoded_at: 2026-04-30T04:29:11Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/principles/maintainability-one-person-indefinitely
  - klappy://canon/constraints/telemetry-governance
  - klappy://canon/principles/verification-requires-fresh-context
  - klappy://canon/values/axioms
session_type: planning
session_subject: "telemetry feature for PTXprint MCP"
relates_to:
  - klappy://canon/specs/ptxprint-mcp-v1.2-spec
  - klappy://ARCHITECTURE
status: ready_for_handoff
---

# PTXprint MCP — Telemetry Feature Planning Ledger

> Ledger for the planning conversation that designed a telemetry feature for the klappy/ptxprint-mcp Worker + Container + DO + R2 architecture. Pattern derived from klappy/oddkit's `canon/constraints/telemetry-governance.md`, with deliberate deviations driven by the higher privacy floor of Bible translation work and the job-shaped (not request-shaped) workload. All seven open questions surfaced in planning (Q-T1 through Q-T6, plus Q-T-naming) were resolved by the operator in-session. This ledger is the contract that handoff H-T1 (drafting the governance article) will execute against.
>
> **Naming note:** filename is descriptive rather than session-numbered; rename to `transcript-encoded-session-N.md` when integrating into the session series, or leave as-is if treating as a feature-scoped sidecar.

---

## Session context

| Field | Value |
|---|---|
| Date | 2026-04-30 |
| Mode arc | Planning → Encoding |
| Subject | Add telemetry to PTXprint MCP, modeled on oddkit's pattern |
| Architecture in scope | Cloudflare Worker + Container (PTXprint runner) + Durable Objects + R2 + Cache API |
| Tool surface in scope | v1.2 four-tool surface: `submit_typeset`, `get_job_status`, `cancel_job`, `docs` |
| Reference implementation | `klappy/oddkit` — `canon/constraints/telemetry-governance.md` |
| Governance fetched | `knowledge_base` (live from canon, not bundled fallback) |

---

## D — Decisions

### D-T1 — Logging `failure_mode` and `phase` is not a vodka violation

Logging `failure_mode` (`hard | soft | success | cancelled | timeout`) and `phase` (`queued | fetching_inputs | typesetting | autofill | uploading | done`) as Analytics Engine blob dimensions does NOT cross the vodka line for PTXprint MCP telemetry. Both fields are already in the public `get_job_status` response surface, so persisting them to telemetry is not new domain opinion — it is durable persistence of opinion the surface already exposes.

**Operator confirmed:** "T1: fine"

### D-T2 — Log the first 8 hex chars of `payload_hash`

Log the first 8 hex characters of `payload_hash` (sha256 of canonical payload JSON) as a coarse pseudonym dimension on `submit_typeset` and `job_*` telemetry events. Collision rate at 8 chars across the fleet is non-trivial, but collisions are privacy-positive (two teams typesetting the same public Bible like BSB will share a prefix), and the "have we seen this exact build before across the fleet" signal is operationally valuable for cache-anomaly debugging.

**Operator confirmed:** "T2: keep"

### D-T3 — Container telemetry routes through the Worker (Option A)

Container POSTs a small telemetry envelope to a Worker endpoint at each phase transition; Worker forwards to Analytics Engine via `writeDataPoint()`. Single sink, single schema, single redaction surface. Reject direct Container-to-Analytics-Engine writes (Option B) until A is shown to bottleneck.

**Operator confirmed:** "T3: worker a"

### D-T4 — Retention strategy mirrors oddkit

Rely on Cloudflare Analytics Engine's 3-month retention for live data. Produce ad-hoc snapshots to KV/R2/canon if narrative continuity is wanted (the oddkit `writings/half-a-million-requests.md` pattern). No automated weekly snapshot job in v1.

**Operator confirmed:** "T4: same, fine"

### D-T5 — Ship the FULL telemetry scope, not the tight cut

Includes:
- `mcp_request` events at the Worker
- `tool_call` sub-events
- `job_phase` events from the Container at each phase transition
- `job_terminal` events at the end of every dispatched job
- The canned-query library inside the governance article
- Snapshot-writeback hooks

Not gated on the v1.2 smoke test landing first.

**Operator confirmed:** "T5: full"

### D-T6 — Naming conventions confirmed

- Analytics Engine dataset: `ptxprint_telemetry`
- Self-report headers: `x-ptxprint-client`, `x-ptxprint-client-version`, `x-ptxprint-agent-name`, `x-ptxprint-agent-version`, `x-ptxprint-surface`, `x-ptxprint-contact-url`, `x-ptxprint-policy-url`, `x-ptxprint-capabilities`

**Operator confirmed:** "T6: fine"

### D-T7 — Telemetry governance is a canonical artifact in this repo

The PTXprint MCP telemetry feature derives from oddkit's pattern (`klappy://canon/constraints/telemetry-governance` on klappy.dev) but is its own canonical artifact. Governance lives at `canon/governance/telemetry-governance.md` in `klappy/ptxprint-mcp`, fetched at runtime by the new `telemetry_policy` tool. Two new MCP tools: `telemetry_public(sql)` and `telemetry_policy()`. Same three-tier governance fallback (`knowledge_base → bundled → minimal`) as oddkit.

---

## O — Observations

### O-T1 — Privacy floor for PTXprint MCP is materially higher than oddkit's

Analogous fields like Paratext project IDs (e.g., `WSG`), source URLs, font URLs, figure URLs, and payload contents reveal **which Bible translation team is doing what work** — sensitive metadata that has no safe analog in oddkit's "which canon doc was retrieved" model. The exclusion must be enforced in the telemetry module code, not left to discipline.

This is the headline deviation from the oddkit pattern. The governance article must lead with it (see L-T1).

### O-T2 — Cache-hit signal is first-class for PTXprint MCP

The content-addressed cache (`payload_hash → R2 PDF URL`) means many `submit_typeset` calls return without dispatching the Container. Without a `cache_outcome` blob, dashboards cannot distinguish "5 submissions, 5 cache hits, 0 work" from "5 submissions, 5 dispatches, 5 successes" — same MCP-side numbers, totally different infrastructure story.

### O-T3 — Unit-of-work mismatch with oddkit requires a second event class

oddkit's unit is a single Worker request that returns in tens to hundreds of milliseconds. PTXprint MCP's unit is a typeset job that may run 30 minutes across Worker → DO → Container → R2. `mcp_request` and `tool_call` (oddkit's pattern) are insufficient on their own; `job_phase` and `job_terminal` events written from the Container are needed to see where job time goes and what the failure-mix looks like.

---

## L — Learnings

### L-T1 — Forking a governance pattern requires explicit privacy-floor delta identification

oddkit's `document_uri` dimension is safe because canon docs are public; the analogous PTXprint MCP dimension would leak translation team identity. The governance article must lead with the project-identity exclusion, not bury it in a "What Is Excluded" section halfway down.

Generalizable principle for any future port of an oddkit-style governance pattern: **the first review pass on the forked article is to identify what was safe to log in the source context but is unsafe in the destination context**, and to elevate the exclusion to a top-level concern.

### L-T2 — Vodka borderline test for "is this domain opinion creeping into the server"

Clean resolution rule surfaced this session:

- **If the field is already in the public response shape**, persisting it to telemetry is not new opinion — it is making existing opinion queryable over time.
- **If the field is NOT already in a public response**, it warrants fresh vodka scrutiny.

Application: `failure_mode` and `phase` are already in `get_job_status` → safe to log. Hypothetical "estimated_remaining_passes" not in any public response → would warrant scrutiny before adding.

---

## C — Constraints

### C-T1 — Strict project-identity exclusion (enforced in code)

Telemetry **never logs**:
- Paratext project IDs
- Config names
- USFM book codes
- Source URLs (USFM, fonts, figures)
- Payload contents
- USFM bytes
- Log content
- PDF bytes
- IP addresses
- Browser fingerprints

The exclusion is enforced in the telemetry module itself — not by reviewer discipline. Schema slots are typed structurally (counts, sizes, durations, enums) so any leak would require an explicit code change visible in the PR diff.

### C-T2 — All Container-side telemetry routes through the Worker

The Container holds no Analytics Engine credentials and no Cloudflare Account ID. This is both:
- a redaction-surface constraint (one place to enforce C-T1)
- a credential-management constraint (one binding to rotate)

### C-T3 — No speculative empty schema slots

Schema slots beyond the initial set defined in the governance article stay empty until a real operational question demands them. New slots are added by editing the governance article (which IS the canonical schema) and shipping the corresponding Worker change.

Speculative empty slots reproduce the oddkit slot-9 deprecation problem documented in `klappy://canon/constraints/telemetry-governance` §"retired" note on `cache_tier`.

### C-T4 — `payload_hash_prefix` is the only pseudonymous dimension and the line is bright

`payload_hash_prefix` carries only the first 8 hex characters of the sha256. Never the full hash, never the canonicalized payload, never any field of the payload.

---

## Schema (the contract H-T3 implements against)

This schema was agreed in the planning conversation and is restated here so the ledger is self-contained.

### Blobs (12)

| # | Field | Populated for | Example |
|---|---|---|---|
| 1 | `event_type` | all | `mcp_request \| tool_call \| job_phase \| job_terminal` |
| 2 | `method` | mcp_* | `tools/call` |
| 3 | `tool_name` | mcp_*, tool_call | `submit_typeset \| get_job_status \| cancel_job \| docs` |
| 4 | `consumer_label` | all | `claude-desktop`, `bt-servant`, `unknown` |
| 5 | `consumer_source` | all | `header \| query \| client_info \| user_agent \| oauth` |
| 6 | `worker_version` | all | `1.2.3` |
| 7 | `phase` | job_* | `queued \| fetching_inputs \| typesetting \| autofill \| uploading \| done` |
| 8 | `failure_mode` | job_terminal | `success \| soft \| hard \| cancelled \| timeout` |
| 9 | `cache_outcome` | mcp_request (submit_typeset) | `hit \| miss \| n/a` |
| 10 | `payload_hash_prefix` | submit_typeset, job_* | first 8 hex chars only |
| 11 | `docs_audience` | docs | `headless \| gui` |
| 12 | `docs_top_uri` | docs | klappy:// URI of top hit |

### Doubles (10)

| # | Field | Notes |
|---|---|---|
| 1 | `count` | always 1 (for SUM aggregation; use `SUM(_sample_interval)`) |
| 2 | `duration_ms` | wall-clock at the layer that wrote the event (Worker edge for mcp_*, Container for job_*) |
| 3 | `bytes_in` | request body size (mcp_*) or payload size (submit_typeset) |
| 4 | `bytes_out` | response body size (mcp_*) or output PDF bytes (job_terminal success only) |
| 5 | `sources_count` | number of source URLs in payload |
| 6 | `fonts_count` | number of font URLs in payload |
| 7 | `figures_count` | number of figure URLs in payload |
| 8 | `passes_completed` | for autofill, the pass count when it stopped |
| 9 | `overfull_count` | XeTeX `Overfull \hbox` warnings |
| 10 | `pages_count` | page count in produced PDF (success only) |

Slots beyond these stay empty per C-T3.

---

## Tool surface additions

Two new MCP tools, mirroring oddkit. Both are pure-Worker; never reach the Container.

### `telemetry_policy()`

Fetches `canon/governance/telemetry-governance.md` at runtime; returns governance text + self-report header dictionary. Falls back to bundled minimal text if canon unreachable.

### `telemetry_public(sql)`

Accepts raw SQL against the `ptxprint_telemetry` Analytics Engine dataset. Three guards (mirroring oddkit's `Query Security Boundary`, per H-T5):
1. Dataset allowlist (`ptxprint_telemetry` only)
2. Per-consumer rate limiting
3. Error sanitization

No column restriction, no SQL keyword blocking — the data is public, the API token is read-only.

---

## H — Handoffs

### H-T1 — Draft `canon/governance/telemetry-governance.md`

Fork from the oddkit version verbatim, then apply four targeted edits:

1. Rewrite "What Is Tracked" to the schema in §Schema above
2. **Lead "What Is Excluded" with project-identity exclusion** (per L-T1)
3. Add a new section: "Job Lifecycle Events" explaining the second event class (per O-T3)
4. Add a "Canned Queries" section with the dashboard library (cache hit rate by week, soft-failure rate by tool version, top consumers last 30 days, average pages per successful build, etc.)

Single PR.

### H-T2 — Fresh-session review before merge

Per `klappy://canon/principles/verification-requires-fresh-context`. Same-session author + reviewer is invalid. Fresh-session reviewer cross-checks the article against:
- This ledger's decisions (D-T1 through D-T7)
- `failure-mode-taxonomy.md` (terminology consistency on `hard | soft | success`)
- v1.2 spec (terminology consistency on `phase` values, tool names)
- `klappy://canon/principles/vodka-architecture` (the three-question test)

### H-T3 — Schema in §Schema is the implementation contract

Implementation is specced as either a v1.2 amendment or a v1.3 spec — decision deferred to operator at implementation-start time, depending on whether the v1.2 build is still fluid.

### H-T4 — Update tool count claims

Two new MCP tools (`telemetry_public`, `telemetry_policy`) added to v1.2 surface. Update:
- `ARCHITECTURE.md`
- `canon/specs/ptxprint-mcp-v1.2-spec.md` §3 ("Tools")
- Any "tool count = 4" claims downstream

The count becomes **6**.

### H-T5 — Mirror oddkit's three Query Security Boundary guards verbatim

When implementation begins:
1. Dataset allowlist (`ptxprint_telemetry` only)
2. Per-consumer rate limiting on `telemetry_public`
3. Error sanitization of Analytics Engine API responses

No column restriction, no SQL keyword blocking — same justification as oddkit (data is public, API token is read-only).

---

## Cross-references

| This ledger | Source |
|---|---|
| Reference implementation | `klappy://canon/constraints/telemetry-governance` (klappy.dev / oddkit) |
| Tool surface in scope | `klappy://canon/specs/ptxprint-mcp-v1.2-spec` §3 |
| Architecture overview | `klappy://ARCHITECTURE` |
| Vodka compliance test | `klappy://canon/principles/vodka-architecture` |
| Maintainability rationale | `klappy://canon/principles/maintainability-one-person-indefinitely` |
| Fresh-context review rule | `klappy://canon/principles/verification-requires-fresh-context` |
| Failure-mode taxonomy | `canon/articles/failure-mode-taxonomy.md` (v1.2 spec §2 lists this as required canon) |

---

## Provenance

- **Encoding tool:** `oddkit_encode` (batch mode, 21 artifacts, governance from `knowledge_base`)
- **Encoding timestamp:** 2026-04-30T04:29:11Z
- **Planning session timestamp:** 2026-04-30T04:11:36Z (start) → 2026-04-30T04:27:53Z (operator answers)
- **Time elapsed in planning:** ~16 minutes
- **Operator answers received in one message:** Q-T1 through Q-T6 plus naming confirmation
- **Open questions remaining:** zero — all six surfaced questions resolved in-session

---

*End of ledger. Next action per H-T1: draft the governance article.*
