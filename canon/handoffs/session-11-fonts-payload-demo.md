---
title: "Handoff — 2026-04-29 after fonts-payload demo"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "handoff", "session-11", "fonts-payload"]
date: 2026-04-29
status: working
companion_to: "canon/encodings/transcript-encoded-session-11.md"
---

# Handoff — 2026-04-29 after fonts-payload demo

## TL;DR

Session 11 closed H-018 path 2 (operator triage answer). Phase-2 fonts-payload path is now empirically demonstrated end-to-end: the minitests fixture's `ptxprint.cfg` was left **unmodified** (still references "Gentium Plus"), and the actual Gentium Plus 6.200 TTFs were supplied via the payload's `fonts` array. PDF rendered faithfully — `pdffonts` confirms GentiumPlus / GentiumPlus-Bold / GentiumPlus-Italic embedded. **No container code changes were necessary.** PR also folds in H-020 (HEAD `/r2/outputs/<key>` → 404) as a tiny opportunistic fix, which auto-deployed via Workers Builds when PR #13 merged — **HEAD now returns 200 against the live worker**, verified empirically.

> **Correction note (post-session, 2026-04-29).** This handoff was originally drafted with the (wrong) belief that deploys required a manual `wrangler deploy` step ("H-024"). The truth: the CF dashboard's Workers Builds GitHub integration auto-deploys every merged push to `main`. The H-020 fix shipped at PR #13 merge time without any further action. H-024 was a phantom and is closed; the original wording is preserved below for the record.

## What works right now

**Phase 1 DoD step 5** continues to hold (still true from session 10). **Phase 2 fonts path** is also now demonstrated:

- Smoke fixture: `smoke/fonts-payload.json` (committed in this PR).
- Job: `802e42e7d549cf9f827cbbcff69a6354e1b968a23084e5f2485f93cde52fc4bd`.
- PDF: `https://ptxprint-mcp.klappy.workers.dev/r2/outputs/802e42e7d549cf9f827cbbcff69a6354e1b968a23084e5f2485f93cde52fc4bd/minitest_Default_JHN_ptxp.pdf` (68111 bytes, PDF v1.3, 2 pages).
- pdfinfo: `Title="The Testcase" Subject="JHN" Creator="PTXprint 3.0.20 (Default)"`.
- pdffonts: GentiumPlus, GentiumPlus-Bold, GentiumPlus-Italic, SourceCodePro-Regular (the last is system-bundled per PR #10).
- Wall-clock: 4.7s (vs session-10's 4.1s — comparable, slightly larger PDF due to faithful font metrics).

**Staged R2 fixtures** (Gentium Plus 6.200, four faces):
- `https://ptxprint-mcp.klappy.workers.dev/r2/outputs/fixtures/fonts/gentium-plus-6.200/GentiumPlus-Regular.ttf` (sha256 `2c27e7da23ba44d135685836056833b304a388d3da346813189c60656dc02019`, 880592 bytes)
- `…/GentiumPlus-Bold.ttf` (sha256 `622ea9f2709d74f99d45c08d93cdf2a6d096406d3a1ec2939d02714f558b3dac`, 885156 bytes)
- `…/GentiumPlus-Italic.ttf` (sha256 `fedc1acdd2f1080941ed998cabee9759456f0e486fbd8169ff4238b37d3ac60d`, 940752 bytes)
- `…/GentiumPlus-BoldItalic.ttf` (sha256 `960e0a58ce1d7849c7a3e49f4fbc1ac4a27b58ef19a2d013ce637fe364b0a1f0`, 957876 bytes)
- Original ZIP: `https://github.com/silnrsi/font-gentium/releases/download/v6.200/GentiumPlus-6.200.zip` (sha256 `9b21103b79961149b6508791572acb3b2fe7eb621474c57d5e4ee37e76d7b073`).

**H-020 HEAD fix** is in this PR's `src/index.ts` and **deployed live** — Cloudflare Workers Builds GitHub integration auto-deploys every merged push to `main`. `HEAD /r2/outputs/<key>` returns 200 against the live worker; verified empirically post-PR-13-merge.

## What does not yet work

- **Charis SIL canonical URLs** in `canon/articles/font-resolution.md` still cite the unverified `lff.api.languagetechnology.org` placeholder pattern — fine for documentation shape, but if an agent tries those URLs verbatim they may not resolve. H-023 is the cleanup; pairs naturally with H-022 (move fixtures into a dedicated bucket).
- **Widget-ID-to-cfg-key mapping** (session-1 O-003 / session-10 H-019) still open. This was the leverage move the session-10 handoff said "deserves its own session" — still waiting for one.

## First three moves next session

### Move 1 — Time + status sweep (≤2 min)

Same as session-11's session-10 sweep, plus a deploy-state probe.

```bash
# 1a — current time
oddkit_time

# 1b — main HEAD
PAT="<see project instructions>"
curl -sH "Authorization: Bearer $PAT" \
  https://api.github.com/repos/klappy/ptxprint-mcp/commits/main \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['sha'][:10], r['commit']['author']['date'], '-', r['commit']['message'].split(chr(10))[0])"

# 1c — health
curl -sS -w "\nHTTP %{http_code}\n" https://ptxprint-mcp.klappy.workers.dev/health

# 1d — re-verify session-11 PDF still in R2
curl -sS -A "ptxprint-smoke/0.x" -o /tmp/last.pdf \
  "https://ptxprint-mcp.klappy.workers.dev/r2/outputs/802e42e7d549cf9f827cbbcff69a6354e1b968a23084e5f2485f93cde52fc4bd/minitest_Default_JHN_ptxp.pdf"
file /tmp/last.pdf

# 1e — confirm the live worker reflects the latest main (Workers Builds is automatic
# but worth a sanity check — exercise behavior introduced by the most recent merge).
# Example for a route change: curl that route. For a Container change: submit a smoke
# with a unique payload to force a new instance.
curl -sS -I -A "ptxprint-smoke/0.x" \
  "https://ptxprint-mcp.klappy.workers.dev/r2/outputs/802e42e7d549cf9f827cbbcff69a6354e1b968a23084e5f2485f93cde52fc4bd/minitest_Default_JHN_ptxp.pdf" \
  | head -1
```

`HEAD /r2/...` returning `HTTP 200` confirms the H-020 fix deployed correctly. (Workers Builds has auto-deployed since session 11 — this is a sanity check, not a gating step.) If it returns `HTTP 404`, check the **Workers & Pages → ptxprint-mcp → Deployments** tab in the CF dashboard for the latest build status.

### Move 2 — Pick H-019 (widget-ID-to-cfg-key mapping)

This was the session-10 leverage move; session 11 chose not to start it. Resolution paths in priority order (unchanged from session 10's handoff):

- **Run PTXprint locally with the runtime introspection flag** (session-1 O-003 mentioned `-I`) and capture the dump.
- **Read PTXprint's GTK Glade XML (UI definitions)** in `python/lib/ptxprint/` and correlate to cfg setters.
- **Ask Martin (PTXprint dev)** for an authoritative listing.

Outcome: a canon article like `canon/articles/widget-id-to-cfg-key.md` listing every cfg key with its corresponding `-D` widget ID. Unlocks reliable runtime overrides for Phase 2.

### Move 3 — H-022 / H-023: bucket hygiene + Charis URLs

If the operator wants to clean up before scaling fixtures further:
- Add `FIXTURES → ptxprint-fixtures` R2 binding to `wrangler.jsonc`.
- Move the four Gentium Plus TTFs from `outputs/fixtures/fonts/...` to the new bucket's root.
- Update canon URLs in `canon/articles/font-resolution.md`.
- Stage Charis 7.000 the same way; update Charis worked example.

This is "cleanup PR" territory — meaningful but not urgent.

## Open items (priority-ordered)

| ID | Priority | Item | Lives in |
|---|---|---|---|
| H-019 | P1 | Widget-ID-to-cfg-key mapping (closes session-1 O-003) | Canon authoring |
| H-013 | P2 | Update `canon/articles/config-construction.md`'s "minimal cfg" example | Canon edit |
| H-015 | P2 | File 3 upstream issues on `sillsdev/ptx2pdf` | Operator-side |
| H-022 | P3 | Move stable fixtures into dedicated `ptxprint-fixtures` bucket | `wrangler.jsonc` + migration |
| H-023 | P3 | Verify or replace Charis SIL LFF URL pattern in canon | Canon edit (pairs with H-022) |
| H-025 | P3 | Retire H-021 unless larger fixture demonstrates it bites | Empirical pass |
| H-017 | P3 | Resolve oddkit branch URL syntax for ptxprint-mcp canon indexing | Operator + oddkit maintainer |
| C-009 fallout | P3 | `smoke/minimal-payload.json` `_todo` block is stale | Cleanup PR |
| Day-2 deferred | P3 | `cancel_job` SIGTERM into running container | v1.2 spec |
| Day-2 deferred | P3 | `get_upload_url` presigned R2 PUTs | v1.2 spec |
| Day-2 deferred | P3 | Strip bundled fonts (session-3 C-007) | v1.2 spec |
| Day-2 deferred | P3 | Autofill mode | v1.2 spec |
| Day-2 deferred | P3 | Per-pass progress streaming | v1.2 spec |
| Operator-side | P3 | R2 lifecycle policies | CF dashboard |

> **H-024 retracted.** Originally listed as "operator: `wrangler deploy` to ship H-020 HEAD fix." This was based on the incorrect belief that deploys were manual. The truth: Workers Builds GitHub integration auto-deployed the fix at PR #13 merge time. `HEAD /r2/...` returning 200 against the live worker confirms it.

## State at session end (for resuming exactly)

- **Live Worker version:** `0.1.0`, spec `v1.2-draft` (unchanged from session 10).
- **main HEAD before this PR:** `d389648f29` (PR #12 merge of session 10 encoding + canon update + drift-7 isolation).
- **This PR's branch:** `session-11-fonts-payload-demo`.
- **Successful job_id (this session, fonts-payload smoke):** `802e42e7d549cf9f827cbbcff69a6354e1b968a23084e5f2485f93cde52fc4bd`.
- **R2 staged TTF prefix:** `outputs/fixtures/fonts/gentium-plus-6.200/`.
- **Reproducible smoke:** `python3 /home/claude/smoke_run.py smoke/fonts-payload.json` (the `smoke_run.py` script in /home/claude is ephemeral but reconstructs in ~3 minutes from the JSON-RPC pattern: initialize → notifications/initialized → tools/call submit_typeset → poll tools/call get_job_status).

## Things to remember (do not relearn)

Carries forward from session-10 list:

- agents@0.2.x `McpAgent.serve()` needs explicit `binding: "MCP_AGENT"`.
- `this.props` is undefined in tool handlers; use `this.env.<VAR>`.
- Job IDs are sha256 of canonicalized payload — same payload, same id; perturb to force fresh DO state.
- urllib default UA gets Cloudflare-1010-banned. Always set explicit UA.
- `define` overrides do NOT take effect for cfg keys with the same name; PTXprint widget IDs ≠ cfg keys. Edit `config_files` content directly OR supply the actual font via `fonts` payload.
- `project_id` capped at 8 chars by v1.2 schema; "minitests" (9) → "minitest".

New from session 11:

- **Payload-supplied fonts work without container changes.** Materialised at `<scratch>/<project>/shared/fonts/<filename>`; PTXprint's startup adds that to XeTeX's resolution paths. No `fc-cache` or `OSFONTDIR` invocation needed.
- **`fonts-sil-gentium` ≠ `fonts-sil-gentiumplus`.** The Dockerfile's apt list installs the former (Gentium 1.03 from 2008, Regular only). The latter (v6.200, four Gentium Plus faces) was never installed; that explains drift 7 root-cause.
- **`/internal/upload` accepts arbitrary content as binary-clean PUT** as long as the key starts with `outputs/`. No auth in Day-1; Day-2 will replace with presigned URLs.
- **`HEAD /r2/outputs/<key>` returns 200** — the H-020 fix landed in PR #13 and auto-deployed via Workers Builds. Both HEAD and GET work. (Pre-PR-13 it returned 404; if you ever see 404 on a known-existing key after this, suspect a deploy regression and check the Deployments tab.)
- **Surprise downward in scope is a workflow success, not a failure.** Plan called for `fc-cache`/`OSFONTDIR`; empirical test showed not needed; PR shipped strictly less code than predicted. Encode the principle: test before pre-emptive coding.

## Cursor Agent caveat

Cursor Agent collaborates on this repo in parallel. Check git log for unexpected authors before assuming you own a branch.

## Credentials and keys

GitHub PAT and CF account in project instructions. Don't re-fetch.

## What this session accomplished

- Closed H-018 path 2 (Phase-2 fonts-payload path) end-to-end empirically.
- Staged Gentium Plus 6.200 TTFs in R2 (4 files, all sha256-roundtrip-verified).
- Authored `smoke/fonts-payload.json` (committed in this PR).
- Updated `canon/articles/font-resolution.md` with empirically-verified Gentium Plus example, R2-staged-fixtures source pattern, and corrected Phase-1 warning.
- Updated `canon/articles/phase-1-poc-scope.md` with the session-11 demonstration note.
- Folded H-020 HEAD fix into `src/index.ts`.
- Encoded the session and produced this handoff.
- Refuted session-10's "fontconfig refresh may be needed" hypothesis empirically and recorded the lesson.

## If the next session can only do one thing

**Validate this PR as fresh-context Claude**, per `klappy://canon/principles/verification-requires-fresh-context`. The empirical claims (PDF rendered with payload Gentium Plus, R2 roundtrip, HEAD-fix code) are all in the encoding and reproducible. Re-run the smoke (3-5 min) and confirm `pdffonts` shows GentiumPlus faces. Either approve-and-merge or surface what looks shaky.

If validated: the next big leverage move is H-019 (widget-ID-to-cfg-key mapping). It deserves its own session.
