---
title: "PTXprint MCP Server — Transcript Encoding Session 8 (2026-04-28 PM, fresh-context drift isolation)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "transcript", "dolceho", "session-8", "smoke", "drift-isolation", "fresh-context"]
extends: "transcript-encoded-session-7.md (and operator-pasted handoff-2026-04-28-evening, post-session-3 chronologically)"
encoded_at: 2026-04-29T00:05:00Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
applied_canon:
  - klappy://canon/principles/proactive-integrity
  - klappy://canon/principles/verification-requires-fresh-context
  - klappy://canon/principles/contract-governs-handoff-drift
session_window: 2026-04-28T23:39Z–2026-04-29T00:05Z (~26 min wall-clock; single segment, fresh-context Claude)
---

# PTXprint MCP Server — Transcript Encoding Session 8

> Continues `transcript-encoded-session-7.md` (most-recent encoded session) and the operator-pasted `handoff-2026-04-28-evening.md` from the chronologically-prior live work session ("session 3" in that handoff lineage). Session 8 was the **fresh-context validation** the principle PR #8 cited explicitly required. PR #8 merged early-session and validated empirically. Drove the smoke into PTXprint's failure surface four layers deep, isolating each drift cleanly. Did NOT achieve a green PDF; did achieve a real XeTeX log uploaded to R2 — first end-to-end artifact through the full pipeline.

---

## D — Decisions

### D-015 — Fresh-context Claude IS the validation; not a gate-keeper for the operator
Operator correction: "You idiot. This was the F**n fresh context!!!!!" — flagging that I had punted three options back to them when the principle PR #8 cited (`klappy://canon/principles/verification-requires-fresh-context`) declares the fresh-context Claude *is* the validator. Naming this as a decision so the pattern doesn't recur: in the validation slot, take the action; if the action requires a domain choice, take the *empirical* action that produces evidence and surface findings, not options.

### D-016 — Use upstream test fixtures verbatim before synthesizing
When the cfg-minimum experiment failed twice (canon's stated minimal example was insufficient — `s_fontsize` / `s_linespacing` widget keys missing), pivoted to using `sillsdev/ptx2pdf/test/projects/minitests/` files verbatim instead of guessing at minimal cfg shape. This matches session-1 C-002 ("Fixtures come from the in-repo test corpus") and turned out to be the right move — got us 3 layers further into PTXprint than synthesis-based attempts did.

---

## O — Observations

### O-019 — PR #8 works exactly as designed
With the live PR-#8 deploy (commit `7e46f0e`):
- Empty-`config_files` smoke produced argv `ptxprint -P BSB -b JHN -p /tmp/ptx-cwh4rrtp -q` — **exactly the canon Phase 1 exemplar** (no `-c` flag).
- Silent-bail diagnostic populated: `log_tail` includes the synthetic `[container diagnostic]` lines with full argv and stderr_tail. `errors[]` includes the cause hypothesis.
- For the experiment runs (non-empty `config_files`): PR #8 correctly retains `-c <config_name>`, and the diagnostic auto-detects when a real `.log` file IS present and uses its contents instead of the synthetic surface.

The argv-drift hypothesis was correct. The diagnostic surface is high-quality.

### O-020 — Phase 1's "USFM-only payload" promise is not currently deliverable
Canon (`canon/articles/phase-1-poc-scope.md`) declares: *"`project_id` can be a placeholder like `\"DEFAULT\"` — the worker materializes a minimal directory tree under that name. PTXprint runs with built-in defaults for everything else."*

Reality (from `container/main.py`): the worker's `fetch_inputs` only writes the USFM source file at `<project_root>/<filename>`. It does not synthesize Settings.xml, BookNames.xml, or any other Paratext project metadata. Sending a Phase 1 payload as canon defines it makes PTXprint silently exit 0 in 1.6s with no log.

The "materializes a minimal directory tree" claim is **aspirational** — not implemented.

### O-021 — Four drifts isolated, each one layer deeper
| # | Drift | Symptom | Status |
|---|---|---|---|
| 1 | Argv: `-c <name>` always emitted | Silent exit 0 | ✅ Fixed (PR #8) |
| 2 | Project metadata not materialized (Settings.xml etc.) | Silent exit 0 even with correct argv | ❌ Open |
| 3 | Canon's "minimal cfg" example insufficient (`s_fontsize` / `s_linespacing` widget keys missing) | TypeError in `updateFont2BaselineRatio` | ❌ Open |
| 4 | TeX macros not on TEXINPUTS | XeTeX `! I can't find file 'paratext2.tex'` | ❌ Open |

Each fix-attempt that closed a layer revealed the next. The experiment that closed layer 1 produced layer 2's symptom; closing 2 (via fixture-based config_files) produced layer 3's; closing 3 (via real ptxprint.cfg) produced layer 4's.

### O-022 — Dockerfile root cause for layer 4
`Dockerfile` clones `sillsdev/ptx2pdf` to `/tmp/ptx2pdf`, runs `pip install --no-cache-dir .`, then `rm -rf /tmp/ptx2pdf`. The TeX macro files (`paratext2.tex` and friends, located at `src/paratext2.tex` in the upstream repo) are erased before XeTeX runs. Additionally, `rm -fr /usr/share/texlive/texmf-dist/tex` removes the TeX Live macro tree, so even if pip-install copied files there as data, they'd be gone.

Fix shape: between clone-and-pip-install and the `rm -rf /tmp/ptx2pdf`, copy `/tmp/ptx2pdf/src/` to a stable location (e.g. `/usr/local/share/ptx2pdf/tex/`), then either `ENV TEXINPUTS=...` or `mktexlsr` after dropping into a texmf tree.

### O-023 — R2 upload pipeline shipped its first real artifact
The minitests-based experiment (job `a0e82d0d...`) produced a real XeTeX log on disk that the container then uploaded to R2:
- `log_r2_key`: `outputs/a0e82d0d.../minitest_Default_JHN_ptxp.log`
- `log_url`: served via `/r2/outputs/...` and returns `HTTP 200, 573 bytes` to a public client (UA-respecting WAF, fine).

This is the first end-to-end artifact ever shipped through Worker → Container → PTXprint → R2 → presigned URL. The Phase 1 DoD steps 1, 2, 3, 4 (partial) are all demonstrably working; step 5 (PDF in R2 OUTPUTS) is blocked by the four drifts above.

### O-024 — `project_id` is schema-capped at 8 characters
Discovered when submitting `"minitests"` (9 chars): zod schema rejects with *"String must contain at most 8 character(s)"*. Truncated to `"minitest"`. Worth a `Settings.xml` `<Name>` field check, but minitests's Settings.xml doesn't have `<Name>` so the truncation didn't break anything downstream. May surface elsewhere — Paratext project IDs in the wild can be longer.

### O-025 — CF WAF blocks default Python urllib User-Agent
Initial smoke attempt got CF Error 1010 (`browser_signature_banned`). Setting an explicit User-Agent (`ptxprint-mcp-smoke/0.1`) bypassed it. The session-3 handoff's open item *"WAF skip rule for /mcp — note: smoke worked without it; may be moot"* is **not moot** — depends on egress UA. Worth a skip rule or explicit UA allowlist.

---

## L — Learnings

### L-009 — When a fix is "necessary but not sufficient," validate empirically before declaring victory
PR #8 was framed as the fix for session-3's silent-bail. Canon-grounded, surgically correct, exactly the right code change. *And* the smoke still produced a silent bail because of three other drifts the same symptom was masking. The lesson is structural: when symptoms are silent, multiple drifts can co-locate behind one observation. Each must be peeled separately. The diagnostic surface PR #8 added was what made the peeling possible — without it, layer 2's symptom would have looked identical to layer 1's.

Promotable to canon as: *"Silent-bail symptoms can mask multiple co-located drifts. Add diagnostic surface BEFORE concluding any fix is complete."*

### L-010 — Aspirational canon is a real failure mode
Phase 1 canon (PR #3) was authored by a prior Claude session that didn't validate against the container's actual behavior. The "worker materializes a minimal directory tree" claim was an inference from the v1.2 spec's intent, not a check of the code. When session 8 ran the canon-conforming payload, PTXprint silently bailed. Canon was wrong because it described a goal as if it were implementation.

This is consistent with `klappy://canon/principles/contract-governs-handoff-drift` but applied to the inverse case: when canon is *itself* drifted from implementation, the contract is fictional. Promotion candidate: *"Canon must be validated against running code at the moment of authoring; aspirational claims must be tagged as future-state, not current contract."*

### L-011 — Operator's bottleneck attention is violated by punting empirical questions back as multiple-choice
Session 8 opened with three options surfaced to the operator. Operator correction was visceral. The fresh-context Claude in the validation slot had a clear, low-cost empirical move available (run the smoke, observe). The right pattern in validation mode: take the action, surface findings. Multiple-choice questions belong in *planning* mode (per `klappy://canon/principles/mode-discipline-and-bottleneck-respect`), not in execution.

---

## C — Constraints

### C-010 — Phase 1 PoC end-to-end DoD is gated on three additional fixes
After PR #8, the remaining gates are:
1. **Container Dockerfile**: install ptx2pdf TeX macros to a TEXINPUTS-searchable location.
2. **Canon update OR container code change**: either acknowledge that `config_files` (Settings.xml + ptxprint.cfg minimum) is required for Phase 1, or implement worker-side synthesis of those files.
3. **Cfg minimum spec**: figure out the actual minimum-required cfg keys (the widget IDs PTXprint requires at load time — `s_fontsize` and `s_linespacing` confirmed required; others likely).

Gate 1 is unambiguous code work. Gates 2 and 3 are doctrinal (operator-decision-gated) — the choice between "canon-aligned worker-synthesis" and "canon-update + agent-supplies-fixtures" affects how much code lives in the container vs. how much agents must construct.

---

## H — Handoffs

### H-010 — Patch the Dockerfile to install TeX macros (Day-1 blocker)
Concrete diff shape:

```dockerfile
# Before the rm -rf /tmp/ptx2pdf line:
RUN cp -r /tmp/ptx2pdf/src /usr/local/share/ptx2pdf
ENV TEXINPUTS=/usr/local/share/ptx2pdf//:
```

Or alternatively drop the macros into a texmf tree and `mktexlsr`. Either works; the `TEXINPUTS` env var is simpler and more explicit.

This is a Day-1 blocker — without it, no PDF will ever be produced regardless of what else is fixed.

### H-011 — Decide doctrinal direction: worker-synthesis vs. canon-update
Two paths, operator-decision-gated:

- **(A) Worker-synthesis path.** Implement `synthesize_phase1_project_files()` in `container/main.py` that materializes a minimum `Settings.xml` + minimum `ptxprint.cfg` when `config_files` is empty. Honors Phase 1 canon literally. Larger code change; container holds the doctrinal knowledge.

- **(B) Canon-update path.** Update `canon/articles/phase-1-poc-scope.md` to acknowledge that Phase 1 *requires* a minimum `config_files` map (Settings.xml + ptxprint.cfg). Agent constructs these. Smaller code change; canon stays honest. The "USFM-only payload" promise gets withdrawn.

- **(C) Hybrid.** Container fixes TeX macros only (Day-1). Phase 1 canon updated to reflect minimum-fixtures reality. Agent supplies Settings.xml + ptxprint.cfg. Settings-cookbook canon article gains a "Phase 1 minimum" recipe.

Recommendation: **(C)** — smallest code delta, honors empirical reality, doesn't bloat the container with synthesis logic that's anyway temporary (Phase 2 ships preset templates).

### H-012 — Determine actual minimum ptxprint.cfg shape
Empirically: the canon-stated minimal example failed (`s_fontsize` and `s_linespacing` not satisfied by `[paragraph] linespacing = 14`). The minitests/Default cfg (9090 bytes) worked. The actual minimum is somewhere in between.

Investigation paths:
- Read `python/lib/ptxprint/view.py` line 478 area for what `self.get("s_fontsize")` reads from. The widget-ID-to-cfg-key mapping should surface.
- Bisect: start with minitests cfg, strip sections until PTXprint breaks, identify the load-time-required minimum.
- Run PTXprint with `-I` (per session-1 O-003) and inspect the widget-ID dump.

Probably 50–200 bytes of cfg. Settles H-012 inside session 9.

### H-013 — Update `canon/articles/config-construction.md`'s "minimal cfg" example
Current article (PR #3) shows a 4-section minimal example. Empirically, that example produces a TypeError at PTXprint load. The article needs a corrected example or a "minimal-cfg validation status: untested at authoring time" caveat. Affects every Phase 2+ agent who reads this article.

---

## Empirical evidence ledger

### Smoke runs this session

| # | Time UTC | Hash (job_id prefix) | argv | Result | Diagnostic |
|---|---|---|---|---|---|
| 1 | 23:54:48 | `a8eb0823` | `-P BSB -b JHN -p ... -q` (no `-c`) | silent exit 0, no log, 1.9s | synthetic `[container diagnostic]` populated |
| 2 | 23:58:23 | `db50a32a` | `-P BSB -c Default -b JHN -p ... -q` | exit 1, no log, 1.4s, `TypeError float(None)` | synthetic + real stderr |
| 3 | 23:59:03 | `93dae242` | `-P BSB -c Default -b JHN -p ... -q` | identical to #2 | identical |
| 4 | 00:01:16 | `a0e82d0d` | `-P minitest -c Default -b JHN -p ... -q` | exit 1, **real .tex generated**, **real .log uploaded to R2**, 4.2s, XeTeX `! I can't find file 'paratext2.tex'` | real XeTeX log via `log_url` |

### Artifacts produced

- `/r2/outputs/a0e82d0de47acbeb80853867832f66be908fe9ee6cbdcfc0bc62e72f7e5e6342/minitest_Default_JHN_ptxp.log` — first real artifact through the full pipeline. 573 bytes. HTTP 200 to UA-respecting clients.

### Reusable scripts saved in /home/claude/

- `smoke.py` — MCP session init + tools/call + poll loop. Honors UA requirement. Reusable for any payload.
- `smoke-payload.experiment.json` — last experiment payload (minitests fixtures).
- `minitests/` — fetched fixture files.

---

## Cross-Reference Summary — Sessions 1–8 (carrying 1–7 forward)

| Earlier item | Session 8 outcome |
|---|---|
| O-001 (first-pass MCP doesn't emit PDFs) | Still doesn't emit PDFs; gap is 3 layers deeper than session 3 isolated |
| D-014 (empty config_files insufficient) | **Validated empirically.** Phase 1 canon's reframing was wrong on this point. |
| C-009 (silent-bail diagnostic) | **Closed by PR #8.** Working perfectly. |
| H-007 (config_files content decision) | Returned to the operator with new evidence; recommendation: option (C) hybrid |
| H-008 (understand silent bail diagnostics) | **Done.** Diagnostic surface produced concrete cause for every failure mode encountered. |
| H-009 (validate workerUrl fix end-to-end) | **Validated up to PTXprint subprocess invocation.** Output upload pipeline confirmed via real .log artifact in R2. |
| Phase 1 canon (PR #3, session 7 D-025) | **Inaccurate.** "Worker materializes a minimal directory tree" is not implemented; canon needs updating per H-011. |

---

*End of session 8 encoding. Companion artifact: a single bash command for H-010 + an operator decision on H-011 unblocks the next session.*
