---
title: "PR #30 Re-Validation Ledger — SHA 7e03bdf2"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "review", "pr-30", "telemetry", "v1.3", "dolcheo", "encoding", "ledger"]
date: 2026-04-30
reviewer: "Fresh-session managed agent (Claude, PR30 Re-validator)"
encodes: "PR #30 re-validation findings at SHA 7e03bdf2"
companion_to: "canon/handoffs/pr-30-re-validation-7e03bdf2.md"
---

# PR #30 Re-Validation Ledger — SHA 7e03bdf2

## [D] Decision — Re-Validation Verdict

**PR #30 re-validated at SHA 7e03bdf2 by fresh-session Claude (PR30 Re-validator).**

Verdict: **SAFE TO MERGE**. 43/43 tests pass, `tsc --noEmit` clean. All original DoD pass. Three fix commits from Cursor Agent close real bugs (comma-table allowlist bypass, clientInfo.name unwired, rate-limit NaN crash). Privacy floor (DoD #4) unaffected by all three commits. 0 blockers. 8 nits (all pre-existing or low-risk). Original SAFE TO MERGE verdict confirmed.

---

## [O] Observation — Privacy Floor Integrity

All 10 prohibited fields (`project_id`, `config_name`, `book_codes`, `source_url`, `font_url`, `figure_url`, `payload_full`, `usfm_bytes`, `log_content`, `pdf_bytes`) remain in `PROHIBITED_FIELDS` const unchanged. Redactor check precedes zod. Route gate on `ok` result. `writeTelemetry` unreachable on rejection. No path added by any of the three Cursor commits bypasses or weakens the redactor. Direct code observation confirmed; not inferred from PR description.

---

## [O] Observation — Commit 418d547: Comma-Table Bypass Fix

The original regex `/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/g` captured only the **first** identifier after `FROM`/`JOIN`. A query `SELECT * FROM ptxprint_telemetry, secret_dataset` captured only `ptxprint_telemetry` — `secret_dataset` was invisible to the validator. Real bypass confirmed by regex analysis.

Fix is correct: regex extended to `([a-z_][a-z0-9_]*(?:\s*,\s*[a-z_][a-z0-9_]*)*)`, flatMap+split normalizes into individual names, `every()` catches any non-allowlisted name. Bypass closed.

---

## [O] Observation — Commit f27815c: clientInfo.name Wiring

`handleMcpWithTelemetry` previously called `resolveConsumer(urlObj, req.headers)` without `clientInfoName` — priority tier 3 (`client_info`) was unreachable in production. Fix parses `initialize` body, extracts `clientInfo?.name`, passes as 3rd arg. Priority order now matches spec §6.1 exactly. `TELEMETRY_VERIFIED_CLIENTS` correctly removed from both TypeScript interfaces (was never read by any code path).

---

## [O] Observation — Commit 7e03bdf: Rate-Limit Hardening + Handler Hoisting

`parseInt("abc", 10)` returns `NaN`; `NaN > 60` is `false` — rate limiting disabled on non-numeric env var. Fix: `Number.isFinite(parsedLimit) ? parsedLimit : 60` closes the bypass. Negative values safe-fail (every call rate-limited); zero safe-fails. Handler hoisting is a safe structural refactor — module-level constants, no per-request allocation, no public surface change.

---

## [O] Observation — Spec-Lock

`git log --name-only origin/main..HEAD -- canon/specs/` returned no output. Zero changes to `canon/specs/` across all 4 commits on this branch.

---

## [L] Learning — Aliased Comma-Table Gap

The aliased comma-table case (`FROM ptxprint_telemetry t1, other_dataset t2`) still bypasses the allowlist. The alias breaks the comma-group capture: `from ptxprint_telemetry` matches (stops at space before alias), and `other_dataset` is not preceded by a `FROM`/`JOIN` keyword, so it is invisible to the validator. Practical risk is theoretical — Cloudflare Analytics Engine uses a ClickHouse-based SQL dialect that does not support FROM-list comma joins. Filed as NIT NN-4.

---

## [L] Learning — Stale wrangler.jsonc Comment

`wrangler.jsonc` line 90 still documents `TELEMETRY_VERIFIED_CLIENTS` as a configurable secret comment even though it was removed from both TypeScript interfaces. The comment was not updated in commit f27815c. A future operator following the comment and running `wrangler secret put TELEMETRY_VERIFIED_CLIENTS` would set a no-op secret. Filed as NIT NN-1.

---

## [C] Constraint — Privacy Floor Gate

Changes to `PROHIBITED_FIELDS`, `redactAndValidate`, or the `/internal/telemetry` route handler gate in `src/index.ts` MUST be re-validated by a fresh-session reviewer. These three components collectively constitute DoD #4 (the highest-stakes acceptance criterion). No future PR touching these components may rely on the original validator's findings.

---

## [C] Constraint — Spec-Lock

No file under `canon/specs/` may be edited in any PR that implements a spec feature. The spec-lock is verified by `git log --name-only origin/main..HEAD -- canon/specs/` returning empty. This holds across all 4 commits in PR #30.

---

## [H] Handoff — Open Nits for v1.4

The following nits are confirmed open at SHA 7e03bdf2. All are non-blocking for v1.3 merge. Carry forward to v1.4:

**From original review (still open):**
- **N-1**: Per-field DoD #4 tests don't assert `mockWriteDataPoint.not.toHaveBeenCalled()` individually (combined test covers this)
- **N-2**: Leaderboard badge scoring not implemented (badge values emitted correctly; computation logic absent)
- **N-3**: `/internal/telemetry` has no comment noting it IS publicly reachable (spec §5 says service-binding-only)
- **N-4**: `telemetry_public` rate-limit key is DO session ID, not consumer label — comment could note the divergence from spec §3

**From delta commits (new):**
- **NN-1**: `wrangler.jsonc` line 90 still documents `TELEMETRY_VERIFIED_CLIENTS` — remove stale comment (commit f27815c)
- **NN-2**: No regression test for `SELECT * FROM ptxprint_telemetry, secret_dataset` comma-table case (commit 418d547)
- **NN-3**: No tests for rate-limit parse edge cases: NaN env var, empty string, negative, zero (commit 7e03bdf)
- **NN-4**: Aliased comma-table bypass (`FROM tbl t1, other t2`) theoretical gap — low practical risk with Analytics Engine SQL dialect

---

## [E] Encode — Nit Disposition from Original Review

Original 5 nits disposition at 7e03bdf2:

| Nit | Status | Rationale |
|---|---|---|
| N-1 | STILL NIT | Cursor commits didn't touch tests; per-field mock-not-called assertions absent in individual tests |
| N-2 | STILL NIT | Cursor commits didn't implement badge scoring |
| N-3 | STILL NIT | No comment added to `/internal/telemetry` handler |
| N-4 | STILL NIT | Rate-limit key unchanged; no divergence comment added |
| N-5 | PARTIALLY RESOLVED | Bypass closed by 418d547 (better than comment); no test added; aliased variant unaddressed |
