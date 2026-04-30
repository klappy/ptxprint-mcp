---
title: "PTXprint MCP Server — v1.3 Specification"
subtitle: "v1.2 + telemetry: transparency layer over the running typesetter"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "spec", "vodka-architecture", "v1.3", "telemetry", "analytics-engine", "transparency", "cloudflare"]
version: "v1.3-draft"
date: 2026-04-30
supersedes: "ptxprint-mcp-v1.2-spec.md (v1.2-draft, 2026-04-28)"
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/principles/kiss-simplicity-is-the-ceiling
  - klappy://canon/principles/dry-canon-says-it-once
  - klappy://canon/principles/maintainability-one-person-indefinitely
  - klappy://canon/governance/telemetry-governance
governs: "the PTXprint MCP server build, additive layer over v1.2 (May 2026+)"
status: draft_for_review
---

# PTXprint MCP Server — v1.3 Specification

> **What changed from v1.2.** v1.2 ships a four-tool stateless content-addressed build system that takes payloads, dispatches Container jobs, and returns content-addressed PDFs from R2. v1.3 is **purely additive**: it layers a transparency / observability surface on top of the v1.2 system without changing the behavior or contract of any v1.2 tool. Two new MCP tools (`telemetry_public`, `telemetry_policy`), one new internal Worker route (`/internal/telemetry` for Container event forwarding), one new module (the redaction-and-write helper), and a small Container hook that POSTs phase-transition events through the Worker. Tool count: **6** (was 4). The `submit_typeset`, `get_job_status`, `cancel_job`, and `docs` tools are unchanged in interface and behavior. Existing payloads continue to work; no agent change required for v1.3 deployment. Telemetry is governed by `canon/governance/telemetry-governance.md` — the schema, the privacy floor, the canned queries, and the consumer leaderboard all live there. This spec describes the implementation; the article describes the policy.
>
> **Why a new spec rather than a v1.2 amendment.** v1.2 was implemented before this spec was written. The four tools, Worker, Container, DO, and R2 wiring are all live at `src/index.ts`, `container/main.py`, and `wrangler.jsonc`. Per the principle that specs shouldn't be changed after implementation (resolution of H-T3 in `canon/encodings/telemetry-feature-planning-ledger.md`), the telemetry layer gets its own forward-looking spec rather than retroactively amending the v1.2 contract.

---

## 1. The Contract

### Origin

PTXprint MCP v1.2 is a typesetting service. It accepts payloads, runs PTXprint, and returns PDFs. It works. Once it's serving real translation teams, the operator needs to know things that the running system doesn't tell them: how often the cache hits, what fraction of jobs end in soft failure, where time goes inside a job, which canon docs the `docs` tool actually serves. Without that signal, prioritization decisions are guesses.

v1.3 adds telemetry that answers exactly those questions, and only those questions. The collected data is structurally typed, project-identity-free, and queryable by anyone via `telemetry_public`. The dashboard the operator sees is the dashboard any consumer can see. The asymmetry that usually defines telemetry — host-collects-privately, consumer-trusts — is replaced with: host collects publicly, consumer queries the same data.

### What this server is (v1.3)

A Cloudflare-native job queue for PTXprint typesetting (unchanged from v1.2) plus a thin observability layer:

1. **Accept** a fully-specified job payload (config inline, sources/fonts/figures by URL).
2. **Dispatch** to an ephemeral Container worker that materializes the inputs, runs PTXprint, uploads the PDF to R2.
3. **Report** state, progress, and result URLs back through Durable Object-backed status polling.
4. **Search** in-repo canon documentation through the `docs` tool (a thin oddkit forwarding layer).
5. **Emit** structural usage telemetry to a public Cloudflare Workers Analytics Engine dataset at every request and every job phase transition.
6. **Expose** the telemetry dataset for public SQL query (`telemetry_public`) and the governing policy for runtime fetch (`telemetry_policy`).

### What this server is not (unchanged from v1.2, restated)

- **Not a file system.** No `read_file`, `write_file`, `list_files`, or any project-state IO.
- **Not a PTXprint reference manual.** All domain knowledge lives in canon, retrieved via `oddkit` MCP (or proxied via the `docs` tool).
- **Not synchronous.** Every typesetting call returns a `job_id` immediately.
- **Not stateful with respect to project trees.** No projects on the server's filesystem.

### What this server is not (new for v1.3)

- **Not a private-data collector.** Telemetry never logs Paratext project IDs, config names, USFM book codes, source/font/figure URLs, payload contents, USFM bytes, log content, or PDF bytes. The full exclusion list is enforced in code (see §6 Redaction Module) and documented in `canon/governance/telemetry-governance.md` §"Privacy Floor."
- **Not an authenticated service.** v1.3 has no auth on the MCP HTTP transport. Consumer identification is opt-in via self-report headers and query parameters; identification is incentivized by a transparency leaderboard, not enforced.
- **Not a real-time monitoring system.** Cloudflare Analytics Engine has minutes-of-latency between `writeDataPoint()` and queryability. The dashboard is for trend analysis, not incident response.

### Vodka boundary (v1.3 update)

The server adds knowledge of:

- The `ptxprint_telemetry` Analytics Engine dataset name
- The governance article URI (`canon/governance/telemetry-governance.md`)
- A fixed schema for telemetry data points (12 blobs + 10 doubles, fully typed at the writer boundary)
- The three-tier governance fallback chain (`knowledge_base → bundled → minimal`)

The server does **not** acquire knowledge of:

- Which dimensions are operationally interesting (canned queries live in the article, not in code)
- What constitutes a privacy violation (the exclusion list is the policy article; the redaction module enforces by typing slots structurally, not by checking content)
- Which consumer labels are "real" (the verified-clients allowlist is a deployment env var, not server-side opinion)

The constraint test (`klappy://canon/principles/vodka-architecture`):

- **Has the server grown thick?** Modestly. v1.3 adds ~150 lines for the telemetry module (writer + redactor + public-query forwarder + policy fetcher with three-tier fallback) and ~50 lines for the Container's telemetry envelope helper + Worker forwarding endpoint. Total ~200 lines on top of v1.2's ~550. Under 1000 lines remains an unambitious target.
- **Has the server acquired domain opinions?** The borderline answer surfaced in planning (L-T2): persisting `failure_mode` and `phase` to telemetry is not new opinion because both are already in the public `get_job_status` response shape. New blob dimensions that are NOT already in a public response would warrant fresh scrutiny.
- **Can the server be removed without consequence?** No, more so than v1.2. Without telemetry the maintainer has no signal on cache effectiveness, no evidence of soft-failure rate, and no way to know which `docs` queries agents actually run. All three drive prioritization for a single-maintainer system.

---

## 2. Companion: the PTXprint Canon Repo

Unchanged from v1.2 in structure. v1.3 adds one new required-canon entry:

### Canon articles required for v1.3 to be agent-usable

All v1.2 required articles, plus:

- `canon/governance/telemetry-governance.md` — the schema, privacy floor, canned queries, transparency leaderboard, and policy resolution chain. Fetched at runtime by `telemetry_policy`.

The agent's reasoning loop is unchanged: search canon → understand the change or pattern → construct payload → submit job → poll → handle result. Telemetry happens silently; the agent does not interact with it directly. The dashboard is for the maintainer (and any consumer who wants to see the same numbers).

---

## 3. Tools (6)

The first four tools are unchanged from v1.2 — interface, behavior, return shape. Restated briefly here for completeness; full details remain in the v1.2 spec §3.

### `submit_typeset(payload)` — unchanged from v1.2

**Inputs:** the payload (schema in §4, unchanged from v1.2).

**Returns:** `{ job_id, submitted_at, predicted_pdf_url, cached }` — same shape.

Behavior: validate, hash, HEAD R2 for cached output, return cached URL or dispatch via `ctx.waitUntil(fetch(...))`. Same as v1.2.

**v1.3 telemetry:** every call writes one `mcp_request` event with `cache_outcome ∈ {hit, miss}`, plus one `tool_call` event. Cache hits do NOT write `job_*` events (no Container dispatched). Cache misses cause the Worker to write a `job_phase` event with `phase = "queued"` immediately upon DO creation; the Container takes over from there.

### `get_job_status(job_id)` — unchanged from v1.2

Same return shape. `failure_mode ∈ {hard, soft, success, null}` per the failure-mode taxonomy.

**v1.3 telemetry:** writes one `mcp_request` event + one `tool_call` event. No `job_*` events (this is a read tool, not a state-changing one).

### `cancel_job(job_id)` — unchanged from v1.2

Same return shape. Sets `cancel_requested: true` in the DO; Container polls every 10s.

**v1.3 telemetry:** writes one `mcp_request` event + one `tool_call` event. The Container's terminal-phase emission carries `failure_mode = "cancelled"` when the cancel is honored.

### `docs(query, audience?, depth?)` — unchanged from v1.2

Same return shape. Forwards to oddkit; falls back gracefully to `governance_source: "minimal"` on oddkit unreachable.

**v1.3 telemetry:** writes one `mcp_request` event + one `tool_call` event with `docs_audience` and `docs_top_uri` populated. The query string is **never** logged (it is treated as content per `canon/governance/telemetry-governance.md` §"Privacy Floor"); only the audience filter and the top-result URI are persisted.

### `telemetry_public(sql)` — new in v1.3

Forwarder over the `ptxprint_telemetry` Cloudflare Workers Analytics Engine dataset.

**Inputs:**

| Param | Type | Default | Meaning |
|---|---|---|---|
| `sql` | string (required) | — | A read-only SQL query against `ptxprint_telemetry` |

**Returns:** Analytics Engine result rows (passthrough), or a sanitized error message on failure.

```json
{
  "rows": [
    { "week": "2026-04-27", "hit_rate": 0.48, "_sample_interval": 1 },
    ...
  ],
  "row_count": 12,
  "query": "SELECT toStartOfWeek(timestamp) AS week, ... FROM ptxprint_telemetry ...",
  "executed_at": "2026-04-30T13:21:08Z"
}
```

Behavior:

1. Validate the query targets only the allowlisted dataset (`ptxprint_telemetry`). Any reference to another dataset rejects with a sanitized error before the Analytics Engine API is called. This guards against cross-dataset access to other Analytics Engine data on the same Cloudflare account.
2. Rate-limit per consumer label. Default: 60 queries per consumer per hour (configurable via `TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR` env var). The limit protects the Analytics Engine query quota (10,000 queries/day free tier) without restricting the data itself.
3. Forward to Analytics Engine SQL API (`https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine/sql`) with the read-only `CF_API_TOKEN`.
4. Sanitize errors before returning. Raw Analytics Engine errors may contain account IDs, dataset names, or schema details — these are caught and replaced with generic failure messages.

The data is public by design. There is no column restriction, no SQL keyword blocking, no query-complexity check. The API token is read-only; `DROP`/`ALTER`/`INSERT` are rejected by Analytics Engine itself.

A library of canned queries (cache hit rate, failure mix, where time goes, tool leaderboard, document leaderboard, soft-failure trend, pages-per-success) is documented in `canon/governance/telemetry-governance.md` §"Canned Queries — The Dashboard Library."

### `telemetry_policy()` — new in v1.3

Returns the runtime-fetched governance policy plus the self-report header dictionary.

**Inputs:** none.

**Returns:**
```json
{
  "policy": "(full markdown content of canon/governance/telemetry-governance.md)",
  "policy_uri": "klappy://canon/governance/telemetry-governance",
  "governance_source": "knowledge_base | bundled | minimal",
  "self_report_headers": {
    "x-ptxprint-client": "Your client name (e.g., 'claude-desktop', 'bt-servant')",
    "x-ptxprint-client-version": "Version string (semver recommended)",
    "x-ptxprint-agent-name": "AI agent or model name",
    "x-ptxprint-agent-version": "Version string for the agent/model",
    "x-ptxprint-surface": "Where this is running ('claude.ai', 'vscode', 'cli', 'production')",
    "x-ptxprint-contact-url": "Project or organization URL",
    "x-ptxprint-policy-url": "Your privacy or telemetry policy URL",
    "x-ptxprint-capabilities": "Comma-separated capabilities (e.g., 'submit,poll,docs')"
  },
  "fallback_chain": [
    { "tier": "knowledge_base", "source": "https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/canon/governance/telemetry-governance.md" },
    { "tier": "bundled", "source": "compiled into Worker at deploy time" },
    { "tier": "minimal", "source": "static string in Worker; lists dataset name + privacy non-negotiables + policy URI" }
  ],
  "generated_at": "2026-04-30T13:21:08Z"
}
```

Behavior: resolve the policy through the three-tier fallback chain (per planning-ledger D-T7, mirroring oddkit's `telemetry_policy` pattern verbatim):

1. **`knowledge_base`** — fetch this article live via `web_fetch` against `raw.githubusercontent.com`. Cache-busted via etag/If-None-Match where supported. On success, response carries `governance_source: "knowledge_base"`.
2. **`bundled`** — if the live fetch fails (network error, non-200, malformed), serve a copy bundled into the Worker at deploy time. Marked `governance_source: "bundled"`. Slightly stale by definition (refreshed each deploy); never silently misleading.
3. **`minimal`** — if even the bundled copy is missing (deploy artifact corrupt) or unreadable, return a one-paragraph minimal policy string baked into the source. Marked `governance_source: "minimal"`.

The fallback chain is observable: every response includes the `governance_source` field so consumers can tell which tier served their copy.

---

## 4. Payload Schema — unchanged from v1.2

`schema_version: "1.0"`. Container rejects versions it doesn't speak. v1.3 introduces no new payload fields and removes none.

See v1.2 spec §4 for the full schema and slot semantics. The canonical hashing rule (RFC 8785 JCS or equivalent over the payload JSON) is unchanged; cache identity remains content-addressed.

---

## 5. Architecture

```
Agent (Claude Desktop / BT Servant / etc.)
  ↓ MCP/HTTP — 6 tools
┌──────────────────────────────────────────────────────────────┐
│ Cloudflare Worker (the only Worker)                          │
│  Public MCP routes:                                          │
│   - submit_typeset / get_job_status / cancel_job (unchanged) │
│   - docs (unchanged from v1.2 session-13 add)                │
│   - telemetry_public(sql)   → Analytics Engine query         │
│   - telemetry_policy()      → governance from canon          │
│  Internal route (service-binding only, not externally reach):│
│   - POST /internal/telemetry → redact + writeDataPoint       │
│  Telemetry writes (every request):                           │
│   - mcp_request event at request entry                       │
│   - tool_call event when method == tools/call                │
└──────────────────────────────────────────────────────────────┘
  ↓ Worker→Container service binding (job dispatch, unchanged)
  ↑ Container→Worker service binding (telemetry forward, NEW)
┌──────────────────────────────────────────────────────────────┐
│ Cloudflare Container (the only Container image)              │
│  Per job (unchanged behavior):                               │
│   - materialize, fetch+verify, run, classify, upload, update │
│  v1.3 additions (telemetry hooks):                           │
│   - POST /internal/telemetry on each phase transition        │
│       fetching_inputs → typesetting → autofill → uploading   │
│   - POST /internal/telemetry once at terminal                │
│       (failure_mode, totals, pages_count if success)         │
└──────────────────────────────────────────────────────────────┘
  ↕ DO read/write           ↓ R2 PUT (content-addressed)
Durable Objects        Cloudflare R2
(unchanged: per-job)   (unchanged: outputs/<hash>/...)
                                                ↓
                                      writeDataPoint
                                                ↓
┌──────────────────────────────────────────────────────────────┐
│ Cloudflare Workers Analytics Engine                          │
│  Dataset: ptxprint_telemetry                                 │
│  Retention: 3 months (CF default)                            │
│  Schema: 12 blobs + 10 doubles (governance article §What    │
│          Is Tracked)                                         │
│  Public: queryable by anyone via telemetry_public(sql)       │
└──────────────────────────────────────────────────────────────┘
```

### The Worker — additions to v1.2

- Two new public MCP routes (`telemetry_public`, `telemetry_policy`) wired the same way as the existing four.
- One new internal route: `POST /internal/telemetry`. Reachable only via service binding from the Container — not exposed externally. Body shape:
  ```json
  {
    "event_type": "job_phase | job_terminal",
    "job_id": "...",
    "consumer_label": "...",     // forwarded by Container from the originating Worker context
    "phase": "...",              // for job_phase events
    "failure_mode": "...",       // for job_terminal events
    "payload_hash_prefix": "...", // first 8 hex chars
    "duration_ms": 12345,
    "passes_completed": 3,
    "overfull_count": 12,
    "pages_count": 312,
    "bytes_out": 4194304
  }
  ```
  The Worker validates the envelope, applies the redactor (which is mostly a structural-typing pass since the envelope is already typed), and calls `env.PTXPRINT_TELEMETRY.writeDataPoint()`.
- `wrangler.jsonc` additions:
  ```jsonc
  "analytics_engine_datasets": [
    { "binding": "PTXPRINT_TELEMETRY", "dataset": "ptxprint_telemetry" }
  ],
  "vars": {
    "TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR": "60"
  }
  ```
  Plus secrets (set via `wrangler secret put`):
  ```
  CF_ACCOUNT_ID            (used by telemetry_public to hit the SQL API)
  CF_API_TOKEN             (read-only token scoped to Analytics Engine query)
  TELEMETRY_VERIFIED_CLIENTS  (optional comma-separated allowlist)
  ```

### The Container — additions to v1.2

- A small telemetry helper function (~30 lines of Python) that POSTs envelopes to `http://worker.local/internal/telemetry` via the Container's outbound service binding to the Worker.
- Phase-transition hooks: between the existing v1.2 stages in `container/main.py`, insert one helper call per transition. Each hook fires on the boundary between phases and records the `duration_ms` of the just-completed phase.
- Terminal hook: at the end of the run (success, failure, or cancellation), one final `job_terminal` event with the failure_mode and totals.
- The Container does **not** hold `CF_ACCOUNT_ID`, `CF_API_TOKEN`, or any other Analytics Engine credential. It only knows the Worker's internal route. This is the routing constraint from `canon/governance/telemetry-governance.md` §"Job Lifecycle Events" and planning-ledger D-T3.

### State (Durable Objects) — unchanged from v1.2

No schema changes. Telemetry observes DO state but doesn't extend it.

### Output (R2) — unchanged from v1.2

`ptxprint-outputs` bucket continues to be the only R2 bucket. Telemetry has no R2 footprint.

---

## 6. Telemetry Module — Implementation Detail

The module's job is to emit data points without ever leaking content. Three responsibilities, each ~50 lines:

### 6.1 Writer

Single function `writeTelemetry(env, eventType, fields)`. Fields is a typed object: blobs are strings, doubles are numbers, anything else throws at compile time. The writer:

1. Looks up the consumer label from request context (priority: `?consumer=` query > `x-ptxprint-client` header > MCP `clientInfo.name` > `User-Agent` > `"unknown"`).
2. Computes the consumer label's source for blob 5.
3. Stamps the worker version (compiled in via build-time env var).
4. Calls `env.PTXPRINT_TELEMETRY.writeDataPoint({ blobs: [...], doubles: [...], indexes: [consumer_label] })`.

The writer never accepts free-form strings beyond the typed slots. Adding a new dimension requires editing the function signature.

### 6.2 Redactor

The redactor exists primarily as a structural-typing barrier. The writer's signature accepts only the typed slots; any attempt to pass content (a USFM string, a project ID, a payload field) is a compile error in TypeScript. For the Container-to-Worker `/internal/telemetry` endpoint, where the envelope arrives as untyped JSON over the wire, the redactor:

1. Accepts the JSON envelope.
2. Validates against a strict zod (or equivalent) schema that lists exactly the allowed fields.
3. Rejects any envelope containing additional keys (`additionalProperties: false`).
4. Truncates any `payload_hash_prefix` to 8 hex characters even if the Container sent more (defense in depth).
5. Hands the validated, typed object to the writer.

Test: the redactor's rejection list IS the privacy floor. A test suite asserts that envelopes containing `project_id`, `config_name`, `book_codes`, `source_url`, `font_url`, `figure_url`, `payload_full`, `usfm_bytes`, `log_content`, or `pdf_bytes` are rejected before reaching the writer.

### 6.3 Policy Fetcher

Implements the three-tier fallback for `telemetry_policy`:

```typescript
async function resolveTelemetryPolicy(env): Promise<{ policy: string, source: 'knowledge_base' | 'bundled' | 'minimal' }> {
  // Tier 1: knowledge_base
  try {
    const res = await fetch('https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/canon/governance/telemetry-governance.md', {
      cf: { cacheTtl: 300, cacheEverything: true }  // 5min edge cache
    });
    if (res.ok) {
      const text = await res.text();
      if (text.includes('# Telemetry Governance')) {  // sanity check; reject malformed
        return { policy: text, source: 'knowledge_base' };
      }
    }
  } catch (e) { /* fall through */ }

  // Tier 2: bundled
  if (BUNDLED_POLICY) {  // imported as a string literal at build time
    return { policy: BUNDLED_POLICY, source: 'bundled' };
  }

  // Tier 3: minimal
  return { policy: MINIMAL_POLICY_STRING, source: 'minimal' };
}
```

The bundled tier is populated by a build script that copies the article into a TypeScript constant at deploy time. The minimal tier is a ~200-word static string that lists the dataset name, the privacy-floor non-negotiables, and the URI of the canonical article.

### 6.4 Public Query Forwarder

Implements `telemetry_public`:

```typescript
async function forwardTelemetryQuery(env, sql, consumerLabel): Promise<TelemetryQueryResult> {
  // Guard 1: dataset allowlist — reject queries that reference any dataset
  // other than ptxprint_telemetry. A substring check is not sufficient: a
  // query like `SELECT * FROM secret_dataset UNION SELECT * FROM ptxprint_telemetry`
  // would pass it. Strip comments and string literals first so the substring
  // cannot be smuggled in via a literal/comment, then require every FROM/JOIN
  // target to be ptxprint_telemetry.
  const stripped = sql
    .replace(/--[^\n]*/g, ' ')          // line comments
    .replace(/\/\*[\s\S]*?\*\//g, ' ')  // block comments
    .replace(/'(?:''|[^'])*'/g, "''")   // string literals
    .toLowerCase();
  const datasetRefs = [...stripped.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/g)].map(m => m[1]);
  if (datasetRefs.length === 0 || datasetRefs.some(name => name !== 'ptxprint_telemetry')) {
    return sanitizedError('Query must reference only dataset ptxprint_telemetry');
  }

  // Guard 2: rate limit (per-consumer, 60/hour default)
  if (await rateLimitExceeded(env, consumerLabel)) {
    return sanitizedError('Query rate limit exceeded; retry later');
  }

  // Forward to Analytics Engine SQL API
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'text/plain' },
      body: sql
    });
    const data = await res.json();
    if (!res.ok) return sanitizedError('Query execution failed');
    return { rows: data.data, row_count: data.data.length, query: sql, executed_at: new Date().toISOString() };
  } catch (e) {
    // Guard 3: error sanitization — never forward raw Analytics Engine errors
    return sanitizedError('Query execution failed');
  }
}
```

The three guards collectively are infrastructure serving security, not domain opinion about what's interesting. No column restriction. No SQL keyword block list. The data is public.

---

## 7. Cloudflare-specific verified facts (2026-04, v1.3 additions)

All v1.2 facts continue to apply. v1.3 adds:

| Fact | Source |
|---|---|
| Workers Analytics Engine free tier: 100,000 data points/day | `/analytics/analytics-engine/limits/` |
| Workers Analytics Engine free query tier: 10,000 queries/day | same |
| Analytics Engine retention: 3 months | same |
| Analytics Engine `writeDataPoint()` is non-blocking, no latency added to request | `/analytics/analytics-engine/get-started/` |
| Analytics Engine sampling: queries must use `SUM(_sample_interval)` not `COUNT(*)` for sample-correct totals | `/analytics/analytics-engine/sampling/` |
| SQL API endpoint: `POST https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine/sql` with body=raw SQL | `/analytics/analytics-engine/sql-reference/` |
| Service bindings allow Worker-to-Worker and Container-to-Worker calls without traversing the public internet | `/workers/runtime-apis/bindings/service-bindings/` |

Risk to verify at implementation time: whether `cf: { cacheTtl, cacheEverything }` actually caches the GitHub raw fetch in the policy resolver across edge regions. If not, the bundled tier becomes more important than estimated and the deploy script must be reliable.

---

## 8. What's Deferred (and Why)

All v1.2 deferrals continue to apply. v1.3-specific deferrals:

| Deferred capability | Why deferred | When to revisit |
|---|---|---|
| **Snapshot writeback automation** | Analytics Engine's 3-month retention is fine for hackathon-week visibility; manual snapshots if narrative continuity wanted | When the operator wants a quarterly recap blog post |
| **OAuth-derived consumer identification** | v1.3 has no auth; `oauth` is a reserved value in `consumer_source` for future authenticated deployments | When auth lands |
| **Real-time alerting on soft-failure-rate spikes** | Analytics Engine has minutes of latency; not designed for paging | When job volume justifies a separate monitoring layer (probably never; soft-failure-rate is a weekly trend, not a paging signal) |
| **Per-deployment dashboards in the CF console** | Grafana-compatible; users can build their own | If users explicitly ask for them |
| **Telemetry write batching** | At expected volume (sub-1000 jobs/day initially) `writeDataPoint()` per request is fine | If telemetry writes start showing up in Worker latency budgets |

---

## 9. Migration

### From v1.2 to v1.3

| v1.2 surface | v1.3 disposition |
|---|---|
| `submit_typeset` | **Unchanged.** Adds telemetry write at request entry. |
| `get_job_status` | **Unchanged.** Adds telemetry write at request entry. |
| `cancel_job` | **Unchanged.** Adds telemetry write at request entry. |
| `docs` | **Unchanged.** Adds telemetry write at request entry. |
| Worker routes | **+2 public** (`telemetry_public`, `telemetry_policy`), **+1 internal** (`/internal/telemetry`). |
| Container `container/main.py` | **+telemetry helper, +phase-transition hooks, +terminal hook.** No change to the typesetting pipeline itself. |
| `wrangler.jsonc` | **+analytics_engine_datasets binding, +TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR var.** |
| Secrets | **+CF_ACCOUNT_ID, +CF_API_TOKEN, +TELEMETRY_VERIFIED_CLIENTS** (last is optional). |
| DO schema | **Unchanged.** |
| R2 layout | **Unchanged.** |
| Payload schema | **Unchanged.** |

The migration is purely additive. v1.2 agents continue to work without change. v1.3-aware agents may consult `telemetry_policy` to discover the self-report headers and identify themselves; this is recommended but not required.

### Backward compatibility commitment

v1.3 commits to not changing v1.2 tool behavior. If a future v1.4 telemetry change needs to alter v1.3 behavior (e.g., restructure the schema in a way that breaks canned queries), it ships as v1.4 with a "What changed from v1.3" preamble. v1.3 itself stays locked once implemented, per the principle.

---

## 10. Definition of Done for v1.3

The MCP server is "v1.3 done" when, in addition to all v1.2 DoD criteria still passing:

1. **Two new tools work.** `telemetry_public(sql)` returns rows for at least the 8 canned queries documented in `canon/governance/telemetry-governance.md`. `telemetry_policy()` returns the article with `governance_source: "knowledge_base"` in normal operation.
2. **Job-lifecycle events fire.** A submitted job produces (`queued`, `fetching_inputs`, `typesetting`, `[autofill,]` `uploading`, `done`) phase events plus exactly one `job_terminal` event, observable via `telemetry_public`.
3. **Cache hit produces no Container telemetry.** A cached `submit_typeset` returns immediately; only the `mcp_request` event fires (with `cache_outcome = "hit"`); no `job_*` events follow.
4. **Privacy-floor exclusions pass.** A test suite POSTs envelopes to `/internal/telemetry` containing each of the 10 prohibited fields (`project_id`, `config_name`, `book_codes`, `source_url`, `font_url`, `figure_url`, `payload_full`, `usfm_bytes`, `log_content`, `pdf_bytes`); each is rejected before `writeDataPoint()` is called.
5. **Three-tier fallback works.** `telemetry_policy()` returns `governance_source: "bundled"` when the GitHub fetch is mocked to fail, and `governance_source: "minimal"` when both are mocked to fail.
6. **Self-report headers are read.** A request with all 8 self-report headers gets `consumer_source: "header"` and a complete leaderboard score; a request with only `?consumer=foo` gets `consumer_source: "query"`.
7. **Rate limit fires.** The 61st query from the same consumer label within an hour returns the rate-limit sanitized error.
8. **Container has no Analytics Engine credentials.** `grep` on the Container image for `CF_API_TOKEN` returns nothing; the Container's only telemetry path is the Worker forwarding endpoint.

Smoke test: end-to-end on the same English Bible test project from v1.2's smoke test, with `telemetry_public` queries verifying that all 8 canned queries return non-empty results after the test runs.

---

## 11. First Execution Scope (v1.3)

For whoever picks up the v1.3 build (autonomous coding run or human follow-on):

**In scope:**

- Add two MCP tool routes (`telemetry_public`, `telemetry_policy`) to `src/index.ts` following the same pattern as the existing four.
- Add `src/telemetry.ts` containing the writer, redactor, policy fetcher, and public query forwarder per §6.
- Add `POST /internal/telemetry` endpoint to the Worker.
- Add the telemetry envelope helper to `container/main.py` and wire phase-transition + terminal hooks into the existing v1.2 lifecycle.
- Update `wrangler.jsonc` with the analytics_engine_datasets binding and the rate-limit var.
- Add a `scripts/bundle-telemetry-policy.ts` build step that copies `canon/governance/telemetry-governance.md` into `src/bundled-policy.ts` for the tier-2 fallback.
- Configure `CF_ACCOUNT_ID` and `CF_API_TOKEN` as secrets via `wrangler secret put`.
- Smoke-test all 8 DoD items.

**Explicitly out of scope:**

- Anything in §8's deferred list.
- Any change to v1.2's tool behavior.
- Any new payload field.
- Any new R2 footprint.

**Critical-path canon work** (already complete as of this spec):

- `canon/governance/telemetry-governance.md` — the schema, privacy floor, canned queries, transparency leaderboard. **Status: reviewed (PR #25, fixes in PR #26).**

**Validation gate** (per `klappy://canon/principles/verification-requires-fresh-context`):
The first-run agent does not validate its own output. A separate session (or human review) accepts or returns to iteration. The DoD's privacy-floor exclusion test (item 4) is the highest-stakes acceptance criterion — verify it independently.

---

*End of v1.3 specification. Companions: `canon/governance/telemetry-governance.md` (the policy v1.3 implements), `canon/encodings/telemetry-feature-planning-ledger.md` (the design ledger this spec executes against), `canon/handoffs/telemetry-governance-h-t2-review.md` (the fresh-session review of the governance article).*
