---
title: "H-T2 Fresh-Session Review Ledger — Telemetry Governance Article"
subtitle: "DOLCHEO+H encoding of the H-T2 review findings (2026-04-30)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "dolcheo", "telemetry", "governance", "review", "h-t2", "fresh-session"]
encoded_at: 2026-04-30T05:09:43Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
session_type: review
session_subject: "Fresh-session H-T2 review of canon/governance/telemetry-governance.md against four authorities"
reviews: "canon/governance/telemetry-governance.md (commit 4742810)"
reviewer_identity: "H-T2 (managed-agent, fresh session — no prior context from H-T1 drafting session)"
relates_to:
  - canon/governance/telemetry-governance.md
  - canon/encodings/telemetry-feature-planning-ledger.md
  - canon/articles/failure-mode-taxonomy.md
  - canon/specs/ptxprint-mcp-v1.2-spec.md
  - klappy://canon/principles/vodka-architecture
status: complete
---

# H-T2 Fresh-Session Review Ledger — Telemetry Governance Article

> This ledger encodes the findings of the H-T2 fresh-session review per `klappy://canon/principles/verification-requires-fresh-context`. The reviewer had no prior context from the H-T1 drafting session. The full review report is at `canon/handoffs/telemetry-governance-h-t2-review.md`.

---

## D — Decisions

### D-H2-1 — Verdict: APPROVE_WITH_REVISIONS

The telemetry governance article at `canon/governance/telemetry-governance.md` (commit 4742810) is APPROVE_WITH_REVISIONS. Two blockers require correction before merge; three nits and two observations are flagged for operator triage. The article's privacy floor is faithfully represented against C-T1. The canned-query SQL blob references are internally consistent (all eight queries verified). The vodka architecture section engages genuinely with the three-question test rather than parroting it.

---

## O — Observations (Closed)

### O-H2-1 — BLOCKER-1: Incorrect `failure_mode` taxonomy citation (article line 181)

Article line 181 cites `klappy://canon/articles/failure-mode-taxonomy` as the source of `failure_mode ∈ {success, soft, hard, cancelled, timeout}`, but the taxonomy article defines only three values (`hard | soft | success`). The `cancelled` and `timeout` extensions originate in the planning ledger D-T1, not in the taxonomy. The v1.2 spec's Durable Object state schema also defines `failure_mode` as `"hard" | "soft" | "success" | null` only — a three-value enum with no `cancelled` or `timeout`. The citation is factually incorrect and the five-value enum creates a cross-document inconsistency with both the taxonomy and the spec's DO schema.

**Severity:** blocker  
**Grounded in:** failure-mode-taxonomy.md (§"The three outcomes"); v1.2 spec §5 DO schema; planning ledger D-T1

### O-H2-2 — BLOCKER-2: "Phases match current_phase" claim is inaccurate (article line 165)

Article line 165 states "The phases match the `progress.current_phase` values returned by `get_job_status`." The v1.2 spec §3 `get_job_status` response shows `current_phase` with only four values (`fetching_inputs | typesetting | autofill | uploading`). The article defines six phases for blob 7 (`queued | fetching_inputs | typesetting | autofill | uploading | done`). The article's own explanatory text correctly describes the discrepancy, but the opening sentence contradicts it — claiming "match" where two of six values (`queued`, `done`) are telemetry-only and absent from `current_phase`.

**Severity:** blocker  
**Grounded in:** v1.2 spec §3 `get_job_status` response shape; article lines 165–173

### O-H2-3 — NIT-1: `oauth` silently dropped from blob 5 `consumer_source`

The article's schema table for blob 5 lists `header | query | client_info | user_agent` (four values). The planning ledger §Schema blob 5 shows `header | query | client_info | user_agent | oauth` (five values). The article silently drops `oauth` with no documented rationale. If intentional (OAuth deferred to a future auth layer), the deviation should be noted. If an oversight, `oauth` should be restored.

**Severity:** nit  
**Grounded in:** planning ledger §Schema blob 5

### O-H2-4 — NIT-2: `telemetry_policy` three-tier fallback undocumented in the governance article

D-T7 specifies a three-tier governance fallback (`knowledge_base → bundled → minimal`) for the `telemetry_policy` tool. The v1.2 spec §3 documents this behavior. The governance article — which IS the policy document fetched by `telemetry_policy` — does not describe this fallback anywhere. An operator or agent reading only the article cannot know the tool degrades gracefully.

**Severity:** nit  
**Grounded in:** planning ledger D-T7; v1.2 spec §3 `telemetry_policy` section

### O-H2-5 — NIT-3: Stale path references in the planning ledger (not an article fault)

Planning ledger D-T7 and H-T1 reference the governance article path as `canon/constraints/telemetry-governance.md`. The file landed at `canon/governance/telemetry-governance.md`. The article's own frontmatter URI and the v1.2 spec both use the correct path. The ledger references are stale. No change needed in the article; the ledger needs updating.

**Severity:** nit (ledger maintenance)  
**Grounded in:** planning ledger D-T7 and H-T1; article frontmatter URI; v1.2 spec §3

### O-H2-6 — OBSERVATION: Vodka Q1 answer thin on quantitative evidence

The vodka compliance section Q1 ("Has the server grown thick?") answers with "self-contained" but does not cite the quantitative code-size evidence the v1.2 spec provides (~150-line telemetry module added to an existing ~550-line base). The vodka principle explicitly asks whether the codebase is expanding faster than the knowledge base it serves — a qualitative answer without the numbers leaves the test partially answered. Q2 is the strongest answer: the domain-opinion resolution rule is genuine engagement with the principle, not parroting.

**Severity:** observation  
**Grounded in:** klappy://canon/principles/vodka-architecture §"The Constraint Test"; v1.2 spec §1 vodka boundary

---

## O — Observations (Open)

### O-H2-open-1 — COVERAGE-EXCESS: Three "never logged" categories lack ledger grounding

The article's Privacy Floor section includes three categories not explicitly in planning ledger C-T1:

- (a) Authentication tokens, API keys, credentials
- (b) User account IDs beyond self-declared `consumer_label`
- (c) `docs` tool query strings (treated as content, not metadata)

These appear correct in intent and strengthen the privacy floor. But they are not grounded in any planning ledger decision (C-T1 through C-T4). Operator should either encode them retroactively as C-T1 addenda or a new C-T5, or confirm them as approved H-T2 extensions that close as canon.

**Status:** open — pending operator decision  
**Grounded in:** planning ledger C-T1; article §"Privacy Floor — What Is Never Logged"

---

## L — Learnings

### L-H2-1 — Telemetry-only enum extensions need explicit disambiguation at the citation point

When a telemetry schema extends a public-response enum (e.g., adding `cancelled` and `timeout` to `failure_mode`), the citation in the governance article must explicitly distinguish which values come from the named authority and which are telemetry-specific extensions. Citing the taxonomy as the source of all five values when it only defines three is the type of drift that misleads implementers who cross-reference the taxonomy for the full enum.

Generalizable: any time a telemetry dimension is a superset of a public-response field, the governance article should name both sources separately.

### L-H2-2 — Phase lists in telemetry docs must distinguish "telemetry phases" from "API-visible phases"

The job-lifecycle telemetry section correctly describes `queued` (Worker-written) and `done` (Container terminal) as separate from the Container-emitted phases. But the opening sentence — "the phases match `current_phase`" — obscures this distinction before it's made. The distinction must be surfaced at the claim point, not only in the explanatory list.

---

## C — Constraints

### C-H2-1 — `cancelled` and `timeout` must be reconciled across three artifacts before implementation

The `cancelled` and `timeout` failure_mode values appear in: (1) planning ledger D-T1, (2) the governance article. They are absent from: (3) failure-mode-taxonomy.md, (4) the v1.2 spec DO state schema.

Before implementation, one of these reconciliation paths must be taken:
- Update `failure-mode-taxonomy.md` to add them with their semantics
- Update the v1.2 spec DO schema to add them
- Explicitly label them as telemetry-only extensions in both the governance article and the taxonomy disclaimer

The current state — defined in the ledger and article, absent from the taxonomy and spec — is inconsistent and will mislead implementers.

### C-H2-2 — "Phases match current_phase" claim must be corrected (blocker)

The article must not claim the six telemetry phases "match" `get_job_status.progress.current_phase` when `queued` and `done` are absent from the spec's `current_phase` field. The correction must appear at line 165, where the claim is made, before the list that correctly explains the discrepancy.

---

## H — Handoffs

### H-H2-1 — Operator: Apply blocker corrections before merge

Before marking `canon/governance/telemetry-governance.md` as canonical (removing `status: draft_pending_fresh_review`):

1. **B-1:** Correct the `failure_mode` taxonomy citation at article line 181 — distinguish the three taxonomy-defined values from the two ledger-extension values.
2. **B-2:** Correct the "phases match current_phase" claim at article line 165 — state that four phases correspond to `current_phase` values and two are telemetry-only.

### H-H2-2 — Operator: Decide reconciliation path for `cancelled` and `timeout`

Choose one:
- (a) Update `failure-mode-taxonomy.md` to add `cancelled` and `timeout` with semantics (recommended — makes the taxonomy the single source of truth for all `failure_mode` values)
- (b) Update the v1.2 spec DO schema to add them
- (c) Document them as telemetry-only extensions in both the governance article and the taxonomy

### H-H2-3 — Operator: Resolve three nits

- **N-1:** Restore `oauth` to blob 5 or document its removal
- **N-2:** Add `telemetry_policy` fallback documentation to the article
- **N-3:** Update D-T7 and H-T1 in `telemetry-feature-planning-ledger.md` to reference `canon/governance/` (not `canon/constraints/`)

### H-H2-4 — Operator: Encode or confirm the three unlisted privacy-floor categories

Encode authentication tokens, user account IDs, and `docs` query strings as C-T1 addenda in the planning ledger, or confirm them as H-T2-approved extensions that close as canon.

---

## E — Encodes

### E-H2-1 — Fresh-session review executed per verification-requires-fresh-context

Fresh-session review executed by H-T2 reviewer per `klappy://canon/principles/verification-requires-fresh-context`. Reviewer began this session with no prior context from the H-T1 drafting session. All four authorities were fetched and cross-referenced directly. Verdict: APPROVE_WITH_REVISIONS. Two blockers, three nits, two observations recorded. Review artifacts:

- Report: `canon/handoffs/telemetry-governance-h-t2-review.md`
- Ledger: `canon/encodings/h-t2-fresh-review-ledger.md` (this file)

The review satisfies H-T2 from the planning ledger.

---

## Cross-references

| This ledger | Authority |
|---|---|
| Article under review | `canon/governance/telemetry-governance.md` (commit 4742810) |
| Planning ledger | `canon/encodings/telemetry-feature-planning-ledger.md` |
| Taxonomy | `canon/articles/failure-mode-taxonomy.md` |
| v1.2 spec | `canon/specs/ptxprint-mcp-v1.2-spec.md` |
| Vodka architecture | `klappy://canon/principles/vodka-architecture` (klappy.dev, fetched fresh) |
| Review principle | `klappy://canon/principles/verification-requires-fresh-context` |
| Full review report | `canon/handoffs/telemetry-governance-h-t2-review.md` |

---

## Provenance

- **Encoding tool:** `oddkit_encode` (batch mode, 12 artifacts, governance from `knowledge_base`)
- **Encoding timestamp:** 2026-04-30T05:09:43Z
- **Review session start:** 2026-04-30 (fresh session, no prior H-T1 context)
- **Authorities fetched:** 4 (all directly read from filesystem and oddkit)
- **Open questions remaining:** 2 (O-H2-open-1, H-H2-2) — operator decisions required

---

*End of ledger. Next action per H-H2-1: apply blocker corrections to the governance article.*
