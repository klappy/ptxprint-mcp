---
title: "Study Notes and Footnotes — Putting Notes Under the Text, and Keeping Them There"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.3-aligned", "footnotes", "study-notes", "changes-txt", "layout"]
date: 2026-09-05
canonical_status: working
---

# Study Notes and Footnotes — Putting Notes Under the Text, and Keeping Them There

> **What this answers.** How do I add study notes (or any notes) to a book without editing the source USFM? Why did my `changes.txt` do nothing? What is the difference between `\f` and `\ef`? Why does a book with many notes fail with `! Dimension too large`, and what layout settings make a study Bible fit?
>
> **Related articles.** `klappy://canon/articles/changes-txt-format` · `klappy://canon/articles/config-construction` · `klappy://canon/articles/settings-cookbook` · `klappy://canon/articles/failure-mode-taxonomy`

---

## The shape of a study Bible

Scripture in the text block (usually two columns), notes in a band at the foot of the **same page** as the verses they explain. In USFM the notes are footnotes anchored in the verse; PTXprint/XeTeX places each page's notes under that page's text and shrinks the text block to make room. Nothing else has to be built: the layout is a footnote layout with more footnotes.

Verified 2026-09-05: Titus, BSB, 14 Aquifer Open Study Notes as `\f` footnotes at their verses, A5 two-column, Gentium — every note landed on the page of its verse (kitchen ticket `2026-09-05-titus-study-bible-ptxprint`).

## Getting the notes into the text without touching the source

`sources` are URL + sha256 — the worker verifies the bytes, so the agent cannot edit the USFM in place and cannot host a modified copy without infrastructure it may not have. Use `changes.txt` instead: a config-scoped file in `config_files` whose rules insert the note after the verse marker.

```
# shared/ptxprint/<config>/changes.txt
at TIT 3:1 "\\v 1 " > "\\v 1 \\f + \\fr 3:1 \\ft Paul might be telling the believers to make a clear distinction… \\f* "
at TIT 3:4 "\\v 4 " > "\\v 4 \\f + \\fr 3:4–7 \\ft This passage might be a summary or quote… \\f* \\f + \\fr 3:4 \\ft We should behave toward…\\f* "
```

Rules of the road (all bitten in practice):

- **Anchor on the verse marker with its trailing space** (`"\\v 1 "`), scoped with `at BKK c:v`. Without the space, `\v 1` also matches `\v 10`–`\v 19`.
- **Several notes on one verse** (a section note and a verse note) go in one rule, in reading order, separated by a space.
- **Note text must be plain USFM text.** Strip HTML; turn `<data class="bible-ref">` cross-references into plain refs; never let a `"` or `\` from the note into the rule — `"` ends the rule string, `\` starts a marker. Replace `"` with `”`.
- `\fr` carries the note's own range (`3:4–7`), which may differ from the anchoring verse.

## The setting you must flip

`changes.txt` is **ignored unless the config enables it**:

```
[project]
usechangesfile = True
```

The John fixture (`smoke/bsb-jhn-empirical.json`) ships `usechangesfile = False`. A payload that adds a `changes.txt` without flipping this renders a perfect book with no notes and no error — the first Titus run did exactly that. Check this line first when a rule "did nothing".

## `\f` or `\ef`?

| Marker | What it is | When |
|---|---|---|
| `\f + \fr … \ft … \f*` | The translation's own footnote stream — textual variants, literal renderings | The BSB source already carries these (`† 1:2 Literally before times eternal`) |
| `\ef + \fr … \ft … \ef*` | USFM 3 **extended (study) note** — a separate note class, set apart from the translation's footnotes | Study notes, so a reader can tell the publisher's comment from the translator's |

To print `\ef` notes the config needs `includextfn = True` (`[notes]`); with it off they are silently dropped. Both streams share the footnote area; `\ef` lets the stylesheet give study notes their own size, caller, and rule. As of 2026-09-05 the `\ef` path is documented but **not yet rendered in this kitchen** — the `\f` path is the verified one. Treat `\ef` as the target, `\f` as the proven fallback.

## Why a full book fails: `! Dimension too large`

XeTeX places a page's footnotes as an *insert*. The text block shrinks to make room, but a page cannot shrink below zero text: when the notes anchored on one page are together **taller than the page**, the insert cannot be placed and TeX fails — `! Dimension too large` in the log (`failure_mode: hard`, `errors: ["! Dimension too large."]`). Observed on Titus 1:5, where three long notes stack on one A5 page at 12 pt body with body-sized notes; chapter 3 alone (fewer, shorter notes) rendered.

The fixture layout is a *reading* Bible. A study Bible squashes the text and shrinks the notes so more of both fit:

| Setting (`ptxprint.cfg`) | Reading Bible (fixture) | Study Bible |
|---|---|---|
| `[paper] pagesize` | `148mm, 210mm (A5)` | `6in, 9in` (standard study trim) or `8.5in, 11in` |
| `[paper] fontsize` / `displayfontsize` | 12 | 9.5–10 |
| `[notes] fnfontsize`* | body size | 7–7.5 |
| `[notes] fneachnewline` | `False` (notes run on as one paragraph) | `True` (one note per line) |
| `[notes] fnpos` | `page` | `page` |
| note splitting | not allowed → fails | allow a note to continue onto the next page (head stays with the verse) |

\* Key names marked with the section they live in as observed in the bundled default cfg (`klappy://canon/articles/bundled-default-cfg`); where a key is named here but not present in the dump, confirm against a render before relying on it — the cfg surface has ~400 keys and this article was cut from one book's worth of them.

Practical ceiling to plan for: at 7.5 pt in two columns on 6×9, a page carries roughly 3,000–3,500 characters of notes below a third-page text block. A verse whose notes exceed that must split, or the notes must be edited down.

## Diagnostic checklist

1. Notes missing, no error → `usechangesfile = True`? (`\ef`: `includextfn = True`?)
2. Notes on the wrong verse → anchor has the trailing space; `at BKK c:v` scope present.
3. `! Dimension too large` → count characters of notes anchored on the failing page; shrink notes / enlarge page / split.
4. Notes present but the translation's own footnotes vanished → the rule replaced a `\v` that already carried a `\f`; anchor after the existing note or insert before the next `\v`.
5. Rule string looks fine, still nothing → a `"` inside the note text ended the rule early. Look for `”` substitution.

## Recipe: study notes from an open notes source

1. Fetch the notes for the book (e.g. Aquifer Open Study Notes via the Aquifer MCP: `search "TIT 3"` → `get`), keep `content_id`, passage range, HTML body.
2. Convert each note's HTML to plain USFM text; group by anchoring verse; write one `at BKK c:v` rule per verse.
3. Start from a proven config (the John fixture), set `usechangesfile = True`, add the study-layout settings above, add `changes.txt` and a `FRTlocal.sfm` licence page to `config_files`.
4. Submit; on `! Dimension too large`, bisect by chapter (`PTX_ONLY`-style filters) to find the page, then apply the layout table.
5. Keep the payload and the changes file with the PDF — they are the provenance of every note on the page.
