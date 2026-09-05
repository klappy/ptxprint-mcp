# TENSIONS — findings not fixed by the PR that found them

| Id | Opened | Finding | Seeded resolution | Owner |
|---|---|---|---|---|
| T-2026-09-05-F2 | `docs/validation/2026-09-05.md` S2 | `get_job_status` on a cached job replays the last `human_summary` written for that hash — "Cancellation requested…" on a succeeded job | (a) recompute `human_summary` from `state` on every read; (b) clear it on cache-hit return | next `src/job-state-do.ts` cook |
| ~~T-2026-09-05-F3~~ closed by the no-drift PR | V1 | README badge says spec v1.2-draft; repo and `/health` say v1.3-draft | one-line README badge edit; or drop the badge (HYGIENE 19: version lives in the deploy) | whoever next touches README |
| ~~T-2026-09-05-F5~~ closed by the no-drift PR | fix PR | `src/homepage.ts` architecture SVG still draws oddkit as the internal upstream for `docs()` | redraw the node as "bundled canon" or remove the arrow | homepage cook, after the docs fix merges |
| T-2026-09-05-P3 | P3 | `telemetry_public` refused-statement row not run (quota is the captain's account) | run one SELECT and one refused statement from the captain's seat; append to the validation file | captain, or a seat with quota |
| ~~T-2026-09-05-D1s~~ closed by the snippet fix | D1' | depth-1 snippet picks a one-line callout ("Superseded.") when it is the first paragraph mentioning a term | prefer the first paragraph ≥ 80 chars, else fall through | next `src/docs.ts` cook |
