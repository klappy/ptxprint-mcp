---
title: "PR #30 Fresh-Session Validation Ledger"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "ledger", "pr-30", "telemetry", "v1.3", "fresh-session", "dolcheo"]
date: 2026-04-30
reviewer: "Fresh-session managed agent (Claude, independent validator)"
reviews: "PR #30 — feat(v1.3): Worker telemetry surface"
status: complete
---

# PR #30 Fresh-Session Validation Ledger

DOLCHEO+H encoding of findings from the independent validation of PR #30.
Companion to: `canon/handoffs/pr-30-fresh-validator-review.md`

---

## Decisions

**[D] SAFE TO MERGE verdict**
PR #30 is SAFE TO MERGE — 0 blockers, 5 nits, 0 privacy floor violations. All 43 tests pass. TypeScript compiles clean. DoD #4 (privacy floor) passes with full coverage of all 10 prohibited fields.

---

## Observations (Closed)

**[O] DoD #4 Privacy Floor — PASS**
All 10 prohibited fields (project_id, config_name, book_codes, source_url, font_url, figure_url, payload_full, usfm_bytes, log_content, pdf_bytes) are in PROHIBITED_FIELDS const at `src/telemetry.ts:245`. `redactAndValidate` explicitly checks prohibited fields BEFORE zod schema validation. Route handler gates on `result.ok` before any `writeTelemetry` call. 10 individual tests + 1 combined mock-not-called test all pass.
Evidence: `test/telemetry.test.ts` lines 37–145, `src/telemetry.ts` lines 245–316, `src/index.ts` lines 530–534.

**[O] DoD #5 Three-Tier Fallback — PASS**
`resolveTelemetryPolicy` implements knowledge_base → bundled → minimal order. Sanity check on GitHub response (`"# Telemetry Governance"`). 7 tests cover all failure modes including null/empty bundled. `src/bundled-policy.ts` is a real generated file with full governance content from `scripts/bundle-telemetry-policy.ts`.
Evidence: `src/telemetry.ts` lines 330–355, `test/telemetry.test.ts` lines 154–224.

**[O] DoD #6 Self-Report Headers — PASS**
`resolveConsumer` implements correct priority: `?consumer=` → `x-ptxprint-client` header → `clientInfo.name` → `User-Agent` → `"unknown"`. 7 tests verify all priority cases including query-over-header priority.
Evidence: `src/telemetry.ts` lines 210–235, `test/telemetry.test.ts` lines 378–456.

**[O] DoD #7 Rate Limit — PASS**
`rateLimitExceeded` returns `false` for calls 1–60 and `true` for call 61. Per-consumer independence verified. Sanitized error `"Query rate limit exceeded; retry later"` confirmed via `forwardTelemetryQuery`.
Evidence: `src/telemetry.ts` lines 373–396, `test/telemetry.test.ts` lines 232–285.

**[O] Dataset Allowlist Guard — PASS**
`validateDatasetAllowlist` strips line comments, block comments, and string literals before FROM/JOIN regex matching. Handles comma-separated tables (commit 835623f). 9 tests covering UNION, comment, string literal, and comma-table smuggling attacks all pass.
Evidence: `src/telemetry.ts` lines 405–422, `test/telemetry.test.ts` lines 292–369.

**[O] Spec-lock Compliance — PASS**
`git diff main...pr-30 -- canon/` produces no output. Zero changes to any file under `canon/`. Spec-lock principle fully observed.

**[O] TypeScript Compilation — PASS**
`npx tsc --noEmit` produces zero output (zero errors) against all modified and new files in the PR.

**[O] Container credentials clean — PASS**
`grep -n "CF_API_TOKEN\|CF_ACCOUNT_ID" container/main.py` returns no matches. Container holds no Analytics Engine credentials, consistent with spec §5 routing constraint.

---

## Learnings

**[L] redactAndValidate two-step defense works**
Explicit prohibited-field check before zod validation yields clearer error messages ("prohibited field: X" rather than zod's generic "Unrecognized key"). This is correct: the privacy floor deserves explicit, readable error messages. The two-step pattern (explicit check + schema) is a good model for future privacy-sensitive validators.

**[L] validateDatasetAllowlist comma-table fix is non-obvious**
The regex at `src/telemetry.ts:413` handles `FROM t1, t2` via a capture group with optional comma-separated names, then splits on comma. Without the 835623f fix, `FROM ptxprint_telemetry, secret_dataset` would only capture the first name. The fix is elegant but worth a comment explaining why the regex includes the comma-separated group.

---

## Constraints (Boundary Notes)

**[C] In-memory rate limiter (Deviation 1)**
The `telemetry_public` tool uses `this.ctx.id.toString()` as the rate-limit key inside `McpAgent`, not the consumer label. This is per-DO-session rate limiting. Must NOT be changed to block the PR. Acceptable for v1.3 at expected volume. v1.4 candidate: consider per-consumer KV-backed limiting if cross-session consistency becomes necessary.

**[C] Consumer label inaccessible in McpAgent tool handlers (Deviation 2)**
The `McpAgent` Durable Object does not expose HTTP request headers to tool handler functions. The MCP telemetry writes in `handleMcpWithTelemetry` (outer Worker scope) correctly use real consumer labels. Tool handlers cannot independently resolve consumer identity. This is a platform constraint, not a code choice. Must NOT be held against the PR.

**[C] /internal/telemetry publicly reachable (Deviation 3)**
The `/internal/telemetry` route has no origin enforcement. Spec §5 says "service-binding only, not externally reach." The privacy floor is NOT affected — the redactor enforces all 10 prohibited fields regardless of caller origin. The risk is data pollution (fake valid envelopes polluting analytics), which is the same risk as `/internal/job-update`. Acceptable for v1.3. v1.4 candidate: shared-secret header check or service-binding enforcement when CF Container-to-Worker moves to true service binding.

---

## Handoff

**[H] Nits for next session to address (if desired)**

1. **Per-field DoD #4 mock-not-called coverage** (`test/telemetry.test.ts` lines 81–101): Individual per-field tests call `writeTelemetry(mockEnv, "job_phase", {})` and then clear the mock rather than asserting the mock was not called for the prohibited-field path. The combined test at line 61 provides the definitive proof. Per-field tests could be tightened by removing the mock-call bookkeeping and instead asserting `mockWriteDataPoint` is not called.

2. **Leaderboard completeness scoring**: The governance article §"Completeness Scoring" defines badge tiers (Open Ledger ≥ 90%, etc.). No scoring computation exists in this PR. Consumer labels are captured correctly. Badge assignment is a v1.4 enhancement.

3. **Comment on /internal/telemetry reachability**: `src/index.ts` line 515–521 has a good comment but could be clearer that the route IS externally reachable (not just "lacks service-binding enforcement") to avoid misleading future readers of the spec diagram.

4. **Comment on telemetry_public rate-limit key**: `src/index.ts` line 448. The comment explains this correctly. Could mention it diverges from the spec's "per-consumer-label" wording.

---

## Opens

**[O-open] NIT-1: Per-field mock-not-called coverage gap**
Individual DoD #4 per-field tests don't assert `mockWriteDataPoint` is never called for the prohibited-field path. Combined test covers this. Tightenable but not blocking.

**[O-open] NIT-2: Leaderboard badge scoring absent**
Completeness scoring per governance §"Completeness Scoring" is not implemented. Consumer data correctly captured for SQL-query-based leaderboard. Badge computation is future work.

**[O-open] NIT-3: /internal/telemetry comment could be clearer**
Route IS externally reachable (not service-binding–only). Comment at lines 515–521 explains deviation but could be clearer about the actual exposure.

**[O-open] NIT-4: Rate-limit key comment could note spec divergence**
`this.ctx.id.toString()` at index.ts:448 diverges from spec's per-consumer-label wording. Comment partially explains but could explicitly note the spec's intent.

**[O-open] NIT-5: validateDatasetAllowlist comma-group regex comment**
The regex at `src/telemetry.ts:413` handles comma-separated FROM tables via a capture group. A comment explaining this (especially given the 835623f fix history) would help future readers understand why the regex is non-trivial.

---

*Ledger completed by fresh-session managed agent (Claude), 2026-04-30.*
*Companion: `canon/handoffs/pr-30-fresh-validator-review.md`*
