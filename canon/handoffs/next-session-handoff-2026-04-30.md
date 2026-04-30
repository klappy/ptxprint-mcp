---
title: "Next-Session Handoff — Telemetry Feature (post-2026-04-30 session)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["handoff", "session-handoff", "telemetry", "v1.3", "next-session", "pr-queue", "open-decisions"]
date: 2026-04-30
session_summary: "Designed, governed, drafted, reviewed, and revised the telemetry feature for PTXprint MCP. Resolved H-T3 with the operator's spec-lock principle (now canon). Reverted a session-internal principle violation. Encoded the principle on klappy.dev. Five PRs open across two repos at handoff."
status: active
governs: "what the next session reads first when continuing telemetry-feature work"
---

# Next-Session Handoff — Telemetry Feature

> **Read this first if you're continuing the telemetry-feature work that started 2026-04-30.** This is a forward-looking session artifact, not a binding contract — per `klappy://canon/principles/contract-governs-handoff-drift`, when this disagrees with canon, canon wins. Verify any claim here against the underlying canon before acting on it.

---

## TL;DR

Over one session on 2026-04-30, the telemetry feature for PTXprint MCP went from "operator-confirmed planning decisions" to "ready for implementation." Five PRs are open across `klappy/ptxprint-mcp` and `klappy/klappy.dev`. The contract for the next implementer is the new v1.3 spec; the policy they implement is the governance article; the principle that scopes how all of it can change is now canon. The next session's first concrete work is either (a) PR triage with the operator, or (b) starting H-T5 (the actual telemetry-module code) once the operator approves.

---

## The Five Open PRs (in priority order)

| # | Repo | Title | What it does | Blocked on |
|---|---|---|---|---|
| **#26** | ptxprint-mcp | Apply H-T2 review revisions: 2 blockers + 3 nits | Fixes B-1 (failure_mode citation), B-2 (phase enum framing), N-1 (oauth value restored), N-2 (three-tier fallback documented), N-3 (stale `canon/constraints/` paths in planning ledger). Updates the article's `status: draft_pending_fresh_review` → `status: reviewed` | Operator review/merge |
| **#27** | ptxprint-mcp | Spec v1.3: telemetry layer over v1.2 (resolves H-T3) | The v1.3 spec — full standalone re-spec, supersedes v1.2. Adds the two telemetry tools, the internal Worker telemetry route, the redaction module, the three-tier policy fetch | Operator review/merge |
| **#28** | ptxprint-mcp | Revert H-T4 edits to v1.2 spec (apply spec-lock principle) | Restores v1.2 spec to its pre-H-T4 state. Removes the telemetry tool subsections that should never have been added retroactively | Operator review/merge |
| **#159** | klappy.dev | Add tier-2 principle: Specs Lock at Implementation (canon 0.37.0, E0008.6) | New canon principle articulated by the operator and immediately applied (via #28). Includes canon version bump and changelog entry | Operator review/merge; epoch numbering tentative |
| **(this)** | ptxprint-mcp | Next-session handoff doc | This file. Tiny PR, can be merged or closed once read | Read only |

PRs #26, #27, #28 form a coherent set on `klappy/ptxprint-mcp`. Merge order recommendation: #26 → #28 → #27 (revisions land first; revert lands second; v1.3 spec lands last and supersedes the now-clean v1.2 spec). #159 is independent and can land any time.

---

## Outstanding Handoffs from the Planning Ledger

From `canon/encodings/telemetry-feature-planning-ledger.md`, the H-T* handoffs status:

| ID | Status | Where it lives now |
|---|---|---|
| H-T1 — Draft governance article | ✅ Done | `canon/governance/telemetry-governance.md` (status: reviewed) |
| H-T2 — Fresh-session review of governance article | ✅ Done | Managed-agent dispatched, PR #25 merged, revisions in PR #26 |
| H-T3 — Decide v1.2 amendment vs. v1.3 spec | ✅ Resolved | v1.3 spec (PR #27); operator's principle now canon (PR #159) |
| H-T4 — Update tool count claims | ⚠️ Partially undone | Original H-T4 commit (`ae4e60c`) over-reached and edited the implemented v1.2 spec; PR #28 reverts the v1.2 portion; `ARCHITECTURE.md` and `README.md` portions intentionally kept |
| **H-T5 — Mirror oddkit's Query Security Boundary guards in code** | 🔜 Next | Not started. Implementation-time concern. v1.3 spec §6.4 has the code sketch |

H-T5 is the next concrete work. It is not the only piece of v1.3 implementation — the full v1.3 implementation is enumerated in v1.3 spec §11 ("First Execution Scope"):

- Add two MCP tool routes (`telemetry_public`, `telemetry_policy`) to `src/index.ts`
- Add `src/telemetry.ts` (writer + redactor + policy fetcher + public-query forwarder)
- Add `POST /internal/telemetry` Worker endpoint
- Add telemetry envelope helper to `container/main.py` + phase + terminal hooks
- Update `wrangler.jsonc` with the analytics_engine_datasets binding
- Add `scripts/bundle-telemetry-policy.ts` build step
- Configure `CF_ACCOUNT_ID` and `CF_API_TOKEN` as secrets
- Smoke-test all 8 DoD items from v1.3 spec §10

Whether to dispatch this as one autonomous coding run or split it across multiple is the operator's call.

---

## Pending Operator Decisions

These were surfaced and not closed in this session:

1. **Epoch numbering on PR #159.** I picked `E0008.6` as a new sub-epoch for "Spec-Lifecycle Discipline." Alternatives: fold into E0008.5 or jump to E0009. Both the principle file frontmatter and the changelog entry need the same single-string update if changed.

2. **Pre-existing staleness in v1.2 spec.** §1 vodka and §5 Architecture/Worker still claim "three MCP tools" even though the implemented surface is 4 (docs added in session 13, also after-implementation). Reopening this would compound the same principle violation that PR #28 fixes. Recommendation: leave it alone — v1.3 supersedes anyway, and the principle that just landed in canon is precisely what would prevent this kind of fix-after-implementation.

3. **When to start H-T5 (the v1.3 implementation work).** Could be triggered as soon as PRs #26/#27/#28 are merged. Could wait for an explicit kickoff. The v1.3 spec deliberately does not declare a start signal — that's the operator's call per the spec-lock principle (the spec being locked is the precondition for handing it to an implementer).

---

## What This Session Learned (for future reference)

Three patterns that worked and are worth reusing:

1. **Managed-agent dispatch for fresh-session review (H-T2).** A `claude-sonnet-4-6` agent with the project's epistemic posture in its system prompt, reading the article and three authority documents, completed a flag-happy review in ~7 minutes wall-clock and caught two real blockers + three real nits. The pattern: dispatch via `mnt/skills/user/managed-agents/SKILL.md`, write the review to `canon/handoffs/`, the encoded ledger to `canon/encodings/`, and create a PR. See PR #25 and the agent's review at `canon/handoffs/telemetry-governance-h-t2-review.md`.

2. **Surfacing pending operator decisions in PR descriptions, not asking inline.** When a follow-up question would have interrupted execution flow, putting it in the PR description as "Open question for you" let the operator triage on their own time without slipping out of execution mode. Used in PRs #27, #28, and #159.

3. **Independent verification before applying a reviewer's findings.** PR #26's commit message documents that I re-checked B-1 and B-2 against canon (spec line 141, line 427, taxonomy line 33) before applying the fixes. Trust-but-verify even when the reviewer is independent.

One pattern to avoid in future sessions:

4. **Don't edit specs after implementation, even for "harmless" syncing.** My H-T4 commit (`ae4e60c`) edited the v1.2 spec to add references to not-yet-built telemetry tools — the exact pattern the new principle says shouldn't happen. The operator caught it and the revert is PR #28. Lesson: when a spec describes an implemented surface, additions go in vN+1, period. The principle that landed as canon (`klappy://canon/principles/specs-lock-at-implementation`) is the durable record of this lesson.

---

## Recommended First Action for the Next Session

1. Call `oddkit_time` first (project rule).
2. Declare mode (project rule). Most likely "Planning" if you're triaging the PR queue with the operator, or "Executing" if the operator has already greenlit something.
3. Check the PR queue status — `curl -s "https://api.github.com/repos/klappy/ptxprint-mcp/pulls"` and `curl -s "https://api.github.com/repos/klappy/klappy.dev/pulls"` with the PAT will tell you which PRs are still open and which got merged after this handoff was written.
4. If the operator says "continue with H-T5" or "start the v1.3 implementation," read v1.3 spec §11 first and decide whether to dispatch as one managed-agent coding run or split. Either way, a fresh-session validator (per `klappy://canon/principles/verification-requires-fresh-context`) reviews the implementation before merge.
5. If the operator wants to talk through anything before more code lands, you have the context to engage substantively without re-reading the whole conversation.

---

## Durable Artifacts Produced This Session

These live in canon and are searchable via `oddkit_search` with `knowledge_base_url=https://github.com/klappy/ptxprint-mcp`:

- `canon/encodings/telemetry-feature-planning-ledger.md` — the design decisions (D-T1..D-T7, O-T1..O-T3, L-T1..L-T2, C-T1..C-T4, H-T1..H-T5) the whole feature derives from. H-T3 entry includes the resolution.
- `canon/governance/telemetry-governance.md` — the policy article (status: reviewed). The schema, privacy floor, canned queries, transparency leaderboard.
- `canon/handoffs/telemetry-governance-h-t2-review.md` — the fresh-session reviewer's findings.
- `canon/encodings/h-t2-fresh-review-ledger.md` — DOLCHEO+H ledger of the review session.
- `canon/specs/ptxprint-mcp-v1.3-spec.md` — the new build contract (PR #27, not yet merged at handoff time).
- `canon/handoffs/next-session-handoff-2026-04-30.md` — this file.

On `klappy.dev` (searchable as klappy.dev baseline canon):

- `canon/principles/specs-lock-at-implementation.md` — the new tier-2 principle (PR #159, not yet merged at handoff time).
- `canon/CHANGELOG.md` — entry for canon 0.37.0 (PR #159).

---

*End of handoff. Continue from "Recommended First Action" above.*
