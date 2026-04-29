---
title: "PTXprint MCP — Handoff (2026-04-29 after first PDF)"
audience: next-session-claude
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "handoff", "phase-1-poc", "session-10-end", "first-pdf"]
extends: "canon/encodings/transcript-encoded-session-10.md (this PR); supersedes the 2026-04-29 early-AM handoff (operator-side, pre-this-PR)"
written_at: 2026-04-29T01:05:00Z
session_window: 2026-04-29T00:53Z–2026-04-29T01:05Z (session 10; ~12 min wall-clock)
---

# Handoff — 2026-04-29 after first PDF

> Pick this up next session. Companion: `canon/encodings/transcript-encoded-session-10.md` (this PR). This doc is the operational pickup — what to do first, what's in flight, what to know.

---

## What works right now

**Phase 1 DoD step 5: SATISFIED.** First end-to-end PDF generation verified at the live deploy `https://ptxprint-mcp.klappy.workers.dev`:

- `/health` → 200, version 0.1.0, spec v1.2-draft
- All four MCP tools work (`submit_typeset`, `get_job_status`, `cancel_job`, `get_upload_url`)
- Worker → Container → PTXprint → R2 → presigned URL pipeline produces a real, retrievable PDF
- Reproducible smoke at `/home/claude/smoke.py` (this session's working tree; will not survive container reset)

**Validation artifact**: job `6f37b42b9c73ad5e4f7b8a576de8144bcc6c87fad944051e285a33d21de25059`. PDF retrievable at:

```
https://ptxprint-mcp.klappy.workers.dev/r2/outputs/6f37b42b9c73ad5e4f7b8a576de8144bcc6c87fad944051e285a33d21de25059/minitest_Default_JHN_ptxp.pdf
```

(66966 bytes, valid PDF v1.3, Creator: PTXprint 3.0.20, Title: "The Testcase", Subject: "JHN")

main HEAD when this handoff was written: `5978b6b9c9` (PR #11 merge of session 8+9 encodings, 2026-04-29T00:52:50Z). This handoff's PR adds session-10 encoding + canon update.

---

## What does not yet work — drift 7 (open)

The minitests fixture's `ptxprint.cfg` declares **Gentium Plus** as the body font. Container bundles **Charis SIL + Source Code Pro** only. Without mitigation, the smoke fails with:

```
! Font \font<p-12.0>="Gentium Plus:script=latn" at 11.00006pt not loadable: Metric (TFM) file or installed font not found.
```

This session's mitigation: **edit the cfg in-place** in the `config_files` payload to substitute Charis SIL for the four font-role keys (`fontregular`, `fontbold`, `fontitalic`, `fontbolditalic`). Documented in the canon update at `canon/articles/phase-1-poc-scope.md` (this PR).

`define` overrides did NOT work for these keys — see session-10 D-019 / O-035. Widget-ID-to-cfg-key mapping is still undocumented (session-1 O-003 → session-10 H-019).

---

## First three moves next session

### Move 1 — Time + status sweep (≤2 min)

```bash
# 1a — current time
oddkit_time   # call the tool, pass any prior server_time as reference

# 1b — main HEAD and CI deploy state
PAT="<see project instructions>"
curl -sH "Authorization: Bearer $PAT" \
  https://api.github.com/repos/klappy/ptxprint-mcp/commits/main \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['sha'][:10], r['commit']['author']['date'], '-', r['commit']['message'].split(chr(10))[0])"

# 1c — health
curl -sS -w "\nHTTP %{http_code}\n" https://ptxprint-mcp.klappy.workers.dev/health

# 1d — re-verify PDF is still in R2 (90-day retention, but worth checking)
curl -sS -A "ptxprint-smoke/0.x" -o /tmp/last.pdf \
  "https://ptxprint-mcp.klappy.workers.dev/r2/outputs/6f37b42b9c73ad5e4f7b8a576de8144bcc6c87fad944051e285a33d21de25059/minitest_Default_JHN_ptxp.pdf"
file /tmp/last.pdf
```

Expected: HEAD ≥ this PR's merge SHA, /health is 200, PDF file reports `PDF document, version 1.3`.

### Move 2 — Operator triage on drift 7 (H-018)

Three viable paths, each is a separate surgical PR. **Operator's call** which to take first:

1. **Bundle Gentium Plus in the Dockerfile** (mirrors session-9 PR #10's Charis pattern). One Dockerfile change + a font copy. Pro: faithful rendering of any fixture that requests Gentium Plus. Con: container-size growth; sets precedent that "we bundle everything users might want," which ends in the session-3 C-007 anti-direction.
2. **Document the payload `fonts` field in canon and demonstrate it in a smoke test.** The schema already has `FontSchema` with `family_id` / `version` / `filename` / `url` / `sha256`. Phase 2-aligned: agents supply fonts they use. Con: Gentium Plus URLs + sha256 must come from somewhere; container's fontconfig may need refresh after font materialisation.
3. **Stay on the cfg-edit mitigation pattern** (this PR's canon update locks it in). Lowest container/code change. Con: doesn't make the fixture render *faithfully* — just renders. Phase 1 shape, not Phase 2.

Default if no operator triage: stick with (3) and proceed to next item.

### Move 3 — Close session-1 O-003: widget-ID-to-cfg-key mapping (H-019)

This is the leverage move for Phase 2. Without it, `define` is a guess-and-check tool the agent can't rely on. Resolution paths in priority order:

- **Run PTXprint locally with the runtime introspection flag** (session-1 O-003 mentioned `-I`) and capture the dump. Best fidelity, but requires local PTXprint install.
- **Read PTXprint's GTK Glade XML (UI definitions)** in `python/lib/ptxprint/` and correlate to cfg setters in the same module. Works from a `git clone` without local install.
- **Ask Martin (PTXprint dev)** for an authoritative listing.

Outcome: a canon article like `canon/articles/widget-id-to-cfg-key.md` that lists every cfg key with its corresponding `-D` widget ID. This unlocks reliable runtime overrides for Phase 2.

---

## Open items (priority-ordered)

| ID | Priority | Item | Lives in |
|---|---|---|---|
| H-018 | P0 | Drift 7 triage — pick a surgical-PR path (bundle / payload-fonts / cfg-edit-only) | Operator decision |
| H-019 | P1 | Widget-ID-to-cfg-key mapping (closes session-1 O-003) | Canon authoring |
| H-013 | P1 | Update `canon/articles/config-construction.md`'s "minimal cfg" example to match session-10 reality | Canon edit |
| H-015 | P1 | File 3 upstream issues on `sillsdev/ptx2pdf` (session-9 enumeration) | Operator-side |
| H-020 | P2 | Fix `HEAD /r2/outputs/<key>` → 404 in Worker (one-route-handler change) | `src/index.ts` |
| H-021 | P2 | Investigate XDV → PDF page-count discrepancy on longer fixtures | Empirical pass |
| H-017 | P2 | Resolve oddkit branch URL syntax for ptx2pdf indexing | Operator + oddkit maintainer |
| C-009 fallout | P3 | Polish: `smoke/minimal-payload.json` `_todo` block is stale (this session demonstrated the answers) | Cleanup PR |
| Day-2 deferred | P3 | `cancel_job` SIGTERM into running container | v1.2 spec |
| Day-2 deferred | P3 | `get_upload_url` presigned R2 PUTs | v1.2 spec |
| Day-2 deferred | P3 | Strip bundled fonts (session-3 C-007) | v1.2 spec; conflicts with H-018 path 1 |
| Day-2 deferred | P3 | Autofill mode | v1.2 spec |
| Day-2 deferred | P3 | Per-pass progress streaming | v1.2 spec |
| Operator-side | P3 | R2 lifecycle policies (`outputs` 90d, `uploads` 24h) | CF dashboard |
| Operator-side | P3 | WAF skip rule for `/mcp` (or document UA requirement) | Confirmed in session 9 |

---

## State at session end (for resuming exactly)

- **Live Worker version string:** `0.1.0` (per `/health`); spec `v1.2-draft`
- **main HEAD before this PR:** `5978b6b9c9` (PR #11 merge of session 8+9 encodings)
- **This PR's branch:** `session-10-first-pdf-and-canon-h016`
- **Successful job_id (verified end-to-end):** `6f37b42b9c73ad5e4f7b8a576de8144bcc6c87fad944051e285a33d21de25059`
- **Reproducible smoke**: `/home/claude/smoke.py` (this session's container; ephemeral)
  - Builds payload from minitests fixture at SHA `ad086acfa66a5ca64cff361325f849eb30c7984b`
  - Applies cfg-edit Charis substitution before submit
  - Sends MCP JSON-RPC over streamable HTTP at `/mcp` with required UA
  - Polls `get_job_status` until terminal state
- **Pinned ptx2pdf reference:** tag `3.0.20` (sha `c93ee4f692`) bundled in container; minitests fixture read at `master` (sha `ad086acfa6...` per session 8)
- **Pinned BSB:** `usfm-bible/examples.bsb` @ `48a9feb71f0a66f9b8f418b11ae25b7ad2e49a0d` (referenced in `smoke/minimal-payload.json`; not used in this session — minitests was the active fixture)

---

## Things to remember (do not relearn)

These are session-1-through-10 cumulative.

1. **`oddkit_time` is the first call every turn.** No exceptions. Pass prior turn's `server_time` as `reference` for elapsed.
2. **Cursor Agent is a parallel collaborator on this repo.** Check `git log` for unexpected authors before assuming you own a branch.
3. **`agents@0.2.x` McpAgent.serve() needs explicit `binding:` name** — permanent SDK-default landmine.
4. **`this.props` returns undefined in McpAgent tool handlers** unless auth-context middleware is in place. Use `this.env.<VAR>` instead.
5. **Silent-failure bugs are Day-1 priority, not Day-2.** L-007.
6. **The container's `patch_state(callback, ...)` short-circuits when callback is None.** WORKER_URL var must be set.
7. **Job IDs are content-addressed (sha256 of payload).** Same payload → same job_id. Perturb to force fresh DO state. `cached: false` in submit response means "we ran it again," not "we returned cache" — slightly misleading field name.
8. **`/health` and pre-validation MCP paths can be green while DO routes throw 1101.** When MCP routes throw 1101, it's something inside `serve()` or the DO itself.
9. **CF Error 1010 (browser_signature_banned) hits default urllib User-Agent.** Always set an explicit User-Agent on smoke requests.
10. **When operator suggests a fix hypothesis, refute or confirm empirically before agreeing or proposing alternatives.** Session-9 D-018.
11. **In fresh-context-Claude validation slot: take the action, surface findings — don't punt multi-choice questions back to the operator.** Session-8 D-015.
12. **Surgical-PR cadence preserves drift-isolation visibility.** One fix per PR. Cite empirical refutations inline in PR descriptions. Session-9 D-017.
13. **Diagnostic surface (PR #8) is what makes drift isolation possible.** Without it, drifts 4–7 would have looked identical from the outside.
14. **(NEW session 10) `define` overrides DON'T affect cfg keys named the same.** Edit `config_files` content directly until widget-ID mapping is documented.
15. **(NEW session 10) `project_id` is capped at 8 chars by the v1.2 schema.** Paratext convention is project-id-equals-folder-name; 9-char folder names need renaming.
16. **(NEW session 10) Empirical refutation works on the agent's own hypotheses too.** Don't loop on retry-with-variations; one targeted test, then pivot.

---

## Credentials and keys

(See project instructions for the canonical copies.) GitHub PAT scoped to klappy/ptxprint-mcp; CF account `b03e6ea242724c05eb97eb732cceb21d`.

---

## What this session accomplished

- ✅ Move 1 (status sweep): main HEAD verified, /health green, CI in-progress on docs PR (no Worker behavior change expected)
- ✅ Move 2 (drift 6 closure + first PDF): payload reconstruction from upstream fixtures + ptxprint-mods.sty addition + cfg-edit Charis mitigation produced first end-to-end PDF
- ✅ Move 3 (canon update H-016): `canon/articles/phase-1-poc-scope.md` rewritten to match empirical reality
- ✅ Drift 7 (Gentium Plus / font compatibility) fully isolated, characterized, mitigation pattern documented
- ✅ Session 10 encoding written (`canon/encodings/transcript-encoded-session-10.md`)
- ✅ This handoff written

The pipeline went from "one tiny payload edit away" (per the handoff written 12 min before this session opened) to actually-validated-end-to-end. Drift 7 is the next surgical-PR boundary.

---

*End of handoff. The next session's Move 1 is `oddkit_time`. Welcome.*
