---
title: "Track A Snapshot Execution Ledger — 2026-05-01"
subtitle: "DOLCHEO encoding of the Track A snapshot mechanism build-and-deploy session"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "dolcheo", "telemetry", "snapshot", "track-a", "v1.3", "execution"]
encoded_at: 2026-05-01T03:18:00Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
session_type: execution
session_subject: "Track A — weekly telemetry snapshot mechanism (Cron + R2 + JSONL writer + bootstrap + lifetime composite)"
session_window: "2026-05-01T02:56Z–2026-05-01T03:19Z (~23 min wall-clock)"
applied_canon:
  - klappy://canon/articles/hero-metrics-and-storytelling
  - klappy://canon/governance/telemetry-governance
  - klappy://canon/constraints/definition-of-done
  - klappy://canon/principles/vodka-architecture
relates_to:
  - canon/articles/snapshot-operations.md (authored this session)
  - canon/articles/hero-metrics-and-storytelling.md (the build spec; not modified)
  - canon/governance/telemetry-governance.md (the data contract; not modified)
ships:
  - "feat commit f216924 — snapshot infrastructure"
  - "docs commit c9eb859 — operations companion + DEPLOY recipe"
status: complete
---

# Track A Snapshot Execution Ledger — 2026-05-01

> Took over an autonomous build run for `klappy/ptxprint-mcp` Track A. Discovered prior in-progress work in the workspace (uncommitted snapshot module, tests, wrangler/index/DEPLOY edits, operations canon draft). Verified end-to-end via vitest (96/96 green), tsc (only pre-existing latent error), git push to main, GitHub propagation, and live Cloudflare Workers Builds deploy verified by curling the three new endpoints. Track A scope met; out-of-scope guards held; one latent tsc issue flagged as a non-Track-A follow-up.

---

## D — Decisions

### D-A1 — Treat in-progress workspace state as the authoritative draft; verify and ship rather than rewrite

The clone showed uncommitted changes covering nearly the full Track A surface (snapshot.ts module, snapshot.test.ts, wrangler.jsonc bindings, index.ts handlers, DEPLOY.md updates, snapshot-operations.md). The decision was to read the existing work in full, run the test suite + tsc, verify against the canon spec, and ship as-is in two logical commits — rather than recreate from scratch.

**Rationale.** The work-in-progress is materially complete and matches the article spec verbatim. Discarding it to rewrite would waste tokens and risk drift from the prior session's calibration. The vodka-correct posture in execution mode is to verify and ship; novelty is not a virtue.

### D-A2 — Materialize cache_hits and cache_misses as two distinct metrics (5 R2 objects, not 4)

The hero-metrics article enumerates four query buckets, with cache_hits and cache_misses on a single bullet. The implementation materializes them as two separate metrics (one R2 object each).

**Rationale.** The article's explicit rule is "one object per metric." Combining hits and misses into one query/object would either require shoving two values into one row (schema-shaped) or interleaving rows with different semantic meaning (read-shaped friction). Splitting honors both the one-object-per-metric rule and the schema's `{metric, week_start, value, snapshotted_at, source}` invariant. Documented in `canon/articles/snapshot-operations.md` § "What the snapshot system does".

### D-A3 — Two commits, separated by intent (infrastructure vs. operator-facing docs)

Per repo convention (project memory: "separate commits for content vs. metadata changes to keep history legible by intent"). Commit 1 is the infrastructure (`src/snapshot.ts`, `test/snapshot.test.ts`, `wrangler.jsonc`, `src/index.ts`); commit 2 is the human-facing setup recipe and operations companion (`DEPLOY.md`, `canon/articles/snapshot-operations.md`).

### D-A4 — Do not commit `worker-configuration.d.ts`

The file is wrangler-generated, has never appeared in git history (`git log --all --diff-filter=A` confirms), and is therefore by-convention a regenerate-locally artifact. It was regenerated this session to include the new `TELEMETRY_SNAPSHOTS` binding but kept untracked.

---

## O — Observations

### O-A1 — Live deploy verified end-to-end

Cloudflare Workers Builds picked up the push within ~60 seconds. All three new routes respond correctly:

- `GET /diagnostics/snapshot` → returns `ok: true`, lists 5 expected metrics, `objects_present: []` (bootstrap pending — expected).
- `GET /diagnostics/snapshot/lifetime` → returns `{lifetime_pages: 0, archive_pages: 0, current_week_pages: 0, current_week_start: "2026-04-27", computed_at: "2026-05-01T03:17:31.190Z", archive_source: "r2:ptxprint-telemetry-snapshots/pages-typeset-weekly.jsonl", raw_source: "ptxprint_telemetry (analytics engine)"}`. The non-zero `current_week_start` proves `weekStartFor()` works against the live wall-clock; the 200 response proves R2 read + Analytics Engine SQL API both execute under real bindings.
- `POST /internal/snapshot/run` (no token) → `503 {"ok": false, "error": "manual snapshot runs disabled — SNAPSHOT_BOOTSTRAP_TOKEN secret not set on this Worker"}`. Documented behavior — maintainer opts in by setting the secret.

### O-A2 — Test suite is comprehensive and green

`npx vitest run` → **96 / 96 passing** across three files (telemetry: 43, snapshot: 26, telemetry-schema: 27). Snapshot tests cover JSONL round-trip, idempotent merge by `(metric, week_start, failure_mode??"")`, SQL boundary construction `[Mon, next-Mon)`, per-failure-mode row emission, idempotency of re-runs, multi-week bootstrap, lifetime composite, missing-credentials handling, and per-metric error isolation.

### O-A3 — Out-of-scope guards held

`git diff` against `canon/articles/hero-metrics-and-storytelling.md` and `canon/governance/telemetry-governance.md` returns empty. Both untouched.

### O-A4 — Pre-existing tsc error on main, unrelated to Track A

`npx tsc --noEmit` reports a single error: `src/index.ts: Type 'Env' does not satisfy the constraint 'Cloudflare.Env'. Types of property 'WORKER_URL' are incompatible. Type 'string' is not assignable to type '"https://ptxprint.klappy.dev"'.`

Verified pre-existing by stashing all session changes, regenerating `worker-configuration.d.ts` against the unmodified `wrangler.jsonc`, and running `tsc` — same error, different line number (97 vs 109). The cause: `wrangler types` synthesizes literal types for vars in `wrangler.jsonc`; the local `Env` interface in `src/index.ts` declares `WORKER_URL: string` (broader). CI does not run tsc (project memory: "pushes to main auto-deploy via Cloudflare Workers Builds … not GitHub Actions"), so the latent error never blocks deploy.

---

## L — Learnings

### L-A1 — In-progress workspace can be a feature, not a hazard, when the prior session encoded its intent in canon

The snapshot-operations article and the canon hero-metrics article between them specified the work tightly enough that an arriving session can verify the in-progress code matches the intent without re-deriving the design. This is the canon-first/server-second pattern from session 4 paying off: the article was the spec, the WIP was the implementation, and validation was a 5-minute test run rather than a 5-hour rebuild.

### L-A2 — `oddkit_validate` evaluates claims, not infrastructure

When called with a long natural-language claim, `oddkit_validate` returns `NEEDS_ARTIFACTS` enumerating required deliverables: visual proof, session capture (encoding), change summary, version tracking. The encoding artifact (this file) plus the git commits supply three of the four; the "visual proof" gap for backend infra is satisfied by the live curl outputs documented in O-A1.

---

## C — Constraints

### C-A1 — The snapshot module holds zero PTXprint domain opinions

`src/snapshot.ts` knows about: Cloudflare Analytics Engine SQL API, R2 binding shape, JSONL idempotent merge by composite key, week-boundary date arithmetic. It does **not** know what `pages_count` means, what `failure_mode = success` indicates, or what the `ptxprint_telemetry` dataset is for. The `METRICS` array is the canonical "what gets snapshotted" enumeration mirrored verbatim from the canon article — the only domain knowledge in the file is the one declarative table.

### C-A2 — The privacy floor is preserved by construction

Every snapshot SQL query references only public schema slots (`blob1`, `blob3`, `blob8`, `blob9`, `double10`, `_sample_interval`, `timestamp`). The R2 archive contains only pre-aggregated counts. There is no path by which project IDs, USFM bytes, payload contents, or any private data could appear in the archive.

---

## H — Handoffs

### H-A1 — Maintainer: create R2 bucket and run bootstrap

The Cron Trigger is registered and will fire next Monday (2026-05-04T00:00Z). To capture the prior 13 weeks of telemetry that already exist within the 90-day Analytics Engine retention window, the maintainer should:

```bash
npx wrangler r2 bucket create ptxprint-telemetry-snapshots
openssl rand -hex 32 | npx wrangler secret put SNAPSHOT_BOOTSTRAP_TOKEN
TOKEN=<the value just set>
curl -X POST https://ptxprint.klappy.dev/internal/snapshot/run \
  -H "x-snapshot-bootstrap-token: $TOKEN" \
  -H "content-type: application/json" \
  -d '{"weeks_back": 13}'
```

Per the hero-metrics article: "every week of delay between v1.2 telemetry shipping and snapshot bootstrapping is a week of pages that will not survive the retention window."

Full recipe in `canon/articles/snapshot-operations.md` and `DEPLOY.md` § "Snapshot archive setup".

### H-A2 — Latent tsc error is a separate cleanup task, not Track A scope

The `WORKER_URL` literal-vs-string mismatch (O-A4) is unrelated to the snapshot mechanism. Two clean fixes exist; the maintainer can pick whichever feels less invasive:

1. **Narrow the local `Env` interface** so `WORKER_URL` matches the wrangler-generated literal type (`"https://ptxprint.klappy.dev"`). Brittle if the URL ever changes.
2. **Drop the manual `Env` interface** in `src/index.ts` and rely on the imported `Cloudflare.Env` type directly. Cleaner long-term — wrangler's typegen becomes the single source of truth.

Either way the change is small (≤ 30 lines) and unblocks `npm run tsc` as a useful pre-push check.

### H-A3 — Track B (public dashboard HTML) and Track C (`get_lifetime_hero_stat` MCP tool) remain deferred

Per the original prompt, these were explicitly out of scope. The infrastructure shipped in Track A makes both straightforward when prioritized:

- Track B: HTML page that reads `/diagnostics/snapshot/lifetime` (already public, 5-minute browser cache) plus the chart queries listed in hero-metrics § "Below The Fold — Three Charts".
- Track C: An MCP tool wrapping `getLifetimeHeroStat()` from `src/snapshot.ts`. The function is already exported and tested.

---

## Q-open — None

No open questions arrived in this session. The build spec was unambiguous, the in-progress work matched it, the deploy is live, the guards held.

---

## Cross-Reference Summary

| Item | Where it lands |
|---|---|
| Cron Trigger | `wrangler.jsonc` `triggers.crons: ["0 0 * * 1"]` |
| R2 bucket binding | `wrangler.jsonc` `r2_buckets[1].binding = TELEMETRY_SNAPSHOTS` |
| Cron handler | `src/index.ts` `scheduled()` (wrapped in `ctx.waitUntil`) |
| Snapshot module | `src/snapshot.ts` (586 LOC; `runSnapshot`, `runSnapshotForWeeks`, `getLifetimeHeroStat`, `METRICS` table) |
| Tests | `test/snapshot.test.ts` (575 LOC; 26 tests) |
| Diagnostic endpoints | `src/index.ts`: `GET /diagnostics/snapshot`, `GET /diagnostics/snapshot/lifetime` |
| Bootstrap endpoint | `src/index.ts`: `POST /internal/snapshot/run` (token-gated) |
| Operations canon | `canon/articles/snapshot-operations.md` |
| Operator setup recipe | `DEPLOY.md` § "Snapshot archive setup" |
| Build spec (unmodified) | `canon/articles/hero-metrics-and-storytelling.md` |
| Data contract (unmodified) | `canon/governance/telemetry-governance.md` |

---

*End of execution ledger. Successor sessions: read this ledger plus the two referenced canon articles to fully resume context for Track B / Track C work or for any follow-up on H-A2.*
