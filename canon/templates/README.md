---
title: "Templates Index — Available Bootstrap Payloads for Common Renders"
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
  - templates
  - index
  - bootstrap
  - quickstart
companion_to: "canon/articles/composition-and-templates.md"
canonical_status: non_canonical
date: 2026-04-30
status: draft_for_operator_review
---

# Templates Index

> Pre-baked partial payloads, retrievable via the `docs` tool, that downstream agents merge with their own caller-owned fields and submit via `submit_typeset`. See `klappy://canon/articles/composition-and-templates` for the pattern.

---

## Available templates

| Template ID | URI | Applies to | Caller supplies |
|---|---|---|---|
| `english-single-book` | `klappy://canon/templates/english-single-book` | Single English Bible book, A5 layout, parallel-passage refs on, Gentium Plus fonts | `books`, `sources`, `vars.maintitle` |

---

## How to retrieve

Call `docs(query="<template description>", depth=2)`. Examples:

- `docs(query="english single book template", depth=2)` → returns the `english-single-book` article in full, including the partial payload as a fenced JSON code block.
- `docs(query="render single english bible book", depth=2)` → also routes to `english-single-book`.

`depth=2` is the key parameter — it returns the full top document, including the embedded partial payload. `depth=1` (default) returns only a snippet.

---

## How to add a new template

1. Identify a "common shape" not covered by existing templates — for example: an English NT (multi-book), an English poetry-heavy book (Psalms, Proverbs, Song), a diglot, a non-A5 format, a non-English language.
2. Create `canon/templates/<template-id>.md` following the structure of an existing template.
3. Frontmatter declares `template_id`, `template_version`, `caller_supplies`, `applies_to`, `derived_from` (which smoke fixture or working render the template was distilled from).
4. The article body documents when to use, what the caller controls, what's in the template, and the validation contract.
5. The partial payload goes in a fenced `json` code block. Caller-owned fields (`books`, `sources`, anything the caller's input would specify) are absent or empty — never hardcoded to a real value.
6. Update this index with a new row.
7. Open a PR. The validation gate is: a fresh-context Claude (or a smoke run) confirms the merged payload renders cleanly with the documented caller inputs.

The growth model: the catalog scales with use cases. The worker doesn't change. The schema doesn't change. Each new template is a markdown file.

---

## Validation status

| Template | Status | Validated against |
|---|---|---|
| `english-single-book` | `draft_for_operator_review` (v0.1) | Derived from `smoke/bsb-jhn-empirical.json` (which renders successfully end-to-end per session 12). The template version has not yet been independently smoke-tested with merged caller inputs — pending PR review. |

---

## See also

- `klappy://canon/articles/composition-and-templates` — the merge pattern
- `klappy://canon/articles/payload-construction` — the underlying payload schema
- `klappy://canon/specs/ptxprint-mcp-v1.2-spec` — the spec templates conform to
