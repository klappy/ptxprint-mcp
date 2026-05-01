---
title: "Snapshot Operations — Track A Telemetry Archive"
audience: project
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "telemetry", "snapshot", "operations", "long-term-retention", "r2", "cron", "bootstrap", "v1.3-aligned"]
date: 2026-04-30
derives_from: "klappy://canon/articles/hero-metrics-and-storytelling, klappy://canon/governance/telemetry-governance"
companion_to: "klappy://canon/articles/hero-metrics-and-storytelling, klappy://canon/specs/ptxprint-mcp-v1.3-spec"
canonical_status: non_canonical
governs: "How operators run, bootstrap, smoke-test, and read the Track A telemetry snapshot archive."
status: working
---

# Snapshot Operations — Track A Telemetry Archive

> The snapshot mechanism designed in `klappy://canon/articles/hero-metrics-and-storytelling` § "Long-Term Retention Strategy" is implemented in `src/snapshot.ts` and wired into the Worker. This article is the operations companion: how to set up the R2 bucket, how to bootstrap the archive after deploy, how to smoke-test a snapshot run, and how to read the lifetime hero stat. It is operational, not architectural — the architectural decisions live in the hero-metrics article and stay there.

---

## What the snapshot system does

A Cloudflare Worker Cron Trigger fires at Monday 00:00 UTC every week. It runs five aggregate queries against the `ptxprint_telemetry` Analytics Engine dataset, scoped to the just-completed week (`[Mon 00:00 UTC, next Mon 00:00 UTC)`). Each query result becomes one or more JSONL lines in an R2 bucket named `ptxprint-telemetry-snapshots`. The archive persists past the 90-day Analytics Engine retention window. Lifetime totals are computed by reading the archive and adding the current incomplete week from raw Analytics Engine.

The five metrics:

| Metric | R2 object | Rows per snapshot |
|---|---|---|
| `pages_typeset_weekly` | `pages-typeset-weekly.jsonl` | 1 per week |
| `successful_builds_weekly` | `successful-builds-weekly.jsonl` | 1 per week |
| `cache_hits_weekly` | `cache-hits-weekly.jsonl` | 1 per week |
| `cache_misses_weekly` | `cache-misses-weekly.jsonl` | 1 per week |
| `failure_mode_distribution_weekly` | `failure-mode-distribution-weekly.jsonl` | 1 per (week, failure_mode) |

The article enumerates four query buckets; `cache_hits` and `cache_misses` are materialized as two distinct metrics so each metric has exactly one R2 object (matching the article's "one object per metric" rule).

### The `failure_mode` dimension

The hero-metrics article schema example shows `{metric, week_start, value, snapshotted_at, source}`. For the failure-mode distribution, each row carries an additional `failure_mode` field that names the bucket (`success`, `soft`, `hard`, `cancelled`, `timeout`). This is additive — `failure_mode` is already a public schema dimension per `klappy://canon/governance/telemetry-governance` § "Structural Dimensions" — and it preserves the article's "one R2 object per metric" rule. The replacement key for idempotent merges is `(metric, week_start, failure_mode ?? "")`.

---

## One-time setup (per environment)

### 1. Create the R2 bucket

```bash
wrangler r2 bucket create ptxprint-telemetry-snapshots
```

The bucket binding (`TELEMETRY_SNAPSHOTS`) is already declared in `wrangler.jsonc`. After bucket creation, the next deploy picks it up automatically.

### 2. (Optional) Set a manual-run token

The cron handles routine weekly snapshots. For bootstrap and recovery, the Worker exposes `POST /internal/snapshot/run`, gated by a header token. To enable it:

```bash
openssl rand -hex 32 | wrangler secret put SNAPSHOT_BOOTSTRAP_TOKEN
```

If the secret is not set, the route returns `503` with a clear message. The Cron Trigger does not depend on this token.

### 3. Make the bucket public-readable (optional, recommended)

Same transparency principle as `telemetry_public` — the snapshot archive contains only public aggregates. Enable public read access in the Cloudflare dashboard (R2 → Bucket → Settings → Custom domains / Public access).

If the bucket is left private, the read recipes in this article still work via the Worker's `/diagnostics/snapshot/lifetime` endpoint (which reads R2 server-side).

---

## Bootstrap — backfill the archive after deploy

Until the cron has run at least once, the archive is empty. To capture every week within the 90-day Analytics Engine retention window:

```bash
TOKEN=<your SNAPSHOT_BOOTSTRAP_TOKEN>

curl -X POST https://ptxprint.klappy.dev/internal/snapshot/run \
  -H "x-snapshot-bootstrap-token: $TOKEN" \
  -H "content-type: application/json" \
  -d '{"weeks_back": 13}'
```

`weeks_back: 13` snapshots the last 13 completed weeks (≈ 90 days). The route caps `weeks_back` at 26.

The response shape:

```json
{
  "weeks_processed": 13,
  "results": [
    {
      "week_start": "2026-01-26",
      "snapshotted_at": "2026-04-30T03:14:15.926Z",
      "metrics": [
        { "name": "pages_typeset_weekly", "object_key": "pages-typeset-weekly.jsonl", "records_written": 1, "records_replaced": 0 },
        ...
      ],
      "ok": true
    },
    ...
  ],
  "ok": true
}
```

Per-metric errors do not abort other metrics or other weeks; they appear as `error: "..."` strings in the response. Re-running with the same range is safe — it overwrites with the same values.

### Schedule the bootstrap as soon as the snapshot mechanism deploys

Per the hero-metrics article: "every week of delay between v1.2 telemetry shipping and snapshot bootstrapping is a week of pages that will not survive the retention window." Run the bootstrap once immediately after the first deploy that includes Track A.

---

## Manual single-week snapshot

For recovery, smoke testing, or backfilling a specific week:

```bash
curl -X POST https://ptxprint.klappy.dev/internal/snapshot/run \
  -H "x-snapshot-bootstrap-token: $TOKEN" \
  -H "content-type: application/json" \
  -d '{"week": "2026-04-27"}'
```

The week must be a Monday in `YYYY-MM-DD` form. The route refuses non-Monday dates with an explicit error message naming the correct Monday.

With no body (or `{}`), the route runs the same week the cron would have run on its next firing — the just-completed week.

---

## Smoke test (post-deploy)

After bootstrap, verify the pipeline end-to-end:

1. **List the archive contents.**
   ```bash
   curl https://ptxprint.klappy.dev/diagnostics/snapshot
   ```
   Expect `objects_present` to contain the five expected `.jsonl` files (or fewer if some metrics had zero data — empty queries still produce one row with `value: 0`, so all five files should normally be present after bootstrap).

2. **Fetch one JSONL file directly from R2.**

   If the bucket is public:
   ```bash
   curl https://pub-<bucket-id>.r2.dev/pages-typeset-weekly.jsonl
   ```

   If private, the file contents are visible to the Worker only — use `wrangler r2 object get`:
   ```bash
   wrangler r2 object get ptxprint-telemetry-snapshots/pages-typeset-weekly.jsonl
   ```

   Expect one JSON object per line, each matching:
   ```json
   {"metric":"pages_typeset_weekly","week_start":"2026-04-27","value":...,"snapshotted_at":"...","source":"ptxprint_telemetry"}
   ```

3. **Verify idempotency.** Re-run the snapshot for the same week. The line count in R2 should not change. The `snapshotted_at` field on the affected row should advance to the new run's timestamp; the `value` should match (or differ only because new events arrived in raw AE since the last run).

4. **Verify the lifetime composite.**
   ```bash
   curl https://ptxprint.klappy.dev/diagnostics/snapshot/lifetime
   ```
   Returns the lifetime hero stat as JSON. See "Reading the lifetime hero stat" below.

### Bootstrap smoke without real telemetry

If the deploy is fresh and `ptxprint_telemetry` has no rows yet, every snapshot value will be `0` or `null`. That is a real smoke result — it proves the R2 write path works even when the data is empty. The `pages-typeset-weekly.jsonl` file will contain one row per snapshot week, each with `value: 0`. As real telemetry accumulates, future snapshots replace those zeros with real counts (idempotent merge by week).

---

## Reading the lifetime hero stat

The hero-metrics article specifies the composite query:

```text
lifetime_pages_typeset =
  SUM(value FROM R2 ptxprint-telemetry-snapshots/pages-typeset-weekly.jsonl)
  +
  SELECT SUM(pages_count * _sample_interval)
  FROM ptxprint_telemetry
  WHERE event_type = 'job_terminal'
    AND failure_mode = 'success'
    AND timestamp >= toStartOfWeek(NOW() - INTERVAL '7' DAY)
```

The Worker exposes this directly at `GET /diagnostics/snapshot/lifetime` (no auth, public, 5-minute browser cache). The response:

```json
{
  "lifetime_pages": 152340,
  "archive_pages": 138917,
  "current_week_pages": 13423,
  "current_week_start": "2026-04-27",
  "archive_weeks_counted": 41,
  "computed_at": "2026-04-30T03:14:15.926Z",
  "archive_source": "r2:ptxprint-telemetry-snapshots/pages-typeset-weekly.jsonl",
  "raw_source": "ptxprint_telemetry (analytics engine)"
}
```

This URL is what the eventual public homepage hero number queries. The endpoint lives on the Worker so the recipe does not need to be re-implemented per consumer.

### Doing the composition by hand

For Grafana, a custom dashboard, or a one-off audit:

1. Read the archive:
   - Public bucket: `curl https://pub-<bucket-id>.r2.dev/pages-typeset-weekly.jsonl`
   - Private bucket: `wrangler r2 object get ptxprint-telemetry-snapshots/pages-typeset-weekly.jsonl --file=archive.jsonl`
2. Sum the `value` fields across rows where `metric == "pages_typeset_weekly"`.
3. Run the current-week SQL via `telemetry_public` or directly through the Analytics Engine SQL API.
4. Add the two numbers.

The function `getLifetimeHeroStat()` in `src/snapshot.ts` is the single source of truth. If the recipe ever changes (e.g., a different cutoff for the current week), update the function and this section together.

---

## What the cron does (under the hood)

```typescript
// src/index.ts default export
async scheduled(event, env, ctx) {
  const fireTime = new Date(event.scheduledTime);
  const justCompletedWeek = addDays(weekStartFor(fireTime), -7);
  ctx.waitUntil(runSnapshot(env, justCompletedWeek));
}
```

When Cron fires Monday 00:00 UTC, `weekStartFor(fireTime)` returns the *current* week's Monday (which is `fireTime` itself). Subtracting 7 days yields the prior Monday — the start of the week that just ended at `fireTime - 1 second`.

`runSnapshot()` iterates over the `METRICS` array in `src/snapshot.ts`. Per-metric errors are captured and logged; they do not abort other metrics. The whole run is wrapped in `ctx.waitUntil` so the cron itself returns immediately and the Workers runtime keeps the snapshot work alive in the background.

### Verifying the cron registration

After deploy:

```bash
wrangler deployments list   # verify latest deploy includes the cron trigger
```

Or via the Cloudflare API:

```bash
curl -H "Authorization: Bearer $CF_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/workers/scripts/ptxprint-mcp/schedules"
```

Expect `{"data":[{"cron":"0 0 * * 1","created_on":"...","modified_on":"..."}], "success":true}`.

---

## Operating principle

The snapshot system is generic infrastructure. The five metrics it archives are the canonical "what gets snapshotted" list from the hero-metrics article — adding a new metric means appending one entry to the `METRICS` array in `src/snapshot.ts`, with no other code changes. Removing a metric means deleting the entry; the orphaned R2 object stays in place (data is precious, code is cheap) until manually deleted.

The privacy floor (`klappy://canon/governance/telemetry-governance` § "Privacy Floor") is preserved by construction: the snapshot writer only reads aggregate query results that themselves only reference public schema slots. There is no path by which project IDs, USFM bytes, or any content data could appear in the archive.

---

## See Also

- [Hero Metrics & Storytelling](klappy://canon/articles/hero-metrics-and-storytelling) — the design that this article operationalizes.
- [Telemetry Governance](klappy://canon/governance/telemetry-governance) — the data contract the snapshot reads from.
- [v1.3 Specification](klappy://canon/specs/ptxprint-mcp-v1.3-spec) — the tool surface telemetry observes.
