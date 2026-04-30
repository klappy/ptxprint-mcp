---
title: "Phase 1 PoC Scope — Minimum Fixture Payload, Pipeline Validation"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "phase-1", "hackathon", "scope", "poc", "superseded", "historical-reference"]
derives_from: "transcript-encoded-session-7.md (D-025); revised per session-8 H-011, session-9 H-016, session-10 D-019/O-036"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-29
status: superseded
superseded_by: "klappy://canon/articles/progressive-customization"
supersession_reason: "Phase 1's anticipated bundling work has been completed. The default-behavior surface (Level 0 in the new ladder) is now publication-quality, not bare-defaults. The progressive-customization article is the live reference for {books, sources} → Level 4+ progression."
---

# Phase 1 PoC Scope

> 🛈 **Superseded.** This article describes the Phase 1 PoC scope as defined on 2026-04-28 (transcript-encoded-session-7 D-025). At that time, the Container was expected to ship with PTXprint's compiled defaults serving as the bundle, with everything else as Phase 2/3 work. Empirical testing on 2026-04-30 found the Container had no usable bundled defaults — Phase 1 strict payloads failed with `"PTXprint produced no output (silent exit)"`. The bundling work is being completed (see `klappy://canon/handoffs/bundle-default-cfg-handoff`), and the new default-behavior surface (Level 0 in `klappy://canon/articles/progressive-customization`) is publication-quality.
>
> **For current default behavior, see `klappy://canon/articles/progressive-customization`.**
>
> **For what the bundle contains, see `klappy://canon/articles/bundled-default-cfg`.**
>
> The historical content below is preserved for traceability — the session-7 D-025 boundary, the drift-isolation work in sessions 8–10, and the BSB-render iteration trail are referenced from downstream encodings.

> **What this answers.** What does the agent actually do during hackathon week? What's deferred? When does this article become obsolete?
>
> **Related articles.** `klappy://canon/articles/payload-construction` · `klappy://canon/articles/output-naming` · `klappy://canon/articles/failure-mode-taxonomy`

---

## Revision note (session 10)

The earlier revision of this article promised *"USFM-only payload; the worker materializes a minimal directory tree."* That was empirically false — PTXprint exits 1 on a missing `ptxprint-mods.sty` and on missing fonts the cfg references. Session-9 closed the file-completeness gap; session-10 produced the first end-to-end PDF (job `6f37b42b...`, 2026-04-29T01:00:00Z) once the agent supplied the **minimum config_files map** below AND mitigated drift 7 (font compatibility). This article is rewritten to match the empirical reality. Old version preserved at the bottom for diff visibility.

---

## The three phases

| Phase | Scope | Validates |
|---|---|---|
| **1 — now** | Minimum-fixture payload (5 config files + ≥1 USFM source); cfg-edit-for-fonts mitigation when fixture requests an unbundled font. | The full pipeline: Worker → Container → PTXprint → R2 → presigned URL → return. |
| **2 — next** | 3–4 preset config templates the agent picks from; payload `fonts` field documented; `define` widget-ID-to-cfg-key mapping. | The configuration layer actually applies; fonts beyond bundled defaults are usable. |
| **3 — after** | Resolve zip-vs-structured payload format. | Long-term agent ergonomics for multi-config jobs (diglot, triglot). |

All session-6 tensions (D-022 templates, O-open-P1-005 zip, O-open-P1-006 preset inventory, H-014 zip resolution) remain real and explicitly sequenced behind Phase 1 pipeline validation.

## The Phase 1 payload contract

The complete agent-side payload for Phase 1 — empirically minimum, demonstrated working in session 10:

```json
{
  "schema_version": "1.0",
  "project_id": "minitest",
  "config_name": "Default",
  "books": ["JHN"],
  "mode": "simple",
  "define": {},
  "config_files": {
    "Settings.xml":                                "<contents>",
    "custom.sty":                                  "<contents>",
    "shared/ptxprint/Default/ptxprint.cfg":        "<contents>",
    "shared/ptxprint/Default/ptxprint.sty":        "<contents>",
    "shared/ptxprint/Default/ptxprint-mods.sty":   "<contents>"
  },
  "sources": [
    {
      "book": "JHN",
      "filename": "44JHNtest.usfm",
      "url": "https://raw.githubusercontent.com/.../44JHNtest.usfm",
      "sha256": "<sha256 of the file at url>"
    }
  ],
  "fonts": [],
  "figures": []
}
```

### Why each `config_files` entry is required

| Path | Why |
|---|---|
| `Settings.xml` | Paratext project settings; PTXprint reads `LanguageIsoCode`, `FileNameBookNameForm`, `FileNamePostPart`, etc. to find source USFM. Without it, PTXprint cannot resolve the book filename. |
| `custom.sty` | Project-level USFM stylesheet additions. Referenced by `shared/ptxprint/Default/ptxprint.cfg` via `..\..\..\custom.sty`; absent → fatal load error. |
| `shared/ptxprint/Default/ptxprint.cfg` | The 400-key config the `-c Default` flag points at. PTXprint requires this to exist with the named config. |
| `shared/ptxprint/Default/ptxprint.sty` | Config-level stylesheet overrides. Referenced by the cfg's stylesheet chain. |
| `shared/ptxprint/Default/ptxprint-mods.sty` | Additional config-level stylesheet modifications. **Empirically required, not optional** (drift 6, session 9). The asymmetric companions `ptxprint-mods.tex` and `ptxprint-premods.tex` are loaded as optional and may be omitted. |

### project_id constraint

`project_id` is capped at 8 characters by the v1.2 schema (validated at submit time). Paratext convention is project-id = folder-name; the upstream `minitests` fixture (9 chars) must be renamed to `"minitest"` (8 chars) when used as a payload. This is a known asymmetry between the schema and Paratext convention; an open question for the v1.2 spec is whether to lift the cap.

### Drift-7 mitigation for fixtures requesting unbundled fonts

The container bundles **Charis SIL** + **Source Code Pro** only (per session-9 PR #10). Any fixture whose `ptxprint.cfg` declares a font outside that set (e.g., the upstream minitests fixture's `Gentium Plus`) will fail with:

```
! Font \font<p-12.0>="Family Name:script=latn" at Npt not loadable: Metric (TFM) file or installed font not found.
```

**Mitigation for Phase 1:** Edit the cfg's `[document]` section in your `config_files` payload to substitute Charis SIL for the four font-role keys before submission. Example transformation:

```ini
# Before (in ptxprint.cfg [document])
fontregular = Gentium Plus||false|false|
fontbold = Gentium Plus| Bold|false|false|
fontitalic = Gentium Plus| Italic|false|false|
fontbolditalic = Gentium Plus| Italic Bold|false|false|

# After
fontregular = Charis SIL||false|false|
fontbold = Charis SIL|Bold|false|false|
fontitalic = Charis SIL|Italic|false|false|
fontbolditalic = Charis SIL|Bold Italic|false|false|
```

**Do NOT use `define`** for this purpose. PTXprint's `-D` widget IDs are not the same strings as `ptxprint.cfg` keys (session-1 O-003 still open; session-10 D-019). `define: { fontregular: ... }` was empirically tested and did not affect rendering.

This mitigation produces a pipeline-validation PDF, **not** a faithful render of the fixture. Phase 2 introduces the `fonts` payload field for proper font supply.

**Update (session 11, 2026-04-29):** the Phase-2 path was demonstrated end-to-end via `smoke/fonts-payload.json` (job `802e42e7d549cf9f827cbbcff69a6354e1b968a23084e5f2485f93cde52fc4bd`). The minitests fixture's cfg was left **unmodified** (still references Gentium Plus); the four Gentium Plus 6.200 TTFs were staged in R2 and supplied via the payload's `fonts` array. PTXprint discovered the materialised fonts in `<project>/shared/fonts/` without any container changes — `fc-cache` and `OSFONTDIR` were not required, contradicting the session-10 handoff's prediction. The resulting PDF embeds GentiumPlus / GentiumPlus-Bold / GentiumPlus-Italic per `pdffonts` (faithful render), not Charis. Both the cfg-edit mitigation above (simpler) and the fonts-payload approach (faithful) now work for fixtures that request unbundled fonts; choose based on whether the user needs faithful rendering. See `klappy://canon/articles/font-resolution` §"A worked-minimum English-Bible payload" for the verified URLs and sha256s.

## What the Container provides

For Phase 1, the Container image bundles:

- PTXprint 3.0.20 (pinned per session-9 PR #9 for reproducibility)
- ptx2pdf TeX macros (installed via upstream's documented pattern, not the broken `pip install` package-data path — drift 4)
- XeTeX (`texlive-xetex`)
- **SIL Charis** font (bundled per session-9 PR #10; serves the Phase-1 drift-7 mitigation)
- **Source Code Pro** font (bundled per PR #10; PTXprint's `ptx-cropmarks.tex` line 38 hardcodes it)
- The MCP worker code

This is not the long-term architecture — Phase 2/3 will move agent-supplied fonts into the payload — but for hackathon week it gets the pipeline shippable.

## What Phase 1 does NOT do

- Custom-built configurations beyond the supplied fixture's
- Multi-script support (English Bibles only; Charis covers them; non-Charis fonts require Phase-2 `fonts` field)
- Override files (apart from cfg-edit-for-fonts mitigation)
- AdjLists, piclists, changes.txt, FRTlocal — read but not authored by the agent
- Cover periphs
- TeX macro injection (`*-mods.tex`, `*-premods.tex`)
- Diglot or triglot setups
- Reliable `define` (-D) overrides — until session-1 O-003 / session-10 H-019 closes

The agent that drives Phase 1 reads three articles to function: `klappy://canon/articles/payload-construction` (full schema), this article (the minimum-payload contract), and `klappy://canon/articles/output-naming` (to interpret result URLs). When Phase 1 produces a hard or soft failure, the agent reads `klappy://canon/articles/failure-mode-taxonomy` and `klappy://canon/articles/diagnostic-patterns`.

## Phase 1 Definition of Done

The DoD reduces to:

1. Agent constructs the minimum payload above (5 config files + ≥1 USFM source) and submits via `submit_typeset`.
2. Server returns `job_id` and `predicted_pdf_url` synchronously.
3. Container picks up the job, materialises the project tree, runs `ptxprint -P <project_id> -c <config_name> -b "<books>" -p <scratch> -q`, uploads the resulting PDF and log to R2.
4. Agent polls `get_job_status`, receives `failure_mode: "success"` and a working `pdf_url`.
5. The PDF, when downloaded, contains typeset content from the source USFM in the fixture's intended layout (modulo drift-7 mitigation if a non-bundled font was substituted).

**Empirically demonstrated session 10**, job `6f37b42b9c73ad5e4f7b8a576de8144bcc6c87fad944051e285a33d21de25059`: 4.1s wall-clock, 2-page XDV → 1-page PDF, 66966 bytes, `Creator: PTXprint 3.0.20 (Default)`.

Anything beyond this — settings the user wants changed, fonts the user prefers (without cfg-edit), layout adjustments, multiple custom configs — is Phase 2.

## When the agent should escalate

Phase 1 is deliberately narrow. If a user asks for anything beyond "typeset this fixture with the bundled fonts," surface honestly:

> "Phase 1 of this PoC supports typesetting from a fixture's full config_files map plus USFM source, with the container's bundled fonts (Charis SIL, Source Code Pro). Custom configurations, agent-supplied fonts, layout tuning, and reliable widget-ID overrides are coming in Phase 2. For today, I can typeset your fixture with PTXprint's defaults — and if your cfg requests Gentium Plus or another non-bundled font, I'll substitute Charis SIL via cfg-edit. Would you like to proceed?"

Do not fabricate Phase 2 capabilities. The v1.2 server accepts arbitrary `config_files` maps, `fonts` arrays, and `define` overrides; Phase 1's *validated* tooling around them is narrower than the schema's surface.

## When this article goes away

This article is **temporary**. It bridges v1.2's full architecture and the hackathon-week minimum. Once Phase 2 ships (preset templates, agent-supplied fonts, widget-ID mapping), this article gets either:

- **Deleted**, if its content is fully obsolete.
- **Kept as historical reference**, marked `canonical_status: superseded`, with a `superseded_by` pointer to the Phase 2 reference article.

The decision lives with whoever ships Phase 2.

---

## Old version (preserved for diff visibility — withdrawn 2026-04-29)

The withdrawn promise was:

> *"USFM-only payload; PTXprint runs with built-in defaults. ... `project_id` can be a placeholder like `\"DEFAULT\"` — the worker materializes a minimal directory tree under that name. PTXprint runs with built-in defaults for everything else."*

This was incorrect. PTXprint requires a populated `<project>/shared/ptxprint/<config>/` directory or it silently bails (session-3 C-009) or — once the cfg is supplied but its referenced files aren't — exits 1 with a "Paratext stylesheet not found" fatal (session-9 drift 6). The minimum is what the empirical session-10 success ran with.

---

*This article is the operational scope statement for hackathon-week PoC. It supersedes (for hackathon week only) the broader DoD in `klappy://canon/specs/ptxprint-mcp-v1-2-spec` §10 item 2.*
