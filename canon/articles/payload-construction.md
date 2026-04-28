---
title: "Payload Construction — How to Build a v1.2 Typeset Job"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "payload", "submit-typeset", "schema"]
derives_from: "canon/governance/headless-operations.md (Part 0, Part 1, Part 2)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

> ⚠️ **Phase 1 (hackathon week, per session 7 D-025).** Phase 1 ships with a USFM-only payload — no `config_files`, no `fonts`, no `figures`, no `define`. PTXprint runs with built-in defaults; the Container has Charis SIL pre-installed. The minimum Phase 1 payload is:
>
> ```json
> {
>   "schema_version": "1.0",
>   "project_id": "DEFAULT",
>   "books": ["JHN"],
>   "sources": [
>     { "book": "JHN", "filename": "44JHNDEFAULT.SFM", "url": "...", "sha256": "..." }
>   ]
> }
> ```
>
> Everything else this article describes (`config_files`, `fonts` array, `define`, figures, content-addressed cache nuance, override coordination) is **Phase 2/3** material — implemented by the server, but not used by Phase 1 agents. Read the rest of this article when Phase 2 lands. See `klappy://canon/articles/phase-1-poc-scope` for the current scope boundary.

# Payload Construction

> **What this answers.** How does the agent build a payload for `submit_typeset`? What goes inline, what goes by URL, when do I use `define` vs `config_files`?
>
> **Related articles.** `klappy://canon/articles/output-naming` · `klappy://canon/articles/file-system-map` · `klappy://canon/articles/config-construction` · `klappy://canon/articles/font-resolution` · `klappy://canon/articles/failure-mode-taxonomy`

---

## The contract in one sentence

A payload is a JSON object that fully describes one typesetting job: which project and config to use, which books, the inline text content of every config-folder file, and URL+sha256 references for every binary input (USFM sources, fonts, figures). The agent submits it via `submit_typeset` and gets back a `job_id` plus a predicted PDF URL.

Re-submitting the same payload returns the cached PDF URL with no re-typesetting. The cache is content-addressed by `sha256(canonical_json(payload))`.

## Skeleton

```json
{
  "schema_version": "1.0",

  "project_id": "WSG",
  "config_name": "Default",
  "books": ["JHN"],
  "mode": "simple",
  "define": {},

  "config_files": {
    "shared/ptxprint/Default/ptxprint.cfg": "[paper]\npagesize = 148mm, 210mm (A5)\n..."
  },

  "sources": [
    {
      "book": "JHN",
      "filename": "44JHNWSG.SFM",
      "url": "https://r2.../uploads/abc/44JHNWSG.SFM",
      "sha256": "..."
    }
  ],

  "fonts": [
    {
      "family_id": "charissil",
      "version": "7.000",
      "filename": "CharisSIL-Regular.ttf",
      "url": "https://lff.api.languagetechnology.org/...",
      "sha256": "..."
    }
  ],

  "figures": []
}
```

The full schema lives in the v1.2 spec §4. This article is the agent-side construction guide.

## What goes where

| Slot | What | Inline or URL? |
|---|---|---|
| `project_id`, `config_name`, `books`, `mode` | identifiers and run mode | inline (small) |
| `define` | one-shot `-D key=value` overrides | inline |
| `config_files` | every text artifact in the project's config folder (cfg, sty, changes.txt, FRTlocal.sfm, AdjLists, piclist, override files) | **inline text**, keyed by relative path |
| `sources` | USFM book content | **URL + sha256** |
| `fonts` | font binaries | **URL + sha256** |
| `figures` | image binaries (TIF/PNG) | **URL + sha256** |

Rule of thumb: text goes inline; binaries go by URL. Multi-MB files in MCP envelopes are a bad idea; presigned R2 URLs (mintable via `get_upload_url`) are the right path.

## `config_files` keys: relative paths

The keys in `config_files` are paths relative to the project root. The worker materializes each file at the corresponding location in its scratch dir before running PTXprint. See `klappy://canon/articles/file-system-map` for the full tree.

The most common keys, in order of frequency:

```
shared/ptxprint/<config>/ptxprint.cfg          primary settings (always)
shared/ptxprint/<config>/ptxprint.sty          style overrides (often)
shared/ptxprint/<config>/changes.txt           regex transforms (sometimes)
shared/ptxprint/<config>/FRTlocal.sfm          front matter (when ToC/cover needed)
shared/ptxprint/<config>/<PRJ>-<config>.piclist
                                               picture placements (when figures present)
shared/ptxprint/<config>/AdjLists/<num><BOOK><PRJ>-<config>.SFM.adj
                                               paragraph adjustments (rare, per-book)
shared/ptxprint/<config>/ptxprint_override.cfg    config-level overrides (admin)
shared/ptxprint/ptxprint_project.cfg              project-level overrides (admin)
```

Inheritance: if the config has `[import] config = Parent`, **also** include the parent's `ptxprint.cfg` (and recursively up the chain) at the parent's path. PTXprint resolves inheritance inside the worker the same way it does in the GUI — but only if the parent files are physically present. See `klappy://canon/articles/config-inheritance-and-overrides`.

## `define` vs `config_files`: which to use

The `define` map is for **transient run-time overrides** that should not mutate the working config. The keys are PTXprint UI widget identifiers (`s_linespacing`, `c_fighiderefs`, etc.); they map to `-D key=value` flags when the worker invokes the CLI.

| Use `define` when... | Use `config_files["...ptxprint.cfg"]` when... |
|---|---|
| Producing a one-off draft with different spacing | Committing to a finalised configuration |
| Exploring options without persisting | The change should round-trip back to the user's project store |
| Parameterised runs (rotating output formats) | The change is part of the user's saved working state |

A common pattern: explore with `define`, then promote to `config_files` once the user commits.

## Sources, fonts, figures: URL + sha256

Each entry must include a fetchable URL and the sha256 of the file at that URL. The worker hashes the bytes as they arrive and aborts if they don't match.

```json
{
  "book": "JHN",
  "filename": "44JHNWSG.SFM",
  "url": "https://r2.../44JHNWSG.SFM",
  "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
}
```

URL stability matters for caching. Two payloads pointing at the same content via different URLs hash differently and miss the cache. Prefer:

- R2 presigned GETs with long expiry (mint via `get_upload_url`)
- Content-addressed CDNs (the sha256 is in the URL)
- Stable Git-LFS or DBL endpoints

Avoid:
- Volatile presigned URLs that change every 15 minutes
- Sources that may move (a Paratext server under maintenance)
- URLs whose host requires auth that the worker can't replay

## Staging local files into URL space

When the user has a USFM or font file on their local disk that the agent needs to reference by URL, call `get_upload_url`:

```
get_upload_url(filename="44JHNWSG.SFM", content_type="text/plain")
→ { put_url, get_url, expires_at }
```

The agent (or its host) HTTPs-PUTs the file content to `put_url`, then includes `get_url` in subsequent payloads. Uploads are pruned after 24h by R2 lifecycle policy — re-stage if a payload references a stale upload.

The `put_url` is the agent's upload destination. The `get_url` is what goes in the payload. Don't confuse them.

## Canonical hashing and the cache

`payload_hash = sha256(canonical_json(payload))`. The canonicalization (RFC 8785 JCS or equivalent) ensures logically-identical payloads produce identical hashes regardless of key order or whitespace.

When the agent submits a payload:

1. The worker hashes it.
2. If `outputs/<payload_hash>/<PRJ>_<Config>_<bks>_ptxp.pdf` exists in R2 → the response includes `cached: true` and the URL points to the existing PDF. **No typesetting runs.**
3. If miss → a Container is dispatched, the job runs, the PDF lands at the same content-addressed path.

This is the mechanism behind "free re-runs of unchanged builds." Agents that iterate by changing one cfg key and re-submitting get a cache hit on every key that has been tried before. There is no separate undo button — re-submitting an earlier payload is the undo.

## Worked example: a simple draft of John

```json
{
  "schema_version": "1.0",
  "project_id": "WSG",
  "config_name": "Default",
  "books": ["JHN"],
  "mode": "simple",
  "define": { "output_format": "Screen-Quickest" },
  "config_files": {
    "shared/ptxprint/Default/ptxprint.cfg": "[config]\nname = Default\n[paper]\npagesize = 148mm, 210mm (A5)\nmargins = 12\n[paragraph]\nlinespacing = 14\n",
    "shared/ptxprint/Default/ptxprint.sty": ""
  },
  "sources": [
    {
      "book": "JHN",
      "filename": "44JHNWSG.SFM",
      "url": "https://r2.../uploads/abc/44JHNWSG.SFM",
      "sha256": "<sha256 of the USFM file>"
    }
  ],
  "fonts": [
    {
      "family_id": "charissil",
      "version": "7.000",
      "filename": "CharisSIL-Regular.ttf",
      "url": "https://lff.../CharisSIL-Regular.ttf",
      "sha256": "<sha256 of the font>"
    }
  ],
  "figures": []
}
```

Submit, poll `get_job_status` until `state ∈ {succeeded, failed}`, read the result.

## What the agent should NOT include

- TeX macro files (`*-mods.tex`, `*-premods.tex`) — v1.2 defers these as too risky.
- Files outside the project sandbox.
- Multi-megabyte content inline (use URLs).
- Override files the user hasn't authorized — see `klappy://canon/articles/config-inheritance-and-overrides`.
- Made-up cfg keys. PTXprint silently ignores unknown keys; the agent's change appears to do nothing. Verify keys against the running tooltip dump or canon's cfg-key index.

## When the payload doesn't behave as expected

Run the diagnostic in `klappy://canon/articles/diagnostic-patterns`. The most common causes:

1. An override file in `config_files` is winning over the cfg change — see `klappy://canon/articles/config-inheritance-and-overrides`.
2. The cfg key was misspelled — verify against canon.
3. A cache hit returned an earlier payload's PDF — check `cached: true` in the `submit_typeset` response.
4. The change was in `define` but `config_files` had a contradicting value — `config_files` wins for keys it sets.

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`. See also: `klappy://canon/specs/ptxprint-mcp-v1-2-spec` for the server-side schema definition.*
