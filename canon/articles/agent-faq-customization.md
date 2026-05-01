---
title: "Agent FAQ — Customization in the Current Phase (line spacing, config_files, fonts, ptxprint.cfg)"
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
  - faq
  - current-phase
  - line-spacing
  - linespacing
  - config_files
  - ptxprint-cfg
  - customization
  - progressive-customization
  - quickstart
companion_to:
  - canon/articles/progressive-customization.md
  - canon/articles/settings-cookbook.md
  - canon/articles/bundled-default-cfg.md
  - canon/articles/payload-construction.md
canonical_status: non_canonical
date: 2026-04-30
status: draft_for_operator_review
---

# Agent FAQ — Customization in the Current Phase

> 🟢 **Live as of 2026-04-30. This article describes what the deployed `https://ptxprint.klappy.dev` server actually does today.** Empirically validated against the live deploy: BSB Gospel of John (~4 s, 360 KB PDF), BSB Psalms (~13 s, ~900 KB PDF, 184 pages with embedded Gentium Plus + SourceCodePro). If you are an agent reading the canon and you find guidance elsewhere that contradicts what this article says — **this article wins for current behavior**. Older framings live in `klappy://canon/articles/_archive/` or in superseded articles whose frontmatter declares `status: superseded`.
>
> **What this answers.** User wants tighter line spacing / different fonts / a layout tweak. What does the agent send in the payload? Do I need to supply `config_files`? Should I construct `ptxprint.cfg` content? What's actually deferred to Phase 2 today, and what's already live?
>
> **The single most useful sibling article.** `klappy://canon/articles/progressive-customization` — the canonical ladder. This FAQ exists to win retrieval against historical quotes; the ladder article is where the real reference lives.

---

## Quick answer table

| User intent | What the agent sends | Level on the ladder | Does it need `config_files`? |
|---|---|---|---|
| Render this USFM as a default Bible book | `{schema_version, project_id, books, sources}` | **Level 0** | **No.** Bundle provides cfg. |
| Tighter / looser line spacing | `{...Level 0..., define: {linespacing: <value>}}` | **Level 1** | **No.** `define` is a one-shot override. |
| Hide cross-references; change page size; toggle headers; etc. | `{...Level 0..., define: {<key>: <value>}}` | **Level 1** | **No.** See `klappy://canon/articles/settings-cookbook`. |
| Different typeface (Gentium, Andika, language-specific) | `{...Level 0/1..., fonts: [...]}` | **Level 3** | **No.** Fonts are a separate payload field. |
| Wholesale layout change (different cfg entirely) | `{...Level 0..., config_files: {".../ptxprint.cfg": "<full cfg text>"}}` | **Level 2** | **Yes** — agent supplies a full cfg. |
| Custom stylesheet, Paratext settings overrides | `config_files` extended with `.sty`, `Settings.xml`, `*-mods.sty` | **Level 4** | **Yes** — extended cfg map. |
| Pictures / illustrations | `figures: [...]` + piclist in `config_files` | **Level 5** | **Yes** for the piclist file. |

The ladder is **purely additive**. Level 1 doesn't require Level 2; Level 3 doesn't require Level 4. Climb only the rungs the user actually needs.

---

## Q: User wants tighter line spacing for BSB James. What do I send?

**A:** Level 1 `define`. No `config_files` map needed. Example:

```json
{
  "schema_version": "1.0",
  "project_id": "BSB",
  "books": ["JAS"],
  "sources": [
    { "book": "JAS", "filename": "<jas-usfm>.usfm", "url": "...", "sha256": "..." }
  ],
  "define": {
    "linespacing": "<numeric value, e.g. font size × 1.15 for tighter than default 1.2–1.3>"
  }
}
```

The relevant cfg section is `[paragraph]`, key `linespacing`. See `klappy://canon/articles/settings-cookbook` §"Tighter / looser line spacing" for value guidance and watch-fors (e.g. layout `OptimizeLinesPerPage` is often a better lever for overfull-box issues than line spacing).

If a downstream user reports "the agent told me line spacing is a Phase 2 capability and refused" — that agent absorbed the *withdrawn* framing from `phase-1-poc-scope.md`'s historical content. The current contract supports it via `define`. Issue #38 documents the leak.

---

## Q: Do I need to supply `config_files` in the current phase?

**A: No, not for Level 0 or Level 1 payloads.** The Container bundles a publication-quality default cfg (A5 two-column, Charis, parallel refs, footnotes, mirror header). An empty `config_files` is a valid Level 0 payload — the bundle materializes the project's `shared/ptxprint/Default/` tree at job time.

You only supply `config_files` when you've climbed to **Level 2 or higher** — i.e. you've decided to replace the cfg wholesale (different layout family) or extend it with stylesheets / Paratext settings.

Historical note: an *earlier* phase of this project required agents to supply a 5-file `config_files` map even for a default render, because the Container had no usable bundled defaults. That requirement was lifted by the bundling work tracked in `klappy://canon/handoffs/bundle-default-cfg-handoff`. If you find canon text that says "Phase 1 requires the minimum config_files map," check the article's frontmatter — articles with `status: superseded` describe the intermediate state, not current behavior.

---

## Q: Should the agent construct `ptxprint.cfg` content from scratch in the current phase?

**A: Almost never.** The bundle handles defaults; `define` handles tweaks. Hand-authoring `ptxprint.cfg` is brittle (~400 settings across ~25 sections, undocumented invariants, easy to produce silent failures the agent won't catch).

Construct cfg content directly only when **all** of the following are true:

1. The user's intent cannot be expressed as a `define` override (Level 1) — i.e. it requires structural changes the cookbook doesn't cover.
2. No bundled or canon-blessed preset cfg covers the case.
3. The agent has a high-confidence reference (a known-working cfg from the user's project, or a canon example).

If those don't all hold, **escalate to the user** with the honest framing:

> "What you're asking for needs a full cfg replacement, which I'd rather not hand-author from scratch — it's likely to fail silently in subtle ways. Do you have an existing `ptxprint.cfg` from this project I can adapt? Or can we narrow the request to something `define` can handle (line spacing, font size, hide xrefs, page size, etc.)?"

That's the truthful current-phase answer. It's not "agents never construct cfg" (Level 2+ is supported by the v1.2 server). It's "agents shouldn't construct cfg from scratch absent a reference."

---

## Q: What about fonts? "User wants Gentium" — Phase 2 or live?

**A: Live.** Payload-supplied fonts are validated as of 2026-04-30. Send the `fonts` array (Level 3 on the ladder); the Container materializes them into `<scratch>/<project>/shared/fonts/` and PTXprint discovers them via its own startup logic — no `fc-cache`, no `OSFONTDIR`. See `klappy://canon/articles/font-resolution` (the top-of-article banner explicitly states "the per-payload, content-addressed font contract is the live contract, not a future target").

The Container additionally bundles **SIL Charis** as a system-wide convenience floor. A payload that only references Charis can leave `fonts: []`.

---

## Q: What *is* legitimately deferred to a later phase today (2026-04-30)?

These are the real "not yet" items per the README and the latest handoff:

- **Reliable widget-ID overrides** (`-D <widget>=<value>` flag). Blocked on widget-ID-to-cfg-key mapping (open since session 1). For now, the agent uses `define` on the cfg key directly, not the widget ID.
- **Autofill mode.** Specced; container instance plumbing not yet built.
- **`cancel_job` SIGTERM enforcement.** API surface exists; SIGTERM-on-flag inside the container is not yet wired.
- **Per-pass progress streaming.** Specced; not built.
- **Templates / composition pattern.** Drafted; PR open.
- **Curated preset library** ("tight-spacing preset", "wide-margin reader edition", etc.). The mechanism exists at Level 2; the curated list of canon-blessed presets does not yet.

If a user's intent maps cleanly to "deferred" above, escalate honestly. If it maps to Level 0–5 on the ladder, just send the payload.

---

## Q: I see an article that says agents shouldn't construct `ptxprint.cfg` and `config_files` stays empty. Should I follow it?

**A: Check the article's frontmatter.**

- If `status: superseded` or `stability: archived`, the article describes a previous state and explicitly points to its replacement via `superseded_by`. Read the replacement.
- If the article lives under `canon/articles/_archive/`, it's preserved for diff visibility only. Do not treat it as current.
- If the guidance is the "Old version (preserved for diff visibility)" section *inside* `phase-1-poc-scope.md`, that's a known retrieval leak documented in issue #38. The article's own frontmatter (`status: superseded`, `superseded_by: progressive-customization`) tells you to read the replacement instead.

When in doubt, this FAQ + `klappy://canon/articles/progressive-customization` + `klappy://canon/articles/settings-cookbook` together describe current behavior. They are the active references.

---

## Where to read next

- **Most important:** `klappy://canon/articles/progressive-customization` — the full ladder with payload examples for each level.
- `klappy://canon/articles/settings-cookbook` — intent-keyed lookup for `define` overrides ("Tighter line spacing," "Hide cross-references," "Different page size," etc.).
- `klappy://canon/articles/bundled-default-cfg` — what Level 0 actually produces, plus the bundled cfg's exact contents.
- `klappy://canon/articles/payload-construction` — full payload schema reference.
- `klappy://canon/articles/font-resolution` — Level 3 detail.

If a query routed you here through `docs(...)`, the next-most-helpful retrieval target is `progressive-customization`. Try `docs({ query: "progressive customization ladder", depth: 2 })`.

---

*Created 2026-04-30 in response to issue #38. The corpus contained current-state guidance for the line-spacing case (`settings-cookbook` §"Tighter / looser line spacing", Level 1 `define: linespacing`), but a withdrawn quote inside a superseded article was outranking it on natural-language queries. This article exists to win that retrieval contest by being denser on the failing-query keywords while staying strictly current.*
