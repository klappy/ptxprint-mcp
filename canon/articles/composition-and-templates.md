---
title: "Templates and Composition — How Clients Bootstrap a submit_typeset Payload"
audience: agent
exposure: working
voice: instructional
stability: working
tags:
  - ptxprint
  - mcp
  - agent-kb
  - v1.2-aligned
  - non-canonical
  - composition
  - templates
  - pattern
  - bootstrap
  - quickstart
  - bt-servant
  - downstream-agent
derives_from: "klappy://canon/specs/ptxprint-mcp-v1.2-spec, klappy://canon/articles/payload-construction"
companion_to:
  - "canon/templates/README.md"
  - "canon/templates/english-single-book.md"
canonical_status: non_canonical
date: 2026-04-30
status: draft_for_operator_review
---

# Templates and Composition

> **What this answers.** A downstream agent (BT Servant or any LLM client) needs to construct a working `submit_typeset` payload but doesn't want to figure out PTXprint's 400+ cfg keys, sty syntax, and font manifest from scratch. Templates are the answer: pre-baked partial payloads, retrievable via the `docs` tool, that the client merges with its own minimal inputs.
>
> **What this is not.** Templates are not "official PTXprint configurations." They are agent-facing bootstrap surfaces — clean baselines that produce nice-looking PDFs for common use cases. Anything beyond a template requires understanding the underlying payload schema (see `klappy://canon/articles/payload-construction`).

---

## The composition pattern

A `submit_typeset` payload has two kinds of fields:

**Caller-owned** (the agent always knows or can derive these):
- `books` — USFM 3-letter book code(s)
- `sources` — URL + sha256 of the USFM file(s) the caller wants rendered
- `vars.maintitle` — what to put on the title page
- `project_id`, `config_name` — namespacing labels

**Template-owned** (the agent doesn't want opinions about these):
- `config_files` — the cfg, sty, and Settings.xml content
- `fonts` — the font manifest with URLs + hashes
- All the cfg defaults that produce a particular look (margins, line spacing, parallel-passage refs, decorations off, etc.)

A *template* is a partial payload containing only the template-owned fields. The client retrieves the template, lays its caller-owned fields on top, and submits the merged result.

```
template (partial payload)
    +
caller-owned fields (books, sources, vars)
    =
full submit_typeset payload
```

That merged result is what the worker hashes and runs. Same merged payload always returns the same `job_id` (content-addressed), so re-rendering is free.

---

## How a client uses a template (MCP-only flow)

1. **Discover.** Call `docs(query="english single book template", depth=2)`. The tool returns the full template article — including a fenced `json` code block with the partial payload.

2. **Extract.** Pull the JSON code block out of the markdown response. One line of string handling.

3. **Merge.** Layer the client's `{books, sources, vars}` on top of the template:

   ```python
   merged = template.copy()
   merged["books"] = ["JHN"]
   merged["sources"] = [{"book": "JHN", "filename": "...", "url": "...", "sha256": "..."}]
   # vars is nested inside config_files's cfg INI — see the template article for
   # the exact pattern, since the caller-owned vars sit inside an embedded INI string
   ```

   The shallow merge handles `books`, `sources`, top-level fields. The `vars` overlay requires editing the cfg INI text inside `config_files`, which the per-template article documents.

4. **Submit.** Call `submit_typeset(payload=merged)`. Receive `job_id`. Poll `get_job_status` until `state == "succeeded"`.

No new MCP tool is required. No HTTPS fetch outside MCP is required. No repo access is required. Just `docs` + `submit_typeset` + `get_job_status`.

---

## Where templates live

`canon/templates/` in the PTXprint MCP repo. Each template is a single markdown file with:

- Frontmatter declaring `template_id`, `template_version`, `caller_supplies` list, `applies_to` description
- Narrative sections — when to use, what's in the template, what the caller controls, what to *not* change
- A fenced `json` code block containing the partial payload

The `docs` tool indexes everything under `canon/`, so templates surface naturally to natural-language queries. New templates land via PR; no server change, no schema change.

`canon/templates/README.md` is the human-readable index of currently-available templates.

---

## What this pattern is and isn't

**Is.** A documented, vodka-compliant convention for partial-payload + caller-overlay composition. Mirrors well-established overlay patterns (Kustomize bases, Helm chart values, OpenAPI `$ref` components, dotfiles, terraform modules). The novelty is local — naming the pattern and committing to it — not the pattern itself.

**Isn't.** A schema-level feature. The worker has zero knowledge of templates. A "template" is just a markdown file in canon that happens to contain a partial payload; the worker only sees the merged payload after the client submits it. If templates disappeared tomorrow, the worker would not notice.

---

## Vodka compliance — the constraint test

| Constraint | This pattern's posture |
|---|---|
| **Server holds zero domain opinion** | Worker has no template-aware code. `submit_typeset` runs whatever payload the client sends. ✅ |
| **DRY — canon says it once** | Each template's content lives in exactly one file. Smoke fixtures should be regenerated from templates + known inputs (validation closes the DRY loop). ✅ when smoke regeneration lands. |
| **No new tool surface** | Existing `docs` retrieves; existing `submit_typeset` runs. ✅ |
| **Reversible** | Templates are markdown files. Delete the directory and the only consequence is loss of the bootstrap surface; nothing else breaks. ✅ |
| **No content embedded in governance articles** | This article describes the pattern; it has zero embedded payload. The template articles ARE the templates — their payload is their substance, not embedded supplementary content. ✅ |

The split-of-concerns: governance describes *when* and *how*; templates contain the *what*. They share the directory `canon/` because both are knowledge-base content, but they live in separate folders (`canon/articles/` vs `canon/templates/`) so the distinction is structural, not stylistic.

---

## Validation and growth

A template is valid when:
1. It produces a successful render (`failure_mode == "success"`) when merged with a representative caller payload.
2. The PDF output is what the template's `applies_to` description promises.
3. The merge contract documented in the template article is correct — i.e., applying the documented caller-owned fields to the partial payload produces a payload the worker accepts.

The smoke fixtures in `smoke/` should be regenerated periodically from the current templates plus their known inputs. When a template and its smoke fixture diverge, the smoke fixture wins for the moment but the template is the bug to fix.

New templates land via PR. The growth model is: an agent (or a human) discovers a new "common shape" — a poetry book, a diglot, a multi-book NT, a non-A5 format — and adds a template for it. The catalog grows; the worker stays the same; the pattern doesn't change.

---

## Companion documents

- `klappy://canon/templates/README` — index of available templates
- `klappy://canon/templates/english-single-book` — the first template (English Single-Book Bible)
- `klappy://canon/articles/payload-construction` — reference for what's in the payload schema
- `klappy://canon/articles/font-resolution` — how the `fonts` array is materialized
- `klappy://canon/specs/ptxprint-mcp-v1.2-spec` — the spec templates conform to

---

*This article describes the pattern. The templates folder contains the data. Both are in canon; neither contains the other.*
