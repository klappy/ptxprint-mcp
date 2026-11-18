# TENSIONS — findings not fixed by the PR that found them

| Id | Opened | Finding | Seeded resolution | Owner |
|---|---|---|---|---|
| T-2026-09-05-F2 | `docs/validation/2026-09-05.md` S2 | `get_job_status` on a cached job replays the last `human_summary` written for that hash — "Cancellation requested…" on a succeeded job | (a) recompute `human_summary` from `state` on every read; (b) clear it on cache-hit return | next `src/job-state-do.ts` cook |
| ~~T-2026-09-05-F3~~ closed by the no-drift PR | V1 | README badge says spec v1.2-draft; repo and `/health` say v1.3-draft | one-line README badge edit; or drop the badge (HYGIENE 19: version lives in the deploy) | whoever next touches README |
| ~~T-2026-09-05-F5~~ closed by the no-drift PR | fix PR | `src/homepage.ts` architecture SVG still draws oddkit as the internal upstream for `docs()` | redraw the node as "bundled canon" or remove the arrow | homepage cook, after the docs fix merges |
| T-2026-09-05-P3 | P3 | `telemetry_public` refused-statement row not run (quota is the captain's account) | run one SELECT and one refused statement from the captain's seat; append to the validation file | captain, or a seat with quota |
| ~~T-2026-09-05-D1s~~ closed by the snippet fix | D1' | depth-1 snippet picks a one-line callout ("Superseded.") when it is the first paragraph mentioning a term | prefer the first paragraph ≥ 80 chars, else fall through | next `src/docs.ts` cook |
| T-2026-09-05-F6 | Titus cook | one container per job + sleepAfter 45m exhausts max_instances=5 after five jobs | **fixed** — Worker stops the instance when the job returns (0.2.1) | — |
| T-2026-09-05-F7 | Titus cook | `! Dimension too large` when a full book of study-note footnotes is set (Titus 1–3, 41 notes; chapter 3 alone renders) — a footnote stack on one A5 page that outgrows it | investigate: `\ef` vs `\f`, note splitting, or a taller page | Titus dish / next cook |

### 2026-09-05 (Spanish Titus cook) — closed in 0.3.1
- **F10** Source `filename` must carry the *Paratext* book number (`57TIT`), not a sequential one (`56TIT`): PTXprint finds the book by it; wrong → silent exit, `findScript` traceback. → canon `payload-construction` §Sources. Closed.
- **F11** Fixture `iffrontmatter = False` silently skips `FRTlocal.sfm` (the first plated Titus PDF had no licence page). → canon `study-notes-and-footnotes` §The setting you must flip + checklist. Closed.
- Two articles without a "What this answers." line (`hero-metrics-and-storytelling`, `snapshot-operations`) — lines added. Closed.

### 2026-09-05 (translator's desk) — 0.4.0
- **D2** Diglot impossible: the container wrote every source into the primary project and sandboxed `config_files` to it, so no secondary project could exist. → `payload.projects` (optional map of secondary projects), spec §4, `payload-construction`, `workflow-recipes` diglot recipe. Closed in 0.4.0; first render pending (kitchen `trb-diglot-ult-ust`).

### 2026-11-18 (small-model test) — 0.4.1
- **S1** 7B models fired `get_job_status` with invented ids (`job-1234567890`, `"job_id"`) in the same turn as `submit_typeset`, and mistyped `project_id` (`bsoref`). → tool descriptions state submit-once-then-poll-the-returned-`job_id`; the submit result echoes what was hashed and names the next call (spec v1.3 §3 amendment). Closed in 0.4.1, pending re-measure against a deploy.
- **S2** Proposed server-side `preset` on `submit_typeset` — **not built here; still open.** A no-`config_files` ("Level 0") payload does **not** render on this build: the bundled default cfg in `canon/handoffs/bundle-default-cfg-handoff` has not shipped, and `container/main.py` drops `-c` when no config is supplied (Terry review 5962686549). The real fix for short small-model payloads is that handoff, in its own PR; until then the tool description requires `config_files` and points to `canon/templates`. Seven agent-facing articles served by `docs` still describe that path; each now carries a one-line "Not on this build" note at the claim (Terry review 5962869455), and the full rewrite waits for the handoff PR: `payload-construction`, `agent-faq-customization`, `progressive-customization`, `bundled-default-cfg`, `config-construction`, `using-custom-fonts`, `phase-1-poc-scope`. A test (`test/canon-config-claims.test.ts`) keeps every bundled article that makes the claim qualified.
- **S3** Proposed flat-args variant for weak tool callers — **not built.** Llama 3.1 8B also failed at the runtime's tool-call parser, so flat args would not have fixed it; a second argument shape grows the surface. Re-open with a runtime that parses the model's calls.
