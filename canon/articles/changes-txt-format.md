---
title: "changes.txt Format — Regex USFM Transforms"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "changes-txt", "regex", "usfm-transforms", "supporting-files"]
derives_from: "canon/governance/headless-operations.md (Part 6 changes.txt subsection)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

# changes.txt Format

> **What this answers.** What's `changes.txt`? When does the agent edit it? What's the regex grammar?
>
> **Related articles.** `klappy://canon/articles/payload-construction` · `klappy://canon/articles/file-system-map`

---

## What `changes.txt` is

`changes.txt` is a regex-based USFM transformation language applied to source USFM **before** typesetting. It's the single most useful supporting file for surgical text manipulation: change "Jesus" to a vernacular name throughout, swap a USFM marker at specific references, insert page breaks, etc.

Two scopes:

```
shared/ptxprint/changes.txt              project-wide (often `include`s a `PrintDraftChanges.txt` the team maintains)
shared/ptxprint/<config>/changes.txt     config-specific (this run only)
```

Both are processed; rules in both apply. The agent constructs the content and includes it in the payload's `config_files` map.

## The five scoping levels

```
"<pattern>" > "<replacement>"                          # global
at BKK "<pattern>" > "<replacement>"                   # book-restricted
at BKK c "<pattern>" > "<replacement>"                 # book + chapter
at BKK c:v "<pattern>" > "<replacement>"               # book + chapter + verse
in '<context regex>': '<pattern>' > '<replacement>'    # environment-restricted
at BKK c:v in '<ctx>': "<pattern>" > "<replacement>"   # combined book+chapter+verse + environment
```

Each line is a transformation. Lines starting with `#` are comments. Blank lines are ignored.

## Worked examples

### Global replacement

```
"Jesus" > "Yesu"
```

Replaces every occurrence of "Jesus" in every book with "Yesu". Use carefully — the pattern matches anywhere, including inside USFM markers.

### Book-restricted

```
at GLO "\\p \\k " > "\\ili \\k "
```

In the Glossary book only, change `\p \k ` to `\ili \k ` (different USFM markers). The `\\` is a regex-escaped backslash for the USFM marker.

### Book + chapter

```
at JHN 2 "grape juice" > "wine"
```

In John chapter 2 only.

### Book + chapter + verse

```
at MAT 7:23 "old text" > "new text"
```

At Matthew 7:23 only. Note the `:` between chapter and verse in the `at` clause (different from the `c.v` style used in piclists and AdjLists).

### Environment-restricted

```
in '\\f .+?\\f\\*': 'Syria' > 'Aram'
```

In any footnote (`\f ... \f*`), replace `Syria` with `Aram`. Doesn't change body text.

### Combined: at-clause + in-clause

```
at LUK 3:10 in '\\f .+?\\f\\*': "old" > "new"
```

In footnotes within Luke 3:10 only.

## Regex syntax notes

`changes.txt` uses standard regex syntax (effectively Python's `re` with some PTXprint extensions). Key things:

| Pattern | Matches |
|---|---|
| `\\` | literal backslash (USFM markers contain backslashes; `\\` in a regex is one literal `\`) |
| `\\p` | the USFM `\p` marker |
| `\\f .+?\\f\\*` | a complete footnote, non-greedy |
| `[^\\]` | any character except backslash |
| `(?:...)` | non-capturing group |
| `(...)` | capturing group; reference in replacement as `\1`, `\2` |

**Common mistake:** forgetting that USFM markers begin with `\`. To match `\p`, you write `\\p` in the regex.

### Capturing groups in replacement

```
"\\f \\+ ([^\\]+)\\f\\*" > "\\f - \\1\\f*"
```

Captures the footnote text (everything between `\f +` and `\f*`), reproduces it after `\f - ` (changes the caller from `+` to `-`).

## Include directives

```
include "PrintDraftChanges.txt"
include "../../../PrintDraftChanges.txt"
```

The `include` directive pulls in another file's rules. Common pattern: the project-wide `shared/ptxprint/changes.txt` includes a team-maintained `PrintDraftChanges.txt` from the project root, and the config-specific `changes.txt` adds run-specific rules.

In the v1.2 payload model, the agent has two choices:

- Include the included content **inline** in the payload's `changes.txt` content (flatten).
- Include both files in `config_files` at their relative paths (preserve the `include` directive).

Flattening is simpler when the team-maintained file is small. Preserving structure is better when the team-maintained file is the source of truth and the agent is only adding config-specific rules.

## When to use `changes.txt`

- **Temporary fix without round-tripping to Paratext** — the team can leave the source USFM unchanged.
- **Cross-cutting changes** — replace all instances of a name, fix a recurring typo without 50 individual edits.
- **USFM markup adjustment** — change `\p` to `\nb` at specific locations to control paragraph behavior.
- **Inserting ornament rules** — insert `\zrule` markers under all main titles.
- **Inserting page breaks** at specific references.

## When NOT to use `changes.txt`

- **The change should be permanent in source.** Let the team make it in Paratext. `changes.txt` is for typesetting-time tweaks, not source-of-truth corrections.
- **The agent is uncertain about the regex.** Test on a single book first. The failure mode is silent text corruption — wrong characters appear in the PDF and the agent doesn't notice.
- **The change touches many places.** A broad regex with unintended matches produces unpredictable output. Prefer narrow scoping (`at BKK c:v`).

## Testing changes.txt edits

The agent's standard flow for a `changes.txt` change:

1. Submit a payload typesetting **one short book** (JUD, 3JN, PHM all under 1 chapter) with the new rule.
2. Inspect the result. Verify the rule fired where expected and didn't fire where it shouldn't.
3. Once confirmed on the test book, submit the full-scope run.

Skip step 1 only when the rule is so narrow (e.g. `at JHN 3:16`) that the test book wouldn't exercise it. Even then, prefer to test against the actual book the rule targets.

## Including in the payload

```json
"config_files": {
  "shared/ptxprint/Default/changes.txt": "# Config-specific transforms\nat MAT 5:3 \"old\" > \"new\"\n",
  "shared/ptxprint/changes.txt": "# Project-wide transforms\ninclude \"PrintDraftChanges.txt\"\n\"Jesus\" > \"Yesu\"\n"
}
```

For the included `PrintDraftChanges.txt`, either flatten its content into the project-wide `changes.txt` or include the file at its referenced path:

```json
"config_files": {
  ...
  "PrintDraftChanges.txt": "# Team-maintained transforms\n\"common typo\" > \"correction\"\n"
}
```

Verify the `include` directive's relative path resolves to an actual key in `config_files`, or PTXprint will fail to find the included file.

## Reading existing changes.txt from project state

Most projects have established `changes.txt` content the team maintains. The agent reads it from project state, includes it unchanged unless the user is explicitly editing, and adds new rules at the bottom rather than reordering.

If the user provides a new rule, surface where it will go ("I'll add this to the config-level `changes.txt`, not the project-wide one — that way it only applies to this configuration") and confirm before submitting.

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`. See also: `klappy://canon/articles/usfm-markers-headless` for the marker reference (helps in writing regex patterns).*
