---
title: "Handoff — 2026-09-05: docs() served from the bundled canon; validation of the live deploy"
audience: operator
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "handoff", "docs", "validation", "oddkit", "no-drift"]
date: 2026-09-05
written_at: 2026-09-05T01:20:00Z
session_window: 2026-09-05T00:41Z–2026-09-05T01:20Z
companion_to: ["docs/validation/2026-09-05.md", "docs/TENSIONS.md", "canon/handoffs/open-items-validated-2026-04-30.md"]
governance_source: knowledge_base
---

# Handoff — 2026-09-05: `docs()` served from the bundled canon

## What changed (Worker 0.2.0)
- `docs(query, audience?, depth?)` no longer proxies oddkit. `scripts/bundle-canon.ts` writes `src/bundled-canon.ts` from `canon/{articles,governance,specs,templates,handoffs}` + `canon/README.md` (46 docs, ~652 KB, content-hash stamped); `src/docs.ts` searches it in-process (BM25, title bonus, audience-tag tiebreaker). Same `DocsResult` shape; `served_from` added. CI fails on a stale bundle.
- Why: the proxy read oddkit's `result.hits`; oddkit's retrieval-disclosure contract returns `result.data`. Every query — including the README's three examples — came back empty with `governance_source: "knowledge_base"`, for an unknown span before 2026-09-05. Found by validation row D1; confirmed by running the same queries through oddkit directly (23 hits).
- Ruling that shaped the fix (captain, 2026-09-04): new docs tools manage and serve their own policy; do not re-pin an upstream. And (R20, same day): a PR updates every doc it makes stale, in the same PR.

## What was validated (live deploy, `docs/validation/2026-09-05.md`)
Every tool; one fresh render (never-seen payload → 61-page PDF in 10.9 s — the container is alive); cached render; cancel (Day-1 flag only); status on an unknown id; telemetry policy/schema; issue #40 reproduced. After the merge, the three README queries answer on production within 20 s.

## Operator duties this introduces
- After ANY edit under `canon/` (the bundled subtrees): `npm run bundle-canon`, commit the regenerated `src/bundled-canon.ts`. CI will refuse otherwise.
- The bundle excludes `canon/encodings`, `canon/surfaces`, `canon/derivatives`, and the `_archive`/`archive` dirs on purpose. Adding a subtree is a one-line change in `INCLUDE_DIRS`.

## Open (on `docs/TENSIONS.md`)
F2 stale `human_summary` on cached jobs · P3 `telemetry_public` refused-statement row · D1s depth-1 snippet picks a one-line callout.

## Next dish named by the captain
A Titus study bible: Aquifer Open Study Notes (Titus 3) + BSB through this server, notes typeset under the text. Ordered on the kitchen rail when the captain says so.

## Addendum — 0.3.0, same day: progressive disclosure
`docs` re-cut to four calls (`{}` index · `{uri}` article · `{uri, section}` · `{query}` pointers with `covered: false`); `depth` kept one release as an alias. New article `study-notes-and-footnotes` (from the Titus cook); `changes-txt-format` callout; real cfg keys in `settings-cookbook`; taxonomy rows 3a/3b; spec §3 docs + §5 Limits. Kitchen ticket `2026-09-05-ptxprint-docs-v2-progressive-disclosure`.
