# DELTA — 2026-09-05-ptxprint-mcp-validate-and-fix (driver's-seat lens receipt)
Run before fire, 2026-09-04 ~21:05 ET, by Auggie, over TICKET.md, the live deploy as a user (every tool called by hand: health, handshake, tools/list, docs ×3 ×2 depths, submit ×4, status, cancel, telemetry ×3), `src/docs.ts` and `src/index.ts`, `scripts/bundle-telemetry-policy.ts` (the house pattern for bundling), `DEPLOY.md`, `.github/workflows/ci.yml`. Lens by pointer (`klappy://canon/methods/driver-seat-lens`, prompt on the plated `2026-09-02-driver-seat-pass-policy` ticket).

## Changed
| # | Change | Why |
|---|---|---|
| 1 | The fresh-render row modifies a `.sty` file with a TeX `%` comment, not `Settings.xml`. | My first "fresh" payload appended `#` to XML and failed — that was my defect, not the server's. A validation that breaks the payload to change its hash validates nothing. |
| 2 | Fix = bundle `canon/` into the worker (46 docs, 652 KB) with in-process BM25; not a re-pin of oddkit's response shape. | Captain's ruling; also the smaller change to reason about — one build step, zero runtime dependencies, and the repo already bundles `telemetry-governance.md` the same way. |
| 3 | Bundle stamped with a content hash, not the git sha. | CI's staleness check regenerated the bundle on a different commit and failed on the sha line alone. Reproducible builds or no check. |
| 4 | Encodings, surfaces, derivatives, archives excluded from the bundle. | 320 KB of session ledgers and non-canonical ESE output would rank against the articles; the `canon/README.md` already says surfaces "inform but do not become canon." |
| 5 | `served_from` added to the response. | The old failure was invisible — `governance_source: knowledge_base` with nothing in it. Now a reader can see which canon answered. |
| 6 | `docs.test.ts` asserts the three README queries answer and that `fetch` is never called. | The break was the README's own examples failing silently; the test is the README, executable. |

## Considered and rejected
| Considered | Rejected because |
|---|---|
| Patch `callOddkit` to read `result.data` (one-line fix). | Same break, next contract change; the captain named it. |
| Fetch `canon/` from raw.githubusercontent at request time. | Reintroduces a network hop and a cache; the bundle is ~650 KB, well under the Worker limit, and CI keeps it honest. |
| Fix F2 (stale `human_summary`) in the same PR. | Different file, different failure; the ticket's failure mode #1. TENSIONS. |
| Run `telemetry_public` SELECT to complete P3. | Quota belongs to the captain's account; named as owed, not spent. |
| Merge the fix myself since the captain said "fire." | Merge deploys to production. "Fire, then we test it" is an order to cook and to test the deploy; the merge word is still his. |

## The system as one thing
Validation and fix are one motion only if the first never touches the thing under test — so PR #51 is docs only and PR #52 is the change, and the row that failed (D1) is the test that PR #52 carries. What the pass leaves: a docs tool that cannot drift because it has no upstream, a CI that refuses a stale canon, and a validation file whose next row (D1 re-run against the deploy) is written the moment the merge lands.
