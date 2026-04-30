---
title: "PTXprint MCP Server — Transcript Encoding Session 15 (2026-04-30 bundled-default-cfg landing)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "transcript", "dolcheo", "session-15", "bundled-default-cfg", "progressive-customization", "phase-0", "vodka-architecture", "supersession"]
extends: "canon/encodings/transcript-encoded-session-14.md"
encoded_at: 2026-04-30T20:10:00Z
session_window: "2026-04-30T18:10Z–2026-04-30T20:10Z (session 15; ~120 min wall-clock; planning + smoke test + canon authoring + two merged PRs + discoverability validation)"
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
mode_at_open: exploration
mode_at_close: validation
---

# PTXprint MCP Server — Transcript Encoding Session 15

> Continues sessions 1–14. Session 15 opened with an open question — *should the upstream cfg be a template, or something else?* — and converged on **the Phase-0 floor**: `{books, sources}` is the smallest valid payload, the Container bundles the upstream cfg, and a Level-0 → Level-5 progressive-customization ladder replaces the "POC" framing. Two PRs landed and merged (#34 + #35). Mechanical discoverability validated via three docs queries. Container PR remains as the open work item for the next session.

---

## Priority bands

- **P1** — Container PR per `klappy://canon/handoffs/bundle-default-cfg-handoff` lands; smoke test asserts Phase-1-strict (`{books, sources}` only) succeeds against the rebuilt Container.
- **P2** — Fresh-context validation after the Container PR merges. New session issues *"Render BSB John using the smallest possible payload,"* observes whether the agent walks the new ladder unaided.
- **P3** — Optional canon polish: reframe `canon/templates/english-single-book.md` as a Level-4 example; update `canon/README.md` article count (now 21 articles after this PR + session ledger).

---

## DOLCHEO log

### Session open — orientation

- **[O]** Session opened against a question: operator uploaded an upstream PTXprint default cfg (`ptxprint.cfg`, 9177 bytes, 25 INI sections, ~400 keys, version stamp `2.9.9-gc5521963`, schema `2.24`, `printcount = 15`) and asked whether it should land as a template or something else.
- **[O]** Initial Claude recommendation: land as a reference article first, then promote to template after smoke render passes. Operator redirected: *"let's take a journey to test this config as the only special file sent."*
- **[D]** Empirical-validation-before-architecture. Test the cfg first against the running worker before deciding what to do with it. Rationale: avoid speculating about what the cfg produces when we can just submit it and see.
- **[E]** Mode declared as exploration; preflight not strictly required (no canon-producing artifact yet); proceeded to test.

### Empirical validation phase

- **[O]** Test 1 (cfg-only payload): submitted with `config_files` containing the uploaded cfg + BSB JHN USFM source (`44JHNBSB.usfm`, sha256 `f6220aa81c8143cb66a86d775fa3cdfe10efcb52dad135dfc498baeac260103d`). Result: `succeeded` in 14.8 s. 37-page PDF/X-4, 377 KB, 0 errors, 0 overfull boxes, 22 of 37 underfilled pages. Payload hash `d37778c8c2467a07e395718fe1a3477f25cec7b8a55dfd4927af72bee75ba29d`. PDF cached at `https://ptxprint-mcp.klappy.workers.dev/r2/outputs/d37778c8.../BSB_Default_JHN_ptxp.pdf`.
- **[O]** Test 2 (Phase-1 strict — empty `config_files`): same payload minus the cfg. Result: `failed`, `failure_mode: hard`, `errors[0] = "PTXprint produced no output (silent exit). Likely cause: missing config_files or invalid project layout."` 2.9 s, exit_code 0. Payload hash `523d86b14233a6aa95b79cbaf809eb8264357023c381cfae199cfbd5c3c615aa`.
- **[L]** Canon's claim that *"PTXprint runs with built-in defaults; the Container has Charis SIL pre-installed"* is empirically false in the first half. The Container **does** have Charis bundled, but PTXprint does not produce a renderable project from compiled-in defaults alone — a `ptxprint.cfg` at the project's Default config path is structurally required.
- **[L]** The cfg-only payload produces publication-quality output: clean A5 two-column body in Charis, drop cap on chapter 1, italic section heads with parallel-passage references, alphabetic footnote callers, mirror-layout running header. Looks like a real published Bible. The empirical baseline is much better than the "bare defaults" Phase-1 anticipated.

### Architecture phase

- **[L]** The vision crystallized from the operator: *"HOW DO WE JUST MAKE THIS DEFAULT AND NOT REQUIRE ANYTHING ELSE!?!?! send a USFM and get this! docs tool teaches changes."* Translated into architecture: Container bundles the upstream cfg as install-time default; Worker stays opinion-free; progressive customization happens via `define` (Level 1), full cfg replacement (Level 2), fonts (Level 3), stylesheets (Level 4), figures (Level 5).
- **[D]** The cfg lives in canon, not the Container repo. Source of truth: `canon/articles/bundled-default-cfg.md`'s fenced ` ```ini ` block. Per `klappy://canon/principles/dry-canon-says-it-once`, exactly one home; the Container build derives.
- **[D]** Worker stays opinion-free. Defaulting happens entirely in the Container. No Worker code change; vodka-architecture boundary preserved.
- **[D]** Composition is **replace-only**. When the caller supplies `config_files["shared/ptxprint/Default/ptxprint.cfg"]`, that fully replaces the bundle. No section-level merge. Per-key tweaks go through `define = {...}`. Rationale: matches existing schema; avoids silent partial-merge surprises; keeps Container runner under 10 lines of staging logic. Reversibility: PTXprint's native `[import] config = Parent` inheritance is documented as a deferred future evolution if real callers ask for partial overlay.
- **[D]** Bundle scope is the cfg only. No Settings.xml, no `ptxprint.sty`, no `ptxprint-mods.sty`, no fonts manifest. Empirically validated by Test 1's success with the cfg as the only `config_files` entry.
- **[C]** No bundle-scope creep without a smoke-test driven justification. If a future render uncovers a missing-asset failure for non-Latin scripts or complex peripherals, that is a separate handoff with its own empirical baseline.
- **[C]** No Worker-side defaulting. The Worker stages exactly what the caller sent. If implementation needs Worker-touching schema validation around the bundle, that surfaces in the Container PR's post-execution report and pauses for review.
- **[E]** Architectural decisions encoded into `canon/handoffs/bundle-default-cfg-handoff.md` with explicit "Architectural decisions (already made — do not relitigate)" section so future implementers don't re-derive them.

### Drafting phase

- **[O]** Five files drafted at `/mnt/user-data/outputs/canon-updates/`:
  - `canon/articles/bundled-default-cfg.md` (645 lines) — source of truth, cfg embedded in fenced ` ```ini ` block, anatomy table, known characteristics (underfill rate ~59%, hard-coded `book = JHN`, `[vars]` absence, license/colophon contradiction).
  - `canon/articles/progressive-customization.md` (307 lines) — Level 0 → 5 ladder, docs queries per level.
  - `canon/articles/payload-construction.EDIT.md` (85 lines) — instructions to replace the now-falsified Phase-1 caveat box with a Quickstart pointing at progressive-customization.
  - `canon/articles/phase-1-poc-scope.EDIT.md` (89 lines) — instructions to add supersession frontmatter + redirect note while preserving the body for historical traceability.
  - `canon/handoffs/bundle-default-cfg-handoff.md` (309 lines) — Container implementation contract with two implementation paths (Path A: PTXprint install-time defaults; Path B: Container-side staging script), vodka constraints with tests, smoke-test contract, definition of done with fresh-context validation requirement.
- **[O]** Cfg embedded in `bundled-default-cfg.md` verified byte-identical to operator's upload (one trailing-newline difference, functionally equivalent).
- **[L]** The `EDIT.md` files are scaffolding artifacts — they don't land in canon; they communicate intent for in-place edits to existing articles. PR-2 commits the resulting article changes, not the EDIT.md instructions.

### PR landing phase

- **[D]** Two-PR split chosen over single-PR or three-PR alternatives. PR-A (#34) drops in three new files; PR-B (#35) applies in-place edits to two existing articles. Container PR is a separate workstream owned by whoever implements the bundling. Rationale: PR-A and PR-B are reviewable independently; PR-B's edits reference articles added in PR-A so the dependency is one-way and clean.
- **[O]** PR #34 opened: `feat(canon): bundled default cfg + progressive customization ladder`. Branch `feat/bundled-default-cfg-and-progressive-customization` → `main`. Diff `+1261 / −0`, 3 new files. Mergeable. URL: `https://github.com/klappy/ptxprint-mcp/pull/34`.
- **[O]** PR #35 opened: `docs(canon): align payload-construction + supersede phase-1-poc-scope`. Branch `docs/supersede-phase1-update-payload-caveat` → `main`. Diff `+16 / −6`, 2 in-place edits. Mergeable. URL: `https://github.com/klappy/ptxprint-mcp/pull/35`.
- **[O]** Cross-link comment posted on #34 announcing #35 with merge-order recommendation.
- **[O]** Both PRs merged by operator. Merge commits: #34 → `fbc0704`, #35 → `bd4e791`. Main is now at `bd4e791`.

### Validation phase — mechanical discoverability

- **[O]** Q1 ("render a Bible") via `oddkit_search` against `https://github.com/klappy/ptxprint-mcp` with `result_grouping: overlay_first`: PASS. `progressive-customization.md` ranked #1 with score 10.42 (next: 6.98 for `english-single-book` template). `bundle-default-cfg-handoff.md` also surfaced at rank 5. Index built against merge commit `bd4e791`. Total docs: 66 overlay + 6 baseline = 72.
- **[O]** Q2 ("phase 1 minimum payload"): `phase-1-poc-scope.md` ranked #1 with score 8.51. `progressive-customization.md` did NOT appear in top 5.
- **[L]** Initial expectation for Q2 was wrong. The criterion *"progressive-customization should rank above phase-1-poc-scope"* would have been a search-ranking inversion that breaks the supersession redirect pattern. The pattern by design is: queries using **old terminology** route to the **old article**, whose snippet leads with the supersession admonition (`🛈 Superseded. → progressive-customization`) so the redirect is visible at depth=1 (snippet level) without a full fetch. Forcing the new article to rank higher on old-terminology queries would actually **break** the journey, not improve it.
- **[L]** Corrected validation criterion for supersession: *"the rank-1 result for an obsolete term immediately tells the reader where to go now — via frontmatter `status: superseded` + body redirect note in the snippet."* Q2 passes by this corrected criterion. Frontmatter shows `status: superseded`, `superseded_by: klappy://canon/articles/progressive-customization`. Snippet is the redirect admonition itself.
- **[O]** Q3 (bonus, forward-looking — "smallest payload minimum default"): `payload-construction.md` ranked #1 (5.36), `phase-1-poc-scope.md` #2 (5.33, with supersession admonition in snippet), `config-construction.md` #3 (4.13). Both top results lead the reader to the new framing. The new payload-construction Quickstart (from #35) is winning forward-looking queries.
- **[O]** Q3's index showed `docs_considered: 55` (overlay 49) vs. Q1/Q2's 66 — a transient cache miss / index rebuild between queries. New content still ranked correctly mid-rebuild, so discoverability is robust to index churn.
- **[E]** Discoverability validation encoded into this ledger; mechanical loop closed. Deep adequacy validation (would a fresh agent walk the ladder unaided) explicitly NOT closed in this session per `klappy://canon/principles/verification-requires-fresh-context`.

### Session close — encoding

- **[D]** Encode session as DOLCHEO ledger and land via PR (this artifact). Rationale: per `klappy://canon/definitions/dolcheo-vocabulary`, ledger captures decisions, observations, learnings, constraints, handoffs, encodes, and open items so the next session has a clean entry point. Per `klappy://docs/oddkit/proactive/encode-does-not-persist`, encoding to file (and PR-merging the file) is what makes the artifact durable.
- **[E]** This ledger crystallizes the session's D/O/L/C/H/O-open into one document. Quality: comprehensive but self-authored — fresh-context review would strengthen it. Persistence: file committed and PR-landed (the third PR of this session).

---

## Constraints carried forward

- **[C]** `klappy://canon/principles/vodka-architecture` — Worker holds zero PTXprint domain opinion. The Container holds bundling logic; the Worker passes payloads through unchanged. This was preserved by both PRs landed in this session and is the load-bearing constraint for the upcoming Container PR.
- **[C]** `klappy://canon/principles/dry-canon-says-it-once` — the bundled cfg has exactly one home (`canon/articles/bundled-default-cfg.md`). Container build derives. If the cfg ever lives in two places, the article wins; the Container is the bug to fix.
- **[C]** `klappy://canon/principles/verification-requires-fresh-context` — same-session validation does not count. The author of canon is not the right reviewer of canon. The Container PR's definition of done explicitly requires a fresh-context session to validate end-to-end.
- **[C]** Replace-only composition for `config_files["shared/ptxprint/Default/ptxprint.cfg"]`. No section-level merge. Per-key tweaks via `define`. Reversible if real-world usage demonstrates need for `[import] config = Parent` inheritance, but not in v1.2 scope.

---

## Handoffs (transferred to other owners)

### H-021 — Container PR per `bundle-default-cfg-handoff.md`

**Receiver:** autonomous-coding-agent | container-maintainer (next-session-claude or human implementer with Container repo access).

**Contract:** the handoff doc itself (`klappy://canon/handoffs/bundle-default-cfg-handoff`) is the contract. Highlights for the receiver:

- Two implementation paths sketched (PTXprint install-time defaults vs Container-side staging script); pick whichever fits cleaner. ~5–15 lines of runtime change either way.
- Smoke test contract: Phase-1 strict payload (`{books, sources}` only, no `config_files`) must succeed and produce a visually-equivalent PDF to the 2026-04-30 baseline.
- Reference fingerprints for regression: pre-change failing payload hash `523d86b14233a6aa95b79cbaf809eb8264357023c381cfae199cfbd5c3c615aa`; cfg-explicit successful payload hash `d37778c8c2467a07e395718fe1a3477f25cec7b8a55dfd4927af72bee75ba29d`; reference PDF still in R2 cache.
- Vodka constraints with tests: Worker stays unchanged; cfg has one home; bundle is content-addressed by image hash; replace-only composition.
- The handoff is structurally complete — it does not require operator clarification. Deviations surface in the post-execution report.

**Closure criterion:** rebuilt Container produces a successful PDF for the Phase-1-strict payload, smoke test passes, no regression on existing cfg-explicit payloads.

### H-022 — Fresh-context validation session after the Container PR lands

**Receiver:** a fresh Claude session with no context from this session.

**Contract:**

1. Fresh session points at the canon-updated repo + rebuilt Container.
2. Operator issues exactly: *"Render BSB John using the smallest possible payload."*
3. Observe: does the agent find `progressive-customization.md` via `docs`? Does it identify Level 0? Build `{schema_version, project_id, books, sources}`? Submit? Succeed?
4. If anything is unclear, contradictory, or requires clarifying questions: canon is the bug — fix canon, re-validate.

**Closure criterion:** fresh agent produces a working PDF with no clarifying questions and no path Claude couldn't have walked from canon alone.

---

## Open items (forward-pointing — stay with current owner / next session)

- **[O-open P1]** Run the Container PR per `bundle-default-cfg-handoff.md`. Operator's call on whether to dispatch via autonomous coding run, fresh Claude session, or hand-off to a human. The handoff is execution-ready either way.
- **[O-open P2]** After Container PR merges, run the fresh-context validation session (H-022). This closes the deep validation loop opened in this session.
- **[O-open P3.1]** Reframe `canon/templates/english-single-book.md` as a Level-4 example. Add frontmatter note that this template is the fully-customized reference (Gentium fonts, Settings.xml, sty), not the bootstrap surface. Optional companion: a separate `canon/templates/english-single-book-default.md` Level-0 template if downstream agents prefer template-shaped artifacts. Not blocking.
- **[O-open P3.2]** Update `canon/README.md` article count. The README currently says "Currently 18 articles..."; after #34 + #35 + this ledger, it should say "21 articles." Small, deferred for a content refresh.
- **[O-open P3.3]** Cross-link the bundled cfg's `[import]` section caveat from `canon/articles/config-inheritance-and-overrides.md`. The upstream cfg has an `[import]` section that is for the GUI's import-settings workflow, NOT the parent-config inheritance pattern documented in `config-inheritance-and-overrides`. A one-paragraph cross-reference would prevent confusion.
- **[O-open P3.4]** Update `canon/README.md` to mention the new ledger pattern at `canon/encodings/transcript-encoded-session-15.md` for traceability. Same content refresh as P3.2.

---

## Cross-reference summary — sessions 1–14 ↔ session 15

| Prior item | Session 15 outcome |
|---|---|
| D-001 (headless CLI is the agentic surface) | Reaffirmed; the Phase-0 floor is built on top of the headless CLI contract. |
| D-002 (English Bibles initial scope) | Reaffirmed; `bundled-default-cfg.md` is BSB-flavored, Charis-only. |
| O-001 (first-pass MCP server didn't emit PDFs) | Long since closed by sessions 9–14. Session 15 verifies that the production worker not only emits PDFs but does so cleanly with the bundled cfg. |
| O-open-P1-001 (incomplete cfg field docs) | Indirectly resolved for the bundle: the bundled cfg is now documented in full at `bundled-default-cfg.md`, including known characteristics. The 400-key universe outside the bundle remains in the cookbook layer. |
| O-open-P1-002 (font dependency for headless) | Confirmed resolved for the English bundle — Charis SIL is bundled and Test 1's empirical render proves font resolution works. |
| Session 7 D-025 (Phase 1 PoC scope) | Formally superseded by `progressive-customization.md` Level 0. Phase-1-poc-scope article remains as historical reference with frontmatter `status: superseded`. |
| Session 11 H-018 (fonts-payload demo) | Untouched; still relevant for Level 3 of the new ladder. |
| Session 14 BSB Psalms render-quality observations | Untouched; still on iteration backlog. The new ladder doesn't replace per-render iteration; it provides the structure within which iteration happens. |

---

## Validation gap (explicitly not closed in this session)

Per `klappy://canon/principles/verification-requires-fresh-context`, the following loops were **not** closed in this session and require future work:

1. **Whether the bundled cfg actually fixes Phase-1-strict failures end-to-end.** Empirically validated that the cfg produces good output when supplied explicitly. Not validated that bundling logic, once implemented in the Container, produces the same output for the no-`config_files` payload. The Container PR's smoke test (H-021's closure criterion) closes this loop.
2. **Whether a fresh agent walks the new ladder unaided.** Mechanical discoverability proven (Q1 + Q3 PASS). Adequacy not proven — same-session "looks done" disqualified by the principle. H-022's fresh-context session closes this loop.
3. **Whether the `[import] config = Parent` inheritance evolution should ship.** Documented as deferred. Decision deferred until real callers ask for partial cfg overlay or downstream feedback indicates the replace-only model is too rigid.

---

## Provenance

- **Primary artifacts produced in this session (all merged):**
  - PR #34 → merge commit `fbc0704` (3 new files; +1261/−0)
  - PR #35 → merge commit `bd4e791` (2 in-place edits; +16/−6)
  - This ledger (PR-3, in flight at session close)
- **Tooling used:** GitHub HTTPS clone with PAT, `git config user.email/user.name`, str_replace for in-place edits, GitHub REST API for PR creation, `oddkit_search` for discoverability validation, `oddkit_get` for fetching the DOLCHEO vocabulary doc.
- **Cfg verification:** byte-equivalent diff between `/mnt/user-data/uploads/ptxprint.cfg` and the fenced INI block extracted from `bundled-default-cfg.md` (one trailing-newline difference, functionally equivalent).
- **Search-index commit at validation time:** `bd4e791db8108b346405a6b55b2cf13ba22dda0c` (post-merge of #35).

---

*End of session 15 encoding. Next session opens with P1 (Container PR) — handoff doc is the contract; deviations surface in the post-execution report.*
