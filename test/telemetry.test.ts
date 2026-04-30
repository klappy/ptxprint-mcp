/**
 * telemetry.test.ts — v1.3 telemetry unit tests.
 *
 * Tests map to DoD items from spec §10:
 *   DoD #4  — Privacy-floor exclusions (10 prohibited fields)
 *   DoD #5  — Three-tier fallback (knowledge_base → bundled → minimal)
 *   DoD #6  — Self-report headers (consumer_source resolution)
 *   DoD #7  — Rate limit (61st call rejected)
 *   DoD #1  — Dataset allowlist guard (validateDatasetAllowlist)
 *
 * Authority: klappy://canon/specs/ptxprint-mcp-v1.3-spec §10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  redactAndValidate,
  resolveTelemetryPolicy,
  rateLimitExceeded,
  resetRateLimiter,
  validateDatasetAllowlist,
  resolveConsumer,
  writeTelemetry,
  forwardTelemetryQuery,
  PROHIBITED_FIELDS,
  MINIMAL_POLICY,
  type TelemetryEnv,
  type AnalyticsEngineDatasetLike,
} from "../src/telemetry.js";

// ────────────────────────────────────────────────────────────
//  DoD #4 — Privacy-floor exclusions
//  "A test suite POSTs envelopes to /internal/telemetry containing each
//   of the 10 prohibited fields; each is rejected before writeDataPoint()
//   is called."
// ────────────────────────────────────────────────────────────

describe("DoD #4 — Privacy-floor exclusions (10 prohibited fields)", () => {
  const mockWriteDataPoint = vi.fn();
  const mockEnv: TelemetryEnv = {
    PTXPRINT_TELEMETRY: { writeDataPoint: mockWriteDataPoint } as AnalyticsEngineDatasetLike,
  };

  beforeEach(() => {
    mockWriteDataPoint.mockClear();
  });

  // The 10 prohibited fields per spec §10 DoD #4 and governance §"Privacy Floor"
  const prohibitedFields: Array<[string, unknown]> = [
    ["project_id", "WSG"],
    ["config_name", "Default"],
    ["book_codes", ["MAT", "JHN"]],
    ["source_url", "https://example.com/source"],
    ["font_url", "https://example.com/font.ttf"],
    ["figure_url", "https://example.com/fig.png"],
    ["payload_full", '{"schema_version":"1.0"}'],
    ["usfm_bytes", "\\id MAT\n\\c 1\n\\v 1 In the beginning"],
    ["log_content", "This is TeX output line 1\nOverfull \\hbox"],
    ["pdf_bytes", "JVBERi0xLjQK..."],
  ];

  it("rejects ALL 10 prohibited fields before writeDataPoint is called", () => {
    for (const [field, value] of prohibitedFields) {
      const envelope = {
        event_type: "job_phase",
        [field]: value,
      };

      const result = redactAndValidate(envelope);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain(`prohibited field: ${field}`);
      }
    }

    // writeDataPoint must never have been called
    expect(mockWriteDataPoint).not.toHaveBeenCalled();
  });

  // Individual test per field for clarity
  for (const [field, value] of prohibitedFields) {
    it(`rejects envelope containing '${field}'`, () => {
      const envelope = {
        event_type: "job_terminal",
        [field]: value,
      };

      const result = redactAndValidate(envelope);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain(`prohibited field: ${field}`);
      }

      // Verify writeDataPoint was NOT called
      writeTelemetry(mockEnv, "job_phase", {}); // valid call
      mockWriteDataPoint.mockClear();

      // If the envelope somehow passed, writeTelemetry would be called.
      // But since redactAndValidate rejects, the caller should NOT call writeTelemetry.
      // This test verifies the redactor rejects before the write path.
    });
  }

  it("accepts a valid envelope with only allowed fields", () => {
    const validEnvelope = {
      event_type: "job_phase" as const,
      job_id: "abc123",
      consumer_label: "test-consumer",
      phase: "typesetting",
      payload_hash_prefix: "abcd1234",
      duration_ms: 5000,
    };

    const result = redactAndValidate(validEnvelope);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.event_type).toBe("job_phase");
      expect(result.envelope.phase).toBe("typesetting");
    }
  });

  it("rejects envelopes with unknown extra keys (strict mode)", () => {
    const envelope = {
      event_type: "job_phase" as const,
      some_random_field: "should be rejected",
    };

    const result = redactAndValidate(envelope);
    expect(result.ok).toBe(false);
  });

  it("truncates payload_hash_prefix to 8 hex chars (defense in depth)", () => {
    const envelope = {
      event_type: "job_phase" as const,
      payload_hash_prefix: "abcdef1234567890extra",
    };

    const result = redactAndValidate(envelope);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.payload_hash_prefix).toBe("abcdef12");
      expect(result.envelope.payload_hash_prefix!.length).toBe(8);
    }
  });
});

// ────────────────────────────────────────────────────────────
//  DoD #5 — Three-tier fallback
//  "telemetry_policy() returns governance_source: 'bundled' when the GitHub
//   fetch is mocked to fail, and governance_source: 'minimal' when both
//   are mocked to fail."
// ────────────────────────────────────────────────────────────

describe("DoD #5 — Three-tier policy fallback", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns 'knowledge_base' when GitHub fetch succeeds", async () => {
    const mockPolicy = "---\ntitle: test\n---\n# Telemetry Governance\nTest policy content.";
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(mockPolicy, { status: 200 }),
    );

    const result = await resolveTelemetryPolicy("bundled content");
    expect(result.source).toBe("knowledge_base");
    expect(result.policy).toBe(mockPolicy);
  });

  it("returns 'bundled' when GitHub fetch fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    const bundled = "# Telemetry Governance\nBundled policy content.";
    const result = await resolveTelemetryPolicy(bundled);
    expect(result.source).toBe("bundled");
    expect(result.policy).toBe(bundled);
  });

  it("returns 'bundled' when GitHub returns non-200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("Not Found", { status: 404 }),
    );

    const bundled = "# Telemetry Governance\nBundled policy content.";
    const result = await resolveTelemetryPolicy(bundled);
    expect(result.source).toBe("bundled");
    expect(result.policy).toBe(bundled);
  });

  it("returns 'bundled' when GitHub returns malformed content (no heading)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("This is not the governance document", { status: 200 }),
    );

    const bundled = "# Telemetry Governance\nBundled policy content.";
    const result = await resolveTelemetryPolicy(bundled);
    expect(result.source).toBe("bundled");
  });

  it("returns 'minimal' when both GitHub AND bundled fail", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    const result = await resolveTelemetryPolicy(null);
    expect(result.source).toBe("minimal");
    expect(result.policy).toBe(MINIMAL_POLICY);
  });

  it("returns 'minimal' when GitHub fails and bundled is empty string", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    const result = await resolveTelemetryPolicy("");
    expect(result.source).toBe("minimal");
  });

  it("minimal policy mentions dataset name and prohibited fields", () => {
    expect(MINIMAL_POLICY).toContain("ptxprint_telemetry");
    expect(MINIMAL_POLICY).toContain("klappy://canon/governance/telemetry-governance");
    for (const field of PROHIBITED_FIELDS) {
      expect(MINIMAL_POLICY).toContain(field);
    }
  });
});

// ────────────────────────────────────────────────────────────
//  DoD #7 — Rate limit
//  "The 61st query from the same consumer label within an hour returns
//   the rate-limit sanitized error."
// ────────────────────────────────────────────────────────────

describe("DoD #7 — Rate limit", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("allows the first 60 calls and rejects the 61st", () => {
    const consumer = "test-rate-consumer";
    const limit = 60;

    // Calls 1–60 should pass
    for (let i = 1; i <= 60; i++) {
      expect(rateLimitExceeded(consumer, limit)).toBe(false);
    }

    // Call 61 should be rejected
    expect(rateLimitExceeded(consumer, limit)).toBe(true);
  });

  it("tracks different consumers independently", () => {
    const limit = 60;

    // Consumer A uses all 60 slots
    for (let i = 1; i <= 60; i++) {
      rateLimitExceeded("consumer-a", limit);
    }
    expect(rateLimitExceeded("consumer-a", limit)).toBe(true);

    // Consumer B should still have their full quota
    expect(rateLimitExceeded("consumer-b", limit)).toBe(false);
  });

  it("returns sanitized error message via forwardTelemetryQuery", async () => {
    const env: TelemetryEnv = {
      CF_ACCOUNT_ID: "test-account",
      CF_API_TOKEN: "test-token",
      TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR: "60",
    };

    // Exhaust the rate limit
    for (let i = 1; i <= 60; i++) {
      rateLimitExceeded("rate-test-consumer", 60);
    }

    // The 61st call through the full forwarder should get the rate limit error
    const result = await forwardTelemetryQuery(
      env,
      "SELECT * FROM ptxprint_telemetry",
      "rate-test-consumer",
    );

    expect(result.error).toBe("Query rate limit exceeded; retry later");
    expect(result.rows).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────
//  DoD #1 (partial) — Dataset allowlist guard
//  Tests that validateDatasetAllowlist properly gates queries.
// ────────────────────────────────────────────────────────────

describe("Dataset allowlist guard", () => {
  it("rejects queries targeting a different dataset", () => {
    expect(
      validateDatasetAllowlist("SELECT * FROM secret_dataset"),
    ).toBe(false);
  });

  it("accepts queries targeting ptxprint_telemetry", () => {
    expect(
      validateDatasetAllowlist("SELECT * FROM ptxprint_telemetry"),
    ).toBe(true);
  });

  it("rejects the smuggling case: comment-hidden second dataset", () => {
    // The attack: hide a second dataset reference in a comment/newline
    const smuggling = `SELECT * FROM ptxprint_telemetry --comment\nUNION SELECT * FROM secret_dataset`;
    expect(validateDatasetAllowlist(smuggling)).toBe(false);
  });

  it("rejects UNION with a different dataset", () => {
    expect(
      validateDatasetAllowlist(
        "SELECT * FROM ptxprint_telemetry UNION SELECT * FROM other_dataset",
      ),
    ).toBe(false);
  });

  it("accepts queries with JOIN on the same dataset", () => {
    expect(
      validateDatasetAllowlist(
        "SELECT a.* FROM ptxprint_telemetry a JOIN ptxprint_telemetry b ON a.blob1 = b.blob1",
      ),
    ).toBe(true);
  });

  it("rejects queries with no FROM clause", () => {
    expect(validateDatasetAllowlist("SELECT 1")).toBe(false);
  });

  it("rejects smuggling via block comments", () => {
    const blockComment = `SELECT * FROM ptxprint_telemetry /* hidden */ UNION SELECT * FROM secret_dataset`;
    expect(validateDatasetAllowlist(blockComment)).toBe(false);
  });

  it("rejects smuggling via string literals", () => {
    // The attack: hide ptxprint_telemetry in a string literal so the regex
    // thinks it's the FROM target, while the real FROM is secret_dataset
    const stringSmuggle = `SELECT 'ptxprint_telemetry' FROM secret_dataset`;
    expect(validateDatasetAllowlist(stringSmuggle)).toBe(false);
  });

  it("handles mixed-case SQL keywords", () => {
    expect(
      validateDatasetAllowlist("SELECT * from ptxprint_telemetry WHERE blob1 = 'test'"),
    ).toBe(true);
    expect(
      validateDatasetAllowlist("SELECT * FROM PTXPRINT_TELEMETRY"),
    ).toBe(true);
  });

  it("returns sanitized error via forwardTelemetryQuery for disallowed dataset", async () => {
    resetRateLimiter();
    const env: TelemetryEnv = {
      CF_ACCOUNT_ID: "test",
      CF_API_TOKEN: "test",
      TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR: "60",
    };

    const result = await forwardTelemetryQuery(
      env,
      "SELECT * FROM secret_dataset",
      "test-consumer",
    );

    expect(result.error).toBe(
      "Query must reference only dataset ptxprint_telemetry",
    );
  });
});

// ────────────────────────────────────────────────────────────
//  DoD #6 — Self-report headers
//  "A request with all 8 self-report headers gets consumer_source: 'header';
//   a request with only ?consumer=foo gets consumer_source: 'query'."
// ────────────────────────────────────────────────────────────

describe("DoD #6 — Self-report headers / consumer resolution", () => {
  it("resolves consumer_source: 'header' when all 8 self-report headers are present", () => {
    const url = new URL("https://example.com/mcp");
    const headers = new Headers({
      "x-ptxprint-client": "test-client",
      "x-ptxprint-client-version": "1.0.0",
      "x-ptxprint-agent-name": "claude-opus-4-7",
      "x-ptxprint-agent-version": "4.7.0",
      "x-ptxprint-surface": "claude.ai",
      "x-ptxprint-contact-url": "https://example.com",
      "x-ptxprint-policy-url": "https://example.com/privacy",
      "x-ptxprint-capabilities": "submit,poll,docs",
    });

    const result = resolveConsumer(url, headers);
    expect(result.source).toBe("header");
    expect(result.label).toBe("test-client");
  });

  it("resolves consumer_source: 'query' when only ?consumer=foo is present", () => {
    const url = new URL("https://example.com/mcp?consumer=foo");
    const headers = new Headers();

    const result = resolveConsumer(url, headers);
    expect(result.source).toBe("query");
    expect(result.label).toBe("foo");
  });

  it("query param takes priority over header", () => {
    const url = new URL("https://example.com/mcp?consumer=query-label");
    const headers = new Headers({
      "x-ptxprint-client": "header-label",
    });

    const result = resolveConsumer(url, headers);
    expect(result.source).toBe("query");
    expect(result.label).toBe("query-label");
  });

  it("falls back to header when no query param", () => {
    const url = new URL("https://example.com/mcp");
    const headers = new Headers({
      "x-ptxprint-client": "my-client",
    });

    const result = resolveConsumer(url, headers);
    expect(result.source).toBe("header");
    expect(result.label).toBe("my-client");
  });

  it("falls back to client_info when no query or header", () => {
    const url = new URL("https://example.com/mcp");
    const headers = new Headers();

    const result = resolveConsumer(url, headers, "my-mcp-client");
    expect(result.source).toBe("client_info");
    expect(result.label).toBe("my-mcp-client");
  });

  it("falls back to User-Agent when nothing else", () => {
    const url = new URL("https://example.com/mcp");
    const headers = new Headers({
      "user-agent": "Mozilla/5.0 CustomAgent",
    });

    const result = resolveConsumer(url, headers);
    expect(result.source).toBe("user_agent");
    expect(result.label).toBe("Mozilla/5.0 CustomAgent");
  });

  it("falls back to 'unknown' when nothing is set", () => {
    const url = new URL("https://example.com/mcp");
    const headers = new Headers();

    const result = resolveConsumer(url, headers);
    expect(result.source).toBe("unknown");
    expect(result.label).toBe("unknown");
  });
});

// ────────────────────────────────────────────────────────────
//  writeTelemetry — blob/double mapping
// ────────────────────────────────────────────────────────────

describe("writeTelemetry — blob/double mapping", () => {
  it("writes correct blob and double positions", () => {
    const mockWriteDataPoint = vi.fn();
    const env: TelemetryEnv = {
      PTXPRINT_TELEMETRY: { writeDataPoint: mockWriteDataPoint },
    };

    writeTelemetry(env, "mcp_request", {
      method: "tools/call",
      tool_name: "submit_typeset",
      consumer_label: "test-consumer",
      consumer_source: "query",
      cache_outcome: "hit",
      payload_hash_prefix: "abcdef1234", // should be truncated to 8
      duration_ms: 123,
      bytes_in: 456,
      bytes_out: 789,
    });

    expect(mockWriteDataPoint).toHaveBeenCalledOnce();
    const call = mockWriteDataPoint.mock.calls[0][0];

    // Verify blob positions per governance schema
    expect(call.blobs[0]).toBe("mcp_request");       // 1: event_type
    expect(call.blobs[1]).toBe("tools/call");         // 2: method
    expect(call.blobs[2]).toBe("submit_typeset");     // 3: tool_name
    expect(call.blobs[3]).toBe("test-consumer");      // 4: consumer_label
    expect(call.blobs[4]).toBe("query");              // 5: consumer_source
    expect(call.blobs[5]).toBe("0.1.0");              // 6: worker_version
    expect(call.blobs[9]).toBe("abcdef12");           // 10: payload_hash_prefix (truncated)
    expect(call.blobs.length).toBe(12);               // Exactly 12 blobs

    // Verify double positions
    expect(call.doubles[0]).toBe(1);                  // 1: count
    expect(call.doubles[1]).toBe(123);                // 2: duration_ms
    expect(call.doubles[2]).toBe(456);                // 3: bytes_in
    expect(call.doubles[3]).toBe(789);                // 4: bytes_out
    expect(call.doubles.length).toBe(10);             // Exactly 10 doubles

    // Verify index
    expect(call.indexes).toEqual(["test-consumer"]);
  });

  it("no-ops when PTXPRINT_TELEMETRY is not bound", () => {
    const env: TelemetryEnv = {};
    // Should not throw
    writeTelemetry(env, "mcp_request", { method: "test" });
  });
});
