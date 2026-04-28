---
title: "Handoff to oddkit — Feature Request: Isolate Knowledge Base from Baseline Search Corpus"
audience: external
exposure: working
voice: instructional
stability: working
tags: ["handoff", "oddkit", "feature-request", "knowledge-base-isolation", "scoped-truth", "search-corpus", "baseline-contamination"]
canonical_status: non_canonical
created_at: 2026-04-28T12:15:00Z
companion_to: "canon/specs/ptxprint-mcp-v1.2-spec.md, canon/handoffs/session-3-gaps-handoff.md"
references_oddkit_canon:
  - klappy://canon/principles/scoped-truth
  - klappy://canon/constraints/core-governance-baseline
  - klappy://docs/planning/kb-data-model
addressed_to: "klappy/oddkit maintainer (file as a GitHub issue or RFC against oddkit, or treat as canon input for the next governance epoch)"
---

# Handoff to oddkit — Feature Request: Isolate Knowledge Base from Baseline Search Corpus

> **The ask in one sentence.** When `knowledge_base_url` is set on a search/preflight/orient call, oddkit should isolate the search corpus to that KB's overlay (plus the small set of required-baseline governance files), not merge the entire 566-document baseline into the index where it dominates BM25 and contaminates results in exactly the way `canon/principles/scoped-truth.md` names as the anti-pattern.

> **Status.** This handoff was authored from a measurement session against `https://github.com/Klappy/ptxprint-mcp` as the project KB. The empirical evidence is in §2; the existing canon that backs the request is in §3; the proposed flag/parameter shapes are in §4.

---

## 1. The Empirical Observation

A session probing the ptxprint-mcp repo as `knowledge_base_url` measured the search corpus composition and ran ten realistic agent queries. The corpus reported `total: 584` (`canon: 19` from the overlay, `baseline: 566` from klappy.dev). The probe matrix:

| # | Query a real agent would issue | Top hit | Right answer in top 5? | Verdict |
|---|---|---|---|---|
| 1 | "submit_typeset payload schema" | baseline `frontmatter-schema.md` | governance #2, surface #3; **v1.2 spec absent** | Spec missing for its own central concept |
| 2 | "Cloudflare Worker Container Durable Object PTXprint" | baseline `maintainability` | spec #2, **obsolete article #3**, session #5 | OK, but stale article ranks alongside live |
| 3 | "how to construct payload typesetting job" | baseline `the-intern.md` essay | governance #2 only; 4 noise | Bad |
| 4 | "AdjList paragraph adjustment format" | baseline TSV serialization spec | **none** | Total miss |
| 5 | "failure mode hard soft success ptxprint" | baseline `odd/misuse-patterns` | surface #3; spec/governance absent | Total miss |
| 6 | "autofill page filler multi-pass typesetting" | baseline `revision-lens-sequence` | **none** | Total miss |
| 7 | "payload-construction worked example simple typesetting" | baseline `project-instructions-template` | **none** (article doesn't exist yet) | No "missing canon" signal — confidently irrelevant noise instead |
| O | orient — "translator wants A4→A5" | governance + mode discipline | yes | **Works** |
| P | preflight — "implement Worker handler for submit_typeset" | 3 unrelated oddkit ledgers + DoD + 3 generic constraints | **none** | Total miss |
| G | get by URI (`klappy://canon/specs/ptxprint-mcp-v1.2-spec`) | direct fetch | n/a | **Works** |

**Pattern:** `get` (URI-deterministic) and `orient` (high-level domain framing) work. **`search` and `preflight` — the two tools agents lean on most — fail for the majority of realistic project-domain queries**, because the 566 baseline docs (essays, ledgers, methods, fragments, writings) outnumber the 19 overlay docs ~30:1 and dominate BM25 even when the project KB has the better answer.

The retrieval failure is not a content gap in the project KB. The v1.2 spec, the governance doc, and the surfaces all *contain* the answers to queries 1, 4, 5, and 6. They are simply outranked.

---

## 2. The Existing Canon That Backs This Request

Three oddkit canon docs converge on the question. None of them, in their current text, addresses this specific shape — the gap is a real omission, not a contradiction.

### 2.1 `klappy://canon/principles/scoped-truth` (E0006, canon, tier 1)

> "When a single knowledge base serves every context, domain contamination is inevitable — software opinions bleed into theology conversations, engineering constraints shape venture strategy, personal canon governs domains it was never designed for."

This principle was written in March 2026 and explicitly canonizes the empirical observation. The principle's "Three Questions for Every Scope" test fails on the current behavior:

1. **Are the axioms present?** Yes — the few required-baseline files (axioms, creed, DoD) travel correctly via the resolution stack.
2. **Is the domain knowledge scoped?** **No** — when an agent searches the ptxprint-mcp KB, it gets writings on AI cliché editing, generative arc curves, and apocrypha fragments competing for the slot a payload-construction answer should occupy.
3. **Are cross-domain connections explicit?** **No** — baseline content surfaces unattributed and indistinguishable from project content.

Scoped Truth says contamination is the failure. The current corpus composition is the failure shape it names.

### 2.2 `klappy://canon/constraints/core-governance-baseline` (E0008, draft, tier 1)

> "Baseline path is never user-configurable. `knowledge_base_url` overrides the live knowledge base fetch, not the baseline. The baseline is the floor; the floor does not move." (Runtime Invariant #5)

This constraint defines a **three-tier resolution stack** for *required governance files*: live canon → bundled baseline → fail loud. It enumerates ~6 required-baseline files (`canon/values/orientation.md`, `canon/values/axioms.md`, `canon/meta/writing-canon.md`, `canon/constraints/definition-of-done.md`, `canon/constraints/telemetry-governance.md`, `odd/challenge/stakes-calibration.md`).

The request preserves this contract verbatim. It does not propose making baseline user-configurable, removing the floor, or weakening the resolution stack for required governance files.

What it asks: when the agent's *search corpus* is being assembled (not the per-required-file resolution), restrict it to the overlay plus those ~6 required-baseline files, rather than indexing the full 566-doc baseline. The resolution stack still operates exactly as documented for governance reads. Search just stops dragging in `writings/`, `odd/ledger/`, `apocrypha/`, etc., which the constraint itself classifies as canon-only (never bundled, not required for tool function).

### 2.3 `klappy://docs/planning/kb-data-model` (E0005, planning, tier 2)

> "Default Governance — ODD Is Always Present. ... Local governance extends ODD, never weakens it."

The data model establishes that ODD is always present as a default — but in the form of *governance constraints*, not as a co-equal search corpus. The doc lists exactly what's "always present": axioms, creed, core constraints. Not the writings folder, not the ledger, not apocrypha. The current implementation indexes the entire baseline as if the *whole* repo were "default governance," which the planning doc does not assert.

---

## 3. The Specific Gap

None of the three canon docs above addresses **search/index corpus composition when a custom KB is set.** They address adjacent concerns:

| Canon doc | Addresses | Does not address |
|---|---|---|
| `scoped-truth.md` | The principle (contamination is bad) | The implementation (how to prevent it in oddkit's index) |
| `core-governance-baseline.md` | Per-required-file resolution stack | What to do with non-required baseline content during search |
| `kb-data-model.md` | Project roles and write-target model | Read/search corpus boundaries |

The `core-governance-baseline.md` "Canon-Only (Never Bundled)" section names the categories that should not be in the baseline at all (`writings/`, `apocrypha/`, encoding-types/, challenge-types/, gate/, etc.). Yet those categories *are* in the live baseline corpus that gets indexed alongside the overlay. The doc tells operators these files are canon-only — but search behavior treats the entire baseline as searchable canon.

This is the gap the feature request fills: a documented, enforced boundary between *required-baseline governance* (always available, fallback floor) and *baseline content* (essays, ledgers, fragments — should not contaminate project searches).

---

## 4. Proposed Flag/Parameter Shapes

Three options, ordered from most conservative (least change to default behavior) to most Vodka-correct (default to scoped, opt-in to merged). The maintainer should pick one; this handoff does not insist.

### Option A — Opt-in flag, default unchanged

Add `baseline_in_search: boolean` parameter (default `true` to preserve current behavior). When `false`, the search index excludes baseline content other than the required-baseline files enumerated in `core-governance-baseline.md`.

```typescript
// pseudo-schema
{
  input: string,
  knowledge_base_url?: string,
  baseline_in_search?: boolean  // default true; false = scoped to KB + required baseline only
}
```

- **Pro:** zero behavior change for existing callers. Project KBs opt in to scoping.
- **Con:** the contamination remains the default, requiring every project KB to know about the flag. Discovery problem.

### Option B — Tri-state scope parameter

Add `search_scope: "kb_only" | "kb_with_required_baseline" | "merged"` (default `"merged"` to preserve current behavior).

- `"kb_only"`: Search ONLY the overlay; if KB is missing required governance files, response carries `governance_source: "incomplete"`.
- `"kb_with_required_baseline"`: Overlay + the ~6 required-baseline files only. (This is what the ptxprint-mcp use case wants.)
- `"merged"`: Current behavior (overlay + full baseline).

- **Pro:** explicit caller control over the trade-off; integrates with the existing `governance_source` envelope signal.
- **Con:** three modes is one more than most callers will reason about; `kb_only` may foot-gun small KBs that legitimately need axioms in search.

### Option C — Default change, opt-in to merged (Vodka-correct)

When `knowledge_base_url` is set, default to overlay + required-baseline only. Add `include_full_baseline: boolean` parameter (default `false` when KB is set, `true` when KB is unset / using default). Callers who want today's behavior set `include_full_baseline: true` explicitly.

- **Pro:** treats the contamination as the surprising default it is per Scoped Truth. Aligns the implementation with the principle. Zero-config KB onboarding still works (axioms etc. travel via required-baseline).
- **Con:** breaking change for any consumer relying on cross-baseline search hits when they set their own KB. Needs a release note, possibly an epoch bump per `governance-change-discipline.md`.

### Recommendation (mine, from this session's perspective)

**Option C** is most aligned with `scoped-truth` and `core-governance-baseline.md`'s "canon-only" classification. The breaking-change concern is real but the failure mode is loud (results change observably) and migrations are mechanical (set `include_full_baseline: true`). The retraction signal section of `core-governance-baseline.md` already names "baseline capture" as a failure mode telemetry could detect — telemetry on `include_full_baseline` usage would catch any regression of the same shape.

**Option A** is the safest if a release this week matters more than alignment. It unblocks the ptxprint-mcp project immediately and gives time to gather telemetry before flipping defaults.

---

## 5. Considerations and Open Questions

### 5.1 Index cache key

The current cache key (visible in trace as `index/v2.4/github_com_Klappy_ptxprint_mcp_<sha>_<sha2>`) appears to be a function of the KB SHA and the baseline SHA. Whatever option ships, the cache key must include the scope mode so different scopes don't collide on the same cached index.

### 5.2 Required-baseline manifest

`core-governance-baseline.md` enumerates required-baseline files in prose (§"Required in Baseline"). Per its Build-Time Invariant #4, a single `workers/baseline/MANIFEST.json` should list them. If that manifest exists, this feature consumes it directly. If it doesn't yet, this feature has a gating dependency on the manifest landing.

### 5.3 Per-tool variation

`orient` worked in the probes; `search` and `preflight` failed. The corpus composition question may not need to be answered identically for all three. `orient` returns a small `canon_refs` list and naturally bias-toward-relevance via the high-level framing; `search` and `preflight` return ranked ordered lists where the dilution math bites hardest. A first cut could ship the flag for `search` and `preflight` only and add `orient` later if telemetry shows demand.

### 5.4 Telemetry signal

Per the existing telemetry governance, any new parameter should be tracked. Suggested fields:
- `search_scope` (the value the caller passed, or default if unset)
- `index_size_at_query` (how many docs the search ranked over)
- `overlay_doc_count` and `baseline_doc_count` separately

This data would let the maintainer tell whether the new default is being adopted, whether `merged` is being explicitly requested, and whether baseline-capture (per `core-governance-baseline.md` §"Failure Modes OF This Contract") is happening at the search layer.

### 5.5 Interaction with `oddkit_baseline_check`

The probe described in `core-governance-baseline.md` §"Baseline Health" reports per-required-file presence. If this feature ships, `baseline_check` should also report whether the search-corpus scope matches the operator's intent — e.g., warn if a project KB has set scope to `kb_only` but is missing required-baseline files that other tools will need.

### 5.6 Documentation pointer

If the feature ships, `core-governance-baseline.md` needs an addendum (or a sibling doc) covering the search-corpus boundary explicitly. The current §"Canon-Only (Never Bundled)" classification should be cross-referenced as the source of truth for what the search index excludes when scoped.

---

## 6. How This Handoff Should Be Used

The maintainer can:

1. **Treat as a GitHub issue.** Copy the body (or sections of it) into a `klappy/oddkit` issue. The probe matrix in §1 is the reproducible evidence; the existing-canon citations in §2 are the rationale; §4 is the design space.

2. **Treat as canon input.** If the next governance epoch is going to address scoped retrieval, this handoff is exploration material that should land in the relevant exploration ledger or feed into a new constraint doc that extends `core-governance-baseline.md` to cover search-corpus composition.

3. **Defer with a documented retraction signal.** If the maintainer believes the current behavior is correct (full baseline merge is intentional, and the failure mode I observed is something else — bad project KB tagging, missing canon articles, etc.), the handoff should be answered with the reasoning so that the ptxprint-mcp project can adapt its KB authoring to fit. In that case, expect this handoff to be re-issued when other consumers (TruthKit, private KBs, etc.) hit the same shape.

The ptxprint-mcp project does not block on this. The autonomous coding run for the v1.2 build proceeds as planned; the agent that drives the deployed server will have degraded canon retrieval until this feature lands or until the project authors enough overlay docs to overwhelm the baseline noise (which is itself a workaround, not a fix).

---

## 7. Provenance

- **Author:** Claude Opus 4.7 (interactive session, 2026-04-28).
- **Operator:** klappy.
- **Method:** Set `knowledge_base_url` on `oddkit_search`, `oddkit_orient`, `oddkit_preflight`, `oddkit_get`, `oddkit_catalog` with the `Klappy/ptxprint-mcp` repo URL. Recorded each response's full envelope including trace, search index size, top-5 hits, and source field. Cross-referenced against the canon docs surfaced in §2.
- **Reproducibility:** Every probe in the matrix in §1 is reproducible by setting `knowledge_base_url=https://github.com/Klappy/ptxprint-mcp` on the corresponding tool call with the listed query string.
- **Containment:** This handoff is not canon for the ptxprint-mcp project and not canon for oddkit. It is a feature request authored from one project's measured experience. The maintainer's response (acceptance, rejection with rationale, or deferral) is what governs.

---

*End of handoff. Companion to the v1.2 spec; references the session's audit findings; addresses the dominant retrieval-quality risk for the v1.2 Definition of Done step #2 ("Construct a valid payload by following canon's payload-construction article" — which requires canon search to actually surface the article).*
