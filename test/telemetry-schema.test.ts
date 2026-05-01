/**
 * telemetry-schema.test.ts — schema source-of-truth + SQL rewriter tests.
 *
 * The schema module exists to prevent silent column-position drift (see
 * src/telemetry-schema.ts header). These tests pin the contract:
 *
 *   1. BLOB_SCHEMA / DOUBLE_SCHEMA are stable, ordered, and produce
 *      consistent BLOB_INDEX / DOUBLE_INDEX lookups.
 *   2. buildBlobsArray / buildDoublesArray assemble positional arrays in
 *      schema order regardless of input key order.
 *   3. b() and d() helpers return the same column names as the rewriter
 *      generates, so query builders and the rewriter agree.
 *   4. rewriteSemanticSql handles the canonical query patterns:
 *        - bare names in SELECT become `colN AS name`
 *        - bare names in WHERE / GROUP BY / etc. become `colN`
 *        - string literals are NEVER touched (so 'tool_call' stays a string)
 *        - already-positional refs (blob3) pass through unchanged (idempotent)
 *        - user-provided AS aliases are preserved
 */

import { describe, it, expect } from "vitest";
import {
  BLOB_SCHEMA,
  DOUBLE_SCHEMA,
  BLOB_INDEX,
  DOUBLE_INDEX,
  b,
  d,
  buildBlobsArray,
  buildDoublesArray,
  exportSchema,
  rewriteSemanticSql,
} from "../src/telemetry-schema.js";

// ────────────────────────────────────────────────────────────
//  Schema constants — order is contractual
// ────────────────────────────────────────────────────────────

describe("BLOB_SCHEMA — declared positions are forever", () => {
  it("position 1 is event_type (the most-queried filter)", () => {
    expect(BLOB_SCHEMA[0].name).toBe("event_type");
    expect(BLOB_INDEX.event_type).toBe(1);
    expect(b("event_type")).toBe("blob1");
  });

  it("position 3 is tool_name (the leaderboard backbone)", () => {
    expect(BLOB_SCHEMA[2].name).toBe("tool_name");
    expect(BLOB_INDEX.tool_name).toBe(3);
    expect(b("tool_name")).toBe("blob3");
  });

  it("position 4 is consumer_label (the sampling key)", () => {
    expect(BLOB_SCHEMA[3].name).toBe("consumer_label");
    expect(BLOB_INDEX.consumer_label).toBe(4);
    expect(b("consumer_label")).toBe("blob4");
  });

  it("every entry has a name and a desc", () => {
    for (const f of BLOB_SCHEMA) {
      expect(f.name).toBeTruthy();
      expect(f.desc).toBeTruthy();
    }
  });

  it("names are unique", () => {
    const names = BLOB_SCHEMA.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("DOUBLE_SCHEMA — declared positions are forever", () => {
  it("position 1 is count (always 1, for SUM aggregation)", () => {
    expect(DOUBLE_SCHEMA[0].name).toBe("count");
    expect(DOUBLE_INDEX.count).toBe(1);
    expect(d("count")).toBe("double1");
  });

  it("position 2 is duration_ms", () => {
    expect(DOUBLE_SCHEMA[1].name).toBe("duration_ms");
    expect(d("duration_ms")).toBe("double2");
  });
});

// ────────────────────────────────────────────────────────────
//  Builders — preserve position regardless of input order
// ────────────────────────────────────────────────────────────

describe("buildBlobsArray — position is fixed by schema, not input", () => {
  it("missing fields become empty string at their declared slot", () => {
    const arr = buildBlobsArray({ event_type: "tool_call" });
    expect(arr.length).toBe(BLOB_SCHEMA.length);
    expect(arr[0]).toBe("tool_call"); // event_type at slot 1
    expect(arr[1]).toBe(""); // method missing
    expect(arr[2]).toBe(""); // tool_name missing
  });

  it("input key order does not affect output position", () => {
    const a = buildBlobsArray({
      tool_name: "submit_typeset",
      event_type: "tool_call",
      consumer_label: "claude-desktop",
    });
    const b = buildBlobsArray({
      consumer_label: "claude-desktop",
      event_type: "tool_call",
      tool_name: "submit_typeset",
    });
    expect(a).toEqual(b);
    expect(a[0]).toBe("tool_call");        // blob1 = event_type
    expect(a[2]).toBe("submit_typeset");   // blob3 = tool_name
    expect(a[3]).toBe("claude-desktop");   // blob4 = consumer_label
  });
});

describe("buildDoublesArray — position is fixed by schema, not input", () => {
  it("missing fields become 0 at their declared slot", () => {
    const arr = buildDoublesArray({ count: 1 });
    expect(arr.length).toBe(DOUBLE_SCHEMA.length);
    expect(arr[0]).toBe(1); // count at slot 1
    expect(arr[1]).toBe(0); // duration_ms missing
  });
});

// ────────────────────────────────────────────────────────────
//  exportSchema — public mapping for tools / endpoints
// ────────────────────────────────────────────────────────────

describe("exportSchema — runtime-discoverable mapping", () => {
  const schema = exportSchema();
  it("dataset name is ptxprint_telemetry", () => {
    expect(schema.dataset).toBe("ptxprint_telemetry");
  });
  it("blobs is an ordered list of {position, column, name, desc}", () => {
    expect(schema.blobs.length).toBe(BLOB_SCHEMA.length);
    expect(schema.blobs[0]).toEqual({
      position: 1,
      column: "blob1",
      name: "event_type",
      desc: BLOB_SCHEMA[0].desc,
    });
    expect(schema.blobs[2].column).toBe("blob3");
    expect(schema.blobs[2].name).toBe("tool_name");
  });
  it("doubles starts with count at position 1", () => {
    expect(schema.doubles[0].name).toBe("count");
    expect(schema.doubles[0].column).toBe("double1");
  });
});

// ────────────────────────────────────────────────────────────
//  Rewriter — semantic SQL → positional SQL
// ────────────────────────────────────────────────────────────

describe("rewriteSemanticSql — SELECT clause", () => {
  it("expands bare field names to `colN AS name`", () => {
    const out = rewriteSemanticSql(`SELECT tool_name FROM ptxprint_telemetry`);
    expect(out).toBe(`SELECT blob3 AS tool_name FROM ptxprint_telemetry`);
  });

  it("preserves user-provided aliases", () => {
    const out = rewriteSemanticSql(`SELECT tool_name AS t FROM ptxprint_telemetry`);
    expect(out).toBe(`SELECT blob3 AS t FROM ptxprint_telemetry`);
  });

  it("handles multiple selected fields", () => {
    const out = rewriteSemanticSql(
      `SELECT event_type, tool_name, consumer_label FROM ptxprint_telemetry`,
    );
    expect(out).toBe(
      `SELECT blob1 AS event_type, blob3 AS tool_name, blob4 AS consumer_label FROM ptxprint_telemetry`,
    );
  });

  it("leaves non-schema columns alone (timestamp, _sample_interval)", () => {
    const out = rewriteSemanticSql(
      `SELECT tool_name, SUM(_sample_interval) AS calls FROM ptxprint_telemetry`,
    );
    expect(out).toBe(
      `SELECT blob3 AS tool_name, SUM(_sample_interval) AS calls FROM ptxprint_telemetry`,
    );
  });
});

describe("rewriteSemanticSql — WHERE / GROUP BY / ORDER BY", () => {
  it("expands WHERE field refs to positional column refs", () => {
    const out = rewriteSemanticSql(
      `SELECT tool_name FROM ptxprint_telemetry WHERE event_type = 'tool_call'`,
    );
    expect(out).toBe(
      `SELECT blob3 AS tool_name FROM ptxprint_telemetry WHERE blob1 = 'tool_call'`,
    );
  });

  it("expands GROUP BY field refs", () => {
    const out = rewriteSemanticSql(
      `SELECT tool_name, SUM(_sample_interval) AS calls FROM ptxprint_telemetry GROUP BY tool_name`,
    );
    expect(out).toContain(`GROUP BY blob3`);
  });

  it("handles the canon canned tool-leaderboard query", () => {
    const input = `SELECT tool_name, SUM(_sample_interval) AS calls FROM ptxprint_telemetry WHERE timestamp > NOW() - INTERVAL '30' DAY AND event_type = 'tool_call' AND tool_name != '' GROUP BY tool_name ORDER BY calls DESC LIMIT 10`;
    const out = rewriteSemanticSql(input);
    expect(out).toContain(`SELECT blob3 AS tool_name`);
    expect(out).toContain(`AND blob1 = 'tool_call'`);
    expect(out).toContain(`AND blob3 != ''`);
    expect(out).toContain(`GROUP BY blob3`);
    // ORDER BY calls is a SUM alias, not a schema field — must NOT be touched
    expect(out).toContain(`ORDER BY calls DESC`);
  });
});

describe("rewriteSemanticSql — string literals are sacred", () => {
  it("does not substitute schema names that appear as string values", () => {
    // 'tool_name' here is a literal, not a column reference
    const out = rewriteSemanticSql(
      `SELECT event_type FROM ptxprint_telemetry WHERE method = 'tool_name'`,
    );
    expect(out).toBe(
      `SELECT blob1 AS event_type FROM ptxprint_telemetry WHERE blob2 = 'tool_name'`,
    );
  });

  it("handles the failure_mode literal collision case", () => {
    // failure_mode is BOTH a column name AND a possible literal value
    const out = rewriteSemanticSql(
      `SELECT failure_mode FROM ptxprint_telemetry WHERE failure_mode = 'failure_mode'`,
    );
    // Column refs become blob8; the literal 'failure_mode' inside quotes must NOT
    expect(out).toBe(
      `SELECT blob8 AS failure_mode FROM ptxprint_telemetry WHERE blob8 = 'failure_mode'`,
    );
  });
});

describe("rewriteSemanticSql — idempotence with existing positional refs", () => {
  it("blob*/double* refs already in the query are not double-rewritten", () => {
    const input = `SELECT blob3 AS tool_name FROM ptxprint_telemetry WHERE blob1 = 'tool_call'`;
    const out = rewriteSemanticSql(input);
    // tool_name in the AS alias is part of `blob3 AS tool_name` already; should
    // not become `blob3 AS blob3` or any other transformation
    expect(out).toBe(input);
  });

  it("a mixed query (some semantic, some positional) rewrites only the semantic parts", () => {
    const out = rewriteSemanticSql(
      `SELECT blob1 AS event_type, tool_name FROM ptxprint_telemetry`,
    );
    expect(out).toBe(
      `SELECT blob1 AS event_type, blob3 AS tool_name FROM ptxprint_telemetry`,
    );
  });
});

describe("rewriteSemanticSql — doubles too", () => {
  it("rewrites duration_ms and pages_count to double positions", () => {
    const out = rewriteSemanticSql(
      `SELECT phase, AVG(duration_ms) AS avg_ms FROM ptxprint_telemetry WHERE event_type = 'job_phase' GROUP BY phase`,
    );
    expect(out).toContain(`SELECT blob7 AS phase`);
    expect(out).toContain(`AVG(double2)`);
    expect(out).toContain(`WHERE blob1 = 'job_phase'`);
    expect(out).toContain(`GROUP BY blob7`);
  });
});

describe("rewriteSemanticSql — empty / edge cases", () => {
  it("empty string returns empty string", () => {
    expect(rewriteSemanticSql("")).toBe("");
  });

  it("query with no schema names is unchanged", () => {
    const input = `SELECT 1 FROM ptxprint_telemetry LIMIT 1`;
    expect(rewriteSemanticSql(input)).toBe(input);
  });
});
