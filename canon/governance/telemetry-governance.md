---
uri: klappy://canon/governance/telemetry-governance
title: "Telemetry Governance — What PTXprint MCP Tracks and Why"
audience: project
exposure: nav
voice: instructional
stability: working
tags: ["canon", "governance", "constraint", "telemetry", "transparency", "privacy", "vodka-architecture", "maintainability", "analytics-engine", "ptxprint", "mcp", "v1.2-aligned", "ptxprint_telemetry"]
date: 2026-04-30
derives_from: "klappy://canon/constraints/telemetry-governance (klappy.dev / oddkit), canon/encodings/telemetry-feature-planning-ledger.md"
companion_to: "canon/specs/ptxprint-mcp-v1.2-spec.md, canon/articles/failure-mode-taxonomy.md"
canonical_status: canonical
governs: "All telemetry collection in the PTXprint MCP server (Worker + Container + Durable Objects + R2)"
status: reviewed
reviewed_by: "managed-agent fresh session, PR #25 (commit bec765d)"
revisions_applied: "B-1, B-2, N-1, N-2 of the H-T2 review applied in fix/h-t2-revisions"
---

# Telemetry Governance — What PTXprint MCP Tracks and Why

> The PTXprint MCP server runs Bible-translation typesetting jobs on shared infrastructure. Each job costs real Container minutes and produces artifacts that belong to translation teams operating in sensitive contexts. Telemetry exists so the maintainer can make informed decisions about cache effectiveness, failure mix, and where time goes — never to identify which team is doing what work. The system tracks the **shape** of usage; it never records the **substance**. The data is public. If you wouldn't show a Bible translator the dashboard showing what they did, you shouldn't be collecting that data.

---

## Summary — Higher Privacy Floor, Same Transparency Discipline

This governance forks the proven pattern from `klappy://canon/constraints/telemetry-governance` (oddkit's hosted service) and adapts it to one materially different context: PTXprint MCP serves Bible translation teams whose project metadata can reveal who they are, where they work, and what languages they translate into. That context demands a higher privacy floor than oddkit's "which canon doc was retrieved" model required.

Five operational questions justify the telemetry. Anything that doesn't help answer one of them is out of scope:

1. **Adoption** — how many distinct agents/teams are submitting jobs, and is that growing?
2. **Cache effectiveness** — what fraction of `submit_typeset` calls hit the content-addressed cache (free) vs. dispatch the Container (~30 minutes of CPU)? The maintainer needs this number weekly.
3. **Failure mix** — of dispatched jobs, what's the hard / soft / success distribution? A rising soft-failure rate is the silent-degradation signal v1.2 was designed to surface.
4. **Where time goes** — within a job, how much wall-clock is fetching inputs vs. typesetting vs. autofill vs. uploading? Tells us whether the bottleneck is PTXprint or our infrastructure.
5. **Which canon docs the `docs` tool actually serves** — same value as oddkit's document leaderboard; tells us which agent-facing articles do real work.

Telemetry that doesn't answer at least one of these isn't worth shipping.

The design follows four rules:

1. **Track structural identifiers, never content.** The server counts which tools were called, which event types fired, which phases completed, when, and how often. It never records project IDs, source URLs, payload contents, USFM bytes, log lines, or PDF bytes.

2. **Project-identity exclusion is enforced in code.** The exclusion is not a reviewer-discipline policy. Schema slots are typed structurally (counts, sizes, durations, enums) so a leak would require an explicit code change visible in PR diff.

3. **The data is public, not private.** Any consumer can call `telemetry_public` and see the same dashboard the maintainer sees. Same leaderboard. Same numbers. Same trends. There is no information asymmetry between host and consumer.

4. **Participation is rewarded, not extracted.** Consumers who identify themselves — via header, query parameter, or MCP `clientInfo` — appear on the transparency leaderboard. Identification is encouraged and scored, never coerced.

This document is the authoritative reference for what is tracked, what is excluded, and why. It is fetched at runtime by `telemetry_policy` — not hardcoded in server logic. If the policy changes, this document changes. The server stays the same.

---

## Privacy Floor — What Is Never Logged

This section leads, not trails, the rest of the document. The privacy floor for PTXprint MCP telemetry is materially higher than oddkit's because the workload involves Bible translation projects, and project metadata can identify translation teams operating in sensitive contexts.

The following are **never collected, under any circumstance**:

### Project identity

- **Paratext project IDs** (e.g., `WSG`, `WSGNT`, `BSB`)
- **Configuration names** (e.g., `Default`, `FancyNT`, `Long`)
- **USFM book codes** (e.g., `MAT`, `JHN`, `ROM`)
- **Hostnames or URLs** of source repositories, fonts, figures, or any other input

### Content

- **USFM source bytes**
- **Payload contents** (the JSON document submitted to `submit_typeset`)
- **Configuration file contents** (any `ptxprint.cfg`, `.sty`, `changes.txt`, AdjList, or piclist)
- **XeTeX log content**
- **PDF bytes**
- **`docs` tool query strings** (the natural-language question is treated as content, not metadata)

### Caller identity beyond opt-in

- **IP addresses** — never logged for telemetry purposes
- **Browser or device fingerprinting** — never collected
- **Authentication tokens, API keys, or any credential material** — never logged
- **User account IDs** beyond the self-declared `consumer_label`

### The pseudonymous boundary

The single pseudonymous dimension is `payload_hash_prefix` — the **first 8 hex characters** of the sha256 of the canonical payload JSON. Never the full hash. Never any field of the payload itself. Two teams typesetting the same public Bible (e.g., BSB) will share a prefix; this collision is privacy-positive and intentional.

The principle: if a field reveals **who** is doing the work or **what specific text** they are working on, it is excluded. If it reveals **how much** work happened, **how long** it took, or **what shape** it was, it is included.

---

## What Is Tracked (Automatic, Every Request and Every Job Phase)

Two event classes are written:

- **MCP-side events** are written from the Worker for every JSON-RPC envelope the server handles. One data point per `mcp_request`; an additional `tool_call` data point when the method is `tools/call`.
- **Job-lifecycle events** are written from the Worker on behalf of the Container. The Container POSTs a small telemetry envelope to a Worker endpoint at each phase transition; the Worker forwards to Analytics Engine. See the next section for the full lifecycle.

All writes go to the `ptxprint_telemetry` Cloudflare Workers Analytics Engine dataset via `env.PTXPRINT_TELEMETRY.writeDataPoint()`. Writes are non-blocking and add zero latency to request handling.

### Structural Dimensions (Blobs)

| # | Field | Populated For | Example |
|---|---|---|---|
| 1 | `event_type` | all | `mcp_request \| tool_call \| job_phase \| job_terminal` |
| 2 | `method` | mcp_request, tool_call | `tools/call`, `initialize` |
| 3 | `tool_name` | mcp_request, tool_call | `submit_typeset \| get_job_status \| cancel_job \| docs \| telemetry_public \| telemetry_policy` |
| 4 | `consumer_label` | all | `claude-desktop`, `bt-servant`, `unknown` |
| 5 | `consumer_source` | all | `header \| query \| client_info \| user_agent \| oauth` (the last reserved for future authenticated deployments; v1.2 has no auth so this value is never emitted today) |
| 6 | `worker_version` | all | `1.2.3` |
| 7 | `phase` | job_* | `queued \| fetching_inputs \| typesetting \| autofill \| uploading \| done` |
| 8 | `failure_mode` | job_terminal | `success \| soft \| hard \| cancelled \| timeout` |
| 9 | `cache_outcome` | mcp_request (when `tool_name = submit_typeset`) | `hit \| miss \| n/a` |
| 10 | `payload_hash_prefix` | submit_typeset, job_* | first 8 hex chars only (see Privacy Floor §) |
| 11 | `docs_audience` | docs | `headless \| gui` |
| 12 | `docs_top_uri` | docs | `klappy://canon/...` URI of the top hit (canon URIs are public; same logic as oddkit's `document_uri`) |

Slots 13+ are reserved as empty until a real operational question demands them. Do not populate speculatively. (See Schema Hygiene §.)

### Numeric Values (Doubles)

| # | Value | What It Records |
|---|---|---|
| 1 | `count` | always `1`, for SUM aggregation |
| 2 | `duration_ms` | wall-clock at the layer that wrote the event — Worker edge for `mcp_*`, Container-reported for `job_*` |
| 3 | `bytes_in` | for `mcp_*`: UTF-8 byte length of the JSON-RPC request body. For `submit_typeset`: payload size |
| 4 | `bytes_out` | for `mcp_*`: response body size. For `job_terminal` success: the produced PDF byte count |
| 5 | `sources_count` | number of source URLs in the payload (USFM and other text inputs) |
| 6 | `fonts_count` | number of font URLs in the payload |
| 7 | `figures_count` | number of figure URLs in the payload |
| 8 | `passes_completed` | for autofill jobs, the pass count when the job stopped |
| 9 | `overfull_count` | XeTeX `Overfull \hbox` warning count from the run log |
| 10 | `pages_count` | page count in the produced PDF (`job_terminal` with `failure_mode = success` only) |

Slots 11+ are reserved as empty.

### Automatic Properties

| Property | Source |
|---|---|
| Timestamp | Cloudflare Analytics Engine (automatic per data point) |
| Sampling key | `consumer_label` (for Analytics Engine sampling consistency) |

### What This Enables

- **Adoption signal** — distinct consumer count by week (`SELECT DISTINCT consumer_label`)
- **Cache hit rate** — `SUM(IF(cache_outcome = 'hit', 1, 0)) / SUM(_sample_interval)` filtered to `tool_name = 'submit_typeset'`
- **Failure mix** — `GROUP BY failure_mode` over `job_terminal` events
- **Where time goes** — average `duration_ms` per `phase` over `job_phase` events
- **Tool leaderboard** — `GROUP BY tool_name` over `tool_call` events
- **Document leaderboard** — `GROUP BY docs_top_uri` over `tool_call` events with `tool_name = 'docs'`
- **Pages-per-success ratio** — average `pages_count` over `job_terminal` with `failure_mode = 'success'`
- **Soft-failure rate trend** — `WHERE failure_mode = 'soft'` over time

### Per-Request Diagnostics (Ephemeral, Not Stored)

Like oddkit, the Worker MAY return per-request span detail in a debug field on tool responses (cache lookups, sub-fetches, action timing). This is ephemeral diagnostic data — present in the HTTP response and nowhere else. It is not written to Analytics Engine. The Container forwards similar per-job diagnostic spans through the Worker telemetry endpoint; only the structured aggregate data documented above lands in the dataset.

---

## Job Lifecycle Events (Container-Side, Forwarded Through the Worker)

The MCP-side events alone are insufficient to answer the operational questions. A typeset job runs for seconds (cache hit), minutes (simple typesetting), or up to ~30 minutes (autofill of a New Testament). The Worker sees only the `submit_typeset` call (cache hit or dispatch) and subsequent `get_job_status` polls — it cannot see what happens inside the Container.

The Container fills the gap by emitting two kinds of events:

### `job_phase` — written at every phase transition

The phase enum is a superset of `progress.current_phase` from `get_job_status`. The spec exposes four in-flight phases the agent polls (`fetching_inputs | typesetting | autofill | uploading`); telemetry adds `queued` (written by the Worker on dispatch, before the Container picks the job up) and `done` (written by the Container as the terminal phase) so dashboards can reason about end-to-end wall-clock from submission to release, not just the in-flight portion. Full enum:

1. `queued` — telemetry-only. Worker has dispatched to the Container; the Container has not picked it up yet
2. `fetching_inputs` — Container is parallel-fetching `sources`, `fonts`, `figures` from URLs
3. `typesetting` — PTXprint is running the simple-typeset pass
4. `autofill` — PTXprint is running optimization passes (only present when the payload requested autofill)
5. `uploading` — Container is uploading the PDF and run log to R2
6. `done` — telemetry-only. Terminal phase; the Container is releasing the job

`duration_ms` on a `job_phase` event records how long the **just-completed** phase took.

### `job_terminal` — written exactly once per dispatched job

Carries the final outcome and the totals worth keeping:

- `failure_mode` ∈ `{success, soft, hard, cancelled, timeout}` — the three values `success | soft | hard` per `klappy://canon/articles/failure-mode-taxonomy`, extended with two terminal states (`cancelled`, `timeout`) per planning-ledger D-T1. The taxonomy's three-value enum is what `get_job_status.failure_mode` returns to the agent (and is null when the job ended in a non-typesetting terminal state); the telemetry blob flattens the typesetting classification and the terminal state into one queryable dimension so dashboards can ask "of dispatched jobs, what fraction succeeded vs. soft-failed vs. hard-failed vs. were cancelled vs. timed out?" in a single `GROUP BY`.
- `passes_completed` — for autofill jobs, the count when the job ended
- `overfull_count` — count of `Overfull \hbox` warnings in the run log
- `pages_count` — populated only when `failure_mode = success`
- `bytes_out` — PDF byte count (success only)

### Routing constraint

All Container telemetry routes through the Worker via the existing service binding. The Container holds **no** Analytics Engine credentials and **no** Cloudflare Account ID. This is both:

- a **redaction-surface** constraint — one place to enforce the privacy floor
- a **credential-management** constraint — one binding to rotate

Direct Container-to-Analytics-Engine writes are explicitly rejected until the forward path is shown to bottleneck. As of this version, no such bottleneck has been observed.

---

## Consumer Identification Model

PTXprint MCP's hosted service is open. No authentication is required. Consumer labels are resolved from whatever the request provides, in priority order:

1. `?consumer=` query parameter (URL-level, highest priority — works on every MCP client)
2. `x-ptxprint-client` header (explicit)
3. MCP `initialize` → `clientInfo.name` (protocol-native)
4. `User-Agent` header (fallback)
5. `"unknown"` (default)

The query parameter is the recommended identification method because every MCP client lets users edit the URL, while not all platforms expose custom headers. Unidentified consumers see a one-line footer on tool responses linking to this policy and explaining how to identify themselves.

### Verified Clients

A server-side allowlist (env var `TELEMETRY_VERIFIED_CLIENTS`) designates verified consumer labels. Verified clients receive weighted leaderboard scoring. Verification increases visibility but never blocks participation.

---

## Transparency Leaderboard

Modeled after the oddkit pattern, which itself derives from Aquifer MCP.

### Self-Report Headers (Optional, Incentivized)

| Field | Header | Description |
|---|---|---|
| Client name | `x-ptxprint-client` | Your client name (highest priority identifier). Examples: `claude-desktop`, `bt-servant`, `your-organization-agent`. |
| Client version | `x-ptxprint-client-version` | Version string for the client. Semver recommended but any stable identifier works. |
| Agent name | `x-ptxprint-agent-name` | The AI agent or model name when distinct from the client. Example: `claude-opus-4-7`. |
| Agent version | `x-ptxprint-agent-version` | Version string for the agent/model. |
| Surface | `x-ptxprint-surface` | Where this is running. Examples: `claude.ai`, `vscode`, `cli`, `ci`, `production`. |
| Contact URL | `x-ptxprint-contact-url` | URL for your project or organization. Appears on the transparency leaderboard. |
| Policy URL | `x-ptxprint-policy-url` | Your privacy or telemetry policy URL. Signals reciprocal transparency. |
| Capabilities | `x-ptxprint-capabilities` | Comma-separated capability list. Example: `submit,poll,docs`. |

### Completeness Scoring

Each `tools/call` scores the number of self-report fields present (0–8). Completeness percentage drives badge assignment:

| Badge | Threshold |
|---|---|
| Open Ledger | ≥ 90% |
| Clear Reporter | ≥ 70% |
| Starter Reporter | ≥ 40% |
| Hint Reporter | > 0% |
| Silent Reporter | 0% |

### Leaderboard Integrity

Consumer labels are transparent self-declarations. They are not identity proof unless verified by the server-side allowlist. Treat labels as honest claims, not authentication.

---

## Storage and Infrastructure

### Cloudflare Workers Analytics Engine

Telemetry data points are written via `env.PTXPRINT_TELEMETRY.writeDataPoint()`. Writes are non-blocking and add zero latency to request handling.

- **Dataset:** `ptxprint_telemetry`
- **Retention:** 3 months (Cloudflare default)
- **Querying:** SQL API via `CF_ACCOUNT_ID` and `CF_API_TOKEN` (read-only)
- **Visualization:** Grafana-compatible
- **Pricing:** 100,000 data points/day free; 10,000 queries/day free

### Long-Term Retention

Analytics Engine data expires after 3 months. Ad-hoc aggregate snapshots may be persisted to a durable store (KV, R2, or a canon article) before expiration if long-term trend analysis is wanted. No automated weekly snapshot job exists in v1; this matches the oddkit retention model.

### Policy Resolution at Runtime

`telemetry_policy` returns this document, but it does not hardcode it. The tool resolves the policy through a three-tier fallback chain (per planning-ledger D-T7, mirroring oddkit's `telemetry_policy` pattern verbatim):

1. **`knowledge_base`** — fetch this document live from `klappy/ptxprint-mcp` via the canon retrieval path. This is the primary source; if it succeeds the response carries `governance_source: "knowledge_base"` and the freshest text the maintainer has shipped.
2. **`bundled`** — if the canon fetch fails (network error, 404, malformed response), serve a copy bundled into the Worker at deploy time. Marked `governance_source: "bundled"`. Slightly stale by definition; never silently misleading.
3. **`minimal`** — if even the bundled copy is missing or unreadable, return a one-paragraph minimal policy that lists the dataset name, the privacy-floor non-negotiables, and a pointer to this document's URI. Marked `governance_source: "minimal"`.

The fallback chain is observable: every `telemetry_policy` response includes the `governance_source` field, so a consumer can tell which tier served their copy and how stale it might be. The server holds no governance opinions in code at any tier — even the `minimal` tier is a static string defined in the deploy artifact, not derived from server logic.

---

## Vodka Architecture Compliance

This telemetry implementation is infrastructure serving the Maintainability principle. It passes the three-question constraint test from `klappy://canon/principles/vodka-architecture`:

1. **Has the server grown thick?**  
   No. One `writeDataPoint()` per request at the Worker, plus a small Worker endpoint that receives Container-emitted phase events and forwards them. Two new tools (`telemetry_public`, `telemetry_policy`). Combined module is self-contained.

2. **Has the server acquired domain opinions?**  
   The borderline answer surfaced in planning: `failure_mode` and `phase` are PTXprint-shaped enums. The resolution rule applied: **if the field is already in the public response shape**, persisting it is not new opinion — it is making existing opinion queryable over time. Both fields are in the `get_job_status` response surface (per `canon/specs/ptxprint-mcp-v1.2-spec.md` §3), so logging them does not move the vodka line. New blob dimensions that are NOT already in a public response would warrant fresh scrutiny.

3. **Can the server be removed without consequence?**  
   No. Without telemetry the maintainer has no signal on cache effectiveness, no evidence of soft-failure rate, and no way to know which `docs` queries agents actually run. All three drive prioritization decisions for a single-maintainer system. The telemetry is load-bearing for infrastructure sustainability.

---

## Query Security Boundary

`telemetry_public` accepts raw SQL and forwards it to Cloudflare Analytics Engine. The data is public by design — there is nothing to steal. But the query interface requires infrastructure guards to prevent abuse without adding domain opinions.

### Threat Model

The data is public. The API token is read-only. The risk is not data exfiltration — it's resource exhaustion and information leak about other account resources.

### Guards (Infrastructure, Not Domain Opinion)

**1. Dataset allowlist.** The server validates that the SQL query targets only the `ptxprint_telemetry` dataset. Any query referencing a different dataset is rejected before reaching the Analytics Engine API. This prevents cross-dataset access to other Analytics Engine data on the same Cloudflare account.

**2. Rate limiting.** `telemetry_public` calls are rate-limited per consumer label. The limit protects the Analytics Engine query quota (10,000 queries/day free tier). Rate limiting is infrastructure — it protects the resource, not the data.

**3. Error sanitization.** Analytics Engine API errors are caught and returned as generic failure messages. Raw error responses — which may contain account IDs, dataset names, or internal schema details — are never forwarded to the caller.

### What Is NOT Guarded (By Design)

- **Column restriction** — any column can be queried. The data is public.
- **Query complexity** — no LIMIT enforcement. Analytics Engine has built-in timeouts.
- **Authentication** — no auth required to query. Transparency means anyone can see the data.
- **SQL keyword blocking** — unnecessary. The API token is read-only. `DROP`, `ALTER`, `INSERT` are rejected by Analytics Engine regardless.

These three guards are infrastructure serving security, not opinions about what questions are interesting. The server does not decide what to ask — it decides what is safe to forward.

---

## Schema Hygiene

The schema in this document IS the canonical schema. Slots beyond the documented set stay empty until a real operational question demands them.

New slots are added by:
1. Editing this document to define the new slot
2. Shipping the corresponding Worker change
3. (Optional) Backfilling the canned-query library if the new dimension makes a useful dashboard

Speculative empty slots reproduce the oddkit slot-9 deprecation problem (see `klappy://canon/constraints/telemetry-governance` §"retired" note on `cache_tier`). Don't anticipate.

---

## Canned Queries — The Dashboard Library

Every operational question this telemetry is supposed to answer should have at least one canned SQL query here. Lowers the bar for non-SQL-fluent agents and operators to run the dashboard.

Use `SUM(_sample_interval)` instead of `COUNT(*)` to account for Analytics Engine sampling. All examples use a 30-day window; adjust as needed.

### Adoption — distinct consumers per week

```sql
SELECT
  toStartOfWeek(timestamp) AS week,
  COUNT(DISTINCT blob4) AS distinct_consumers
FROM ptxprint_telemetry
WHERE timestamp > NOW() - INTERVAL '90' DAY
  AND blob1 = 'mcp_request'
GROUP BY week
ORDER BY week DESC
```

### Cache hit rate — `submit_typeset` only

```sql
SELECT
  toStartOfWeek(timestamp) AS week,
  SUM(IF(blob9 = 'hit', _sample_interval, 0)) AS hits,
  SUM(IF(blob9 = 'miss', _sample_interval, 0)) AS misses,
  SUM(IF(blob9 = 'hit', _sample_interval, 0)) / SUM(_sample_interval) AS hit_rate
FROM ptxprint_telemetry
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 = 'mcp_request'
  AND blob3 = 'submit_typeset'
GROUP BY week
ORDER BY week DESC
```

### Failure mix — over the last 30 days

```sql
SELECT
  blob8 AS failure_mode,
  SUM(_sample_interval) AS jobs
FROM ptxprint_telemetry
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 = 'job_terminal'
GROUP BY failure_mode
ORDER BY jobs DESC
```

### Where time goes — average phase duration

```sql
SELECT
  blob7 AS phase,
  AVG(double2) AS avg_duration_ms,
  SUM(_sample_interval) AS observations
FROM ptxprint_telemetry
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 = 'job_phase'
GROUP BY phase
ORDER BY avg_duration_ms DESC
```

### Tool leaderboard — which tools get used

```sql
SELECT
  blob3 AS tool_name,
  SUM(_sample_interval) AS calls
FROM ptxprint_telemetry
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 = 'tool_call'
GROUP BY tool_name
ORDER BY calls DESC
```

### Document leaderboard — which canon docs the `docs` tool serves

```sql
SELECT
  blob12 AS document_uri,
  SUM(_sample_interval) AS hits
FROM ptxprint_telemetry
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 = 'tool_call'
  AND blob3 = 'docs'
  AND blob12 != ''
GROUP BY document_uri
ORDER BY hits DESC
LIMIT 25
```

### Soft-failure rate trend — silent-degradation watch

```sql
SELECT
  toStartOfWeek(timestamp) AS week,
  SUM(IF(blob8 = 'soft', _sample_interval, 0)) AS soft_failures,
  SUM(_sample_interval) AS total_jobs,
  SUM(IF(blob8 = 'soft', _sample_interval, 0)) / SUM(_sample_interval) AS soft_rate
FROM ptxprint_telemetry
WHERE timestamp > NOW() - INTERVAL '90' DAY
  AND blob1 = 'job_terminal'
GROUP BY week
ORDER BY week DESC
```

### Pages per successful build — output-size distribution

```sql
SELECT
  AVG(double10) AS avg_pages,
  quantile(0.5)(double10) AS median_pages,
  quantile(0.95)(double10) AS p95_pages,
  SUM(_sample_interval) AS successful_builds
FROM ptxprint_telemetry
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 = 'job_terminal'
  AND blob8 = 'success'
```

---

## The Social Contract

PTXprint MCP is free. The code is MIT. The hosted service runs on shared Cloudflare infrastructure for essentially zero direct cost — the constraint is attention, not money.

A small group maintains this. Decisions about which features to improve, which bugs to fix, which canon articles to author next are made with limited visibility into who is using it and how. Without telemetry, those decisions are guesses. With telemetry, they are informed. That is the value of the data — not paying for servers, but knowing where to spend the only resource that is actually scarce.

The ask: help the maintainers know you exist. A header value, a query parameter, an organization name — any unique identifier. Not so the maintainers can profile you. So they can make better decisions about the infrastructure you depend on.

This is not the standard telemetry social contract. The standard contract is: a funded company collects your data privately and promises it is anonymous. This contract is: a small group publishes the data publicly and asks consumers to be visible. The relationship is different because the power dynamic is different — and because the consumers are translation teams whose work matters far more than the dashboard ever will.

The non-negotiable: project metadata that could identify a translation team's work is never logged. Not even for "diagnostics." Not even briefly. Not at all.

---

## Operating Principle

**Mandatory truth at baseline, optional richness by incentive — with a hard privacy floor that is not optional.**

- Baseline structural usage is always tracked. This is non-negotiable for infrastructure sustainability.
- Optional self-report details are encouraged, scored, and made visible via the transparency leaderboard.
- Project-identity data is **never** collected. This is non-negotiable in the other direction.
- The data is always public. The dashboard is always shared.
- If the policy changes, this document changes. The server never hardcodes governance.

---

## See Also

### PTXprint canon

- [v1.2 Specification](klappy://canon/specs/ptxprint-mcp-v1-2-spec) — the tool surface telemetry observes
- [Failure Mode Taxonomy](klappy://canon/articles/failure-mode-taxonomy) — the source of the `failure_mode` enum
- [Headless Operations Overview](klappy://canon/governance/headless-operations) — the agent-facing operational KB
- [Telemetry Feature Planning Ledger](klappy://canon/encodings/telemetry-feature-planning-ledger) — the DOLCHEO+H encoding of the design conversation that produced this article

### Upstream pattern (klappy.dev)

- [oddkit Telemetry Governance](klappy://canon/constraints/telemetry-governance) — the source pattern this article forks
- [Vodka Architecture](klappy://canon/principles/vodka-architecture) — the design pattern telemetry must not violate
- [Maintainability — One Person, Indefinitely](klappy://canon/principles/maintainability-one-person-indefinitely) — the principle telemetry serves
- [Verification Requires Fresh Context](klappy://canon/principles/verification-requires-fresh-context) — why this article carries `status: draft_pending_fresh_review` until a separate session reviews it

### External

- [Aquifer MCP Telemetry Governance](https://github.com/klappy/aquifer-mcp/blob/main/docs/telemetry-governance-snapshot.md) — the proven pattern oddkit derived from
