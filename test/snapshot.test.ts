/**
 * snapshot.test.ts — Track A snapshot infrastructure tests.
 *
 * Covers:
 *   - Date helpers (weekStartFor, addDays, lastNWeekStarts)
 *   - JSONL parse / serialize round-trip
 *   - Merge replaces by (metric, week_start, failure_mode) key
 *   - Snapshot runner constructs SQL with correct boundaries
 *   - Snapshot runner writes correct JSONL records
 *   - Idempotency: re-running a week replaces old rows with same values
 *   - failure_mode_distribution_weekly emits one row per failure_mode bucket
 *   - getLifetimeHeroStat composes archive + current week
 *   - Bootstrap iterates over many weeks
 *
 * Authority:
 *   klappy://canon/articles/hero-metrics-and-storytelling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  weekStartFor,
  toIsoDate,
  addDays,
  lastNWeekStarts,
  parseJsonl,
  serializeJsonl,
  mergeSnapshots,
  runSnapshot,
  runSnapshotForWeeks,
  getLifetimeHeroStat,
  METRICS,
  type SnapshotEnv,
  type SnapshotRecord,
  type R2BucketLike,
  type R2ObjectLike,
} from "../src/snapshot.js";

// ────────────────────────────────────────────────────────────
//  Mock R2 bucket
// ────────────────────────────────────────────────────────────

class MockR2 implements R2BucketLike {
  store = new Map<string, string>();

  async get(key: string): Promise<R2ObjectLike | null> {
    const v = this.store.get(key);
    if (v === undefined) return null;
    return { text: async () => v };
  }

  async put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
  ): Promise<unknown> {
    if (typeof value === "string") {
      this.store.set(key, value);
    } else {
      throw new Error("MockR2 only handles string puts in this test");
    }
    return {};
  }

  async list(options?: { prefix?: string }) {
    const prefix = options?.prefix ?? "";
    return {
      objects: [...this.store.keys()]
        .filter((k) => k.startsWith(prefix))
        .map((key) => ({
          key,
          size: this.store.get(key)?.length ?? 0,
          uploaded: new Date(),
        })),
    };
  }
}

// ────────────────────────────────────────────────────────────
//  Date helpers
// ────────────────────────────────────────────────────────────

describe("date helpers", () => {
  it("weekStartFor returns the Monday of the containing ISO week", () => {
    // 2026-04-30 is a Thursday → Monday of that week is 2026-04-27
    expect(weekStartFor(new Date("2026-04-30T12:34:56Z"))).toBe("2026-04-27");
    // 2026-05-04 is a Monday → returns itself
    expect(weekStartFor(new Date("2026-05-04T00:00:00Z"))).toBe("2026-05-04");
    // 2026-05-03 is a Sunday → returns 2026-04-27 (the Monday before)
    expect(weekStartFor(new Date("2026-05-03T23:59:59Z"))).toBe("2026-04-27");
  });

  it("toIsoDate formats UTC dates", () => {
    expect(toIsoDate(new Date("2026-04-27T00:00:00Z"))).toBe("2026-04-27");
    expect(toIsoDate(new Date("2026-01-01T23:59:59Z"))).toBe("2026-01-01");
  });

  it("addDays shifts a YYYY-MM-DD by integer days", () => {
    expect(addDays("2026-04-27", 7)).toBe("2026-05-04");
    expect(addDays("2026-04-27", -7)).toBe("2026-04-20");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("lastNWeekStarts returns N completed weeks oldest first", () => {
    const now = new Date("2026-04-30T12:00:00Z"); // Thursday
    const weeks = lastNWeekStarts(now, 3);
    expect(weeks).toEqual(["2026-04-06", "2026-04-13", "2026-04-20"]);
  });
});

// ────────────────────────────────────────────────────────────
//  JSONL round-trip
// ────────────────────────────────────────────────────────────

describe("JSONL serialization", () => {
  it("parses and serializes records round-trip", () => {
    const records: SnapshotRecord[] = [
      {
        metric: "pages_typeset_weekly",
        week_start: "2026-04-27",
        value: 14823,
        snapshotted_at: "2026-05-04T00:00:00.000Z",
        source: "ptxprint_telemetry",
      },
    ];
    const text = serializeJsonl(records);
    expect(text).toContain('"metric":"pages_typeset_weekly"');
    expect(parseJsonl(text)).toEqual(records);
  });

  it("ignores blank lines and malformed lines", () => {
    const text =
      '{"metric":"a","week_start":"2026-04-27","value":1,"snapshotted_at":"x","source":"y"}\n' +
      "\n" +
      "not json\n" +
      '{"metric":"b","week_start":"2026-04-27","value":2,"snapshotted_at":"x","source":"y"}\n';
    const parsed = parseJsonl(text);
    expect(parsed).toHaveLength(2);
    expect(parsed.map((r) => r.metric)).toEqual(["a", "b"]);
  });

  it("returns [] for empty input", () => {
    expect(parseJsonl("")).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────
//  mergeSnapshots
// ────────────────────────────────────────────────────────────

describe("mergeSnapshots", () => {
  const snap = (
    week: string,
    value: number,
    failure_mode?: string,
  ): SnapshotRecord => ({
    metric: failure_mode
      ? "failure_mode_distribution_weekly"
      : "pages_typeset_weekly",
    week_start: week,
    value,
    snapshotted_at: "2026-05-04T00:00:00Z",
    source: "ptxprint_telemetry",
    ...(failure_mode ? { failure_mode } : {}),
  });

  it("appends fresh records when no overlap", () => {
    const existing = [snap("2026-04-13", 100)];
    const fresh = [snap("2026-04-20", 200)];
    const merged = mergeSnapshots(existing, fresh);
    expect(merged).toHaveLength(2);
    expect(merged[0].week_start).toBe("2026-04-13");
    expect(merged[1].week_start).toBe("2026-04-20");
  });

  it("replaces by (metric, week_start) key", () => {
    const existing = [snap("2026-04-20", 100)];
    const fresh = [snap("2026-04-20", 999)];
    const merged = mergeSnapshots(existing, fresh);
    expect(merged).toHaveLength(1);
    expect(merged[0].value).toBe(999);
  });

  it("treats failure_mode dimension as part of the replacement key", () => {
    const existing = [
      snap("2026-04-20", 50, "success"),
      snap("2026-04-20", 5, "soft"),
    ];
    const fresh = [snap("2026-04-20", 60, "success")]; // only success refreshed
    const merged = mergeSnapshots(existing, fresh);
    expect(merged).toHaveLength(2);
    const success = merged.find((r) => r.failure_mode === "success");
    const soft = merged.find((r) => r.failure_mode === "soft");
    expect(success?.value).toBe(60);
    expect(soft?.value).toBe(5);
  });

  it("sorts by (week_start, failure_mode) ascending", () => {
    const merged = mergeSnapshots(
      [],
      [
        snap("2026-04-27", 1, "soft"),
        snap("2026-04-13", 2, "success"),
        snap("2026-04-20", 3, "success"),
        snap("2026-04-20", 4, "hard"),
      ],
    );
    expect(merged.map((r) => `${r.week_start}/${r.failure_mode ?? "-"}`)).toEqual([
      "2026-04-13/success",
      "2026-04-20/hard",
      "2026-04-20/success",
      "2026-04-27/soft",
    ]);
  });

  it("returns existing unchanged if fresh is empty", () => {
    const existing = [snap("2026-04-13", 100)];
    expect(mergeSnapshots(existing, [])).toBe(existing);
  });
});

// ────────────────────────────────────────────────────────────
//  Snapshot runner — query construction and record output
// ────────────────────────────────────────────────────────────

describe("runSnapshot — Track A end-to-end", () => {
  const ENV_BASE: SnapshotEnv = {
    CF_ACCOUNT_ID: "test-account",
    CF_API_TOKEN: "test-token",
  };

  function envWith(r2: MockR2): SnapshotEnv {
    return { ...ENV_BASE, TELEMETRY_SNAPSHOTS: r2 };
  }

  function mockFetch(
    rowsByMatch: Array<{ match: RegExp; rows: Record<string, unknown>[] }>,
  ): typeof fetch {
    return vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = String(init?.body ?? "");
      const hit = rowsByMatch.find((r) => r.match.test(body));
      const rows = hit?.rows ?? [];
      return new Response(JSON.stringify({ data: rows }), { status: 200 });
    }) as unknown as typeof fetch;
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("constructs SQL with the correct week boundaries [Mon, Mon)", async () => {
    const r2 = new MockR2();
    const captured: string[] = [];
    const fetchFn = vi.fn(async (_u: unknown, init?: RequestInit) => {
      captured.push(String(init?.body ?? ""));
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }) as unknown as typeof fetch;

    await runSnapshot(envWith(r2), "2026-04-27", { fetchFn });

    // Every metric query should reference the week's start and end (next Mon)
    for (const sql of captured) {
      expect(sql).toContain("'2026-04-27 00:00:00'");
      expect(sql).toContain("'2026-05-04 00:00:00'");
      expect(sql).toContain("FROM ptxprint_telemetry");
    }
    expect(captured).toHaveLength(METRICS.length);
  });

  it("writes one JSONL line for pages_typeset_weekly", async () => {
    const r2 = new MockR2();
    const fetchFn = mockFetch([
      { match: /double10 \* _sample_interval/, rows: [{ value: 14823 }] },
      { match: /SUM\(_sample_interval\)/, rows: [{ value: 42 }] },
      { match: /GROUP BY blob8/, rows: [] },
    ]);

    const result = await runSnapshot(envWith(r2), "2026-04-27", {
      fetchFn,
      snapshottedAt: "2026-05-04T00:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    const pages = parseJsonl(r2.store.get("pages-typeset-weekly.jsonl") ?? "");
    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual({
      metric: "pages_typeset_weekly",
      week_start: "2026-04-27",
      value: 14823,
      snapshotted_at: "2026-05-04T00:00:00.000Z",
      source: "ptxprint_telemetry",
    });
  });

  it("emits one row per failure_mode bucket for the distribution metric", async () => {
    const r2 = new MockR2();
    const fetchFn = mockFetch([
      // Most-specific matchers first — the failure_mode SQL contains BOTH
      // `SUM(_sample_interval)` AND `GROUP BY blob8`, so the GROUP BY pattern
      // must be checked before the bare SUM pattern.
      {
        match: /GROUP BY blob8/,
        rows: [
          { failure_mode: "success", value: 38 },
          { failure_mode: "soft", value: 3 },
          { failure_mode: "hard", value: 1 },
        ],
      },
      { match: /double10 \* _sample_interval/, rows: [{ value: 100 }] },
      { match: /SUM\(_sample_interval\)/, rows: [{ value: 5 }] },
    ]);

    await runSnapshot(envWith(r2), "2026-04-27", {
      fetchFn,
      snapshottedAt: "2026-05-04T00:00:00.000Z",
    });

    const dist = parseJsonl(
      r2.store.get("failure-mode-distribution-weekly.jsonl") ?? "",
    );
    expect(dist).toHaveLength(3);
    expect(dist.map((r) => r.failure_mode).sort()).toEqual([
      "hard",
      "soft",
      "success",
    ]);
    expect(
      dist.find((r) => r.failure_mode === "success")?.value,
    ).toBe(38);
    // Every distribution row must carry the metric, week_start, and source
    for (const row of dist) {
      expect(row.metric).toBe("failure_mode_distribution_weekly");
      expect(row.week_start).toBe("2026-04-27");
      expect(row.source).toBe("ptxprint_telemetry");
    }
  });

  it("idempotent: re-running for the same week replaces values, doesn't duplicate", async () => {
    const r2 = new MockR2();

    // Run 1: value = 100
    await runSnapshot(envWith(r2), "2026-04-27", {
      fetchFn: mockFetch([
        { match: /double10 \* _sample_interval/, rows: [{ value: 100 }] },
        { match: /SUM\(_sample_interval\)/, rows: [{ value: 1 }] },
        { match: /GROUP BY blob8/, rows: [] },
      ]),
      snapshottedAt: "2026-05-04T00:00:00Z",
    });

    // Run 2: value = 200 (same week)
    await runSnapshot(envWith(r2), "2026-04-27", {
      fetchFn: mockFetch([
        { match: /double10 \* _sample_interval/, rows: [{ value: 200 }] },
        { match: /SUM\(_sample_interval\)/, rows: [{ value: 1 }] },
        { match: /GROUP BY blob8/, rows: [] },
      ]),
      snapshottedAt: "2026-05-05T00:00:00Z",
    });

    const pages = parseJsonl(r2.store.get("pages-typeset-weekly.jsonl") ?? "");
    expect(pages).toHaveLength(1);
    expect(pages[0].value).toBe(200);
    expect(pages[0].snapshotted_at).toBe("2026-05-05T00:00:00Z");
  });

  it("preserves prior weeks when snapshotting a new week", async () => {
    const r2 = new MockR2();

    await runSnapshot(envWith(r2), "2026-04-13", {
      fetchFn: mockFetch([
        { match: /double10 \* _sample_interval/, rows: [{ value: 50 }] },
        { match: /SUM\(_sample_interval\)/, rows: [{ value: 1 }] },
        { match: /GROUP BY blob8/, rows: [] },
      ]),
    });
    await runSnapshot(envWith(r2), "2026-04-20", {
      fetchFn: mockFetch([
        { match: /double10 \* _sample_interval/, rows: [{ value: 75 }] },
        { match: /SUM\(_sample_interval\)/, rows: [{ value: 1 }] },
        { match: /GROUP BY blob8/, rows: [] },
      ]),
    });

    const pages = parseJsonl(r2.store.get("pages-typeset-weekly.jsonl") ?? "");
    expect(pages).toHaveLength(2);
    expect(pages[0].week_start).toBe("2026-04-13");
    expect(pages[0].value).toBe(50);
    expect(pages[1].week_start).toBe("2026-04-20");
    expect(pages[1].value).toBe(75);
  });

  it("captures per-metric error without aborting other metrics", async () => {
    const r2 = new MockR2();
    let calls = 0;
    const fetchFn = vi.fn(async (_u: unknown, _init?: RequestInit) => {
      calls += 1;
      if (calls === 1) {
        return new Response("server error", { status: 500 });
      }
      return new Response(JSON.stringify({ data: [{ value: 7 }] }), {
        status: 200,
      });
    }) as unknown as typeof fetch;

    const result = await runSnapshot(envWith(r2), "2026-04-27", { fetchFn });
    expect(result.ok).toBe(false);
    const failed = result.metrics.find((m) => m.error);
    expect(failed).toBeDefined();
    // Other metrics still ran
    expect(result.metrics.length).toBe(METRICS.length);
  });

  it("returns error if CF credentials are missing", async () => {
    const r2 = new MockR2();
    const result = await runSnapshot(
      { TELEMETRY_SNAPSHOTS: r2 },
      "2026-04-27",
    );
    expect(result.ok).toBe(false);
    expect(result.metrics.every((m) => m.error)).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
//  Bootstrap (multi-week)
// ────────────────────────────────────────────────────────────

describe("runSnapshotForWeeks — bootstrap path", () => {
  it("runs each week sequentially", async () => {
    const r2 = new MockR2();
    const env: SnapshotEnv = {
      CF_ACCOUNT_ID: "x",
      CF_API_TOKEN: "y",
      TELEMETRY_SNAPSHOTS: r2,
    };
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ value: 1 }] }), { status: 200 }),
    ) as unknown as typeof fetch;

    const result = await runSnapshotForWeeks(
      env,
      ["2026-04-13", "2026-04-20", "2026-04-27"],
      { fetchFn },
    );

    expect(result.weeks_processed).toBe(3);
    expect(result.results).toHaveLength(3);
    expect(result.ok).toBe(true);

    const pages = parseJsonl(r2.store.get("pages-typeset-weekly.jsonl") ?? "");
    expect(pages.map((r) => r.week_start)).toEqual([
      "2026-04-13",
      "2026-04-20",
      "2026-04-27",
    ]);
  });
});

// ────────────────────────────────────────────────────────────
//  Lifetime composite query
// ────────────────────────────────────────────────────────────

describe("getLifetimeHeroStat", () => {
  it("sums archive + current week from raw", async () => {
    const r2 = new MockR2();
    const archive: SnapshotRecord[] = [
      {
        metric: "pages_typeset_weekly",
        week_start: "2026-04-13",
        value: 100,
        snapshotted_at: "x",
        source: "ptxprint_telemetry",
      },
      {
        metric: "pages_typeset_weekly",
        week_start: "2026-04-20",
        value: 200,
        snapshotted_at: "x",
        source: "ptxprint_telemetry",
      },
    ];
    r2.store.set("pages-typeset-weekly.jsonl", serializeJsonl(archive));

    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ value: 50 }] }), { status: 200 }),
    ) as unknown as typeof fetch;

    const stat = await getLifetimeHeroStat(
      { CF_ACCOUNT_ID: "x", CF_API_TOKEN: "y", TELEMETRY_SNAPSHOTS: r2 },
      { now: new Date("2026-04-30T12:00:00Z"), fetchFn },
    );

    expect(stat.archive_pages).toBe(300);
    expect(stat.current_week_pages).toBe(50);
    expect(stat.lifetime_pages).toBe(350);
    expect(stat.archive_weeks_counted).toBe(2);
    expect(stat.current_week_start).toBe("2026-04-27");
  });

  it("treats missing archive as zero", async () => {
    const r2 = new MockR2();
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ value: 12 }] }), { status: 200 }),
    ) as unknown as typeof fetch;
    const stat = await getLifetimeHeroStat(
      { CF_ACCOUNT_ID: "x", CF_API_TOKEN: "y", TELEMETRY_SNAPSHOTS: r2 },
      { now: new Date("2026-04-30T12:00:00Z"), fetchFn },
    );
    expect(stat.archive_pages).toBe(0);
    expect(stat.current_week_pages).toBe(12);
    expect(stat.lifetime_pages).toBe(12);
  });

  it("ignores rows from other metrics that share the file (defensive)", async () => {
    const r2 = new MockR2();
    const mixed: SnapshotRecord[] = [
      {
        metric: "pages_typeset_weekly",
        week_start: "2026-04-13",
        value: 100,
        snapshotted_at: "x",
        source: "ptxprint_telemetry",
      },
      {
        // hypothetical contamination — should be ignored
        metric: "successful_builds_weekly",
        week_start: "2026-04-13",
        value: 999,
        snapshotted_at: "x",
        source: "ptxprint_telemetry",
      },
    ];
    r2.store.set("pages-typeset-weekly.jsonl", serializeJsonl(mixed));
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    ) as unknown as typeof fetch;
    const stat = await getLifetimeHeroStat(
      { CF_ACCOUNT_ID: "x", CF_API_TOKEN: "y", TELEMETRY_SNAPSHOTS: r2 },
      { now: new Date("2026-04-30T12:00:00Z"), fetchFn },
    );
    expect(stat.archive_pages).toBe(100);
    expect(stat.archive_weeks_counted).toBe(1);
  });
});

// ────────────────────────────────────────────────────────────
//  METRICS table sanity — vodka boundary check
// ────────────────────────────────────────────────────────────

describe("METRICS table", () => {
  it("contains exactly 5 metrics (4 query buckets per article spec)", () => {
    // pages_typeset, successful_builds, cache_hits, cache_misses,
    // failure_mode_distribution. The article enumerates "cache_hits and
    // cache_misses" together; we materialize them as two rows for
    // schema consistency (one R2 object per metric name).
    expect(METRICS).toHaveLength(5);
  });

  it("each metric has unique name and objectKey", () => {
    const names = new Set(METRICS.map((m) => m.name));
    const keys = new Set(METRICS.map((m) => m.objectKey));
    expect(names.size).toBe(METRICS.length);
    expect(keys.size).toBe(METRICS.length);
  });

  it("each metric SQL only references ptxprint_telemetry", () => {
    for (const m of METRICS) {
      const sql = m.buildSql("2026-04-27", "2026-05-04").toLowerCase();
      // No other dataset names should appear after FROM/JOIN
      const matches = [...sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/g)];
      for (const match of matches) {
        expect(match[1]).toBe("ptxprint_telemetry");
      }
    }
  });
});
