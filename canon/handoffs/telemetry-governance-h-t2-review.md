---
title: "H-T2 Fresh-Session Review — canon/governance/telemetry-governance.md"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "review", "h-t2", "telemetry", "governance", "fresh-session", "dolcheo"]
date: 2026-04-30
reviewer: "H-T2 (fresh-session, managed-agent)"
reviews: "canon/governance/telemetry-governance.md (commit 4742810)"
authorities:
  - canon/encodings/telemetry-feature-planning-ledger.md
  - canon/articles/failure-mode-taxonomy.md
  - canon/specs/ptxprint-mcp-v1.2-spec.md
  - klappy://canon/principles/vodka-architecture
status: complete
---

# H-T2 Fresh-Session Review — `canon/governance/telemetry-governance.md`

> **Independence statement.** I did not author the article under review. This session began with no context from the drafting session (H-T1). The findings below are drawn from direct cross-referencing of the article against each named authority, not from any memory of how the article was constructed.

---

## Executive Verdict

**APPROVE_WITH_REVISIONS**

The article is structurally sound. The privacy floor is faithfully represented against C-T1. The canned-query SQL is internally consistent with the schema tables (every blob and double reference checks out). The vodka architecture section is genuine engagement — the Q2 resolution rule is the real argument, not a paraphrase of the principle. The social contract and operating principle sections are well-grounded.

Two blockers must be corrected before merge. Three nits and two observations are flagged for operator triage. None of the findings touch the privacy floor or the canned-query library.

---

## Findings by Authority

---

### Authority 1 — Planning Ledger (`canon/encodings/telemetry-feature-planning-ledger.md`)

#### Finding A1-1 · Faithfulness · **BLOCKER**

**Article line 181** cites `klappy://canon/articles/failure-mode-taxonomy` as the source of `failure_mode ∈ {success, soft, hard, cancelled, timeout}`.

The taxonomy article defines **only three values**: `hard | soft | success`. The `cancelled` and `timeout` extensions originate in the planning ledger **D-T1**, which reads:

> "Logging `failure_mode` (`hard | soft | success | cancelled | timeout`) and `phase` …"

The taxonomy is not the source of `cancelled` or `timeout`. Citing it as such is factually incorrect. Additionally, the v1.2 spec's Durable Object state schema (§5) defines `failure_mode` as `"hard" | "soft" | "success" | null` — a three-value enum with no `cancelled` or `timeout`.

**Proposed correction (article line 181):**

```diff
- `failure_mode` ∈ `{success, soft, hard, cancelled, timeout}` per `klappy://canon/articles/failure-mode-taxonomy`
+ `failure_mode` ∈ `{success, soft, hard, cancelled, timeout}` — `success | soft | hard` per
+ `klappy://canon/articles/failure-mode-taxonomy`; `cancelled` and `timeout` are telemetry extensions
+ introduced in the planning ledger D-T1 (not in the taxonomy or the v1.2 DO state schema)
```

Note: the v1.2 spec DO schema and the failure-mode taxonomy both need to be updated separately to add `cancelled` and `timeout`, or the article must explicitly call them out as telemetry-only extensions not surfaced via `get_job_status`. See Handoff at end of this review.

---

#### Finding A1-2 · Gap · **NIT**

**Blob 5 `consumer_source`:** The article's schema table lists four values — `header | query | client_info | user_agent`. The planning ledger §Schema blob 5 shows five values: `header | query | client_info | user_agent | oauth`.

The article silently drops `oauth`. The Consumer Identification Model section describes a five-tier resolution order (query param, header, clientInfo, user-agent, "unknown") that maps to four blob values — none of which is `oauth`. If OAuth support was intentionally deferred or removed, this should be documented as a ledger deviation. If it was overlooked, `oauth` should be restored.

**Proposed correction:** Either add `oauth` back to blob 5's example values, or add a note: "OAuth identification (`consumer_source = 'oauth'`) is reserved for a future auth layer; not populated in v1.2."

---

#### Finding A1-3 · Gap · **NIT**

**`telemetry_policy` three-tier fallback:** D-T7 specifies "Same three-tier governance fallback (`knowledge_base → bundled → minimal`) as oddkit" for the `telemetry_policy` tool. The v1.2 spec §3 documents this behavior. The governance article — which IS the policy document fetched by `telemetry_policy` — does not describe this fallback anywhere.

An operator or agent reading only the governance article cannot know that the tool degrades gracefully. This is a gap between what the article governs and what the tool implements.

**Proposed addition:** A short paragraph in the Storage and Infrastructure section or a new "Governance Fetch Behavior" subsection explaining the three-tier fallback.

---

#### Finding A1-4 · Observation · **NIT** (ledger maintenance, not article fault)

**Path mismatch in the ledger:** D-T7 and H-T1 in the planning ledger reference the governance article path as `canon/constraints/telemetry-governance.md`. The file landed at `canon/governance/telemetry-governance.md`. The article's own frontmatter URI and the v1.2 spec both use the correct `canon/governance/` path. The ledger references are stale. Anyone following H-T1's path verbatim will not find the file.

**Action:** Update D-T7 and H-T1 in the planning ledger to reflect the correct path. No change needed in the article.

---

#### Finding A1-5 · Excess · **OBSERVATION**

The article's "never logged" list includes three categories not explicitly traceable to planning ledger C-T1:

- (a) Authentication tokens, API keys, credentials
- (b) User account IDs beyond self-declared `consumer_label`
- (c) `` `docs` tool query strings`` (treated as content, not metadata)

C-T1 covers project identity (project IDs, config names, book codes, source URLs, payload contents, USFM bytes, log content, PDF bytes) and caller identity (IP addresses, browser fingerprints). The three additions are absent from C-T1 but appear reasonable in intent.

These are not wrong inclusions — they strengthen the privacy floor. But they lack a ledger decision grounding them. Operator should either encode them retroactively in the ledger (as C-T1 addenda or a new C-T5) or confirm they close as H-T2-approved extensions.

---

### Authority 2 — Failure Mode Taxonomy (`canon/articles/failure-mode-taxonomy.md`)

#### Finding A2-1 · Faithfulness · **BLOCKER** (same root as A1-1)

The taxonomy article defines exactly three values for `failure_mode`: `hard | soft | success`. The taxonomy's `get_job_status` return shape reads:

> "`get_job_status` returns the classification result in the `failure_mode` field — one of `"hard" | "soft" | "success"`."

The governance article extends this to five values (`+ cancelled + timeout`) but cites the taxonomy as the source of the full enum. This is a cross-document inconsistency. The taxonomy does not define or disclaim `cancelled` or `timeout`. An implementer reading the taxonomy to understand `failure_mode` will see a three-value enum; reading the governance article, they'll see five. The two documents currently contradict each other without either acknowledging the gap.

**The taxonomy extension to five values appears correct** — `cancelled` is returned when `cancel_job` is acted upon; `timeout` handles wall-clock overflow. But neither is in the taxonomy. The taxonomy needs to be updated (or explicitly constrained to "typeset run outcomes, not job lifecycle outcomes"), and the governance article's citation must be corrected as described in A1-1.

---

#### Finding A2-2 · Faithfulness · **OBSERVATION**

The taxonomy's classification logic (hard/soft/success truth table) is correctly NOT reproduced in the governance article — the governance article rightly defers to the taxonomy for classification semantics. The `overfull_count` metric in the doubles table (double 9) is consistent with the taxonomy's threshold section. No drift found here.

---

### Authority 3 — v1.2 Spec (`canon/specs/ptxprint-mcp-v1.2-spec.md`)

#### Finding A3-1 · Faithfulness · **BLOCKER**

**Article line 165:** "The phases match the `progress.current_phase` values returned by `get_job_status`."

The v1.2 spec §3 `get_job_status` response shows:

```json
"current_phase": "fetching_inputs | typesetting | autofill | uploading"
```

Four values. The governance article defines **six** phases for blob 7: `queued | fetching_inputs | typesetting | autofill | uploading | done`.

The article's own explanatory text correctly describes the discrepancy — `queued` is "written by the Worker on dispatch, not the Container" and `done` is the "terminal" Container phase. But the opening sentence claims the phases "match" the spec's `current_phase`, which is incorrect: two of the six (`queued` and `done`) are telemetry-only phases that do not appear in `get_job_status.progress.current_phase`.

**Proposed correction (article line 165):**

```diff
- The phases match the `progress.current_phase` values returned by `get_job_status`:
+ Six telemetry phases are defined. Four correspond to the `progress.current_phase` values
+ returned by `get_job_status` (`fetching_inputs`, `typesetting`, `autofill`, `uploading`).
+ Two are telemetry-only and do not appear in `current_phase`:
```

The numbered list that follows (items 1–6) is accurate and can remain unchanged.

---

#### Finding A3-2 · Faithfulness · **PASS**

**Tool names in blob 3:** The article lists `submit_typeset | get_job_status | cancel_job | docs | telemetry_public | telemetry_policy`. The v1.2 spec §3 defines exactly these six tools. ✓

The ledger's §Schema blob 3 shows only four tools (`submit_typeset | get_job_status | cancel_job | docs`), but this is a ledger artifact — the ledger schema was written before D-T7 formally added the two telemetry tools. The article correctly reflects the final six-tool surface. No fault in the article; the ledger's schema table is stale.

---

#### Finding A3-3 · Faithfulness · **PASS**

**Blob/double slot references in canned queries:** All eight canned SQL queries were traced against the schema tables. Every `blobN` and `doubleN` reference is correct:

| Query | Key references | Verified |
|---|---|---|
| Adoption | `blob1=mcp_request`, `blob4=consumer_label` | ✓ |
| Cache hit rate | `blob9=cache_outcome`, `blob3=submit_typeset` | ✓ |
| Failure mix | `blob8=failure_mode`, `blob1=job_terminal` | ✓ |
| Where time goes | `blob7=phase`, `double2=duration_ms` | ✓ |
| Tool leaderboard | `blob3=tool_name`, `blob1=tool_call` | ✓ |
| Document leaderboard | `blob12=docs_top_uri`, `blob3=docs` | ✓ |
| Soft-failure trend | `blob8=failure_mode`, `blob1=job_terminal` | ✓ |
| Pages per success | `double10=pages_count`, `blob8=success` | ✓ |

No schema slot mismatches found. This is the cleanest part of the article.

---

#### Finding A3-4 · Faithfulness · **PASS**

**`failure_mode` in the DO state schema:** The v1.2 spec DO schema defines `failure_mode: "hard" | "soft" | "success" | null`. The governance article's `job_terminal` section adds `cancelled` and `timeout` to the telemetry enum. As noted in A1-1 and A2-1, the spec needs to be reconciled. This is a cross-artifact gap, not a fault of the governance article in isolation — the ledger D-T1 authorizes the five-value enum, and the spec just hasn't been updated yet (H-T4 is the relevant handoff).

---

### Authority 4 — Vodka Architecture (`klappy://canon/principles/vodka-architecture`)

#### Finding A4-1 · Faithfulness · **OBSERVATION**

**Q1 — "Has the server grown thick?"** The article answers: "One `writeDataPoint()` per request at the Worker, plus a small Worker endpoint that receives Container-emitted phase events and forwards them. Two new tools. Combined module is self-contained."

The vodka principle's test is: "If the codebase is expanding faster than the knowledge base it serves, something is wrong." The v1.2 spec quantifies the telemetry addition as "~150 lines of telemetry module (split across writer, redactor, public-query, and policy-fetch helpers)" added to an existing ~250+200+100 line base. The article doesn't cite these numbers. The answer is defensible but thin — "self-contained" is not the same as demonstrating the growth rate is appropriate.

This is an observation, not a blocker. The answer is not wrong.

---

#### Finding A4-2 · Faithfulness · **PASS**

**Q2 — "Has the server acquired domain opinions?"** The article's answer is the strongest of the three. It engages with the actual principle:

> "if the field is already in the public response shape, persisting it is not new opinion — it is making existing opinion queryable over time"

This is the resolution rule from planning ledger L-T2. It correctly applies the vodka principle's "Zero Domain Opinion" property and the "if-branch that checks a domain term" anti-pattern test. The article also correctly limits the ruling to `failure_mode` and `phase`, and correctly specifies that new dimensions NOT in the public response would warrant fresh scrutiny. This is genuine engagement, not parroting.

---

#### Finding A4-3 · Faithfulness · **PASS**

**Q3 — "Can the server be removed without consequence?"** The article answers No, citing three operational dependencies (cache effectiveness signal, soft-failure rate, docs query signal). The vodka principle says the only acceptable answer is No — meaning the layer is load-bearing. The article gives the right answer with grounded justification. The answer correctly applies to the telemetry feature within the server, not the server as a whole (which is separately load-bearing for typesetting dispatch).

---

## Recommended Changes

### Must-fix before merge (blockers)

**B-1: Correct the `failure_mode` taxonomy citation (article line 181)**

```markdown
# CURRENT:
`failure_mode` ∈ `{success, soft, hard, cancelled, timeout}` per `klappy://canon/articles/failure-mode-taxonomy`

# PROPOSED:
`failure_mode` ∈ `{success, soft, hard, cancelled, timeout}`. The core three values (`success | soft | hard`)
are defined in `klappy://canon/articles/failure-mode-taxonomy`. The `cancelled` and `timeout` values are
telemetry lifecycle extensions defined in the planning ledger (D-T1) — they are not in the taxonomy and
are not currently in the v1.2 spec DO state schema (a gap H-T4 should close).
```

**B-2: Correct the "phases match current_phase" claim (article line 165)**

```markdown
# CURRENT:
The phases match the `progress.current_phase` values returned by `get_job_status`:

# PROPOSED:
Six telemetry phases are defined. Four of these correspond directly to the `progress.current_phase`
values returned by `get_job_status` (`fetching_inputs`, `typesetting`, `autofill`, `uploading`).
Two are telemetry-only phases not present in `current_phase`:
```

### Should-fix (nits)

**N-1: `oauth` in blob 5** — Restore `oauth` to the blob 5 example values OR add a note that OAuth identification is reserved for a future auth layer.

**N-2: `telemetry_policy` fallback behavior** — Add a brief description of the three-tier fallback (`knowledge_base → bundled → minimal`) to the governance article.

**N-3: Ledger path references** — Update D-T7 and H-T1 in `canon/encodings/telemetry-feature-planning-ledger.md` to reference `canon/governance/telemetry-governance.md` (not `canon/constraints/`).

### Operator decision required

**O-1: `cancelled` and `timeout` reconciliation** — Choose one of:
- (a) Update `failure-mode-taxonomy.md` to add `cancelled` and `timeout` with their semantics
- (b) Update the v1.2 spec DO schema to add them
- (c) Leave them as telemetry-only extensions and explicitly label them as such in both the governance article and the taxonomy

**O-2: Privacy floor excess categories** — Encode the three unlisted categories (credentials, account IDs, docs query strings) retroactively in the planning ledger as C-T1 addenda, or confirm them as approved H-T2 extensions.

---

## Summary Table

| ID | Authority | Type | Severity | Article Location | Finding |
|---|---|---|---|---|---|
| A1-1 | Ledger / Taxonomy | Faithfulness | **blocker** | Line 181 | `failure_mode` taxonomy citation incorrect; `cancelled`/`timeout` not in taxonomy |
| A3-1 | v1.2 Spec | Faithfulness | **blocker** | Line 165 | "phases match current_phase" inaccurate — `queued` and `done` are telemetry-only |
| A1-2 | Ledger | Gap | nit | Blob 5 table | `oauth` dropped from `consumer_source` values without documented rationale |
| A1-3 | Ledger / Spec | Gap | nit | Storage section | `telemetry_policy` three-tier fallback not documented in the article |
| A1-4 | Ledger | Observation | nit | (ledger, not article) | D-T7 / H-T1 reference stale `canon/constraints/` path |
| A1-5 | Ledger | Excess | observation | Privacy Floor section | Three "never logged" categories not in C-T1 lack ledger decision grounding |
| A4-1 | Vodka | Faithfulness | observation | Vodka section Q1 | Q1 answer thin — doesn't cite quantitative code-size evidence from spec |
| A2-2 | Taxonomy | Faithfulness | pass | `job_terminal` section | Taxonomy classification semantics correctly deferred to taxonomy article |
| A3-2 | v1.2 Spec | Faithfulness | pass | Blob 3 table | Tool names correct (6 tools) — ledger schema table is stale, not the article |
| A3-3 | v1.2 Spec | Faithfulness | pass | Canned queries | All 8 canned queries use correct blob/double slot references |
| A3-4 | v1.2 Spec | Faithfulness | pass | `job_terminal` section | DO schema gap is a spec maintenance issue, not an article fault |
| A4-2 | Vodka | Faithfulness | pass | Vodka section Q2 | Genuine engagement with domain-opinion test; not parroting |
| A4-3 | Vodka | Faithfulness | pass | Vodka section Q3 | Correct No answer with grounded justification |

---

## Statement of Independence

I did not author `canon/governance/telemetry-governance.md`. This review session began with no context from the drafting session (H-T1) and no memory of the article's construction. All findings are grounded in direct cross-referencing of the article against the four named authority documents, per `klappy://canon/principles/verification-requires-fresh-context`.

---

*Review completed by H-T2 (fresh-session managed agent, 2026-04-30). Companions: `canon/encodings/h-t2-fresh-review-ledger.md` (DOLCHEO+H encoding of these findings).*
