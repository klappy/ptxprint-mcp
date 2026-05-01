/**
 * snapshot.ts — Track A snapshot infrastructure (Cron + R2 archive).
 *
 * Implements the weekly snapshot mechanism specified in
 * klappy://canon/articles/hero-metrics-and-storytelling §"Long-Term Retention Strategy".
 *
 * Vodka boundary:
 *   - This module is generic infrastructure: "read aggregate queries, write to R2."
 *   - The 4 metric definitions below are the single source of truth for *what* gets
 *     archived. They mirror the article's "What Gets Snapshotted" enumeration.
 *   - The runner code is fully table-driven over the METRICS array. New metrics
 *     are added by appending to METRICS — no code changes elsewhere.
 *   - The module holds NO PTXprint domain opinions beyond what the canon article
 *     already specifies.
 *
 * Authority:
 *   klappy://canon/articles/hero-metrics-and-storytelling
 *   klappy://canon/governance/telemetry-governance (data contract)
 */

// ────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────

/**
 * One snapshot record. Schema per article §"The Snapshot Schema".
 *
 * `failure_mode` is an optional dimension used only by the
 * `failure_mode_distribution_weekly` metric — one row per
 * (week, failure_mode) pair lives in a single R2 object.
 * All other metrics omit this field.
 */
export interface SnapshotRecord {
  metric: string;
  week_start: string; // ISO date YYYY-MM-DD (Monday)
  value: number;
  snapshotted_at: string; // ISO 8601 UTC
  source: string; // dataset name
  failure_mode?: string; // optional dimension for failure_mode_distribution_weekly
}

/** A row returned by the Analytics Engine SQL API. Shape varies per query. */
export type AeRow = Record<string, unknown>;

/**
 * One metric definition. The runner calls `runForWeek(env, range)` and writes
 * the returned records to `objectKey`. Idempotent re-runs replace existing
 * rows for the same (metric, week_start, failure_mode?) key.
 */
export interface SnapshotMetric {
  name: string;
  objectKey: string;
  /** SQL template — must reference only `ptxprint_telemetry`. */
  buildSql(weekStart: string, weekEnd: string): string;
  /** Convert AE rows → SnapshotRecord[]. One row per dimension value (e.g. failure_mode). */
  rowsToRecords(
    rows: AeRow[],
    weekStart: string,
    snapshottedAt: string,
  ): SnapshotRecord[];
}

/** Minimal R2 bucket interface — matches the CF Workers binding. */
export interface R2BucketLike {
  get(key: string): Promise<R2ObjectLike | null>;
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  list(options?: { prefix?: string }): Promise<{
    objects: Array<{ key: string; size?: number; uploaded?: Date }>;
  }>;
}

export interface R2ObjectLike {
  text(): Promise<string>;
}

/** Env shape required by the snapshot module. */
export interface SnapshotEnv {
  TELEMETRY_SNAPSHOTS?: R2BucketLike;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
}

export interface SnapshotRunResult {
  week_start: string;
  snapshotted_at: string;
  metrics: Array<{
    name: string;
    object_key: string;
    records_written: number;
    records_replaced: number;
    error?: string;
  }>;
  ok: boolean;
}

export interface BootstrapResult {
  weeks_processed: number;
  results: SnapshotRunResult[];
  ok: boolean;
}

// ────────────────────────────────────────────────────────────
//  Metric Definitions — the canonical "what gets snapshotted" list
//  Per article §"What Gets Snapshotted":
//    - Weekly pages_typeset (success only)
//    - Weekly successful_builds count
//    - Weekly cache_hits and cache_misses
//    - Weekly failure_mode distribution
// ────────────────────────────────────────────────────────────

const SOURCE_DATASET = "ptxprint_telemetry";

export const METRICS: SnapshotMetric[] = [
  {
    name: "pages_typeset_weekly",
    objectKey: "pages-typeset-weekly.jsonl",
    buildSql: (start, end) => `
      SELECT SUM(double10 * _sample_interval) AS value
      FROM ptxprint_telemetry
      WHERE blob1 = 'job_terminal'
        AND blob8 = 'success'
        AND timestamp >= toDateTime('${start} 00:00:00')
        AND timestamp <  toDateTime('${end} 00:00:00')
    `.trim(),
    rowsToRecords: (rows, weekStart, snapshottedAt) => [
      {
        metric: "pages_typeset_weekly",
        week_start: weekStart,
        value: numericValue(rows[0], "value"),
        snapshotted_at: snapshottedAt,
        source: SOURCE_DATASET,
      },
    ],
  },

  {
    name: "successful_builds_weekly",
    objectKey: "successful-builds-weekly.jsonl",
    buildSql: (start, end) => `
      SELECT SUM(_sample_interval) AS value
      FROM ptxprint_telemetry
      WHERE blob1 = 'job_terminal'
        AND blob8 = 'success'
        AND timestamp >= toDateTime('${start} 00:00:00')
        AND timestamp <  toDateTime('${end} 00:00:00')
    `.trim(),
    rowsToRecords: (rows, weekStart, snapshottedAt) => [
      {
        metric: "successful_builds_weekly",
        week_start: weekStart,
        value: numericValue(rows[0], "value"),
        snapshotted_at: snapshottedAt,
        source: SOURCE_DATASET,
      },
    ],
  },

  {
    name: "cache_hits_weekly",
    objectKey: "cache-hits-weekly.jsonl",
    buildSql: (start, end) => `
      SELECT SUM(_sample_interval) AS value
      FROM ptxprint_telemetry
      WHERE blob1 = 'mcp_request'
        AND blob3 = 'submit_typeset'
        AND blob9 = 'hit'
        AND timestamp >= toDateTime('${start} 00:00:00')
        AND timestamp <  toDateTime('${end} 00:00:00')
    `.trim(),
    rowsToRecords: (rows, weekStart, snapshottedAt) => [
      {
        metric: "cache_hits_weekly",
        week_start: weekStart,
        value: numericValue(rows[0], "value"),
        snapshotted_at: snapshottedAt,
        source: SOURCE_DATASET,
      },
    ],
  },

  {
    name: "cache_misses_weekly",
    objectKey: "cache-misses-weekly.jsonl",
    buildSql: (start, end) => `
      SELECT SUM(_sample_interval) AS value
      FROM ptxprint_telemetry
      WHERE blob1 = 'mcp_request'
        AND blob3 = 'submit_typeset'
        AND blob9 = 'miss'
        AND timestamp >= toDateTime('${start} 00:00:00')
        AND timestamp <  toDateTime('${end} 00:00:00')
    `.trim(),
    rowsToRecords: (rows, weekStart, snapshottedAt) => [
      {
        metric: "cache_misses_weekly",
        week_start: weekStart,
        value: numericValue(rows[0], "value"),
        snapshotted_at: snapshottedAt,
        source: SOURCE_DATASET,
      },
    ],
  },

  {
    name: "failure_mode_distribution_weekly",
    objectKey: "failure-mode-distribution-weekly.jsonl",
    buildSql: (start, end) => `
      SELECT blob8 AS failure_mode, SUM(_sample_interval) AS value
      FROM ptxprint_telemetry
      WHERE blob1 = 'job_terminal'
        AND timestamp >= toDateTime('${start} 00:00:00')
        AND timestamp <  toDateTime('${end} 00:00:00')
      GROUP BY blob8
    `.trim(),
    rowsToRecords: (rows, weekStart, snapshottedAt) =>
      rows
        .filter((r) => stringValue(r, "failure_mode") !== "")
        .map((r) => ({
          metric: "failure_mode_distribution_weekly",
          week_start: weekStart,
          value: numericValue(r, "value"),
          snapshotted_at: snapshottedAt,
          source: SOURCE_DATASET,
          failure_mode: stringValue(r, "failure_mode"),
        })),
  },
];

// ────────────────────────────────────────────────────────────
//  Date Helpers
// ────────────────────────────────────────────────────────────

/**
 * Normalize a Date to the start (Monday 00:00 UTC) of its containing ISO week.
 * Returned as YYYY-MM-DD string.
 */
export function weekStartFor(d: Date): string {
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = (day + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMonday),
  );
  return toIsoDate(monday);
}

/** YYYY-MM-DD from a UTC Date. */
export function toIsoDate(d: Date): string {
  const yy = d.getUTCFullYear().toString().padStart(4, "0");
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = d.getUTCDate().toString().padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Add N days to a YYYY-MM-DD, return YYYY-MM-DD. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86_400_000;
  return toIsoDate(new Date(t));
}

/** Return an array of week-start ISO dates, oldest first, of the last N completed weeks. */
export function lastNWeekStarts(now: Date, n: number): string[] {
  const currentWeek = weekStartFor(now);
  const out: string[] = [];
  for (let i = n; i >= 1; i--) {
    out.push(addDays(currentWeek, -7 * i));
  }
  return out;
}

// ────────────────────────────────────────────────────────────
//  Analytics Engine SQL execution (internal — no rate limit, no allowlist
//  rewrite; the queries are constructed by this module and target only
//  ptxprint_telemetry).
// ────────────────────────────────────────────────────────────

export async function runAnalyticsEngineSql(
  env: SnapshotEnv,
  sql: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ rows: AeRow[]; error?: string }> {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
    return {
      rows: [],
      error: "missing CF_ACCOUNT_ID or CF_API_TOKEN",
    };
  }
  try {
    const res = await fetchFn(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CF_API_TOKEN}`,
          "Content-Type": "text/plain",
        },
        body: sql,
      },
    );
    if (!res.ok) {
      return { rows: [], error: `analytics engine returned ${res.status}` };
    }
    const data = (await res.json()) as { data?: AeRow[] };
    return { rows: data.data ?? [] };
  } catch (err) {
    return {
      rows: [],
      error: `fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ────────────────────────────────────────────────────────────
//  R2 read/write — JSONL with idempotent merge
// ────────────────────────────────────────────────────────────

export async function readSnapshotJsonl(
  env: SnapshotEnv,
  objectKey: string,
): Promise<SnapshotRecord[]> {
  if (!env.TELEMETRY_SNAPSHOTS) return [];
  const obj = await env.TELEMETRY_SNAPSHOTS.get(objectKey);
  if (!obj) return [];
  const text = await obj.text();
  return parseJsonl(text);
}

export function parseJsonl(text: string): SnapshotRecord[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      try {
        return JSON.parse(line) as SnapshotRecord;
      } catch {
        return null;
      }
    })
    .filter((r): r is SnapshotRecord => r !== null);
}

export function serializeJsonl(records: SnapshotRecord[]): string {
  return records.map((r) => JSON.stringify(r)).join("\n") + "\n";
}

/**
 * Merge fresh records into existing JSONL.
 *
 * Replacement key: (metric, week_start, failure_mode ?? "").
 * Existing records matching any fresh record's key are dropped; fresh
 * records are appended. Other existing records are preserved as-is.
 *
 * Sort: by (week_start ASC, failure_mode ASC) for stable diffs.
 */
export function mergeSnapshots(
  existing: SnapshotRecord[],
  fresh: SnapshotRecord[],
): SnapshotRecord[] {
  if (fresh.length === 0) return existing;
  const freshKeys = new Set(fresh.map(recordKey));
  const surviving = existing.filter((r) => !freshKeys.has(recordKey(r)));
  const merged = [...surviving, ...fresh];
  merged.sort((a, b) => {
    if (a.week_start !== b.week_start) {
      return a.week_start < b.week_start ? -1 : 1;
    }
    const fa = a.failure_mode ?? "";
    const fb = b.failure_mode ?? "";
    if (fa !== fb) return fa < fb ? -1 : 1;
    return 0;
  });
  return merged;
}

function recordKey(r: SnapshotRecord): string {
  return `${r.metric}|${r.week_start}|${r.failure_mode ?? ""}`;
}

export async function writeSnapshotJsonl(
  env: SnapshotEnv,
  objectKey: string,
  records: SnapshotRecord[],
): Promise<void> {
  if (!env.TELEMETRY_SNAPSHOTS) {
    throw new Error("TELEMETRY_SNAPSHOTS R2 binding not present");
  }
  const body = serializeJsonl(records);
  await env.TELEMETRY_SNAPSHOTS.put(objectKey, body, {
    httpMetadata: { contentType: "application/x-ndjson" },
  });
}

// ────────────────────────────────────────────────────────────
//  Snapshot Runner
// ────────────────────────────────────────────────────────────

/**
 * Snapshot one week.
 *
 * For each metric:
 *   1. Build the SQL for [weekStart, weekStart + 7 days)
 *   2. Run the query against Analytics Engine
 *   3. Convert rows → SnapshotRecord[]
 *   4. Read existing JSONL from R2
 *   5. Merge: replace records for this (metric, week_start, failure_mode) by key
 *   6. Write back to R2
 *
 * Per-metric errors are captured in the result and do not abort other metrics.
 */
export async function runSnapshot(
  env: SnapshotEnv,
  weekStart: string,
  options: {
    snapshottedAt?: string;
    fetchFn?: typeof fetch;
    metrics?: SnapshotMetric[];
  } = {},
): Promise<SnapshotRunResult> {
  const snapshottedAt = options.snapshottedAt ?? new Date().toISOString();
  const fetchFn = options.fetchFn ?? fetch;
  const metrics = options.metrics ?? METRICS;
  const weekEnd = addDays(weekStart, 7);

  const result: SnapshotRunResult = {
    week_start: weekStart,
    snapshotted_at: snapshottedAt,
    metrics: [],
    ok: true,
  };

  for (const m of metrics) {
    try {
      const sql = m.buildSql(weekStart, weekEnd);
      const { rows, error } = await runAnalyticsEngineSql(env, sql, fetchFn);
      if (error) {
        result.metrics.push({
          name: m.name,
          object_key: m.objectKey,
          records_written: 0,
          records_replaced: 0,
          error,
        });
        result.ok = false;
        continue;
      }
      const fresh = m.rowsToRecords(rows, weekStart, snapshottedAt);
      const existing = await readSnapshotJsonl(env, m.objectKey);
      const replaced = countReplaced(existing, fresh);
      const merged = mergeSnapshots(existing, fresh);
      await writeSnapshotJsonl(env, m.objectKey, merged);
      result.metrics.push({
        name: m.name,
        object_key: m.objectKey,
        records_written: fresh.length,
        records_replaced: replaced,
      });
    } catch (err) {
      result.metrics.push({
        name: m.name,
        object_key: m.objectKey,
        records_written: 0,
        records_replaced: 0,
        error: err instanceof Error ? err.message : String(err),
      });
      result.ok = false;
    }
  }

  return result;
}

function countReplaced(
  existing: SnapshotRecord[],
  fresh: SnapshotRecord[],
): number {
  const freshKeys = new Set(fresh.map(recordKey));
  return existing.filter((r) => freshKeys.has(recordKey(r))).length;
}

/**
 * Snapshot many weeks (bootstrap path).
 * Runs sequentially — there are typically < 13 weeks within the 90-day
 * AE retention window. Per-week errors do not abort the run.
 */
export async function runSnapshotForWeeks(
  env: SnapshotEnv,
  weekStarts: string[],
  options: {
    fetchFn?: typeof fetch;
    snapshottedAt?: string;
    metrics?: SnapshotMetric[];
  } = {},
): Promise<BootstrapResult> {
  const results: SnapshotRunResult[] = [];
  let ok = true;
  for (const ws of weekStarts) {
    const r = await runSnapshot(env, ws, options);
    results.push(r);
    if (!r.ok) ok = false;
  }
  return { weeks_processed: weekStarts.length, results, ok };
}

// ────────────────────────────────────────────────────────────
//  Lifetime composite query — archive + current week from raw
// ────────────────────────────────────────────────────────────

export interface LifetimeHeroStat {
  lifetime_pages: number;
  archive_pages: number;
  current_week_pages: number;
  current_week_start: string;
  archive_weeks_counted: number;
  computed_at: string;
  archive_source: string;
  raw_source: string;
}

/**
 * Compose lifetime pages typeset from:
 *   - sum of value across all rows in pages-typeset-weekly.jsonl (archive)
 *   - plus the current incomplete week from raw Analytics Engine
 *
 * Per article §"Lifetime Hero Stat — The Composite Query".
 */
export async function getLifetimeHeroStat(
  env: SnapshotEnv,
  options: { now?: Date; fetchFn?: typeof fetch } = {},
): Promise<LifetimeHeroStat> {
  const now = options.now ?? new Date();
  const fetchFn = options.fetchFn ?? fetch;

  // Archive: sum value across all rows in pages-typeset-weekly.jsonl
  const archive = await readSnapshotJsonl(env, "pages-typeset-weekly.jsonl");
  const archiveRows = archive.filter(
    (r) => r.metric === "pages_typeset_weekly",
  );
  const archivePages = archiveRows.reduce((sum, r) => sum + (r.value ?? 0), 0);

  // Current week from raw AE — bounded [currentWeekStart, +infinity).
  const currentWeekStart = weekStartFor(now);
  const sql = `
    SELECT SUM(double10 * _sample_interval) AS value
    FROM ptxprint_telemetry
    WHERE blob1 = 'job_terminal'
      AND blob8 = 'success'
      AND timestamp >= toDateTime('${currentWeekStart} 00:00:00')
  `.trim();
  const { rows } = await runAnalyticsEngineSql(env, sql, fetchFn);
  const currentWeekPages = numericValue(rows[0], "value");

  return {
    lifetime_pages: archivePages + currentWeekPages,
    archive_pages: archivePages,
    current_week_pages: currentWeekPages,
    current_week_start: currentWeekStart,
    archive_weeks_counted: archiveRows.length,
    computed_at: now.toISOString(),
    archive_source: "r2:ptxprint-telemetry-snapshots/pages-typeset-weekly.jsonl",
    raw_source: "ptxprint_telemetry (analytics engine)",
  };
}

// ────────────────────────────────────────────────────────────
//  Internal helpers
// ────────────────────────────────────────────────────────────

function numericValue(row: AeRow | undefined, field: string): number {
  if (!row) return 0;
  const v = row[field];
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function stringValue(row: AeRow | undefined, field: string): string {
  if (!row) return "";
  const v = row[field];
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
