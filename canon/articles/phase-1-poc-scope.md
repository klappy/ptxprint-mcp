---
title: "Phase 1 PoC Scope — USFM-Only Payload, Defaults Handle the Rest"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "phase-1", "hackathon", "scope", "poc"]
derives_from: "transcript-encoded-session-7.md (D-025)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

# Phase 1 PoC Scope

> **What this answers.** What does the agent actually do during hackathon week? What's deferred? When does this article become obsolete?
>
> **Related articles.** `klappy://canon/articles/payload-construction` · `klappy://canon/articles/output-naming` · `klappy://canon/articles/failure-mode-taxonomy`

---

## The three phases

| Phase | Scope | Validates |
|---|---|---|
| **1 — now** | USFM-only payload; PTXprint runs with built-in defaults. | The full pipeline: Worker → Container → PTXprint → R2 → presigned URL → return. |
| **2 — next** | 3–4 preset config templates the agent picks from. | The configuration layer actually applies. |
| **3 — after** | Resolve zip-vs-structured payload format. | Long-term agent ergonomics for multi-config jobs (diglot, triglot). |

All session 6 tensions (D-022 templates, O-open-P1-005 zip, O-open-P1-006 preset inventory, H-014 zip resolution) are real but explicitly sequenced behind Phase 1 pipeline validation.

## The Phase 1 payload contract

The complete agent-side payload for Phase 1:

```json
{
  "schema_version": "1.0",
  "project_id": "DEFAULT",
  "books": ["JHN"],
  "sources": [
    {
      "book": "JHN",
      "filename": "44JHNDEFAULT.SFM",
      "url": "https://r2.../uploads/abc/44JHNDEFAULT.SFM",
      "sha256": "<sha256 of the file at url>"
    }
  ]
}
```

That's it. No `config_files`, no `fonts`, no `figures`, no `define`. Five fields, one source entry per book.

`project_id` can be a placeholder like `"DEFAULT"` — the worker materializes a minimal directory tree under that name. PTXprint runs with built-in defaults for everything else.

## What the Container provides

For Phase 1, the Container image bundles:

- PTXprint (latest stable)
- XeTeX (`texlive-xetex`)
- SIL Charis font (system-installed via `fonts-sil-charis` apt package, resolvable via fontconfig)
- The MCP worker code

This is not the long-term architecture — Phase 2/3 will move fonts into the payload — but for hackathon week it gets the pipeline shippable today.

## What Phase 1 does NOT do

- Custom configurations (no `config_files`)
- Multi-script support (English Bibles only; Charis covers them)
- Per-job font selection (whatever Charis defaults to)
- Override files
- AdjLists, piclists, changes.txt, FRTlocal — none of it
- Cover periphs
- TeX macro injection
- Diglot or triglot setups

The agent that drives Phase 1 reads exactly two articles to function: `klappy://canon/articles/payload-construction` (top section, the Phase 1 caveat) and `klappy://canon/articles/output-naming` (to interpret the result URLs). When Phase 1 produces a hard or soft failure, the agent reads `klappy://canon/articles/failure-mode-taxonomy` and `klappy://canon/articles/diagnostic-patterns`.

## Phase 1 Definition of Done

The DoD reduces to:

1. Agent constructs the minimum payload above and submits via `submit_typeset`.
2. Server returns `job_id` and `predicted_pdf_url` synchronously.
3. Container picks up the job, materializes the project tree, runs `ptxprint -P DEFAULT -b "JHN" -p <scratch> -q`, uploads the resulting PDF and log to R2.
4. Agent polls `get_job_status`, receives `failure_mode: "success"` and a working `pdf_url`.
5. The PDF, when downloaded, contains typeset content from the source USFM in a default-styled layout.

Anything beyond this — settings the user wants changed, fonts the user prefers, layout adjustments — is Phase 2.

## When this article goes away

This article is **temporary**. It's the bridge between v1.2's full architecture and the hackathon-week minimum. Once Phase 2 ships (preset templates, config-construction tested), this article gets either:

- **Deleted**, if its content is fully obsolete.
- **Kept as historical reference**, marked `canonical_status: superseded`, with a `superseded_by` pointer to the Phase 2 reference article.

The decision lives with whoever ships Phase 2.

## When the agent should escalate

Phase 1 is deliberately narrow. If a user asks for anything beyond "typeset this USFM with defaults," surface honestly:

> "Phase 1 of this PoC only supports default typesetting from USFM source. Custom configurations, font selection, and layout tuning are coming in Phase 2. For today, I can typeset your text with PTXprint's defaults — would you like to proceed?"

Don't fabricate Phase 2 capabilities. Don't quietly try to construct a `config_files` map and submit it; the v1.2 server accepts it but Phase 1's tooling around it isn't validated yet.

---

*This article is the operational scope statement for hackathon-week PoC. It supersedes (for hackathon week only) the broader DoD in `klappy://canon/specs/ptxprint-mcp-v1-2-spec` §10 item 2.*
