---
title: "Documentation Cleanup Handoff — Sorted Priorities for the ptxprint-mcp Canon Repo"
audience: operator
exposure: working
voice: instructional
stability: working
tags: ["handoff", "documentation-cleanup", "priorities", "audit-followup", "v1.2-bootstrap", "ptxprint-mcp"]
canonical_status: non_canonical
created_at: 2026-04-28T12:30:00Z
companion_to: "canon/handoffs/oddkit-kb-isolation-feature-request.md, canon/specs/ptxprint-mcp-v1.2-spec.md"
derives_from: "audit session 2026-04-28 (KB-as-knowledge-base-url probe matrix)"
target_outcome: "All P0 cleanup applied before the next autonomous coding run, so the canon repo presents a coherent surface to that agent."
---

# Documentation Cleanup Handoff — Sorted Priorities

> **Scope.** This handoff covers the cleanup track only — stale references, supersession markers, structural fixes. New article authoring (the five gating articles) and external feature requests (oddkit KB isolation) are tracked separately. Total estimated effort for P0: ~25 minutes of mechanical edits plus a commit.

> **Why this exists.** An audit session on 2026-04-28 set the ptxprint-mcp repo as `knowledge_base_url` against oddkit and ran ten realistic agent queries. The probe surfaced (a) staleness — handoffs marked open whose work has been applied, (b) supersession gaps — an obsolete font-resolution article presenting as live, and (c) corpus-composition issues separately tracked in the oddkit handoff. This document sorts those findings into prioritized, mechanical work.

---

## 1. Three Tracks (so this handoff stays in its lane)

| Track | What | Where it lives |
|---|---|---|
| **1. Documentation cleanup** (this handoff) | Stale refs, supersession, frontmatter, structural fixes | here |
| **2. New article authoring** | Five gating articles for v1.2 agent-usability | `canon/specs/ptxprint-mcp-v1.2-spec.md` §2, §10; `canon/handoffs/session-3-gaps-handoff.md` §2.2 |
| **3. External (oddkit feature)** | KB isolation flag — stops baseline contamination of search | `canon/handoffs/oddkit-kb-isolation-feature-request.md` |

Tracks 2 and 3 are tracked in their own durable handoffs. This document does not duplicate them.

---

## 2. The Font Docs Question — Answered Directly

The operator asked whether the font docs need a separate handoff. **No.** Reasoning:

The font work splits into two phases:

1. **Mechanical cleanup** — mark `canon/articles/font-resolution-design.md` as superseded; archive it. Belongs in P0 below as a single 5-minute edit.
2. **Authoring the replacement** — `canon/articles/font-resolution.md` is named in the v1.2 spec §2 critical-articles list and the resolution path is captured in `session-3-gaps-handoff.md` §2.2 (carries forward F-Q1, F-Q2, F-Q5, F-Q6 from the session-3 font-resolution thread).

A standalone font handoff would duplicate phase 2 and bloat phase 1. Phase 1 is an item below. Phase 2 stays in the v1.2 spec and the session-3 gaps handoff.

---

## 3. P0 Cleanup Inventory

Four items, sorted by dependency (later items don't block on earlier ones, but applying P0.1 → P0.2 → P0.3 → P0.4 is the cleanest order). All editable by the operator with the bootstrap PAT, or delegable to a small focused session.

### P0.1 — Supersede and archive `canon/articles/font-resolution-design.md`

**What's wrong.** This article (v0.2-draft, 2026-04-28) describes the "Three-MCP Architecture" — content-cache MCP + fonts MCP + thin PTXprint integration. The v1.2 spec D-021 retired that approach (fonts became payload entries fetched at job time; no separate fonts MCP). The article has no `superseded_by` frontmatter field and ranks #3 for queries like "Cloudflare Worker Container Durable Object PTXprint" — agents will read it as live guidance. Its `companion_to` field points at `ptxprint-mcp-v1-spec.md` (now archived) and `transcript-encoded-session-3-1.md` (consolidated into session-3 proper).

**What to do.**

(a) Add to the frontmatter:
```yaml
status: superseded
superseded_by: "canon/articles/font-resolution.md (TODO — see canon/specs/ptxprint-mcp-v1.2-spec.md §2)"
supersession_reason: "v1.2 D-021 absorbed font fetching into the payload schema; the three-MCP design is no longer the build target. Retained as design history."
```

Update the `companion_to` field to point at `canon/specs/archive/ptxprint-mcp-first-pass-poc.md` and remove the dangling `transcript-encoded-session-3-1.md` reference.

(b) Add a top-of-file blockquote immediately after the title:
```markdown
> **Status: superseded.** This article describes a three-MCP architecture that v1.2 D-021 retired. v1.2 makes fonts payload entries fetched and verified by the Container at job time; no separate fonts MCP is built. This article is retained as design history of the path not taken; it is not live guidance. The replacement article `canon/articles/font-resolution.md` (per v1.2 spec §2) is the authoritative source once authored.
```

(c) Move the file to `canon/articles/_archive/font-resolution-design.md` (the `_archive/` location is already foreseen in `canon/PENDING_UPLOADS.md` §4). Update the `canon/README.md` `articles/` description to reflect the `_archive/` subdirectory.

**Effort.** ~5 minutes.

**Commit.** `cleanup: supersede and archive font-resolution-design (v1.2 D-021 retired three-MCP path)`

---

### P0.2 — Update stale handoff and inventory markers

**What's wrong.** Three documents reference work that has since been completed but were never updated:

(a) `canon/handoffs/governance-update-handoff.md` — the 447-line edit list whose changes have been applied (`canon/governance/headless-operations.md` frontmatter declares `v1.2-aligned` and `updated_at: 2026-04-28T04:06:00Z`; the blockquote text matches the handoff's "replace with"). The handoff itself carries no resolution marker.

(b) `canon/handoffs/missing-uploads-handoff.md` — Prompt A asks the slides-ESE session to upload `ptxprint-master-slides.surface.md/.json`, the training manual, and governance Parts 3–12. All four are in the repo (commit `4c84979`). The prompt is now describing solved work.

(c) `canon/PENDING_UPLOADS.md` — the body jumps from the §0 header straight to §4 (sections §1–§3 appear excised mid-edit). The "What's already in the repo" table omits `transcript-encoded-session-3.md` and `canon/articles/font-resolution-design.md` (both committed in `24275fd`).

(d) `canon/README.md` "Status of canon content" — claims "v1.0 and v1.1 are historical and not in the repo" (both are) and "encodings 1–4 are referenced but may not yet be in this repo" (all five are). Lists `articles/` as "planned" while the directory exists.

**What to do.**

For (a): Add a `## Resolution` section at the top of `governance-update-handoff.md`:
```markdown
> **Resolved 2026-04-28.** All edits in this handoff have been applied to `canon/governance/headless-operations.md`. The frontmatter `updated_at: 2026-04-28T04:06:00Z` and the v1.2-aligned blockquote in §0 reflect the integrated changes. This document is retained as a historical record of what was changed; do not re-apply.
```

For (b): Add a similar resolution note at the top of `missing-uploads-handoff.md`:
```markdown
> **Prompt A resolved 2026-04-28.** The slides ESE surface (`canon/surfaces/ptxprint-master-slides.surface.md/.json`), training manual (`canon/derivatives/ptxprint-training-manual.md`), and governance Parts 3–12 + Provenance (`canon/governance/headless-operations.md`) are all committed. Prompt A is no longer needed. Prompts B and C status — verify before reusing.
```

For (c): Restore §1–§3 (or replace them with a single "All resolved" note + the corrected inventory table that includes session-3 encoding and font-resolution-design). Add the two missing entries to the "What's already in the repo" table.

For (d): Update the "Status of canon content" section:
- "Specs: v1.0, v1.1, and v1.2 are all in the repo at `canon/specs/`. The original 17-tool PoC is at `canon/specs/archive/`."
- "Encodings: all five sessions (1–5) are in `canon/encodings/`."
- "Articles: `canon/articles/` exists with one item; the v1.2 gating articles (per spec §2) are not yet authored."

**Effort.** ~10 minutes total across the four files.

**Commit.** `cleanup: mark resolved handoffs, fix stale repo-status references`

---

### P0.3 — Commit the oddkit KB-isolation feature-request handoff

**What's wrong.** The handoff was authored in this session and lives at `/mnt/user-data/outputs/oddkit-kb-isolation-feature-request.md`. It's not yet in the repo.

**What to do.** Place the file at `canon/handoffs/oddkit-kb-isolation-feature-request.md`. Optionally also file a klappy/oddkit GitHub issue linking back to it.

**Effort.** ~5 minutes for the commit; ~5 more minutes if the issue is filed at the same time (the handoff body is already issue-shaped).

**Commit.** `handoffs: oddkit KB-isolation feature request (audit-derived, addresses search-corpus contamination)`

---

### P0.4 — Commit *this* cleanup handoff

**What's wrong.** Same as P0.3 — the deliverable artifact lives at `/mnt/user-data/outputs/documentation-cleanup-handoff.md` and needs to land in the repo to be durable.

**What to do.** Place the file at `canon/handoffs/documentation-cleanup-handoff.md`.

**Effort.** ~3 minutes.

**Commit.** `handoffs: consolidated documentation cleanup priorities (audit-derived)`

---

## 4. P4 Long-Tail (Deferred Until After v1.2 Smoke Test)

These improve search/retrieval quality but are not gating for the v1.2 build. Track here so they don't get lost.

### P4.1 — Split the governance monolith

`canon/governance/headless-operations.md` is 1,182 lines covering Parts 0–12 + Provenance. BM25 dilutes per-section relevance across that mass — the doc never wins specific queries. Twelve focused files (`headless-contract-part-0.md`, `cli-reference-part-1.md`, etc., or topical names) would each rank #1 for their topic. Estimated effort: 2–3 hours of careful splitting + cross-link audit.

Alternative cheap version: leave the doc whole but add per-Part h2 anchors with topic-specific tags so search can target sections. ~30 minutes; partial fix; revisit if insufficient.

### P4.2 — Audit frontmatter tags against natural agent queries

Rule: every tool name (`submit_typeset`, `cancel_job`, `get_upload_url`, `get_job_status`), every payload field (`config_files`, `sources`, `fonts`, `figures`, `mode`, `define`), and every operational concept (`autofill`, `simple-typesetting`, `cache-hit`, `cancellation`, `failure-mode`, `hard-failure`, `soft-failure`) should appear as a tag on at least one doc that authoritatively explains it. This is what makes BM25 surface the right docs against natural-language queries. Estimated effort: ~45 minutes for a single careful pass across the existing 19 indexed docs.

Note: this is most leveraged AFTER the new gating articles land (Track 2), since those articles are where the tags should accumulate. Do P4.2 once Track 2 is well underway.

---

## 5. Recommended Sequencing

```
Tonight (operator, ~25 min mechanical)
  └─ P0.1 → P0.2 → P0.3 → P0.4
     (After commit, verify with: oddkit_search "submit_typeset payload"
                                  knowledge_base_url=https://github.com/Klappy/ptxprint-mcp
                                  Expect: stale font-resolution-design no longer ranks as live)

Parallel during the autonomous build (separate session)
  ├─ Track 2 — start with P1.4 (payload-construction.md) and P1.5 (output-naming.md)
  │   from v1.2 spec §10's "Critical-path canon work" — these unblock DoD step #2
  ├─ Track 3 — file oddkit-kb-isolation handoff as klappy/oddkit GitHub issue
  └─ session-3-gaps-handoff §3 — delegate the deferred ESE-vs-v1.2 gap analysis

After the smoke test passes (sequence)
  ├─ Track 2 — P2.6 failure-mode-taxonomy.md (highest leverage for downstream agents)
  ├─ Track 2 — P2.7 config-construction.md
  ├─ Track 2 — P2.8 font-resolution.md (replaces the archived font-resolution-design)
  ├─ P4.2 frontmatter tag audit
  └─ P4.1 governance doc split (cheap version first; full split if needed)
```

---

## 6. Carry-Overs from Prior Handoffs (Cleanup-Track Subset Only)

These are still owed; they don't have a natural home in any specific cleanup item above. Tracking here so they aren't lost.

| ID | Origin | What | Status |
|---|---|---|---|
| H-005 | session 2 | Verify ptx2pdf licence before mirroring docs from `sillsdev/ptx2pdf/docs/documentation/` | Still owed; gates any canon content copied from upstream. ~5 minutes (read LICENSE at repo root). |
| H-006 | session 2 | Filter the operator's ~1000-config corpus for sensitivity before agent ingestion | Still owed; non-blocking for v1.2 build because the corpus isn't the smoke-test fixture. |
| H-009 / F-Q3 | session 3 | Verify clean Ubuntu container with no `fonts-*` packages | Belongs to Track 2 / Dockerfile work, not cleanup. Mentioned here only to confirm it's not lost. |

---

## 7. How to Use This Handoff

Three options, ordered by speed:

1. **Operator runs P0 directly tonight.** ~25 minutes of mechanical edits with a text editor + git push. The frontmatter changes are small, the resolution notes are short, and the file moves are obvious. This is the fastest path to a clean canon surface for tomorrow's run.

2. **Delegate P0 to a focused session.** The four items are mechanically independent; a session given this handoff and the bootstrap PAT can apply all four in one pass. Estimated session length: 30–40 minutes including verification.

3. **Defer P0 and accept the canon's current presentation for the autonomous build.** The autonomous coder reads the v1.2 spec by URI (which works) and builds against it. The stale font article will not appear in the spec it's reading. The risk is the *next* agent — the one driving the deployed server — encountering the obsolete article through search. That risk is bounded by the deployed agent also having access to the v1.2 spec by URI; if it's reasoning carefully, it cross-references and detects the inconsistency. This is acceptable as a deferral if other priorities crowd the operator tonight, but P0.1 specifically is a 5-minute edit that meaningfully reduces downstream confusion and should not be deferred without reason.

P4 items are explicitly deferrable; do not attempt them before the smoke test passes.

---

## 8. Provenance

- **Author:** Claude Opus 4.7 (interactive session, 2026-04-28).
- **Operator:** klappy.
- **Source audit:** Same session that produced `oddkit-kb-isolation-feature-request.md`. Empirical evidence (probe matrix) lives there; this handoff carries forward only the cleanup-track conclusions.
- **Correction applied during authoring:** The audit's earlier "P0.3 — resolve 19-vs-24 indexing gap" item was based on a miscount. Re-verification (`find canon/ -name '*.md'` + frontmatter check) shows the actual count is 19-of-22, with the three unindexed files (`README.md`, `CONTRIBUTING.md`, `canon/specs/archive/ptxprint-mcp-first-pass-poc.md`) deliberately and correctly excluded from the search index. That item was dropped from this handoff.
- **Containment:** Non-canonical. This is a working document that should be marked resolved (similar to the resolution markers it asks the operator to add to other handoffs) once the P0 items have landed, and ultimately deleted once P4 is also complete or explicitly punted.

---

*End of handoff. Companion artifacts: `oddkit-kb-isolation-feature-request.md` (Track 3), `ptxprint-mcp-v1.2-spec.md` §2 + §10 (Track 2 scope).*
