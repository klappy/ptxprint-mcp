---
title: "PTXprint MCP Server — Transcript Encoding Session 9 (2026-04-28/29 PM, drifts 4–6 verified + isolated)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "transcript", "dolceho", "session-9", "smoke", "drift-isolation", "fresh-context"]
extends: "transcript-encoded-session-8.md"
encoded_at: 2026-04-29T00:38:00Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
applied_canon:
  - klappy://canon/principles/proactive-integrity
  - klappy://canon/principles/verification-requires-fresh-context
  - klappy://canon/principles/contract-governs-handoff-drift
session_window: 2026-04-29T00:10Z–2026-04-29T00:38Z (~28 min wall-clock; continuous fresh-context smoke-and-fix)
---

# PTXprint MCP Server — Transcript Encoding Session 9

> Continues `transcript-encoded-session-8.md`. Session 8 isolated drifts 1–5 and shipped PR #9 (drift-4 fix: TeX macros via `cp src/` + `TEXINPUTS`). Session 9 verified PR #9 in production, isolated drift 5 (Source Code Pro font missing), shipped PR #10, verified PR #10 in production, and isolated drift 6 (payload missing `ptxprint-mods.sty`). End-of-session state: PTXprint runs through ~95% of its setup including all macros and all SFM stylesheets; one mechanical payload-completeness gap remains before the first PDF can ship.

---

## D — Decisions

### D-017 — Surgical-PR cadence is the right pattern for drift isolation
Sessions 4–5 produced PRs #8, #9, #10 in rapid succession (≤90 minutes between merges), each addressing one isolated drift surfaced by the prior PR's smoke. Each PR was small (10–24 line Dockerfile/container changes), individually mergeable, and citable. The diagnostic surface from PR #8 made each subsequent isolation possible because every smoke produced specific evidence rather than opaque silence.

Naming this as a decision because it's a candidate canon promotion: *"When isolating drifts behind co-located silent symptoms, surgical PRs (one fix per PR) preserve the ability to verify each layer in isolation. Bundled fixes hide which change actually closed which drift."*

### D-018 — Empirical refutation beats hypothesis acceptance
Operator hypothesized "maybe master is broken; pin to a release." Session-9 verified empirically that 3.0.20 has the **same** bug (broken `package-data` globs, `paratext2.tex` only at `src/`). Could have just done what was suggested. Did the work to refute first, then PR #9 included pinning anyway as separate hygiene. This pattern — empirical refutation of plausible-sounding fixes — is what fresh-context validation IS for.

---

## O — Observations

### O-026 — Drift 4 closed in production by PR #9
Post-PR-#9 deploy, smoke against minitests fixtures produced this XeTeX log:

```
(/usr/local/share/ptx2pdf/ptx-note-style.tex ...)
(/usr/local/share/ptx2pdf/ptx-stylesheet.tex ...)
(/usr/local/share/ptx2pdf/ptx-periph.tex ...)
(/usr/local/share/ptx2pdf/ptx-attribute.tex)
(/usr/local/share/ptx2pdf/ptx-references.tex ...)
(/usr/local/share/ptx2pdf/ptx-cropmarks.tex
! Font \idf@nt="Source Code Pro" at 8.0pt not loadable: ...
```

XeTeX reached `paratext2.tex` and successfully read all its sibling macros. The `cp /tmp/ptx2pdf/src/. /usr/local/share/ptx2pdf/` + `TEXINPUTS=/usr/local/share/ptx2pdf//:` combination did exactly what canon predicted.

### O-027 — Drift 5 isolated: Source Code Pro hardcoded in `ptx-cropmarks.tex` line 38
Unconditional `\font\idf@nt="Source Code Pro" at 8pt` during macro setup. Not gated by any cfg flag. Hits every Phase 1 typeset.

Found in 9 places across upstream (`src/ptx-triggers.tex`, `python/lib/ptxprint/view.py`, `src/ptx2pdf.sty`, `python/lib/ptxprint/gtkview.py`, `src/ptx-cropmarks.tex`, `src/ptx-stylesheet.tex`, `src/ptx-milestone-style.tex`, `python/lib/ptxprint/template.tex`, `test/projects/WSG/shared/ptxprint/Borders/ptxprint.cfg`). Woven in.

### O-028 — Upstream's pattern is `COPY fonts/`, mirroring it via `cp` + `fc-cache` works
Upstream `sillsdev/ptx2pdf/Dockerfile` ships fonts via `COPY fonts/` of a 7-file `fonts/` directory at the repo root: 4 Charis variants + `OrnamentTest.ttf` + `SourceCodePro-Regular.ttf` + `empties.ttf`. Total ~3.6 MB.

`fonts-source-code-pro` does not exist as a Debian package (sources.debian.org → 404). Bundle is the only path.

PR #10 mirrored this as a `cp /tmp/ptx2pdf/fonts/*.ttf /usr/local/share/fonts/ptx2pdf/` + `fc-cache -fv` during the existing `RUN` block. Verified post-deploy: drift 5 closed cleanly.

### O-029 — Drift 4–5 closed gets us to ~95% of PTXprint setup
Post-PR-#10 smoke log shows PTXprint loaded:

- All ptx2pdf TeX macros (paratext2, stylesheet, periph, attribute, references, cropmarks, plugins, cover, ornaments, marginnotes, ptxprint)
- `standardborders.sty` (full table of border definitions)
- `usfm_sb.sty` (full USFM stylesheet with all markers)
- `ptx2pdf.sty` (PTXprint-specific style overrides)
- `custom.sty` (project-level custom)
- `ptxprint.sty` (config-level)

Then crashed on:

```
! Paratext stylesheet "../../../shared/ptxprint/Default/ptxprint-mods.sty" not found.
```

### O-030 — Drift 6 is mechanical, not architectural
The cfg loads `ptxprint-mods.sty` as part of its stylesheet chain. The minitests fixture has this file at `shared/ptxprint/Default/ptxprint-mods.sty` (1796 bytes), but the session-8 experiment payload only included `Settings.xml`, `custom.sty`, `ptxprint.cfg`, and `ptxprint.sty` — `ptxprint-mods.sty` was omitted.

This is **payload completeness**, not container/canon code drift. Adding the file to next session's payload should resolve it. Possibly also `ptxprint-mods.tex` (the macro-level companion) — would only know which by trying.

### O-031 — `ptxprint-premods.tex` is treated as optional, `ptxprint-mods.sty` as required
Earlier in the same log:

```
Optional file "../../../shared/ptxprint/Default/ptxprint-premods.tex" Cannot be found
```

PTXprint kept going — that one's optional. But `ptxprint-mods.sty` errors fatally. Subtle distinction in upstream's loader logic; the agent (or canon) needs to know which support files are mandatory vs optional for any given cfg shape.

### O-032 — JobStateDO content-addresses by hash; identical payload reuses job_id even after code change
All four PR-#10-era smoke jobs (drift 5, drift 6, post-PR#10 verify) returned `job_id = a0e82d0d...` because the payload was byte-identical. The container correctly re-dispatched (`cached: false` in the submit response) even with the cached job_id, but the JobStateDO retained the previous status until the new run completed. Worth documenting that `cached: false` means "we ran it again" not "we returned cached results" — the field name is slightly misleading.

---

## L — Learnings

### L-012 — Each PR's diagnostic surface earns the next PR's surgical scope
PR #8 added the silent-bail diagnostic. Every smoke since has produced concrete evidence rather than opacity, which is what made PRs #9 and #10 each addressable in 14–24 lines. Without PR #8's investment, drifts 4–6 would all have looked like the same opaque "PTXprint exits 0" symptom.

Promotion candidate: *"Diagnostic-surface improvements compound. Land them early; each subsequent fix becomes more surgical."*

### L-013 — Empirical-refutation as a fresh-context-Claude duty
Session-9 D-018 demonstrated the pattern: when the operator suggests a fix hypothesis, the validating fresh-context Claude's role is to verify or refute the hypothesis empirically before agreeing or proposing alternatives. The "maybe master is broken" hypothesis was reasonable; the empirical check (3.0.20 trees identical for the relevant files; pyproject.toml package-data globs broken on both refs) closed the question and produced citation-grade evidence for the PR description.

### L-014 — Operator's bottleneck attention is preserved by PR descriptions that cite empirical refutations inline
PRs #9 and #10 included sections like "Pinning hypothesis empirical check" and "Why upstream's pattern, not apt." This shape — surface the question, then surface the evidence that ruled out alternatives — preserves the operator's right to second-guess without forcing them to re-derive.

---

## C — Constraints

### C-011 — Minitests fixture is incomplete for a clean Phase 1 smoke
Need at minimum: `Settings.xml`, `custom.sty`, `shared/ptxprint/Default/ptxprint.cfg`, `shared/ptxprint/Default/ptxprint.sty`, `shared/ptxprint/Default/ptxprint-mods.sty`, possibly `shared/ptxprint/Default/ptxprint-mods.tex`, plus `44JHNtest.usfm` as the source. Until C-011 is resolved, no PDF will ship.

### C-012 — oddkit indexing of large external repos is bounded by 300s timeout
Session-9 attempted oddkit search against `https://raw.githubusercontent.com/sillsdev/ptx2pdf/master`; it timed out at 300s. ptx2pdf is much larger than klappy.dev (1500+ files including binary blobs). For canon-discovery against external repos of this size, oddkit indexing may not be the right tool. Worth a follow-up with the oddkit maintainer about whether this is fixable (incremental indexing? lazy fetch? smaller index?).

---

## H — Handoffs

### H-014 — Next session: complete the minitests payload (drift 6 fix)
**This is the obvious-and-easy first move.** Add `ptxprint-mods.sty` (and possibly `ptxprint-mods.tex`) from the minitests fixture into `config_files`. Re-smoke. Expected outcomes:

- **Success** — PDF in R2 OUTPUTS. Phase 1 DoD step 5 satisfied. 🎉
- **Failure with new error** — drift 7. Encode and continue.

The script `/home/claude/smoke.py` and the experiment payload generator are documented in this session's preserved scripts (next session inherits them via the persistent /home/claude workspace, OR re-derives in 5 minutes from this encoding).

### H-015 — File the upstream issues on `sillsdev/ptx2pdf`
Three issues identified over sessions 4–5 worth filing upstream (operator's call when):

1. **`pyproject.toml` `package-data` globs reference non-existent subdirs.** `[tool.setuptools.package-data] "ptxprint" = ["ptx2pdf/**/*", "xetex/**/*"]` — those subdirs don't exist under `python/lib/ptxprint/` in either master or 3.0.20. Result: `pip install .` ships zero TeX macros.
2. **Source Code Pro hardcoded in `ptx-cropmarks.tex` line 38.** `\font\idf@nt="Source Code Pro" at 8pt` — unconditional, not gated by any cfg flag. Forces every distribution to bundle the font.
3. **`pyproject.toml` dependency name typo.** `"markdown_it"` → should be `"markdown-it-py"`. Already worked around by sed in our Dockerfile.

### H-016 — Update `canon/articles/phase-1-poc-scope.md` to acknowledge minimum config_files reality
Current canon promises *"USFM-only payload; the worker materializes a minimal directory tree."* Empirically, agents must supply `Settings.xml + custom.sty + ptxprint.cfg + ptxprint.sty + ptxprint-mods.sty + 44JHNtest.usfm` (or equivalent). Phase 1 canon should be edited to:

- Withdraw the "USFM-only" promise.
- Document the actual minimum-required `config_files` map shape.
- Reference `canon/articles/payload-construction.md` for the full schema.

This is the operator-promised "Hybrid path" canon update from session-8 H-011. Recommended editor: a fresh Claude session with this encoding + session 8 encoding loaded.

### H-017 — Resolve oddkit branch URL syntax / size handling
Session-9 attempted `https://github.com/sillsdev/ptx2pdf/tree/master`, `https://raw.githubusercontent.com/sillsdev/ptx2pdf/master` — both failed (404 then 300s timeout respectively). Operator confirmed oddkit *does* support branches (klappy.dev uses branch URLs for PR previews) — so I'm using the wrong URL form, OR ptx2pdf is too large for oddkit's current indexing path.

**Action for operator**: surface the canonical URL syntax (probably one short Slack/IM line). If indexing-time is genuinely the blocker for non-klappy repos, that's a separate oddkit feature gap.

Until H-017 resolves, fall back to direct GitHub API + raw file fetches for ptx2pdf docs (this session demonstrated that pattern works fine in 1–2 calls per question).

---

## Empirical evidence ledger

### PRs landed this session

| # | Branch | Author | Merged | Drift addressed |
|---|---|---|---|---|
| #9 | `fix/dockerfile-tex-macros-and-pin` | claude-fresh-context | 00:18:05Z | 4 (TeX macros) + pin hygiene |
| #10 | `fix/dockerfile-bundle-source-code-pro` | claude-fresh-context | ~00:35Z | 5 (Source Code Pro) |

### Smoke runs verifying production state

| # | Time UTC | Hash (job_id prefix) | Outcome |
|---|---|---|---|
| 1 | 00:21:06 | `a0e82d0d` | post-PR-#9 deploy: drift 4 closed, drift 5 surfaced (font error) |
| 2 | 00:35:56 | `a0e82d0d` | post-PR-#10 deploy: drift 5 closed, drift 6 surfaced (missing ptxprint-mods.sty) |

Both runs uploaded full XeTeX logs to R2; both `log_url` endpoints serve HTTP 200 to UA-respecting clients. Pipeline integrity confirmed.

### Updated drift map

| # | Drift | Status |
|---|---|---|
| 1 | argv: `-c` always emitted | ✅ PR #8 |
| 2 | container doesn't materialize Settings.xml etc. | ⚠️ doctrinal (Hybrid: agent supplies via `config_files`) — H-016 canon update pending |
| 3 | canon's "minimal cfg" example missing required widget keys | ⚠️ canon update + use real fixture for now |
| 4 | TeX macros not on TEXINPUTS | ✅ PR #9 |
| 5 | Source Code Pro font missing from container | ✅ PR #10 |
| 6 | minitests payload missing `ptxprint-mods.sty` | ⏸️ H-014 — next session, mechanical payload fix |

---

## Cross-Reference Summary — Sessions 1–9

| Earlier item | Session 9 outcome |
|---|---|
| Phase 1 DoD step 5 (PDF in R2 OUTPUTS) | Not yet met. ~95% of setup completes; one stylesheet file missing from payload. |
| H-010 (TeX macros install — Day-1 blocker) | **Closed** by PR #9, verified in production. |
| H-011 (doctrinal: A/B/C) | Operator chose Hybrid (C); container-side fix shipped; canon update tracked as H-016. |
| H-012 (cfg minimum spec) | Sidestepped by using minitests fixture. Still open for Phase 2 work. |
| H-013 (update canon's "minimal cfg" example) | Still open; tied to H-016. |
| C-009 (silent-bail diagnostic) | Continues to earn its keep — every drift in this session was diagnosable from the synthesized `log_tail` and the actual XeTeX log uploaded to R2. |

---

*End of session 9 encoding. Companion artifact: `handoff-2026-04-29-early-am.md` (the next-session pickup). Next session's first move is H-014.*
