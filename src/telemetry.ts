/**
 * telemetry.ts — v1.3 telemetry module.
 *
 * Four exports per spec §6:
 *   6.1  writeTelemetry  — typed writer, consumer-label resolution
 *   6.2  redactAndValidate — strict zod schema, privacy-floor enforcement
 *   6.3  resolveTelemetryPolicy — three-tier fallback (knowledge_base → bundled → minimal)
 *   6.4  forwardTelemetryQuery — dataset allowlist, rate limit, error sanitization
 *
 * Plus helpers: resolveConsumer, tryParseJsonRpc, validateDatasetAllowlist.
 *
 * Authority: klappy://canon/specs/ptxprint-mcp-v1.3-spec §6
 * Policy:    klappy://canon/governance/telemetry-governance
 */

import { z } from "zod";

// ────────────────────────────────────────────────────────────
//  Constants
// ────────────────────────────────────────────────────────────

export const WORKER_VERSION = "0.1.0";

const POLICY_RAW_URL =
  "https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/canon/governance/telemetry-governance.md";
const POLICY_SANITY_CHECK = "# Telemetry Governance";

export const SELF_REPORT_HEADERS: Record<string, string> = {
  "x-ptxprint-client":
    "Your client name (e.g., 'claude-desktop', 'bt-servant')",
  "x-ptxprint-client-version": "Version string (semver recommended)",
  "x-ptxprint-agent-name": "AI agent or model name",
  "x-ptxprint-agent-version": "Version string for the agent/model",
  "x-ptxprint-surface":
    "Where this is running ('claude.ai', 'vscode', 'cli', 'production')",
  "x-ptxprint-contact-url": "Project or organization URL",
  "x-ptxprint-policy-url": "Your privacy or telemetry policy URL",
  "x-ptxprint-capabilities":
    "Comma-separated capabilities (e.g., 'submit,poll,docs')",
};

/**
 * Tier-3 minimal policy — ~200 words. Lists dataset name, privacy-floor
 * non-negotiables, and the canonical policy URI.
 */
export const MINIMAL_POLICY = `# PTXprint MCP Telemetry — Minimal Policy

Dataset: ptxprint_telemetry (Cloudflare Workers Analytics Engine)
Canonical policy: klappy://canon/governance/telemetry-governance

## Privacy Floor (Non-Negotiable)

The following are NEVER collected under any circumstance:

- project_id — Paratext project IDs (e.g. WSG, WSGNT, BSB)
- config_name — configuration names (e.g. Default, FancyNT)
- book_codes — USFM book codes (e.g. MAT, JHN, ROM)
- source_url — hostnames or URLs of source repositories
- font_url — font file URLs
- figure_url — figure file URLs
- payload_full — full payload contents (the JSON submitted to submit_typeset)
- usfm_bytes — USFM source content
- log_content — XeTeX log content
- pdf_bytes — PDF output content

Consumer identification is opt-in via self-report headers or ?consumer= query parameter.
IP addresses are never logged. No authentication tokens or credentials are logged.

The data is public — any consumer can query the same dashboard the maintainer sees
via the telemetry_public(sql) tool.

For the full governance document, see:
  klappy://canon/governance/telemetry-governance
  https://github.com/klappy/ptxprint-mcp/blob/main/canon/governance/telemetry-governance.md`;

// ────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────

export type GovernanceSource = "knowledge_base" | "bundled" | "minimal";
export type EventType = "mcp_request" | "tool_call" | "job_phase" | "job_terminal";
export type ConsumerSource = "header" | "query" | "client_info" | "user_agent" | "unknown";

export interface ConsumerInfo {
  label: string;
  source: ConsumerSource;
}

export interface TelemetryFields {
  method?: string;
  tool_name?: string;
  consumer_label?: string;
  consumer_source?: string;
  phase?: string;
  failure_mode?: string;
  cache_outcome?: string;
  payload_hash_prefix?: string;
  docs_audience?: string;
  docs_top_uri?: string;
  duration_ms?: number;
  bytes_in?: number;
  bytes_out?: number;
  sources_count?: number;
  fonts_count?: number;
  figures_count?: number;
  passes_completed?: number;
  overfull_count?: number;
  pages_count?: number;
}

/** Minimal Analytics Engine interface — matches the CF Workers binding. */
export interface AnalyticsEngineDatasetLike {
  writeDataPoint(event: {
    blobs?: (string | ArrayBuffer | null)[];
    doubles?: number[];
    indexes?: (string | ArrayBuffer | null)[];
  }): void;
}

/** Env shape required by the telemetry module. */
export interface TelemetryEnv {
  PTXPRINT_TELEMETRY?: AnalyticsEngineDatasetLike;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR?: string;
}

export interface TelemetryQueryResult {
  rows?: unknown[];
  row_count?: number;
  query?: string;
  executed_at?: string;
  error?: string;
}

export interface ParsedRpc {
  method: string;
  toolName: string;
  params: Record<string, unknown>;
  id?: string | number | null;
}

// ────────────────────────────────────────────────────────────
//  6.1 — Writer
// ────────────────────────────────────────────────────────────

/**
 * Write a single telemetry data point.
 *
 * Blobs (12) and doubles (10) are mapped positionally per the schema in
 * canon/governance/telemetry-governance.md §"Structural Dimensions".
 * The writer never accepts free-form strings beyond the typed slots.
 */
export function writeTelemetry(
  env: TelemetryEnv,
  eventType: EventType,
  fields: TelemetryFields,
): void {
  if (!env.PTXPRINT_TELEMETRY) return;

  const blobs: string[] = [
    /* 1  event_type         */ eventType,
    /* 2  method             */ fields.method ?? "",
    /* 3  tool_name          */ fields.tool_name ?? "",
    /* 4  consumer_label     */ fields.consumer_label ?? "unknown",
    /* 5  consumer_source    */ fields.consumer_source ?? "unknown",
    /* 6  worker_version     */ WORKER_VERSION,
    /* 7  phase              */ fields.phase ?? "",
    /* 8  failure_mode       */ fields.failure_mode ?? "",
    /* 9  cache_outcome      */ fields.cache_outcome ?? "",
    /* 10 payload_hash_prefix*/ (fields.payload_hash_prefix ?? "").slice(0, 8),
    /* 11 docs_audience      */ fields.docs_audience ?? "",
    /* 12 docs_top_uri       */ fields.docs_top_uri ?? "",
  ];

  const doubles: number[] = [
    /* 1  count              */ 1,
    /* 2  duration_ms        */ fields.duration_ms ?? 0,
    /* 3  bytes_in           */ fields.bytes_in ?? 0,
    /* 4  bytes_out          */ fields.bytes_out ?? 0,
    /* 5  sources_count      */ fields.sources_count ?? 0,
    /* 6  fonts_count        */ fields.fonts_count ?? 0,
    /* 7  figures_count      */ fields.figures_count ?? 0,
    /* 8  passes_completed   */ fields.passes_completed ?? 0,
    /* 9  overfull_count     */ fields.overfull_count ?? 0,
    /* 10 pages_count        */ fields.pages_count ?? 0,
  ];

  env.PTXPRINT_TELEMETRY.writeDataPoint({
    blobs,
    doubles,
    indexes: [fields.consumer_label ?? "unknown"],
  });
}

// ────────────────────────────────────────────────────────────
//  6.1 — Consumer Resolution
// ────────────────────────────────────────────────────────────

/**
 * Resolve consumer label from request context.
 *
 * Priority per spec §6.1 and governance article §Consumer Identification:
 *   1. ?consumer= query parameter  → source: "query"
 *   2. x-ptxprint-client header    → source: "header"
 *   3. MCP clientInfo.name         → source: "client_info"
 *   4. User-Agent header           → source: "user_agent"
 *   5. "unknown"                   → source: "unknown"
 */
export function resolveConsumer(
  url: URL,
  headers: Headers,
  clientInfoName?: string,
): ConsumerInfo {
  const queryConsumer = url.searchParams.get("consumer");
  if (queryConsumer) {
    return { label: queryConsumer, source: "query" };
  }

  const headerClient = headers.get("x-ptxprint-client");
  if (headerClient) {
    return { label: headerClient, source: "header" };
  }

  if (clientInfoName) {
    return { label: clientInfoName, source: "client_info" };
  }

  const userAgent = headers.get("user-agent");
  if (userAgent) {
    return { label: userAgent, source: "user_agent" };
  }

  return { label: "unknown", source: "unknown" };
}

// ────────────────────────────────────────────────────────────
//  6.2 — Redactor
// ────────────────────────────────────────────────────────────

/**
 * The 10 prohibited fields — the privacy floor.
 * Any envelope containing these is rejected BEFORE writeDataPoint is called.
 */
export const PROHIBITED_FIELDS = [
  "project_id",
  "config_name",
  "book_codes",
  "source_url",
  "font_url",
  "figure_url",
  "payload_full",
  "usfm_bytes",
  "log_content",
  "pdf_bytes",
] as const;

/**
 * Strict zod schema for the /internal/telemetry envelope.
 * .strict() enforces additionalProperties: false — any extra key rejects.
 */
const TelemetryEnvelopeSchema = z
  .object({
    event_type: z.enum(["job_phase", "job_terminal"]),
    job_id: z.string().optional(),
    consumer_label: z.string().optional(),
    phase: z.string().optional(),
    failure_mode: z.string().optional(),
    payload_hash_prefix: z.string().optional(),
    duration_ms: z.number().optional(),
    passes_completed: z.number().optional(),
    overfull_count: z.number().optional(),
    pages_count: z.number().optional(),
    bytes_out: z.number().optional(),
  })
  .strict();

export type TelemetryEnvelope = z.infer<typeof TelemetryEnvelopeSchema>;

/**
 * Validate and redact a Container-forwarded telemetry envelope.
 *
 * 1. Explicitly checks for each of the 10 prohibited fields (clear error message).
 * 2. Validates against the strict zod schema (rejects unknown keys).
 * 3. Truncates payload_hash_prefix to 8 hex chars (defense in depth).
 */
export function redactAndValidate(
  raw: unknown,
): { ok: true; envelope: TelemetryEnvelope } | { ok: false; error: string } {
  // Step 1: Explicit prohibited-field check (before schema validation)
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    for (const field of PROHIBITED_FIELDS) {
      if (field in obj) {
        return { ok: false, error: `prohibited field: ${field}` };
      }
    }
  }

  // Step 2: Strict schema validation
  const parsed = TelemetryEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: `validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    };
  }

  // Step 3: Defense-in-depth truncation
  const envelope = { ...parsed.data };
  if (envelope.payload_hash_prefix) {
    envelope.payload_hash_prefix = envelope.payload_hash_prefix.slice(0, 8);
  }

  return { ok: true, envelope };
}

// ────────────────────────────────────────────────────────────
//  6.3 — Policy Fetcher (three-tier fallback)
// ────────────────────────────────────────────────────────────

/**
 * Resolve the telemetry governance policy through the three-tier chain:
 *   1. knowledge_base — live fetch from GitHub raw
 *   2. bundled — deploy-time constant (pass as param for testability)
 *   3. minimal — static string with non-negotiables
 *
 * @param bundledPolicy  The BUNDLED_POLICY constant (null/undefined to skip tier 2)
 */
export async function resolveTelemetryPolicy(
  bundledPolicy?: string | null,
): Promise<{ policy: string; source: GovernanceSource }> {
  // Tier 1: knowledge_base — live fetch with edge caching
  try {
    const res = await fetch(POLICY_RAW_URL, {
      cf: { cacheTtl: 300, cacheEverything: true },
    } as RequestInit);
    if (res.ok) {
      const text = await res.text();
      if (text.includes(POLICY_SANITY_CHECK)) {
        return { policy: text, source: "knowledge_base" };
      }
    }
  } catch {
    // fall through to bundled
  }

  // Tier 2: bundled — deploy-time constant
  if (bundledPolicy) {
    return { policy: bundledPolicy, source: "bundled" };
  }

  // Tier 3: minimal — static string
  return { policy: MINIMAL_POLICY, source: "minimal" };
}

// ────────────────────────────────────────────────────────────
//  6.4 — Public Query Forwarder
// ────────────────────────────────────────────────────────────

/**
 * In-memory sliding-window rate limiter.
 *
 * KISS choice: at expected volume (sub-1000 queries/day), per-isolate
 * tracking provides sufficient protection for the 10K/day AE quota.
 * A future version could use KV for cross-isolate consistency if volume
 * justifies the added complexity.
 *
 * Deviation from spec §3 task description ("DO matches v1.2 patterns;
 * KV is simpler"): in-memory is simpler than both. Documented in PR
 * description as a v1.4 candidate if cross-isolate consistency is needed.
 */
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

export function rateLimitExceeded(
  consumerLabel: string,
  limitPerHour: number,
): boolean {
  const now = Date.now();
  const hourMs = 3_600_000;
  const entry = rateLimitMap.get(consumerLabel);

  if (!entry || now - entry.windowStart > hourMs) {
    // New window
    rateLimitMap.set(consumerLabel, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  return entry.count > limitPerHour;
}

/** Reset the rate limiter. Exported for tests only. */
export function resetRateLimiter(): void {
  rateLimitMap.clear();
}

/**
 * Validate that a SQL query targets ONLY the ptxprint_telemetry dataset.
 *
 * 1. Strip comments and string literals (prevent smuggling via literals).
 * 2. Extract all FROM/JOIN targets.
 * 3. Require at least one target and all targets must be ptxprint_telemetry.
 */
export function validateDatasetAllowlist(sql: string): boolean {
  const stripped = sql
    .replace(/--[^\n]*/g, " ") // line comments
    .replace(/\/\*[\s\S]*?\*\//g, " ") // block comments
    .replace(/'(?:''|[^'])*'/g, "''") // string literals
    .toLowerCase();

  const datasetRefs = [
    ...stripped.matchAll(
      /\b(?:from|join)\s+([a-z_][a-z0-9_]*(?:\s*,\s*[a-z_][a-z0-9_]*)*)/g,
    ),
  ].flatMap((m) => m[1].split(/\s*,\s*/));

  return (
    datasetRefs.length > 0 &&
    datasetRefs.every((name) => name === "ptxprint_telemetry")
  );
}

function sanitizedError(message: string): TelemetryQueryResult {
  return { error: message };
}

/**
 * Forward a SQL query to the Analytics Engine SQL API.
 *
 * Three guards per spec §6.4:
 *   1. Dataset allowlist — only ptxprint_telemetry
 *   2. Rate limit — per-consumer, default 60/hr
 *   3. Error sanitization — never expose raw AE errors
 */
export async function forwardTelemetryQuery(
  env: TelemetryEnv,
  sql: string,
  consumerLabel: string,
): Promise<TelemetryQueryResult> {
  // Guard 1: dataset allowlist
  if (!validateDatasetAllowlist(sql)) {
    return sanitizedError(
      "Query must reference only dataset ptxprint_telemetry",
    );
  }

  // Guard 2: rate limit
  const parsedLimit = parseInt(
    env.TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR ?? "60",
    10,
  );
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 60;
  if (rateLimitExceeded(consumerLabel, limit)) {
    return sanitizedError("Query rate limit exceeded; retry later");
  }

  // Env check
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
    return sanitizedError("Telemetry query service not configured");
  }

  // Forward to Analytics Engine SQL API with error sanitization (Guard 3)
  try {
    const res = await fetch(
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
    if (!res.ok) return sanitizedError("Query execution failed");
    const data = (await res.json()) as { data?: unknown[] };
    return {
      rows: data.data ?? [],
      row_count: (data.data ?? []).length,
      query: sql,
      executed_at: new Date().toISOString(),
    };
  } catch {
    // Guard 3: never forward raw Analytics Engine errors
    return sanitizedError("Query execution failed");
  }
}

// ────────────────────────────────────────────────────────────
//  JSON-RPC Parser (for telemetry hooks)
// ────────────────────────────────────────────────────────────

/**
 * Best-effort parse of a JSON-RPC request body.
 * Returns null on any parse failure — telemetry is never on the critical path.
 */
export function tryParseJsonRpc(body: string): ParsedRpc | null {
  try {
    const parsed = JSON.parse(body) as {
      id?: string | number | null;
      method?: string;
      params?: { name?: string; arguments?: Record<string, unknown> };
    };
    if (!parsed.method) return null;
    return {
      id: parsed.id ?? null,
      method: parsed.method,
      toolName:
        parsed.method === "tools/call" ? (parsed.params?.name ?? "") : "",
      params:
        parsed.method === "tools/call"
          ? (parsed.params?.arguments ?? {})
          : (parsed.params as Record<string, unknown>) ?? {},
    };
  } catch {
    return null;
  }
}
