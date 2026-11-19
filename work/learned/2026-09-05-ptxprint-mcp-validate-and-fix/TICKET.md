# TICKET — ptxprint-mcp-validate-and-fix

**What this is:** Validate the live PTXprint MCP server (`https://ptxprint.klappy.dev`) as it
stands today — every tool, one fresh render, the `docs` surface, the open issue — and, in a
second PR, fix what the validation proves broken. Validation writes the findings; the fix reads them.
**Why now:** Captain, 2026-09-04 ~20:50 ET: "we need a new ticket to validate the PTX Print MCP
server and fix it if it is broken." Last validation on record is 2026-04-30; last human commit
2026-07-21 (three dependabot PRs open since); the study-notes cookbook's print output is the
obvious next consumer of a working typesetter.
**Your move:** none until it plates — then read `docs/validation/2026-09-05.md` (findings) and
say merge on the fix PR if there is one.

Class: entrée. Risk: STANDARD (findings are docs; the fix PR touches `src/` only where a finding
names the line; no secrets — the Cloudflare deploy is HUMAN-ONLY if a fix needs one).
Owner: Auggie (fresh to this repo — has not cooked on it; validation seat ≠ fix seat is satisfied
by splitting into two PRs, findings first, per the house prior art). Promise: 4 h (R6).
Depends: none. Meal: none. driver-seat: run before fire (entrée; `DELTA.md` beside this ticket).

Prior rulings this extends (do not re-ask): `klappy://canon/validation-as-epistemic-mode`
(observed / not observed / failed, with the call and the bytes); HYGIENE 3 (validate on the
branch and after merge); HYGIENE 19 (version lives in the deploy — README enumerations drift).

Gate 10 — reference observed: `rail/4-plated/2026-09-03-door43-mcp-v1-validation-gate4`
(one row per acceptance item, call + bytes, findings with disposition; findings never fixed in
the validation PR). Gate 11 — house prior art: same ticket's DEBRIEF; `ptxprint-mcp`
`canon/handoffs/open-items-validated-2026-04-30.md` (the last validation, to diff against).

Ingredients (fetch live, never preload):
- Live deploy: `/health`; `/mcp` streamable-HTTP (`initialize` → `mcp-session-id` →
  `notifications/initialized` → `tools/list` → calls). Observed at order (2026-09-05T00:41Z):
  `/health` 200 in 0.53 s, `version 0.1.0`, `spec v1.3-draft`, 7 tools; handshake OK;
  `tools/list` = submit_typeset · get_job_status · cancel_job · docs · telemetry_policy ·
  telemetry_public · telemetry_schema.
- Repo `klappy/ptxprint-mcp` @ main `de39386f` (2026-07-21): `README.md`, `ARCHITECTURE.md`,
  `canon/specs/ptxprint-mcp-v1.2-spec.md` (README badge says v1.2-draft; `/health` says
  v1.3-draft — first drift to name), `smoke/*.json` + `*.README.md`, `smoke/docs-smoke.py`,
  `smoke/verify-*.sh`, `canon/handoffs/` (13), open issue #40, open PRs #47 #49 #50 (deps).
- Observed at order, to confirm not re-discover:
  1. `docs(query="phase 1 minimum payload", depth=1)` — the README's own first example —
     returns `answer: null, sources: []` (governance_source knowledge_base). Either the
     knowledge base is not resolving or the canon moved. **Candidate break #1 — diagnosed by the
     captain, 2026-09-04 ~21:00 ET:** the `docs` tool is a proxy over an *old* oddkit; oddkit
     changed (retrieval-disclosure contract) and the proxy broke. Ruling for the fix: do not
     re-pin or re-proxy oddkit — the docs tool serves its own policy from this repo's `canon/`
     (the pattern `klappy://canon/patterns/docs-proxy-canon-as-tool`, P0004; Door43 MCP and
     Cartographer already do this). Validation still records the failing bytes first.
  2. `smoke/minimal-payload.json` → job `a8eb0823…` **failed** in 1.8 s: "PTXprint exited 0
     with no PDF and no log file", argv `ptxprint -P BSB -b JHN -p … -q`. This is open
     issue #40 (define-only payloads). Known; decide whether the fixture, the server, or the
     issue is what's wrong.
  3. `smoke/bsb-jhn-empirical.json` → job `a1c54672…` `cached: true`, `succeeded`, PDF 200
     (359 KB, 61 pages) — but from R2 cache; **the container did not run**. Its
     `human_summary` reads "Cancellation requested. Container will SIGTERM…" on a succeeded,
     cached job — stale or wrong summary. **Candidate break #2.** A fresh render (a payload
     hash the cache has never seen) is the only proof the container is alive today.
  4. `get_job_status` on an unknown id → clean `job_id not found` (observed, fine).

Declared product:
A. Validation PR on `klappy/ptxprint-mcp` (branch `validate/2026-09-05`), docs only:
   1. `docs/validation/2026-09-05.md` — one row per tool (7) plus: handshake, `/health`
      vs README vs spec versions, one **fresh** render (modified fixture → new hash → container
      runs → PDF bytes fetched and page-counted), one cached render, `cancel_job` on a running
      job, `docs` for the three README queries at depth 1 and 2, telemetry SELECT + one refused
      statement, issue #40 reproduced or not. Each row: observed / not observed / failed, the
      call, the bytes. Findings with disposition accept · iterate · pivot.
   2. `docs/TENSIONS.md` — one line per finding not fixed by product B.
B. Fix PR (separate branch `fix/2026-09-05-<finding>`), only if A shows a failed row: the
   smallest change that turns that row green, with the validation row re-run on the branch
   and its bytes in the PR. Deploy is HUMAN-ONLY (Cloudflare) unless the repo's CI deploys on
   merge — observe which before promising.
C. Kitchen: `DELTA.md` before fire; `DEBRIEF.md`; journal rows for every ruling touched.

Done-means:
- The captain can open `docs/validation/2026-09-05.md` and see every tool marked observed /
  not observed / failed with the call that proved it, and a fresh-render row with a PDF size
  and page count that did not come from cache.
- A reader can grep the validation PR for `src/` changes and find none.
- If a fix PR exists, its description names the validation row it fixes and shows that row
  re-run green on the branch.
- Issue #40 is either closed by the fix, or has a comment with today's reproduction.
- The three version strings (README badge, spec file, `/health`) agree, or TENSIONS names the owner.

## Failure Modes — What Breaks When "Validate and Fix" Is One Motion
- Fixing in the validation PR (the artifact under test changes under the test).
- Calling a cached render "the server works."
- Fixing `docs` by pinning or re-wiring oddkit instead of self-serving `canon/` (the captain's
  ruling names the direction; a re-pin is the same break deferred).
- A fix that needs a deploy nobody can run from a seat.

## Required Response When Detected
- Revert the fix out of the validation PR; open the fix branch.
- Change one byte of the payload; re-submit; report the new hash and the container timing.
- Pull the fix; serve `canon/` from the worker itself (bundle or fetch-by-sha), no oddkit hop.
- Name the deploy as HUMAN-ONLY in the PR and stop there; the captain deploys or delegates.
