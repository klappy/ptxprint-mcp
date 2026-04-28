---
title: "CLI Reference — How the Worker Invokes PTXprint"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "cli", "flags", "exit-codes"]
derives_from: "canon/governance/headless-operations.md (Part 1 The CLI Reference)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

# CLI Reference

> **What this answers.** What flags does PTXprint's CLI accept? How do payload fields map to those flags? What do the exit codes mean?
>
> **Related articles.** `klappy://canon/articles/payload-construction` · `klappy://canon/articles/failure-mode-taxonomy`

---

## In v1.2, the agent does not invoke this directly

The Container worker invokes PTXprint on the agent's behalf. This reference exists because the payload's fields map directly to CLI flags, and understanding the CLI surface helps the agent construct payloads that work.

The worker translates the payload approximately as follows:

| Payload field | Becomes |
|---|---|
| `project_id: "WSG"` | `-P WSG` |
| `config_name: "Default"` | `-c Default` |
| `books: ["JHN"]` | `-b "JHN"` |
| `books: ["MAT","MRK","LUK","JHN"]` | `-b "MAT MRK LUK JHN"` |
| `define: { "s_linespacing": "14" }` | `-D s_linespacing=14` |
| `define: { ..., "c_fighiderefs": "True" }` | `-D s_linespacing=14 -D c_fighiderefs=True` (one `-D` per key) |
| `mode: "autofill"` | (autofill flag — exact name to confirm at implementation time) |
| `timeout: 1800` | `--timeout 1800` |

The worker also adds `-p <scratch_dir>` (pointing at the materialized project tree) and `-q` (quiet mode).

## Full CLI signature

```
ptxprint -P <prjid> [-c <config_name>] [-b "<books>"]
                    [-p <projects_dir>] [-q]
                    [-D key=value ...]
                    [--timeout <seconds>]
```

The deck's example invocation:

```
ptxprint.exe -b ROM -c SingleSpaceDraft -P XYZ
```

## Flag reference

| Flag | Required | Meaning |
|---|---|---|
| `-P <prjid>` | yes | Paratext project ID. The worker materializes a directory with this name from the payload. |
| `-c <config>` | no (defaults to `Default`) | Named configuration to use |
| `-b "<codes>"` | no | Space-separated USFM book codes; overrides the cfg's `[project] booklist` for this run only |
| `-p <path>` | no | Projects root directory; the worker sets this to its scratch dir |
| `-q` | no | Quiet; suppresses splash and any GUI artifacts |
| `-D key=value` | no, repeatable | Override any UI setting at runtime without modifying the stored cfg |
| `--timeout <s>` | no (defaults to 1200) | Maximum seconds to wait for XeTeX |
| `-h` | no | Print all arguments and exit |

## Exit codes

| Code | Meaning | Typical cause |
|---|---|---|
| 0 | Success | PDF was produced |
| 1 | Startup failure | Project not found, bad config path, missing dependency |
| 3 | XeTeX completed but produced no PDF | XeTeX errors prevented final write |
| 4 | XeTeX returned non-zero | Typesetting errors during macro processing |

A non-zero exit code is necessary but not sufficient evidence of failure. A zero exit code is necessary but not sufficient evidence of success. The worker classifies into hard/soft/success — see `klappy://canon/articles/failure-mode-taxonomy`.

## The `-D` runtime override mechanism

`-D key=value` accepts any PTXprint widget identifier and value, applied at runtime without persisting to `ptxprint.cfg`. The agent populates the payload's `define` field with key/value pairs; the worker translates them into `-D` flags.

### Widget identifier conventions

| Prefix | Type | Example |
|---|---|---|
| `s_` | string or numeric | `s_linespacing`, `s_fontsize` |
| `c_` | checkbox / boolean | `c_fighiderefs`, `c_disablehyphen` |
| `r_` | radio / enum | `r_outputformat` |
| `t_` | text-area | `t_headertext` |

Prefixes are not 100% consistent across all widgets. Always verify against canon's cfg-key index (seeded from the running tooltip dump) before relying on a specific name.

### Boolean values

Use `True` / `False` (capitalized). Lowercase `true`/`false` may or may not be accepted depending on the widget; capitalized is safest.

### When `-D` (i.e., `define`) wins

- The override is for this run only — the user is iterating, exploring, or producing a one-off
- The override should not pollute the saved config

### When the cfg wins (i.e., `config_files`)

- The change should persist to the user's project state
- The user has committed to the change

If both are set for the same key, `-D` (define) wins for this specific run; the cfg keeps its old value for future runs that don't override.

## What the worker adds beyond the payload

The worker invokes PTXprint with:

- `-P <project_id>` — from payload
- `-c <config_name>` — from payload (or default `Default` if not provided)
- `-b "<books>"` — from payload's `books` array, joined with spaces
- `-p <scratch_dir>` — the worker's per-job temporary directory (the agent never sees this path)
- `-q` — always quiet
- `-D <key>=<value>` — one per entry in payload's `define`
- `--timeout <s>` — from payload's `timeout` (or default per spec)

The worker handles paths, temporary directory creation, and cleanup. The agent doesn't.

## What the agent must NOT include in the payload

- `-D` keys referencing settings that don't exist (silently ignored — see *Common cfg-construction mistakes* in `klappy://canon/articles/config-construction`)
- Negative timeouts or zero timeouts
- `--<flag>` style overrides outside what the v1.2 schema allows

## When the user asks about CLI directly

A user familiar with PTXprint's GUI may ask about the CLI ("can I just run `ptxprint.exe -b ROM -c MyConfig -P XYZ`?"). The answer:

> "Yes — that command runs PTXprint locally. The MCP server runs the same CLI inside a Container worker, but you don't invoke it directly. Instead, you construct a payload that describes the same inputs (project, config, books, plus overrides), and the worker translates."

The mapping is:

| Local CLI invocation | Payload |
|---|---|
| `ptxprint.exe -b ROM -c MyConfig -P WSG` | `{ project_id: "WSG", config_name: "MyConfig", books: ["ROM"], ... }` |
| `... -D s_linespacing=14` added | `define: { "s_linespacing": "14" }` added |
| `... --timeout 1800` added | `timeout: 1800` added |

The user's mental model from local CLI experience transfers cleanly.

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`.*
