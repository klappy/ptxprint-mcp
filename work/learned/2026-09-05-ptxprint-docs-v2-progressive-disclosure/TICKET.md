# TICKET — ptxprint-docs-v2-progressive-disclosure

**What this is:** Re-cut the PTXprint MCP `docs` tool to the progressive-disclosure shape the
house's newer MCP docs tools already use (index → article → section → search-as-pointers, with
an honest "not covered"), and close the canon gaps the Titus cook exposed — in one PR, docs and
spec updated with it (R20).
**Why now:** Captain, 2026-09-04 ~21:55 ET, after the Titus cook: "Do we need to rearchitect
the docs tool and docs files to ensure proper progressive disclosure like our latest mcp docs
tools?" — ruled "order it." Evidence from the cook: `usechangesfile` findable only as a bare
line in a 600-line cfg dump; `\ef` study notes nowhere; the container limit nowhere; "how many
jobs at once" confidently answered with telemetry governance. Retrieval is now in-process (0.2.0),
so the shape is cheap to change.
**Your move:** read the PR when it opens; the index it prints is the acceptance test you can
eyeball in ten seconds.

Class: entrée. Risk: STANDARD (worker code + canon; behaviour change to a public tool → version
bump, spec amendment in the same PR). Owner: Auggie. Promise: 4 h (R6).
Depends: `2026-09-05-ptxprint-mcp-validate-and-fix` (plated; 0.2.x live). Meal: none.
driver-seat: run before fire (`DELTA.md`).

Gate 10 — reference observed: Cartographer `docs {}` / `docs {capability}` / `docs {topic}`
(index cheap, schema bought per capability, policy on demand — the live pattern); the
retrieval-disclosure contract (`klappy://canon/constraints/retrieval-disclosure-contract`:
uri+title floor, body single, caps per flag). Gate 11 — house prior art: ptxprint-mcp 0.2.0
(bundled canon, BM25), `canon/articles/*` — 23 of 25 already open with a "What this answers"
line, which is the index text.

Declared product (ptxprint-mcp, one PR, `docs/2026-09-05-v2`):
1. `docs` tool, one surface, four calls: `docs {}` → index (uri · title · what-it-answers ·
   tags, ~47 lines); `docs {uri}` → one article (frontmatter + body); `docs {uri, section}` →
   one `##` section; `docs {query}` → ranked **pointers** (uri · title · what-it-answers · score),
   never bodies, with a score floor below which the answer is `covered: false` and the index is
   suggested. `depth` retired (kept as a deprecated alias for one release: depth 2 → `{uri}` of
   the top hit). `served_from` on every response.
2. Canon gaps closed: new `articles/study-notes-and-footnotes.md` (`\f` vs `\ef`, `includextfn`,
   `usechangesfile`, note stacking, `! Dimension too large` and the study-layout settings —
   page size, body/notes sizes, two-column notes, note splitting); `changes-txt-format` gains a
   "settings you must flip" callout at the top; `settings-cookbook` footnote rows carry the real
   cfg keys; `failure-mode-taxonomy` gains the #40 row (exit 0, no PDF, no log → missing
   config_files); spec §5 gains "Limits" (instances, timeouts, sizes).
3. Spec v1.3-draft §3 `docs` rewritten for the four calls; README/ARCHITECTURE/homepage demo
   updated (the demo shows the index, then a click-through); version 0.3.0.
4. Tests: index has every bundled article once; every article's `what_it_answers` is non-empty;
   the six Titus-cook questions return the right article in the top 3 or `covered: false`;
   section fetch returns the section and only it; no network.
5. Kitchen: DELTA, FIRE-CHECK-RUN, DEBRIEF, journal rows.

Done-means: an agent that has never seen the repo can call `docs {}` and pick the right article
for "study notes as footnotes" from the index alone; `docs {query:"how many jobs at once"}`
returns the spec Limits section or `covered: false` — never telemetry governance; the six
Titus-cook questions are a passing test; CI green; `/health` says 0.3.0.

## Failure Modes / Required Response
- Rebuilding a search engine instead of an index → the index is the product; search is a
  pointer finder over it. Stop when `docs {}` reads well.
- Answers still dump bodies → body only on `{uri}`/`{uri, section}`; search never carries one.
- New article written from memory → every setting named in it is verified against the bundled
  default cfg or a render; unverified lines are marked so.
- Breaking existing agents → `depth` alias for one release; `DocsResult` fields kept where they
  still mean the same thing.
