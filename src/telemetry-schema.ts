/**
 * telemetry-schema.ts — SINGLE source of truth for ptxprint_telemetry blob/double positions.
 *
 * THE PROBLEM THIS SOLVES
 * Cloudflare Analytics Engine stores writes as positional `blobs[1..20]`
 * and `doubles[1..20]`. SQL queries against the dataset must use those
 * positional column names. If `writeDataPoint()` ever shuffles its array
 * order without every query being updated in lockstep, dashboards
 * silently start showing the wrong data — `tool_name` charts now
 * graphing `consumer_label`, etc. The columns still exist; the values
 * just changed meaning. No error is raised.
 *
 * This module makes that drift impossible by:
 *   1. Declaring the schema ONCE in a frozen list of `{name, desc}`.
 *   2. Exposing helpers that build the writer's blob array BY NAME, in
 *      the schema's declared order — so callers cannot accidentally
 *      transpose positions.
 *   3. Exposing a `b('field_name')` helper so query builders never type
 *      `blob3` — they reference the same schema constant.
 *   4. Exposing `rewriteSemanticSql()` so user-supplied SQL can use
 *      readable column names (`WHERE event_type = 'tool_call'`) and the
 *      worker rewrites them to positional refs before forwarding to AE.
 *   5. Exposing the schema via the `telemetry_schema` MCP tool and the
 *      `/diagnostics/schema` HTTP endpoint, so external query authors
 *      have a runtime-discoverable mapping.
 *
 * ADDING A NEW FIELD
 * Append to BLOB_SCHEMA or DOUBLE_SCHEMA. Never reorder existing
 * entries — that breaks already-written historical data. Never delete an
 * entry — leave it with a deprecation note. Position is forever.
 */

// ────────────────────────────────────────────────────────────
//  Schema declaration — order is contractual, position is forever
// ────────────────────────────────────────────────────────────

export const BLOB_SCHEMA = [
  { name: "event_type", desc: "mcp_request | tool_call | job_phase | job_terminal" },
  { name: "method", desc: "JSON-RPC method (e.g. tools/call, initialize)" },
  { name: "tool_name", desc: "MCP tool name when method is tools/call" },
  { name: "consumer_label", desc: "self-declared caller identity" },
  { name: "consumer_source", desc: "header | query | client_info | user_agent | unknown" },
  { name: "worker_version", desc: "worker code version string at write time" },
  { name: "phase", desc: "job lifecycle phase (job_phase / job_terminal events only)" },
  { name: "failure_mode", desc: "success | soft | hard | cancelled | timeout (job_terminal only)" },
  { name: "cache_outcome", desc: "hit | miss | n/a (mcp_request when tool_name = submit_typeset)" },
  { name: "payload_hash_prefix", desc: "first 8 hex chars of canonical payload sha256" },
  { name: "docs_audience", desc: "headless | gui (docs() tool only)" },
  { name: "docs_top_uri", desc: "klappy://canon/... URI of the top-ranked docs() result" },
] as const;

export const DOUBLE_SCHEMA = [
  { name: "count", desc: "always 1, present so SUM(_sample_interval) yields call counts" },
  { name: "duration_ms", desc: "wall-clock duration of the event at the layer that wrote it" },
  { name: "bytes_in", desc: "request body size (mcp_*) or input payload size (job_*)" },
  { name: "bytes_out", desc: "response body size (mcp_*) or PDF byte count (job_terminal success)" },
  { name: "sources_count", desc: "number of source URLs in payload (submit_typeset)" },
  { name: "fonts_count", desc: "number of font URLs in payload (submit_typeset)" },
  { name: "figures_count", desc: "number of figure URLs in payload (submit_typeset)" },
  { name: "passes_completed", desc: "autofill pass count when the job stopped" },
  { name: "overfull_count", desc: "Overfull \\hbox warnings in run log" },
  { name: "pages_count", desc: "page count of produced PDF (job_terminal with failure_mode=success)" },
] as const;

export type BlobName = typeof BLOB_SCHEMA[number]["name"];
export type DoubleName = typeof DOUBLE_SCHEMA[number]["name"];

// ────────────────────────────────────────────────────────────
//  Position lookups (1-indexed to match Cloudflare AE column names)
// ────────────────────────────────────────────────────────────

export const BLOB_INDEX: Record<BlobName, number> = Object.fromEntries(
  BLOB_SCHEMA.map((f, i) => [f.name, i + 1]),
) as Record<BlobName, number>;

export const DOUBLE_INDEX: Record<DoubleName, number> = Object.fromEntries(
  DOUBLE_SCHEMA.map((f, i) => [f.name, i + 1]),
) as Record<DoubleName, number>;

/** SQL column reference for a named blob field, e.g. b('tool_name') === 'blob3'. */
export function b(name: BlobName): string {
  return `blob${BLOB_INDEX[name]}`;
}

/** SQL column reference for a named double field, e.g. d('duration_ms') === 'double2'. */
export function d(name: DoubleName): string {
  return `double${DOUBLE_INDEX[name]}`;
}

// ────────────────────────────────────────────────────────────
//  Writer helpers — build positional arrays from named maps
// ────────────────────────────────────────────────────────────

/**
 * Build the `blobs` array for `writeDataPoint()` from a name-keyed map.
 * Keys not in the map become "" at their declared position. Callers cannot
 * transpose positions because the array is always assembled in BLOB_SCHEMA
 * order from the named input.
 */
export function buildBlobsArray(values: Partial<Record<BlobName, string>>): string[] {
  return BLOB_SCHEMA.map((f) => values[f.name] ?? "");
}

/**
 * Build the `doubles` array for `writeDataPoint()` from a name-keyed map.
 * Keys not in the map become 0 at their declared position.
 */
export function buildDoublesArray(values: Partial<Record<DoubleName, number>>): number[] {
  return DOUBLE_SCHEMA.map((f) => values[f.name] ?? 0);
}

// ────────────────────────────────────────────────────────────
//  Schema export for tools / endpoints
// ────────────────────────────────────────────────────────────

export interface SchemaExport {
  dataset: string;
  blobs: Array<{ position: number; column: string; name: string; desc: string }>;
  doubles: Array<{ position: number; column: string; name: string; desc: string }>;
  notes: string[];
}

export function exportSchema(): SchemaExport {
  return {
    dataset: "ptxprint_telemetry",
    blobs: BLOB_SCHEMA.map((f, i) => ({
      position: i + 1,
      column: `blob${i + 1}`,
      name: f.name,
      desc: f.desc,
    })),
    doubles: DOUBLE_SCHEMA.map((f, i) => ({
      position: i + 1,
      column: `double${i + 1}`,
      name: f.name,
      desc: f.desc,
    })),
    notes: [
      "Cloudflare Analytics Engine stores writes as positional blob1..20 and double1..20.",
      "Use semantic field names in your SQL — telemetry_public auto-rewrites them to positional refs.",
      "Or query positionally with blob1..12 and double1..10 directly; both work.",
      "Use SUM(_sample_interval) instead of COUNT(*) to account for AE sampling.",
      "Always include a timestamp filter, e.g. WHERE timestamp > NOW() - INTERVAL '30' DAY.",
    ],
  };
}

// ────────────────────────────────────────────────────────────
//  Semantic SQL rewriter
//
//  Lets users write queries with field names instead of blobN/doubleN:
//
//    INPUT:   SELECT tool_name, SUM(_sample_interval) AS calls
//             FROM ptxprint_telemetry
//             WHERE event_type = 'tool_call' AND tool_name != ''
//             GROUP BY tool_name
//
//    OUTPUT:  SELECT blob3 AS tool_name, SUM(_sample_interval) AS calls
//             FROM ptxprint_telemetry
//             WHERE blob1 = 'tool_call' AND blob3 != ''
//             GROUP BY blob3
//
//  RULES
//   - String literals ('...') are protected from substitution.
//   - In SELECT clause: bare `name` becomes `blobN AS name` (unless already
//     followed by AS, in which case it just becomes `blobN`).
//   - In WHERE / GROUP BY / HAVING / ORDER BY clauses: bare `name` becomes
//     `blobN` (the SELECT alias would also work for some clauses, but
//     positional refs are universally safe).
//   - Already-positional refs (blob3, double2) pass through unchanged.
//   - Fields that AREN'T in the schema (e.g. `_sample_interval`, `timestamp`,
//     `calls`, ClickHouse functions like `toStartOfHour`, `NOW`) are left
//     alone since they're not in the substitution table.
// ────────────────────────────────────────────────────────────

const ALL_FIELD_NAMES: Array<{ name: string; col: string }> = [
  ...BLOB_SCHEMA.map((f, i) => ({ name: f.name, col: `blob${i + 1}` })),
  ...DOUBLE_SCHEMA.map((f, i) => ({ name: f.name, col: `double${i + 1}` })),
];

const FIELD_LOOKUP: Record<string, string> = Object.fromEntries(
  ALL_FIELD_NAMES.map(({ name, col }) => [name, col]),
);

/** Substitute every `\bname\b` with its positional column ref. No aliasing. */
function substituteFieldsToCol(text: string): string {
  let result = text;
  for (const { name, col } of ALL_FIELD_NAMES) {
    result = result.replace(new RegExp(`\\b${name}\\b`, "g"), col);
  }
  return result;
}

/** Split on a separator at paren-depth 0. Used to walk SELECT columns. */
function splitTopLevel(text: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === sep && depth === 0) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

/**
 * Rewrite a single SELECT-clause column expression. Three cases:
 *   1. Bare identifier (`tool_name`) → `blob3 AS tool_name`.
 *   2. Bare identifier with user alias (`tool_name AS t`) → `blob3 AS t`.
 *   3. Already positional (`blob3`, `blob3 AS tool_name`) → unchanged.
 *   4. Complex expression (`AVG(duration_ms)`, `SUM(_sample_interval) AS x`)
 *      → substitute schema names to col refs INSIDE; do not add aliasing.
 *
 * The aliasing rule fires only at top-level column positions, so e.g.
 * `AVG(duration_ms)` becomes `AVG(double2)`, not `AVG(double2 AS duration_ms)`.
 */
function rewriteSelectColumn(col: string): string {
  const trimMatch = col.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!trimMatch) return col;
  const [, leading, body, trailing] = trimMatch;

  // Case 1-3: a single identifier, optionally with AS alias.
  const simple = body.match(/^(\w+)(\s+(?:AS|as)\s+\w+)?$/);
  if (simple) {
    const ident = simple[1];
    const asTail = simple[2] ?? "";

    // Already-positional ref — pass through unchanged.
    if (/^(?:blob|double)\d+$/.test(ident)) {
      return col;
    }

    // Schema field — substitute, with aliasing if no user alias.
    const colRef = FIELD_LOOKUP[ident];
    if (colRef) {
      if (asTail) return `${leading}${colRef}${asTail}${trailing}`;
      return `${leading}${colRef} AS ${ident}${trailing}`;
    }

    // Unknown identifier (e.g. `timestamp`, `_sample_interval`) — leave alone.
    return col;
  }

  // Case 4: complex expression — substitute schema names without aliasing.
  return `${leading}${substituteFieldsToCol(body)}${trailing}`;
}

/**
 * Rewrite SQL with semantic field names into positional column refs.
 * Idempotent: queries already using positional refs (blob1..N, double1..N)
 * pass through unchanged.
 */
export function rewriteSemanticSql(sql: string): string {
  if (!sql) return sql;

  // 1. Stash string literals so we don't substitute inside 'mcp_request' etc.
  const literals: string[] = [];
  const stashed = sql.replace(/'(?:[^']|'')*'/g, (m) => {
    literals.push(m);
    return `__LIT_${literals.length - 1}__`;
  });

  // 2. Locate SELECT...FROM boundaries (case-insensitive).
  const upper = stashed.toUpperCase();
  const selectIdx = upper.indexOf("SELECT");
  const fromIdx = upper.indexOf(" FROM ", selectIdx >= 0 ? selectIdx : 0);

  let processed: string;
  if (selectIdx < 0 || fromIdx < 0) {
    // No identifiable SELECT...FROM — substitute everywhere, no aliasing.
    processed = substituteFieldsToCol(stashed);
  } else {
    const before = stashed.slice(0, selectIdx);
    const selectKw = stashed.slice(selectIdx, selectIdx + "SELECT".length);
    const selectBody = stashed.slice(selectIdx + "SELECT".length, fromIdx);
    const rest = stashed.slice(fromIdx); // " FROM ..." onwards

    // SELECT body: split on top-level commas, rewrite each column expression.
    const newSelectBody = splitTopLevel(selectBody, ",")
      .map(rewriteSelectColumn)
      .join(",");

    // Rest (FROM/WHERE/GROUP BY/etc.): bare names → positional refs only.
    processed = before + selectKw + newSelectBody + substituteFieldsToCol(rest);
  }

  // 3. Restore string literals.
  return processed.replace(/__LIT_(\d+)__/g, (_m, idx) => literals[Number(idx)]);
}
