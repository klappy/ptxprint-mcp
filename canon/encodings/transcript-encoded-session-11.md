---
title: "PTXprint MCP — Session 11 Encoding"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "session-11", "fonts-payload", "drift-7-resolved", "h-020-fix"]
extends: "canon/encodings/transcript-encoded-session-10.md"
encoded_at: 2026-04-29T01:55:00Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
---

# PTXprint MCP — Session 11 Encoding

> Continues session 10. Session 10 closed with a working pipeline using cfg-edit-substitution for drift 7. Session 11 picked H-018 path 2 (operator triage answer: "Demo fonts payload"), demonstrated payload-supplied fonts end-to-end, and folded in H-020 (HEAD /r2/ 404) opportunistically.

---

## D — Decisions

### D-021 — Stage v6.200 TTFs in our R2, not link to upstream raw URLs

**Operator triage Q1 (session 11): "Stage v6.200 TTFs into our R2 first (extra step, pristine)"** vs. using `silnrsi/font-gentium`'s in-tree `references/v6101/` files at the v6.200 git tag (which would have been v6.101 bytes labeled as v6.200, working but imprecise).

The R2-stage path puts the actual `GentiumPlus-6.200.zip` extracts at content-addressed URLs we control. URLs persist as long as the OUTPUTS bucket does. Per-file sha256s are computed from the original ZIP and verified to match the served bytes (roundtrip check passed all four faces).

**Path:** `outputs/fixtures/fonts/gentium-plus-6.200/<filename>` under the existing OUTPUTS bucket. URLs at `https://ptxprint-mcp.klappy.workers.dev/r2/outputs/fixtures/fonts/gentium-plus-6.200/<filename>`. Mixing test fixtures into the OUTPUTS bucket is a slight semantic strain (the bucket's purpose is job outputs); a future split into a `ptxprint-fixtures` bucket is the cleaner long-term shape but was not in session-11 scope. See H-022.

### D-022 — H-020 HEAD fix folded into this PR

**Operator triage Q2 (session 11): "Yes — trivial fix, makes smoke verification cleaner".** The `/r2/` route handler in `src/index.ts` was extended to share the HEAD path with GET. HEAD uses `env.OUTPUTS.head()` (metadata only, no body bytes), GET uses `.get()` as before. Content-type table extended to `font/ttf` and `font/otf` for completeness. Body is `null` for HEAD per `Response` semantics. The deploy of this fix is gated on operator running `wrangler deploy` (no CI workflow exists in `.github/workflows/`); session-11 empirical claims are all independent of it.

### D-023 — No container code changes were necessary

**Surprise downward in scope.** The session-10 handoff predicted "container's fontconfig may need refresh after font materialisation"; the operator-chosen plan budgeted for `fc-cache` and/or `OSFONTDIR` env wiring as a likely-needed defensive change. Session-11 ran the smoke against the live deploy without any container changes and the PDF rendered with the actual payload-supplied Gentium Plus fonts. **PTXprint's own startup logic adds `<project>/shared/fonts/` to XeTeX's font resolution paths automatically.** The container's existing `fetch_inputs()` materialiser places fonts in exactly that directory — the wire was complete on day 1; it just had never been exercised end-to-end.

---

## O — Observations (closed)

### O-039 — Drift 7 root cause: wrong Debian package, not missing fontconfig refresh

The Dockerfile installs `fonts-sil-gentium` (Debian source package, currently version `20081126:1.03-4` on bookworm) — that is the **original 2008 Gentium 1.03**, Regular only, no Bold/Italic. The minitests fixture's cfg references `Gentium Plus`, which lives in a **separate** Debian package: `fonts-sil-gentiumplus` (currently version `6.200-1`), four faces. The two packages have nearly-identical names and easy-to-confuse purposes; session 9 PR #10's Dockerfile commit happened to install the simpler one.

This corrects the session-10 mental model that drift 7 was about "missing 'Gentium Plus' family name in v7-renamed font." That is also true upstream (SIL renamed v7.000 family from "Gentium Plus" back to "Gentium"), but is downstream of the actual cause: Debian's `fonts-sil-gentium` package never carried "Gentium Plus" — that's `fonts-sil-gentiumplus`'s job.

### O-040 — First PDF with payload-supplied fonts: 4.7s, 2 pages, faithful render

Job `802e42e7d549cf9f827cbbcff69a6354e1b968a23084e5f2485f93cde52fc4bd`. Submitted 2026-04-29T01:51:12.548Z, succeeded 2026-04-29T01:51:20Z. PTXprint reported 1 typesetting pass, exit code 0, 1 overfull-hbox warning (vs session-10's 2 — slight metric difference between Charis and Gentium Plus), 0 errors. PDF metadata: Title="The Testcase", Subject="JHN", Creator="PTXprint 3.0.20 (Default)", Producer="XeTeX". 68111 bytes (vs session-10's 66966 — larger because Gentium Plus has wider metrics than Charis substitution; rendered as 2 pages vs session-10's 1 page).

`pdffonts` confirms the embedded faces:

```
ONUMAO+GentiumPlus-Bold        CID TrueType  yes (subset)
XKSEBK+GentiumPlus             CID TrueType  yes (subset)
ABXWCT+GentiumPlus-Italic      CID TrueType  yes (subset)
SATGCN+SourceCodePro-Regular   CID TrueType  yes (subset)
```

Three of the four payload-supplied faces actually got embedded (Regular, Bold, Italic). BoldItalic was supplied but not used — the JHN test USFM doesn't combine bold+italic anywhere. Source Code Pro is the system-bundled `\font\idf@nt` from `ptx-cropmarks.tex` line 38 (per session-9 PR #10 and the Dockerfile comment).

URL accessible via `GET https://ptxprint-mcp.klappy.workers.dev/r2/outputs/802e42e7.../minitest_Default_JHN_ptxp.pdf`.

### O-041 — payload `fonts` materialisation already worked end-to-end at v0.1.0 deploy time

Session 9 / PR #10 added the `fetch_inputs()` parallel-fetch-with-sha256-verify path in `container/main.py`. Sessions 9 and 10 never exercised it (sessions 9 used `fonts: []`; session 10 used `fonts: []` with cfg-edit Charis substitution). Session 11 was the first time the path ran with non-empty `fonts`, and it worked on the first try. The `<scratch>/<project>/shared/fonts/<filename>` placement happened to coincide with where PTXprint's startup looks. Worth promoting as canon: *"Materialised payload fonts in `<project>/shared/fonts/` are picked up by PTXprint without further wiring."*

### O-042 — Roundtrip-verified that R2 PUT + R2 GET preserves bytes exactly

Each of the four staged TTFs was PUT to `/internal/upload`, then GET via `/r2/...`, then sha256-checked against the original ZIP-extracted bytes. All four matched. The `/internal/upload` path's behavior is therefore confirmed lossless for binary content (it sets the request's `content-type` header through to R2's `httpMetadata.contentType` and stores the body verbatim).

---

## O-open — Observations still open

### O-open-S11-001 — `R2.OUTPUTS` now mixes job outputs and stable test fixtures (semantic)

**Priority:** P3 (working, not blocking)

`outputs/fixtures/fonts/gentium-plus-6.200/*.ttf` lives alongside content-addressed `outputs/<job_hash>/...` keys in the OUTPUTS bucket. As long as the bucket has no lifecycle policy enforced, this is fine. Once a 90-day lifecycle is applied (per session-7 D-025 backlog), the fixtures need either a prefix exemption or a separate bucket. Cleanest long-term: a `ptxprint-fixtures` bucket binding. Tracked as H-022.

### O-open-S11-002 — Charis SIL canonical URL source still undocumented

**Priority:** P2 (Phase-2 readiness)

The font-resolution.md article now has a fully-verified worked example for Gentium Plus 6.200 but still leans on the `lff.api.languagetechnology.org/charissil/...` placeholder URL pattern for Charis SIL itself. LFF was not exercised this session. The next session should either (a) verify LFF actually serves Charis at that URL pattern with stable content, or (b) stage Charis 7.000 in R2 the same way Gentium Plus was, and update canon's Charis worked example with verified URLs and sha256s.

---

## L — Learnings

### L-018 — "Fontconfig refresh might be needed" was a plausible-sounding wrong prediction

The session-10 handoff's "container's fontconfig may need refresh after font materialisation" was a reasonable hypothesis with no empirical evidence behind it. Acting on it would have shipped `fc-cache` invocations and `OSFONTDIR` env-var wiring that turned out to be unnecessary. The right move was the empirical one: stage the smoke first, observe what actually happens, only then decide whether to ship code. This generalises: handoffs that name "may need" risks should be tested before being acted upon, not used as motivation for pre-emptive code changes.

### L-019 — One-page-vs-two-page rendering differences flow from font metrics, not bugs

Session 10's PDF was 1 page (Charis substitution). Session 11's PDF is 2 pages (genuine Gentium Plus). The XDV log shows 2 pages in both cases; pdfinfo reports the post-pdfinish page count. The discrepancy session 10 surfaced as H-021 may have a simpler explanation than initially thought: small page sizes + different font metrics + variable-width pdfinish pagination = different final page counts on small inputs. H-021 should probably be retired unless it manifests on a larger fixture where it actually matters.

### L-020 — A surprise downward in scope is a workflow success, not a failure

The PR closed with no container code changes, which feels anticlimactic compared to the planned `fc-cache`/`OSFONTDIR` work. But: the scope dropped because *we tested the assumption first*. The execution gate produced a PR strictly smaller than planned, and exactly equal to what was needed. Encoding this so the operator and future agents see scope contractions as a normal outcome of empirical-first execution, not as "didn't finish the work."

---

## C — Constraints

### C-011 — H-020 deployment is gated on operator-side `wrangler deploy`

There is no CI workflow in `.github/workflows/` (verified directly, dir does not exist). Code merged to `main` does not auto-deploy. The HEAD-/r2/-fix lands in main at PR merge but only takes effect once the operator runs `wrangler deploy` (or whatever their deploy process is). Smoke verification via HEAD will continue to return 404 against the live worker until that deploy. All session-11 success claims (the fonts-payload PDF, the empirical correctness proof) are based on behavior that did not require this fix and are therefore fully independent of it.

---

## H — Handoffs

### H-022 — Move stable test fixtures out of OUTPUTS bucket into a dedicated `ptxprint-fixtures` bucket

P3. When the OUTPUTS lifecycle policy ships, the `outputs/fixtures/...` prefix conflicts with the bucket's purpose. Cleanest fix: add a third R2 binding (`FIXTURES → ptxprint-fixtures`), migrate the four TTFs, update canon URLs. Operator decision; not blocking.

### H-023 — Verify or replace the LFF Charis SIL URL pattern in canon

P2. Either confirm LFF works as documented and update Charis worked example with verified hashes, or stage Charis 7.000 in R2 the same way Gentium Plus was staged this session. Pairs naturally with H-022.

### H-024 — Operator deploy of the H-020 HEAD fix

P3. Trivial. After PR merge, run `wrangler deploy`. Verify with `curl -I https://ptxprint-mcp.klappy.workers.dev/r2/outputs/802e42e7.../minitest_Default_JHN_ptxp.pdf` returning HTTP 200 (currently returns 404 against the live deploy).

### H-025 — Retire H-021 (XDV vs pdfinfo page count) unless it bites a larger fixture

P3. Session-10 raised this as an investigation item. L-019 above suggests the simpler explanation is enough. Confirm-or-disconfirm by typesetting a Bible-sized payload and seeing whether the two counts diverge in a meaningful way; if not, close H-021 as "expected behavior of pdfinish on small inputs."

---

## Cross-Reference Summary — Session 10 ↔ Session 11

| Session 10 item | Session 11 outcome |
|---|---|
| H-018 path 2 ("Demo fonts payload") | Closed — empirically demonstrated, canon updated, fixture in repo |
| H-020 (HEAD /r2/ 404) | Code fix landed in this PR; deploy gated on H-024 |
| H-019 (widget-ID-to-cfg-key mapping) | Untouched — still next session's leverage move per session-10 handoff |
| H-021 (XDV→PDF page count) | Working hypothesis from L-019; close-or-keep depends on H-025 result |
| Drift 7 (Gentium Plus not loadable) | Two working mitigations now in canon: cfg-edit (simpler) and fonts-payload (faithful) |
| Container `fc-cache`/`OSFONTDIR` (predicted need) | Empirically NOT needed; predict was wrong; canon updated |

---

*End of session 11 encoding. Companion artifacts: `canon/handoffs/session-11-fonts-payload-demo.md` (durable handoff), `smoke/fonts-payload.json` (the demonstration fixture).*

---

## Correction note (added 2026-04-29 post-session, not contemporaneous)

D-022, C-011, H-024, and the cross-reference table above all carry the (incorrect) belief that deploys required a manual `wrangler deploy` step. **They are wrong.** The session-11 author inferred "no CI" from the absence of `.github/workflows/`, missing that Cloudflare Workers Builds is configured via the CF dashboard's GitHub integration and auto-deploys every merged push to `main`. The H-020 fix in PR #13 deployed automatically at merge time; `HEAD /r2/outputs/<key>` returns 200 against the live worker as of 2026-04-29T02:36Z (verified empirically).

The above sections are preserved unedited as the historical record of what the session-11 author believed at the time. The correction lives here to keep the encoding honest:

- **D-022's last sentence** ("The deploy of this fix is gated on operator running `wrangler deploy`…"): false. Auto-deployed.
- **C-011 in full**: false. Workers Builds GitHub integration is the CI; merged commits to `main` auto-deploy.
- **H-024**: phantom. No operator action was needed; closing.
- **Cross-ref table row "H-020 (HEAD /r2/ 404)"**: revised — fix is live, not gated.

The truthful deploy story now lives in `BUILD.md` ("How deploys work" section) and the corrected `canon/handoffs/session-11-fonts-payload-demo.md`. Future sessions should treat those as the canonical source.
