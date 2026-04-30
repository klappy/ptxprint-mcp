# PTXprint MCP v1.3 — End-to-End Smoke Test Procedure

> **Audience:** Operator (post-merge, pre-production).
> This smoke test requires Cloudflare credentials and a deployed Worker.
> It cannot run in CI — it runs against the live Cloudflare infrastructure.

## Prerequisites

| Requirement | How to set |
|---|---|
| `CF_ACCOUNT_ID` | Your Cloudflare account ID (Dashboard → Account Home → sidebar) |
| `CF_API_TOKEN` | Read-only token scoped to Analytics Engine (Account → API Tokens) |
| `TELEMETRY_VERIFIED_CLIENTS` | Optional: comma-separated verified client labels |
| `wrangler` CLI | `npm install -g wrangler` (v4+) |
| Deployed Worker | `wrangler deploy` from the repo root |

## Step 1 — Configure secrets

```bash
# Set secrets (one-time, persisted server-side by Cloudflare)
wrangler secret put CF_ACCOUNT_ID
wrangler secret put CF_API_TOKEN

# Optional: verified-clients allowlist
wrangler secret put TELEMETRY_VERIFIED_CLIENTS
```

## Step 2 — Deploy

```bash
wrangler deploy
```

Verify deployment:
```bash
curl https://ptxprint-mcp.klappy.workers.dev/health
# Expected: {"ok": true}
```

## Step 3 — Submit a test job

Use the English Bible test fixture from v1.2 smoke (BSB/JHN or equivalent):

```bash
# Example: submit a simple typeset job
curl -X POST https://ptxprint-mcp.klappy.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "x-ptxprint-client: smoke-test" \
  -H "x-ptxprint-surface: cli" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "submit_typeset",
      "arguments": {
        "payload": {
          "schema_version": "1.0",
          "project_id": "BSB",
          "books": ["JHN"],
          "mode": "simple",
          "sources": [
            {
              "book": "JHN",
              "filename": "43JHNBSB.SFM",
              "url": "<YOUR_SOURCE_URL>",
              "sha256": "<YOUR_SOURCE_SHA256>"
            }
          ],
          "fonts": [],
          "figures": []
        }
      }
    },
    "id": 1
  }'
```

Note the `job_id` from the response. Poll until complete:

```bash
curl -X POST https://ptxprint-mcp.klappy.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_job_status",
      "arguments": { "job_id": "<JOB_ID>" }
    },
    "id": 2
  }'
```

## Step 4 — Verify telemetry via canned queries

Wait 2–5 minutes for Analytics Engine ingestion latency, then run each
canned query via `telemetry_public`. All 8 should return non-empty results
after the test job completes.

### Query 1 — Adoption (distinct consumers per week)

```bash
curl -X POST https://ptxprint-mcp.klappy.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "telemetry_public",
      "arguments": {
        "sql": "SELECT toStartOfWeek(timestamp) AS week, COUNT(DISTINCT blob4) AS distinct_consumers FROM ptxprint_telemetry WHERE timestamp > NOW() - INTERVAL '\''90'\'' DAY AND blob1 = '\''mcp_request'\'' GROUP BY week ORDER BY week DESC"
      }
    },
    "id": 10
  }'
```

### Query 2 — Cache hit rate

```bash
curl -X POST https://ptxprint-mcp.klappy.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "telemetry_public",
      "arguments": {
        "sql": "SELECT toStartOfWeek(timestamp) AS week, SUM(IF(blob9 = '\''hit'\'', _sample_interval, 0)) AS hits, SUM(IF(blob9 = '\''miss'\'', _sample_interval, 0)) AS misses, SUM(IF(blob9 = '\''hit'\'', _sample_interval, 0)) / SUM(_sample_interval) AS hit_rate FROM ptxprint_telemetry WHERE timestamp > NOW() - INTERVAL '\''30'\'' DAY AND blob1 = '\''mcp_request'\'' AND blob3 = '\''submit_typeset'\'' GROUP BY week ORDER BY week DESC"
      }
    },
    "id": 11
  }'
```

### Query 3 — Failure mix

```bash
curl -X POST https://ptxprint-mcp.klappy.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "telemetry_public",
      "arguments": {
        "sql": "SELECT blob8 AS failure_mode, SUM(_sample_interval) AS jobs FROM ptxprint_telemetry WHERE timestamp > NOW() - INTERVAL '\''30'\'' DAY AND blob1 = '\''job_terminal'\'' GROUP BY failure_mode ORDER BY jobs DESC"
      }
    },
    "id": 12
  }'
```

### Query 4 — Where time goes (average phase duration)

```bash
curl -X POST https://ptxprint-mcp.klappy.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "telemetry_public",
      "arguments": {
        "sql": "SELECT blob7 AS phase, AVG(double2) AS avg_duration_ms, SUM(_sample_interval) AS observations FROM ptxprint_telemetry WHERE timestamp > NOW() - INTERVAL '\''30'\'' DAY AND blob1 = '\''job_phase'\'' GROUP BY phase ORDER BY avg_duration_ms DESC"
      }
    },
    "id": 13
  }'
```

### Query 5 — Tool leaderboard

```bash
curl -X POST https://ptxprint-mcp.klappy.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "telemetry_public",
      "arguments": {
        "sql": "SELECT blob3 AS tool_name, SUM(_sample_interval) AS calls FROM ptxprint_telemetry WHERE timestamp > NOW() - INTERVAL '\''30'\'' DAY AND blob1 = '\''tool_call'\'' GROUP BY tool_name ORDER BY calls DESC"
      }
    },
    "id": 14
  }'
```

### Query 6 — Document leaderboard

```bash
curl -X POST https://ptxprint-mcp.klappy.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "telemetry_public",
      "arguments": {
        "sql": "SELECT blob12 AS document_uri, SUM(_sample_interval) AS hits FROM ptxprint_telemetry WHERE timestamp > NOW() - INTERVAL '\''30'\'' DAY AND blob1 = '\''tool_call'\'' AND blob3 = '\''docs'\'' AND blob12 != '\'''\'' GROUP BY document_uri ORDER BY hits DESC LIMIT 25"
      }
    },
    "id": 15
  }'
```

### Query 7 — Soft-failure rate trend

```bash
curl -X POST https://ptxprint-mcp.klappy.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "telemetry_public",
      "arguments": {
        "sql": "SELECT toStartOfWeek(timestamp) AS week, SUM(IF(blob8 = '\''soft'\'', _sample_interval, 0)) AS soft_failures, SUM(_sample_interval) AS total_jobs, SUM(IF(blob8 = '\''soft'\'', _sample_interval, 0)) / SUM(_sample_interval) AS soft_rate FROM ptxprint_telemetry WHERE timestamp > NOW() - INTERVAL '\''90'\'' DAY AND blob1 = '\''job_terminal'\'' GROUP BY week ORDER BY week DESC"
      }
    },
    "id": 16
  }'
```

### Query 8 — Pages per successful build

```bash
curl -X POST https://ptxprint-mcp.klappy.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "telemetry_public",
      "arguments": {
        "sql": "SELECT AVG(double10) AS avg_pages, SUM(_sample_interval) AS successful_builds FROM ptxprint_telemetry WHERE timestamp > NOW() - INTERVAL '\''30'\'' DAY AND blob1 = '\''job_terminal'\'' AND blob8 = '\''success'\''"
      }
    },
    "id": 17
  }'
```

## Step 5 — Verify telemetry_policy

```bash
curl -X POST https://ptxprint-mcp.klappy.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "telemetry_policy",
      "arguments": {}
    },
    "id": 20
  }'
```

Expected: `governance_source: "knowledge_base"` and full markdown policy content.

## Acceptance Criteria

All 8 canned queries return non-empty results after the test job completes.
`telemetry_policy` returns `governance_source: "knowledge_base"`.
No project-identifying data appears in any telemetry row.

## Notes

- **Analytics Engine latency:** 2–5 minutes between `writeDataPoint()` and queryability.
- **Sampling:** Use `SUM(_sample_interval)` instead of `COUNT(*)` for correct totals.
- **This procedure is post-merge, not in CI.** CI tests cover unit/integration assertions. The CF deploy + live queries require operator credentials.
