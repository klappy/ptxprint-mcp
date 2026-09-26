---
title: "Diglot on This Server — What Actually Makes PTXprint Merge"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "diglot", "non-canonical", "lessons", "pass-0008"]
derives_from: "cookbook PASS-0008 (titus-diglot-tn, ULT | UST, 8 runs) via kitchen rail/3-pass/2026-09-05-trb-diglot-ult-ust/DEBRIEF.md"
companion_to: "canon/articles/workflow-recipes.md (Recipe: Set up a diglot publication)"
canonical_status: non_canonical
date: 2026-09-26
status: draft
---

# Diglot on This Server

> **What this answers.** Why a diglot payload renders monoglot or a truncated merge, why a diglot job loops forever (`! Output loop`), and how to get one note band instead of two — lessons from the first ULT | UST Titus diglot on this server.
>
> **Related articles.** `klappy://canon/articles/workflow-recipes` · `klappy://canon/articles/payload-construction` · `klappy://canon/articles/study-notes-and-footnotes`

---

The recipe in `workflow-recipes` (§ Set up a diglot publication) gets the secondary project into the payload
(`payload.projects`, Worker ≥ 0.4.0). These are the things that recipe does not say and that cost runs on
PASS-0008 (Titus, ULT primary + notes, UST secondary, 23 pp).

## Monoglot despite ifdiglot, or a truncated merge

`ifdiglot = True` alone is not enough. All three must hold, or PTXprint quietly renders only the primary:

- primary cfg: `ifdiglot = True` **and** `[snippets] diglot = True`;
- the secondary project's `Settings.xml` `<Guid>` equals the primary cfg's `diglotsecprjguid`;
- the secondary's source files are named the way its `Settings.xml` says —
  `<NN><BBB><FileNamePostPart>` (e.g. `57TITust.usfm` for `FileNamePostPart` = `ust.usfm`).

If the filename does not match `FileNamePostPart`, the merge still runs but silently: the job exits 0 with a
truncated merge (secondary text missing) rather than an error. Check the names before diagnosing anything else.

## Output loop — chunks too big to fit

The diglot merge lays out *chunks*: a pair of aligned paragraphs (primary + secondary) that carries its notes
with it. If one chunk plus its notes cannot fit on a page, TeX cycles without progress and dies with
`! Output loop`. Fix: make the paragraphs verse-sized (one verse per paragraph in the sources) so every chunk
fits. Dense study notes make this far more likely.

## One note band, not two

By default a diglot sets separate note bands per side. For one shared band set `diglotsepnotes = False` in the
primary cfg.

## Not written here

The 09-05 order listed a fourth fact ("same mechanism as the white-space finding"). It is not stated in the
PASS-0008 evidence this article could re-read, so it is omitted until re-grounded.
