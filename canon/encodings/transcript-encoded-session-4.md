---
title: "PTXprint MCP Server — Transcript Encoding Session 4 (2026-04-28 Late Night)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "transcript", "dolceho", "vodka-architecture", "first-principles", "session-4"]
extends: "transcript-encoded-session-3.md"
encoded_at: 2026-04-28T03:08:00Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/principles/kiss-simplicity-is-the-ceiling
  - klappy://canon/principles/dry-canon-says-it-once
  - klappy://canon/bootstrap/model-operating-contract
companion_artifact: "ptxprint-mcp-v1.1-spec.md"
---

# PTXprint MCP Server — Transcript Encoding Session 4

> Continues sessions 1, 2, 3. Session 4 was a brief course correction: the operator asked whether the v1.0 spec's 10-tool list was first-principles or refactored from the PoC. Honest answer: refactored. Operator confirmed the original exploration recommended 5–6 tools and authorised a clean redo with the post-discovery additions (job queue, fonts) growing legitimately. Result: v1.1 spec (7 tools) + two gating canon articles. New IDs continue from session 3.

---

## D — Decisions

### D-015 — v1.0 spec is replaced by v1.1 derived from first principles
The v1.0 spec presented its 10 tools as a vodka-correct surface. On reinspection, two tools (`update_cfg_value`, `resolve_config`) encoded PTXprint-specific opinion in server code, and the overall shape was a refactor of the 17-tool PoC rather than a clean derivation. v1.1 redoes the surface from the question: "what is the minimum set of generic primitives an agent needs from a server to drive PTXprint?"

**Operator confirmation:** *"Our discovery exploration was that a fresh first principles vodka approach recommended 5–6 tools. I understand later the job queue and fonts might be a new surface. So growing from first principles makes sense with what you just listed. This looks cleaner and worth landing and separating more to the KB governance articles."*

**Cross-ref:** *supersedes* v1.0; *applies* `klappy://canon/principles/vodka-architecture`

### D-016 — `update_cfg_value` and `resolve_config` move to canon as governance articles
Both encode PTXprint-specific behaviour:
- `resolve_config` encodes the `[import] config = X` walk, which is PTXprint's inheritance rule (other systems would have different rules)
- `update_cfg_value` encodes configparser-correct INI editing semantics (comment policy, override-file interaction)

Both are reproducible by the agent over `read_file` + `write_file` if canon documents the algorithm. v1.1 ships the two articles as gating canon work; without them the agent cannot reproduce what these tools used to do.

**Companion artifacts:** `canon-ptxprint-config-inheritance.md`, `canon-ptxprint-cfg-safe-editing.md`.

### D-017 — `delete_file` deferred to v2
Real-world agent workflows rarely need to delete files. Deferring saves a small amount of code and a small attack surface. Trivial to add later if usage shows demand.

### D-018 — `list_projects` and `list_configs` collapse into `list_files`
Both are listings. `list_files(project_id?, relpath?)` covers all three cases: no args lists projects-root, project_id only lists project root, both lists within sandbox. The Paratext-folder filtering convention (`_*` and `.*` exclusions) moves to a canon article on discovery patterns.

### D-019 — Read-only awareness of `ptxprint_project.cfg` / `ptxprint_override.cfg` is in v1.1 scope
The slides ESE (session 3.5; companion artifact `ptxprint-master-slides.surface.md`) found that PTXprint's override files are documented as live shipping mechanisms in slide 429 of the MASTER SLIDES deck. The v1.0 spec's §10 deferral marked them "may be deprecated upstream; not exposed" — incorrect. v1.1 keeps writes deferred but adds read-only awareness so canon-driven cfg edits can warn users when an override would silently shadow their change.

**Cross-ref:** *contradicts* v1.0 §10; *applies to* canon-ptxprint-cfg-safe-editing.md "Override-File Awareness" section.

---

## O — Observations

### O-015 — Refactor-style "vodka-isation" carries domain opinion across the boundary invisibly
The v1.0 spec went from 17 tools to 10 by trimming, renaming, and consolidating, and labelled the result "vodka." But the migration table in v1.0 §7 itself proves the descent: every v1.0 tool maps to one or more PoC tools. The shape was inherited. Two domain-flavored helpers slipped through under the labels "epistemic discipline" and "ergonomic." A first-principles re-derivation catches what a refactor cannot: the right question is *whether the tool should exist*, not *whether the tool's PoC-equivalent should be renamed*.

### O-016 — The right tool count emerges from the load-bearing question
Asked first-principles: "what does the agent fundamentally need from the server that no other primitive can provide?" — answer arrives as **3 file primitives + 3 job-lifecycle primitives + 1 asset-fetch primitive = 7**. The 5–6 the operator's original exploration recommended was for a sync-only render world. Async-by-default (D-005) split render into 3, fonts (D-014) added 1; net 7. The growth from 5–6 to 7 is each new tool earning its place against the test "no other primitive can do it."

---

## L — Learnings

### L-008 — A spec presented as first-principles must be derivable from first principles, not labelled so
Naming a surface "vodka" or "first-principles" is cheap; deriving it from the question that discriminates load-bearing from convenience is not. The honest test for any future spec revision: can the spec be reproduced by someone reading only the project's foundational principles, with no access to the prior version? If not, it's a refactor, and that's fine — but call it a refactor.

### L-009 — Canon articles can absorb removed server tools without functionality loss
The two articles drafted as part of v1.1 (`ptxprint-config-inheritance.md`, `ptxprint-cfg-safe-editing.md`) demonstrate the pattern: take the algorithm the server tool was running, write it down for the agent to execute over generic primitives, name the edge cases and pitfalls. The result is more durable than the tool — canon can grow ("here's what to do when comments matter") without server churn, and the agent's understanding of *why* deepens because the algorithm is in plain view.

---

## C — Constraints

### C-010 — Authoring the two gating canon articles is on the v1.1 critical path
The §8 Definition of Done for v1.1 requires the agent to accomplish, via canon-driven patterns, what the removed `update_cfg_value` and `resolve_config` tools did. Without canon, the v1.1 server is non-functional for cfg-editing workflows. Authoring the two articles is gated work, not parallel work.

---

## H — Handoffs

### H-007 — Author the two gating canon articles before tomorrow's autonomous run
The sketches in `canon-ptxprint-config-inheritance.md` and `canon-ptxprint-cfg-safe-editing.md` are starting points. They need:
- Operator review for technical accuracy (especially the override-file precedence — flagged in both as needing PTXprint source confirmation)
- Placement in the canon repo at the right path (per session 2 D-006)
- Frontmatter aligned with the canon repo's conventions (oddkit-search-friendly tags)

### H-008 — Verify override-file precedence against PTXprint source
Both new canon articles flag uncertainty about the exact precedence order between `[import]` chain, `ptxprint_project.cfg`, and `ptxprint_override.cfg`. The conservative behaviour suggested in the inheritance article ("warn the user about any key that overrides touch") is safe but coarse. Reading PTXprint source would let canon describe the precise order, and the agent could be more surgical about warnings.

### H-009 — Pull session 3 + slides ESE artifacts + session 4 into `/mnt/project/` before tomorrow's run
The autonomous run needs context. Currently in `/mnt/user-data/outputs/`:
- `transcript-encoded-session-3.md`
- `font-resolution-design.md`
- `ptxprint-master-slides.surface.json` / `.md`
- `ptxprint-training-manual.md`
- `ptxprint-mcp-v1.1-spec.md`
- `canon-ptxprint-config-inheritance.md`
- `canon-ptxprint-cfg-safe-editing.md`
- `transcript-encoded-session-4.md` (this file)

All should be visible to tomorrow's session.

---

## Q-open — Open Questions

| ID | Question | Resolution path |
|---|---|---|
| Q-open-8 | Exact override-file precedence (`[import]` chain vs `ptxprint_project.cfg` vs `ptxprint_override.cfg`) | Read PTXprint source; encode in canon. (H-008) |
| Q-open-9 | Does `list_files` ergonomics suffer measurably without a dedicated `list_projects`? | Real agent runs will tell. Cheap to re-split if needed. |
| Q-open-10 | Should the two canon articles live at `canon/articles/ptxprint-*` or under a different path scheme in the canon repo? | Operator to confirm canon repo layout before finalising. |
| Q-open-11 | Comment-preservation default for cfg edits — should v1.1 ship with Option A (regex) as primary or Option C (accept comment loss) as primary? | Operator preference. v1.1 sketches lean toward C as primary with A as opt-in; revisit after first real run. |

---

## Cross-Reference Summary — Sessions 1, 2, 3, 4

| Prior session item | Session 4 outcome |
|---|---|
| Session 2 D-011 (10-tool surface, soft commitment) | **Reversed.** v1.1 lands at 7 tools after first-principles re-derivation. |
| Session 3 D-014 (one new tool: `install_fonts`) | Reaffirmed and carried into v1.1 |
| Session 3 C-007 (no `fonts-*` apt packages) | Reaffirmed in v1.1 §5 |
| Session 3 design-doc-only scope | Reaffirmed; v1.1 is also design-only ahead of tomorrow's run |
| Session 1 H-002 (gap-analyze ESE vs first-pass spec) | **Closed.** v1.1 is the gap-analysis result. |
| Session 2 D-004 (action-only MCP, no bundled retrieval) | Reaffirmed and reinforced — canon now carries strictly more weight |
| Session 2 H-005 (verify ptx2pdf licence before mirroring docs) | Still owed |
| Session 2 H-006 (filter 1000-config corpus) | Still owed |
| Slides ESE finding (override mechanism is shipping, not deprecated) | Incorporated as D-019 |

---

*End of session 4 encoding. Companion: `ptxprint-mcp-v1.1-spec.md`.*
