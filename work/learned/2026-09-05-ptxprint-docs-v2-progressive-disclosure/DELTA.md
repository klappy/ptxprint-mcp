# DELTA — 2026-09-05-ptxprint-docs-v2-progressive-disclosure (driver's-seat lens receipt)
Before fire, by Auggie, driving `docs()` 0.2 with the six questions from the Titus cook and reading Cartographer's `docs {}` / `{capability}` / `{topic}` shape and the retrieval-disclosure contract.

| # | Changed | Why |
|---|---|---|
| 1 | Index first — `docs {}` returns every article with its own "What this answers" line. | 23 of 25 articles already carried the line; the index cost nothing to build and is the thing an LLM should read before asking. |
| 2 | Search returns pointers, never bodies; `covered: false` below a floor (≥ half the terms, absolute score). | 0.2 answered "how many jobs at once" with telemetry governance, confidently. A wrong answer at glance speed is worse than "not covered". |
| 3 | Sections as a unit (`{uri, section}`). | Articles average nine `##` sections and up to 31 K chars; the section is what fits a context window. |
| 4 | `depth` kept one release as an alias. | Existing agents (and the homepage before this PR) call `docs(query, depth)`; break nothing tonight. |
| 5 | The canon gaps closed in the same PR. | R20 — and the six-question test would fail without the article. |

Rejected: a vector index (BM25 over a 48-doc corpus with a head bonus ranks correctly on every test question; a model call would add latency, cost, and a dependency); rewriting all articles into a keyed format tonight (two dumps flagged by the bundler instead); a separate `catalog` tool (one tool, four calls — like Cartographer's `docs`).
