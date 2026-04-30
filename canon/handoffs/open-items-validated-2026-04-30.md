---
title: "Open Items — Validated by Back-Reference and Fresh PDF Render"
audience: operator
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "handoff", "validation", "open-items"]
date: 2026-04-30
written_at: 2026-04-30T03:16:00Z
session_window: 2026-04-30T03:02Z–2026-04-30T03:15Z (~13 min wall-clock)
companion_to: ["canon/handoffs/session-11-fonts-payload-demo.md", "canon/encodings/transcript-encoded-session-14.md"]
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
---

# Open Items — Validated by Back-Reference and Fresh PDF Render

> **What this is.** Every open handoff catalogued through session 14 (sessions 11, 12, 13, 14 + older standing handoffs), checked against repo state and a fresh PDF render against the live worker. Closes items addressed in the interim; carries forward what remains owed; identifies the work that's gated on something else.
>
> **Method.** Live worker sweep (HEAD probes + `/health` + main HEAD) → fresh PDF render via JSON-RPC → back-reference probes for each open item (file-existence checks, content greps, upstream-issue checks, cache-promise verification).
>
> **Validation pass — not authoring.** Findings here describe what canon shows; nothing in the PTXprint domain has been re-decided.

---

## Live System State (as of validation)

| Probe | Result |
|---|---|
| Wall-clock | 2026-04-30T03:12Z |
| `main` HEAD | `3077e72ccd` (PR #20 merge — session-14-psalms-encoding, 2026-04-30T03:01:45Z, ~10 min before validation) |
| `/health` | HTTP 200, version `0.1.0`, spec `v1.2-draft` |
| Tools list | `submit_typeset`, `get_job_status`, `cancel_job`, **`docs`** ← session-13's tool is live |
| HEAD on session-11 PDF (~26h old) | HTTP 200 |
| HEAD on session-14 PSA PDF (~7h old) | HTTP 200 |
| Fresh perturbed render | `job_id=837b2e262b…`, `cached=false`, `state=succeeded`, `exit_code=0`, `failure_mode=success`, 4s wall-clock |
| Fresh PDF | 68071 bytes, PDF v1.3, 2 pages, fonts: GentiumPlus + GentiumPlus-Bold + GentiumPlus-Italic + SourceCodePro-Regular |
| Cache-hit re-test | Unmodified fonts-payload → `cached=true` + session-11 `job_id=802e42e7…` returned (`started_at=2026-04-29T01:51:15Z`) |

**The pipeline works end-to-end on the latest main HEAD.** Phase-2 fonts-payload pattern carries through to the post-session-14 codebase. Content-addressed cache works as designed.

---

## Closed by This Validation Pass

| ID | Item | How closed |
|---|---|---|
| **Session-13 H-024** | Validate the docs-tool PR by fresh-context Claude | This session is fresh-context relative to session 13; called the docs tool against the live worker, got `{answer, sources}` with valid canon snippets and BM25 scores. Tool works. |
| **H-020** | `HEAD /r2/outputs/<key>` → 404 | Re-confirmed: `HEAD` returns 200. (Was already closed in session 11; sanity-verified today.) |
| **Session-14 H-028 — root cause** | Verify R2 output lifecycle policy | The session-14 cache miss for `bsb-jhn-empirical.json` was **payload-hash drift** (the smoke fixture was edited between sessions 11 and 14), **not** R2 lifecycle eviction. Direct evidence: re-submitting `smoke/fonts-payload.json` unmodified returned `cached=true` with session-11's `job_id=802e42e7…`, ~26 hours after creation. The cache promise holds. The "verify the actual lifecycle policy in CF dashboard matches the documented 90 days" sub-step is still operator-side, but is informationally unblocked — it's not the symptom. |

---

## Still Open — P1

| ID | Item | Evidence |
|---|---|---|
| **H-019** | Widget-ID-to-cfg-key mapping (closes session-1 O-003) | `canon/articles/widget-id-to-cfg-key.md` does not exist on `main`. Deferred across sessions 10, 11, 12, 13, 14. The leverage move three handoffs in a row have flagged. |
| **Session-12 H-026** | Restore cross-references regression in v5, then re-snapshot | Visual-iteration thread; cannot verify externally without re-rendering the v6 fixture and inspecting the PDF. Carry forward. |
| **Session-12 H-027** | Author `canon/articles/section-heading-styling.md` | File does not exist on `main`. Closes session-12 O-open-12-001. |
| **Session-12 H-028** | Extend `canon/articles/stylesheet-format.md` property table to the 40+ properties real configs use | File is 179 lines / 6 KB on `main`; the cited markers are essentially the same minimal set session 12 flagged as insufficient. Not extended. Closes session-12 O-open-12-002 when done. |
| **session-3-gaps §1** | ESE-vs-v1.2 gap analysis (`canon/handoffs/ese-vs-v1.2-gap-analysis.md`) | File does not exist. Originally `H-002` (session 1) → `H-010` (session 3) → `H-015` (session 3.1). Reframed in session-3-gaps as ESE surface vs v1.2 spec. The most load-bearing piece of owed work; deferred 3+ sessions. |

## Still Open — P2

| ID | Item | Evidence |
|---|---|---|
| **Session-13 H-022** | README usage example for the `docs` tool | `README.md` on `main` has zero matches for `docs` or `bt-servant`. Not added. |
| **Session-13 H-025** | Detangle BSB-JHN config discoveries into canon (likely a `bt-servant-integration.md` or `phase-1-poc-scope.md` update) | `canon/articles/bt-servant-integration.md` does not exist. `phase-1-poc-scope.md` was last touched 2026-04-29T01:59:16Z by the session-11 commit — predates session 13's morning conversation that surfaced H-025. Not addressed. |
| **Session-14 H-026** | Psalms render quality iteration backlog | The canonical fix (autofill) is Day-2 deferred. Cfg-knob workarounds (`hangpoetry`, `preventwidows`, `preventorphans`) are cheap — each is a fresh perturbed payload — but no fixture variations have been committed. |
| **Session-11 H-013** | Update `config-construction.md`'s "minimal cfg" example | Current example renders, but the H-013 update (whatever it specifies) hasn't been made. The exact ask isn't loud in the handoff text; if H-013 means "the example isn't minimum-viable," the example as-is is still defensible — worth re-asking what's wanted before authoring. |
| **Session-11 H-015** | File 3 upstream issues on `sillsdev/ptx2pdf` | Probe: `0` issues by `klappy` on `sillsdev/ptx2pdf` (all states). None filed. |
| **Session-12 H-029** | Cookbook recipes ("plain bold centered section headings", "convert testcase config to vanilla Bible config") | Gated on H-027 + H-028. Closes session-12 O-open-12-003 when done. |
| **Session-12 H-030** | "Fresh-context Claude validation pattern" canon article | Neither `canon/articles/validation-recipes.md` nor `canon/articles/smoke-test-patterns.md` exists. Note: today's session is itself a worked example of that pattern. |

## Still Open — P3

| ID | Item | Evidence |
|---|---|---|
| **Session-14 H-027** | File upstream issue against `sillsdev/ptx2pdf` for "IF CHECK mnote Failed" log noise | `0` issues by `klappy`; not filed. |
| **Session-11 H-022** | Move stable fixtures into a dedicated `ptxprint-fixtures` R2 bucket | `wrangler.jsonc` on `main` declares only `OUTPUTS → ptxprint-outputs`. No `FIXTURES` binding. The four Gentium Plus TTFs are still under `outputs/fixtures/fonts/...`. |
| **Session-11 H-023** | Verify or replace Charis SIL LFF URL pattern in canon | `canon/articles/font-resolution.md` line 35 still shows `https://lff.api.languagetechnology.org/...` placeholder. Partial mitigation: line 211 names `silnrsi/font-charis` GitHub releases as alternative. Not closed. |
| **Session-11 H-017** | Resolve oddkit branch URL syntax for ptxprint-mcp canon indexing | Operator + oddkit-maintainer item; no visible commit-side artifact. |
| **Session-11 H-025** | Retire H-021 unless larger fixture demonstrates it bites | H-021 itself isn't surfaced in current handoffs; trace lost. Could be retired in a later cleanup pass. |
| **Session-11 C-009 fallout** | Stale `_todo` block in `smoke/minimal-payload.json` | Block still present today: top-level key `_todo` with two items. |

## Day-2 Deferred (per v1.2 spec — not "open" in the actionable sense)

These are scope-deferred by the spec, not omissions to address. Listed for completeness.

- `cancel_job` SIGTERM into the running container (the tool is exposed in `/health`'s tools list; whether the SIGTERM path is wired is the open piece)
- `get_upload_url` presigned R2 PUTs (currently `/internal/upload` is unauthenticated)
- Strip bundled fonts (session-3 C-007)
- Autofill `mode`
- Per-pass progress streaming

## Older Standing Handoffs

| Handoff | Status |
|---|---|
| `documentation-cleanup-handoff.md` | Per stale memory, all P0 items applied. No contradicting evidence in sessions 7–14. Treat as closed unless reasserted. |
| `governance-update-handoff.md` | Per stale memory, no-op against current `headless-operations.md` (which is v1.2-aligned per its 2026-04-28 metadata). Treat as closed. |
| `missing-uploads-handoff.md` | Status not reasserted in any session 7–14 ledger. Trace lost; would need fresh inventory pass. |
| `oddkit-kb-isolation-feature-request.md` | Filed externally; awaiting maintainer disposition. Not actionable here. |
| `session-10-after-first-pdf-handoff.md` | Superseded by `session-11-fonts-payload-demo.md` (which carried its open items forward). |

---

## Hygiene Findings (recurring across sessions)

- **H-numbering collisions.** Session-12, session-13, and session-14 each independently use `H-022`–`H-028` for unrelated items. Reference scheme should be `<session>-H<n>` (e.g. `s14-H028`) to avoid ambiguity. This validation pass uses that disambiguation throughout the tables above.
- **No dedicated handoff file for sessions 12, 13, 14.** Only encodings exist for those sessions; their open items live in the encoding's `## H — Handoffs` section, which works but breaks the pattern of dedicated `canon/handoffs/session-<n>-*.md` files (sessions 3, 10, 11 have them).
- **User-memory drift.** Stale assistant memory referenced session 6 as the latest; canon shows session 14. Memory was bypassed in favor of canon-direct lookup, per the canon-first principle.

---

## Suggested Next Move

If the operator wants the highest-leverage single move, two contenders stand out:

1. **`s11-H019` widget-ID-to-cfg-key mapping** — three sessions deferred, unlocks reliable runtime overrides for all of Phase 2. Resolution paths in priority order: (a) run PTXprint with `-I` introspection flag and capture; (b) read GTK Glade XML; (c) ask Martin.
2. **`session-3-gaps §1` ESE-vs-v1.2 gap analysis** — also three sessions deferred, the most load-bearing piece of owed work per its own framing. Output: `canon/handoffs/ese-vs-v1.2-gap-analysis.md`.

Both are own-session items per their handoffs.

---

## Evidence Artifacts

- **Fresh PDF (validation):** `https://ptxprint-mcp.klappy.workers.dev/r2/outputs/837b2e262b038fcf54e6170032f20a8fb4d65aadb1c4d34937457e5a0a61ad29/minitest_Default_JHN_ptxp.pdf` (also delivered as `validation-2026-04-30T03-12Z_minitest_Default_JHN_ptxp.pdf` alongside this report)
- **Cache-hit re-test:** `job_id=802e42e7d549cf9f827cbbcff69a6354e1b968a23084e5f2485f93cde52fc4bd` (session-11's; today's submit returned `cached=true`)
- **Live worker version:** `0.1.0`, `v1.2-draft`, main HEAD `3077e72ccd`

---

*End of validation report.*
