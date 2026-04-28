---
title: "Session 3 Gaps Handoff — Still-Owed Work from the Font Resolution Thread"
audience: operator
exposure: working
voice: instructional
stability: working
tags: ["handoff", "session-3", "gaps", "ese-gap-analysis", "font-resolution", "followups"]
canonical_status: non_canonical
created_at: 2026-04-28T05:25:00Z
companion_to: "canon/encodings/transcript-encoded-session-3.md, canon/articles/_archive/font-resolution-design.md (superseded — v1.2 D-021 retired the three-MCP path)"
---

# Session 3 Gaps Handoff

> **What this document is.** A consolidated record of work that was named, deferred, and never completed across the session-3 font-resolution thread. The headline item is an ESE-vs-spec gap analysis that was deferred three sessions in a row (H-002 → H-010 → H-015) and is the most load-bearing piece of owed work. Several session-3 followups have since been resolved by v1.2's architecture and are noted here as such; only the genuinely-still-open items carry forward.

> **Why this exists.** A future session — autonomous coding run, operator catch-up pass, or another Claude — should be able to pick up exactly where session 3 left off, without re-reading the entire encoding chain to figure out what's owed. This document names each gap, gives its current status, and points at the resolution path. The third section is a copy-pasteable session prompt for the gap analysis.

> **How to use this.** Read §1 first — the core gap analysis is the actually-useful next move and the other items are smaller. §2 is a triaged inventory of the rest. §3 is the prompt to paste into a new Claude session if delegating the gap analysis.

---

## 1. The Core Gap — ESE Surface vs Current Spec

### 1.1 History of this handoff

Originally named in transcript session 1 as `H-002 — Gap-analyze ESE against the existing first-pass MCP server`. Restated in session 3 as `H-010` after that session bypassed it for font work. Restated again in session 3.1 (now consolidated into session 3) as `H-015` after the architectural correction. Three named-and-deferred cycles.

### 1.2 What changed under it

The original framing was "ESE surface vs first-pass spec (the 17-tool PoC)." That spec is now archived at `canon/specs/archive/ptxprint-mcp-first-pass-poc.md` and is no longer the build target. The current spec is `canon/specs/ptxprint-mcp-v1.2-spec.md` — a stateless content-addressed build system on Cloudflare Containers, four tools, payload-driven.

The gap analysis as originally framed (ESE vs first-pass) is largely **obsolete**. The big architectural drift the original gap analysis would have surfaced (filesystem-edit-in-place vs stateless build system) has been corrected by other means — specifically session 5's pushback that produced v1.2.

### 1.3 The gap analysis that's actually useful now

**Reframe:** ESE surface (`canon/surfaces/ptx2pdf-surface.md` and `.json`) vs v1.2 spec (`canon/specs/ptxprint-mcp-v1.2-spec.md`).

The question this analysis answers: does v1.2's contract — "submit a payload, get a PDF back" — actually fit what the upstream `sillsdev/ptx2pdf` codebase requires of its caller? Specifically:

- **Inputs the v1.2 payload describes vs inputs PTXprint actually consumes.** v1.2's payload has slots for cfg files, USFM URLs, fonts, figures, AdjLists, piclist, override files, FRTlocal.sfm. Does the ESE confirm those are all the binary and text inputs PTXprint reads? Are there inputs the spec missed (e.g. project-level files at `<prj>/shared/ptxprint/` outside any config — `picInfo.txt`, `picChecks.txt`, project-wide `changes.txt`, `hyphen-<prj>.tex`)?
- **The `-D` override mechanism vs v1.2's `define` parameter.** ESE confirms `-D key=value` accepts arbitrary UI widget identifiers. v1.2 surfaces this as a `define` map. Is the mapping clean, or are there setting categories (e.g. settings that need pre-processing, settings that hit Python before XeTeX) where `-D` doesn't suffice?
- **Output naming convention.** ESE established `<PRJ>_<Config>_<bks>_ptxp.pdf` and a log path beneath `<config>/`. v1.2 stores at `r2://ptxprint-outputs/<sha256_of_canonical_payload>/<PRJ>_<Config>_<bks>_ptxp.pdf`. Does the v1.2 R2 path actually need to preserve PTXprint's filename verbatim, or is it pure metadata for download UX?
- **Failure modes vs v1.2's `failure_mode: hard | soft` taxonomy.** ESE catalogued partial-success cases (issue #212 — PDF emits without pictures). Does v1.2's two-class taxonomy capture every distinct failure category the ESE surfaces?
- **Autofill.** ESE confirms it exists as the multi-pass page-filler. v1.2 has it as `mode: autofill` on the payload. Are there autofill sub-features (per-book overrides? attempt budgets?) the spec doesn't expose?
- **Concurrency / runtime characteristics vs v1.2's Container model.** ESE notes long hangs, performance issues, autofill duration. v1.2 picks `standard-2` and 45m `sleepAfter`. Does the ESE confirm those numbers fit, or did the operator's experience suggest tighter or looser bounds?

### 1.4 Output of this gap analysis

A markdown document at `canon/handoffs/ese-vs-v1.2-gap-analysis.md` (or as part of the v1.2 spec's appendix) that lists, per ESE lens (L1-L12 from `ptx2pdf-surface.md`):

- **Confirmed**: things v1.2 captures correctly.
- **Gap**: things ESE surfaces that v1.2 doesn't account for. Each gap is sized (blocking / improvement / nice-to-have) and pointed at a resolution path (spec amendment, canon article, or punt to v1.3).
- **Phantom**: things v1.2 captures that the ESE doesn't actually require — over-design that should be simplified out.

Estimated effort: 1-2 hours for a careful pass. Less if delegated to a focused session with the ESE and v1.2 spec already in context.

### 1.5 Gating

Implementation work on the v1.2 build can proceed without this — but knowing the gap shape before the autonomous coding run from session 2 H-003 reduces the chance of building toward an incomplete contract. Do this before or in parallel with `H-007` (canon authoring), not after.

---

## 2. Other Session 3 Followups — Triaged

The font-resolution work surfaced fourteen open questions and several handoffs. Many were rendered moot by v1.2's architecture. Triage:

### 2.1 Resolved by v1.2 (no further work)

| Item | Why resolved |
|---|---|
| F-Q7 — cross-project font sharing | v1.2 stores fonts in R2 keyed by SHA. SHA-dedupe is automatic across projects; sharing is the default. |
| F-Q8 — eviction policy for font versions | Per-job ephemeral dirs in v1.2 mean no host-local persistence. Eviction is a non-question. |
| F-Q10 — lock-file location | v1.2 makes the payload itself the lock. The agent's payload-history mechanism (per session 5 Q-open-14) is where pinning lives. No `fonts.lock.json` artifact in v1.2's contract. |
| F-Q11 — cache MCP fetch-on-miss vs pre-warm | v1.2 D-021 makes binary inputs URL+sha256-referenced in the payload. The Container fetches at job time. Pre-warming would be a separate optimisation outside the typesetting MCP. |
| H-014 — first-pass design retains value as lifecycle reference | Done by uploading session-3 encoding and `font-resolution-design.md` to canon. The historical context lives in the encoding's D-012/D-014 entries. |

### 2.2 Still genuinely owed (work needed)

| Item | Status | Resolution path |
|---|---|---|
| H-007 | Open | Author canon article on the agent's font-resolution reasoning loop. v1.2-aligned: agent constructs the payload's `fonts` array from a language tag, possibly via a fonts MCP, and submits. Article goes at `canon/articles/font-resolution.md` (named in session 5 H-007's updated list). |
| H-008 / F-Q1 / F-Q2 | Open | Probe LFF with sample BCP 47 tags (`eng`, `eng-Latn`, `swh-Latn`, `und-Latn`) and several real Paratext `LanguageIsoCode` values from `ptx2pdf/tests/`. Document the canonical transformation. Lives in the font-resolution canon article (H-007). |
| H-009 / F-Q3 | Open | Build a clean Ubuntu container with `apt-get install --no-install-recommends texlive-xetex fontconfig ca-certificates`. Verify `dpkg -l \| grep -i font` returns no `fonts-*` packages. Verify `fc-list` returns only TeX-internal fonts. Gates the v1.2 Container Dockerfile commit. |
| F-Q4 | Open (low priority) | LFF rate limits / auth / change risk. Defer until volume is measured; LFF is self-hostable from `silnrsi/langfontfinder` if rate-limiting becomes a real constraint. |
| F-Q5 | Open | Diglot lock semantics — does the payload's `fonts` array carry the union of left/right column fonts? Almost certainly yes. Confirm by walking through a real diglot project from `ptx2pdf/tests/`. |
| F-Q6 | Open | PTXprint font-selection mechanism — name-based via fontconfig, or axis-based? Read PTXprint Python source to confirm. Likely just fontconfig-by-name (XeTeX `Bold` keyword resolves through fontconfig). |

### 2.3 Deferred or punted

| Item | Status |
|---|---|
| H-011 — read `klappy://docs/oddkit/IMPL-content-addressed-caching` before writing content-cache MCP | Punted. v1.2 D-021 absorbs the byte-fetching concern into the Container's job dispatch; there is no separate "content-cache MCP" to write. The doc is still worth reading if a future cache MCP is built for other consumers (pictures, source bundles). |
| H-012 — content-cache MCP naming | Punted. See above — no separate MCP being built in v1.2. |
| H-013 — fonts MCP naming + tool surface | Punted. v1.2 makes fonts payload-resolved; the agent calls LFF directly (or the operator's preferred catalogue). A fonts MCP becomes useful only if multiple agents need the same translation logic. |
| F-Q9 — server-to-server cache fetch vs agent-passes-bytes | Resolved by v1.2 D-021: agent provides URL+sha256, Container fetches. Neither party shuttles bytes through the MCP envelope. |
| F-Q12, F-Q13, F-Q14 | All resolved by v1.2's Container-fetches-at-job-time pattern. License policy lives with the agent; SHA verification is the Container's job. |

### 2.4 Carried from earlier sessions, still owed

| Item | Origin | Status |
|---|---|---|
| H-005 (session 2) — verify ptx2pdf licence before mirroring docs | session 2 | Independent; still owed. Do before any content from `ptx2pdf/docs/documentation/` is copied into canon. |
| H-006 (session 2) — filter the 1000-config corpus | session 2 | Independent; still owed. Decide filter criterion + tooling before agent ingestion of the corpus. |

---

## 3. Copy-Pasteable Session Prompt for the Gap Analysis

> **Context for the operator before pasting:** Use this prompt in a new Claude session (or paste at the start of a fresh autonomous run) to delegate the ESE-vs-v1.2 gap analysis specifically. The prompt is self-contained and references all the canon documents the receiving session will need to fetch.

```
=== PASTE BELOW THIS LINE ===

You're picking up a deferred handoff from the PTXprint MCP project. The work
has been deferred for three named cycles (H-002 → H-010 → H-015) and now needs
to land before the v1.2 autonomous build proceeds.

**Mode: planning, then execution.**

**Your task:** produce a gap analysis comparing the ESE surface of the upstream
sillsdev/ptx2pdf codebase against the current v1.2 PTXprint MCP spec. Output is
a single markdown document at canon/handoffs/ese-vs-v1.2-gap-analysis.md (or
as an appendix to the v1.2 spec — your judgement).

**Read first (in order):**

1. The session 3 gaps handoff (THIS DOCUMENT) for full context:
   https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/canon/handoffs/session-3-gaps-handoff.md

2. The ESE surface (the upstream codebase observations):
   https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/canon/surfaces/ptx2pdf-surface.md
   https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/canon/surfaces/ptx2pdf-surface.json

3. The current v1.2 spec (the build target):
   https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/canon/specs/ptxprint-mcp-v1.2-spec.md

4. Session 5's encoding (most recent architectural decisions):
   https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/canon/encodings/transcript-encoded-session-5.md

**Method:**

For each ESE lens (L1 through L12 in ptx2pdf-surface.md), check the v1.2 spec
for whether the lens's content is captured. Classify each item as:

- CONFIRMED: v1.2 captures this correctly.
- GAP: ESE surfaces something v1.2 doesn't account for. Size as
  (blocking / improvement / nice-to-have) and propose a resolution path
  (spec amendment, canon article, or punt to v1.3).
- PHANTOM: v1.2 captures something the ESE doesn't actually require —
  over-design that should be simplified.

Specific lenses to attend to most carefully (per the session 3 gaps handoff §1.3):

- L3 (project shape) — does v1.2's payload schema cover all the binary and
  text inputs PTXprint actually reads, including project-level files at
  <prj>/shared/ptxprint/ outside any config (picInfo.txt, picChecks.txt,
  project-wide changes.txt, hyphen-<prj>.tex)?
- L7 (outputs) — does v1.2's R2 output naming preserve everything that
  matters? Are intermediate artifacts (procpdf, parlocs) accessible if the
  agent needs them for diagnosis?
- L8 (failure modes) — does v1.2's two-class hard/soft taxonomy capture
  every distinct failure category the ESE surfaces?
- L10 (deployment / runtime) — does the standard-2 Container with 45m
  sleepAfter actually fit the autofill envelope ESE describes? Any other
  sizing the ESE suggests v1.2 missed?

**Use the GitHub PAT from your project instructions to push** (same PAT that
bootstrapped the repo).

**Procedure:**

1. Fetch and read the four source documents above.
2. Produce the analysis (markdown, structured per the method above).
3. Clone the repo:
   git clone https://${GH_PAT}@github.com/klappy/ptxprint-mcp.git
   cd ptxprint-mcp
4. Place the file at canon/handoffs/ese-vs-v1.2-gap-analysis.md
5. Commit and push:
   git add canon/handoffs/ese-vs-v1.2-gap-analysis.md
   git commit -m "handoffs: ESE surface vs v1.2 spec gap analysis (resolves H-015)"
   git push origin main
6. Report findings — particularly any blocking gaps that should pause the v1.2
   autonomous build until resolved.

**Time budget:** 1-2 hours for a careful pass. If the analysis surfaces more
than ~3 blocking gaps, surface them mid-work rather than continuing — those
are spec issues that need operator review before the analysis can finish
usefully.

=== PASTE ABOVE THIS LINE ===
```

---

## 4. After This Handoff Lands

This file should be updated (not deleted) when the gap analysis is produced —
add a "✅ resolved" note at the top and link to the analysis. The other items
in §2.2 should be picked up either by H-007's canon authoring (which folds in
H-008/F-Q1/F-Q2/F-Q5/F-Q6) or by the v1.2 Dockerfile work (which gates on
H-009/F-Q3).

The carry-over items in §2.4 (H-005, H-006) are independent of session 3's
thread and should be tracked by their own handoff documents if they don't
get resolved soon.
