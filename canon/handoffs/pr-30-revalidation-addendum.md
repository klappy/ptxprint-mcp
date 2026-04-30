---
title: "PR #30 Re-Validation Addendum — Cursor Agent Fix Commits (3 commits)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "review", "revalidation", "telemetry", "pr-30", "cursor-fixes"]
date: 2026-04-30
companion_to: "canon/handoffs/pr-30-fresh-validator-review.md (PR #31, original validation at 835623f)"
status: complete
---

# PR #30 Re-Validation Addendum — Cursor Agent Fix Commits

## Independence Statement

This review is written by a **fresh re-validator session** (Claude, Anthropic) that did NOT author
PR #30, did NOT author the original validator review (PR #31), and has no access to the reasoning
of either prior session. All findings below are derived from direct code observation, test
execution, and spec comparison against `klappy://canon/specs/ptxprint-mcp-v1.3-spec` and
`klappy://canon/governance/telemetry-governance` as loaded from the ptxprint-mcp knowledge base.

---

## Scope

SHA range reviewed: **`835623f..7e03bdf`** (the 3 Cursor Agent fix commits applied after the
original validator signed off at `835623f`)

| Commit | Title |
|--------|-------|
| `418d547` | fix(telemetry): close dataset allowlist bypass via comma-separated FROM tables |
| `f27815c` | fix(telemetry): wire clientInfo.name to consumer resolution and drop unused TELEMETRY_VERIFIED_CLIENTS binding |
| `7e03bdf` | fix: harden telemetry rate-limit parse and hoist MCP handlers |

Original validator review: PR #31 (`review/pr-30-fresh-validator` branch)
This addendum: PR #XX (`review/pr-30-revalidation` branch — the branch you are reading this from)

---

## Test Run Output

```
> ptxprint-mcp@0.1.0 test
> vitest run

 RUN v4.1.5 /home/user/ptxprint-mcp

 ✓ test/telemetry.test.ts (43 tests) 48ms

 Test Files  1 passed (1)
       Tests  43 passed (43)
    Start at  17:59:21
    Duration  348ms
```

TypeScript check: `npx tsc --noEmit` — **clean, no errors**

Test count: **43** (same as original baseline; Cursor did not add regression tests — see NIT-1 below)

---

## Per-Fix Verdicts

### Fix 1 — `418d547`: Close dataset allowlist bypass via comma-separated FROM tables

**Verdict: PASS with NIT**

**What changed:**
`validateDatasetAllowlist()` in `src/telemetry.ts` changed its regex from:
```typescript
// OLD — captures only the first identifier after FROM/JOIN
/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/g
```
to:
```typescript
// NEW — captures the full comma-separated list, then splits
/\b(?:from|join)\s+([a-z_][a-z0-9_]*(?:\s*,\s*[a-z_][a-z0-9_]*)*)/g
```
plus a `.flatMap((m) => m[1].split(/\s*,\s*/))` to enumerate each table name.

**Bypass verified closed:** The old regex on `SELECT * FROM ptxprint_telemetry, secret_dataset`
extracted only `['ptxprint_telemetry']` — the comma terminated the capture. The attacker's
`secret_dataset` was never seen. The new regex extracts
`['ptxprint_telemetry', 'secret_dataset']`. Since `secret_dataset !== 'ptxprint_telemetry'`,
the query is rejected. **The bypass is correctly closed.**

**Clean case verified still passes:** `SELECT * FROM ptxprint_telemetry` extracts
`['ptxprint_telemetry']` → `every(n => n === 'ptxprint_telemetry')` → `true`. ✓

**Direct verification (executed inline):**
```
comma case refs: ["ptxprint_telemetry","secret_dataset"]
comma case result (all ptxprint_telemetry?): false   ← bypass BLOCKED ✓
clean case refs: ["ptxprint_telemetry"]
clean case result: true                              ← clean query PASSES ✓
```

**NIT-1 (test coverage gap):** The Cursor agent fixed the code but **did not add a regression
test** for the comma-separated FROM bypass. The 10 existing dataset-allowlist tests all pre-date
this fix commit (none contain a comma-FROM pattern). Recommend adding:
```typescript
it("rejects comma-separated FROM tables (bypass vector)", () => {
  expect(
    validateDatasetAllowlist(
      "SELECT * FROM ptxprint_telemetry, secret_dataset",
    ),
  ).toBe(false);
});
```
Without this test, the specific bypass attack vector has no automated regression protection.

---

### Fix 2 — `f27815c`: Wire clientInfo.name + drop TELEMETRY_VERIFIED_CLIENTS

**Verdict: PASS**

**clientInfo.name wiring:**
`src/index.ts` now extracts `clientInfo.name` from `initialize` requests:
```typescript
if (rpc?.method === "initialize") {
  const ci = (rpc.params as { clientInfo?: { name?: string } }).clientInfo;
  if (ci?.name) clientInfoName = ci.name;
}
const consumer = resolveConsumer(urlObj, req.headers, clientInfoName);
```
`resolveConsumer()` was updated to accept `clientInfoName?: string` as a third parameter and
checks it at priority 3 (after `?consumer=` query param and `x-ptxprint-client` header, before
`User-Agent`). This matches spec §6.1 exactly:
```
1. ?consumer= query parameter   → source: "query"
2. x-ptxprint-client header     → source: "header"
3. MCP clientInfo.name          → source: "client_info"   ← NEW
4. User-Agent header             → source: "user_agent"
5. "unknown"                    → source: "unknown"
```
The existing test `"falls back to client_info when no query or header"` in DoD #6 exercises this
path and passes. ✓

**TELEMETRY_VERIFIED_CLIENTS removal:**
Removed from: `Env` interface in `src/index.ts`, `TelemetryEnv` interface in `src/telemetry.ts`.
**This is NOT a spec deviation.** The spec §6.1 priority order (above) does not list
`TELEMETRY_VERIFIED_CLIENTS` as a consumer *resolution* source. The field was for
"weighted leaderboard scoring" — never for label resolution — and was declared in both
TypeScript interfaces without ever being read. Removing dead TypeScript declarations is correct.

**Residual references (by design):**
- `wrangler.jsonc` line 90: a comment noting it as an optional secret. Acceptable — it can still
  be set as a future-use secret. The governance article still documents it.
- `src/bundled-policy.ts`: contains the full governance article text (a string constant), which
  still mentions `TELEMETRY_VERIFIED_CLIENTS`. This is documentation inside a string, not a
  code binding.

Neither residual reference creates a runtime behavior dependency. Both are accurate documentation
of a future optional feature. **Not a blocker.**

---

### Fix 3 — `7e03bdf`: Harden rate-limit parse + hoist MCP handlers

**Verdict: PASS**

**Rate-limit parse hardening:**
```typescript
// OLD
const limit = parseInt(env.TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR ?? "60", 10);

// NEW
const parsedLimit = parseInt(env.TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR ?? "60", 10);
const limit = Number.isFinite(parsedLimit) ? parsedLimit : 60;
```
`parseInt("banana", 10)` → `NaN`; `Number.isFinite(NaN)` → `false` → default 60 applied. ✓
`parseInt("Infinity", 10)` → `NaN` → default 60. ✓
`parseInt("-1", 10)` → `-1`; `Number.isFinite(-1)` → `true` → limit = -1 (allows all; edge case,
  but not a security issue since rate limiting protects AE quota, not data). Acceptable.
Default spec value of 60 req/hr is preserved when env var is missing or malformed. ✓

**MCP handler hoisting:**
```typescript
// Module scope — created once at initialization
const mcpHandler = PtxprintMcp.serve("/mcp", { binding: "MCP_AGENT" });
const mcpSseHandler = PtxprintMcp.serveSSE("/sse", { binding: "MCP_AGENT" });
```
Previously these were allocated per-request inside `handleMcpWithTelemetry`. Since `basePath` and
`binding` were constants, every call produced identical handler objects. The hoisting is a
**no-op refactor** (no behavioral change) plus a minor allocation optimization. The commit comment
documents the rationale correctly. No risk of request-state cross-contamination at Cloudflare
Worker isolate granularity; each request runs within the same isolate's single-threaded event
loop. **No spec impact.**

---

## DoD #4 Privacy Floor — Re-Check

Focused review: the Cursor fixes touched consumer resolution (Fix 2) and rate-limit parse (Fix 3).
Neither path touches the redaction module.

**PROHIBITED_FIELDS constant — unchanged:**
```typescript
export const PROHIBITED_FIELDS = [
  "project_id", "config_name", "book_codes", "source_url", "font_url",
  "figure_url", "payload_full", "usfm_bytes", "log_content", "pdf_bytes",
] as const;
```
All 10 required prohibited fields per spec §10 DoD #4. Present and unmodified. ✓

**`redactAndValidate()` — unchanged by any of the 3 Cursor commits.** The diff between
`835623f..7e03bdf` shows zero changes to this function. ✓

**Privacy-floor tests — all 11 pass:**
- 1 bulk test asserting all 10 fields are rejected before `writeDataPoint`
- 10 individual field tests (one per prohibited field)
All 11 remain green. ✓

---

## Spec-Lock Compliance

`git diff 835623f..HEAD -- canon/` → **empty diff**

The `canon/` directory was **not touched** by any of the 3 Cursor commits. The spec-lock
requirement is satisfied. ✓

---

## Summary of Findings

| Finding | Severity | Fix Commit | Detail |
|---------|----------|------------|--------|
| No regression test for comma-FROM bypass | **NIT** | 418d547 | Fix 1 closes the bypass correctly but adds no test for `SELECT * FROM ptxprint_telemetry, secret_dataset`. The specific attack vector has no automated protection. |
| TELEMETRY_VERIFIED_CLIENTS in wrangler comment | **NIT** (informational) | f27815c | Residual comment-only reference is accurate documentation; no code binding. May confuse future readers. |

**Blockers: 0**
**NITs: 2 (1 notable, 1 informational)**

---

## Final Verdict

> **STILL SAFE TO MERGE**

All 3 Cursor fixes are functionally correct. The comma-FROM bypass is closed. The clientInfo.name
consumer resolution correctly implements spec §6.1 priority 3. The rate-limit parse hardening
correctly defends against malformed env vars. The MCP handler hoisting is a clean no-op
refactor. No canon was edited. All 43 tests pass with clean TypeScript.

The single notable NIT (missing regression test for comma-FROM bypass) does not block merge — the
fix is correct in code, and the existing UNION-based tests exercise the broader allowlist
machinery. A follow-up test addition is recommended but not required to land.

---

*Re-validator: Claude (fresh session, not the author or original validator session)*
*Date: 2026-04-30*
*Scope: 835623f..7e03bdf (3 Cursor Agent fix commits)*
*Original validation (PR #31) clean at 835623f — this addendum confirms the fixes do not regress it.*
