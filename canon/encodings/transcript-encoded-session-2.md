---
title: "PTXprint MCP Server — Transcript Encoding Session 2 (2026-04-27 PM)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "transcript", "dolceho", "vodka-architecture", "session-2"]
source_artifacts:
  - "1777322950767_2026-04-27-convo-The_tool_runs_efficiently_in_parallel_ten_to_twelve_process.txt"
  - "1777324162385_2026-04-27-convo-The_tool_runs_efficiently_in_parallel_ten_to_twelve_process.txt"
  - "Claude project chat: PTXprint MCP Vodka Architecture discussion (2026-04-27 PM)"
extends: "transcript-encoded.md (session 1)"
encoded_at: 2026-04-27T21:10:00Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/constraints/oddkit-prompt-pattern
  - klappy://canon/bootstrap/model-operating-contract
---

# PTXprint MCP Server — Transcript Encoding Session 2

> Continues `transcript-encoded.md`. Session 1 surfaced the original problem space and produced the ESE on `sillsdev/ptx2pdf`. Session 2 was a planning conversation: applying Vodka Architecture to the first-pass spec, surfacing structural gaps, and converging on a v1 shape. New IDs continue from session 1; cross-references to session 1 use the same `O-001` style.

---

## D — Decisions

### D-004 — PTXprint MCP is action-only; no bundled retrieval
The MCP server exposes file IO and subprocess action only. Agents that want PTXprint domain knowledge bring `oddkit` MCP separately and point at the PTXprint canon repo via the existing `knowledge_base_url` parameter. No retrieval logic is reimplemented in the PTXprint MCP server.

**Rationale:** Direct application of `klappy://canon/principles/vodka-architecture`. Reimplementing retrieval would be Flavored Vodka — domain-shaped retrieval logic accumulating in the server. The clean answer is the existing oddkit pattern.

**Operator quotes (session 2 transcript, lines 418–424):** *"I don't think we should re-implement retrieval for the knowledge base. We can still use oddkit to retrieve the knowledge base but the MCP server itself would just be the tool usage for controlling the knobs on the MCP server for PTX print. PTX print MCP server becomes pure action driven."*

**Cross-ref:** *resolves* `D-001` open path; *applies* `klappy://canon/principles/vodka-architecture`

### D-005 — Two-step async contract for typesetting
`submit_typeset` returns a `job_id` immediately. `get_job_status` polls for state, progress, log tail, and (when complete) PDF path. This is the contract for **all** typesetting calls, not a special path for autofill — even simple typesetting takes minutes for a whole Bible.

**Rationale:** Both Cloudflare Worker timeout (30s) and Cloudflare Container limits make synchronous calls structurally wrong. Even on a more permissive host, a long-running blocking call collides with chat / agentic interaction patterns. Acknowledged trade-off: every interaction becomes two-step.

**Operator quote (session 2):** *"Yeah I think the best thing we can do is unblock and do a two step. This is the right call for this layer for being serving... I think any agentic usage or chat assistant usage, you don't want to be blocked."*

**Cross-ref:** *closes* `O-001` (validation gap was partly an architectural issue, not just a bug)

### D-006 — Canon lives in a separate GitHub repo
The PTXprint canon (governance articles, schema, format specs, troubleshooting craft) lives in its own GitHub repository on `klappy/`, parallel to `klappy/oral-theology-kb`. Not absorbed into `klappy.dev`; not nested inside the MCP server repo.

**Rationale:** Same pattern that has worked across two prior knowledge bases. Keeps the server's life-cycle separate from canon edits — canon updates ship by `git push`, server updates ship by deployment. Operator confirmed: *"It would definitely be a separate repo."*

### D-007 — Audience: normal users, conversational, with optional power-user override
The MCP server is designed for normal users (Bible translation teams) who interact via conversational agents, not for typesetting experts. A power-user mode preserves arbitrary-override capability for those who need it.

**Rationale:** Operator framing: *"the whole point of conversational is to make something simple, right? So if you're bringing this to an MCP server it's because you're making it easier, not harder."* The MCP server is deliberately not the same surface as the GUI.

### D-008 — Deployment for hackathon week: fly.io, not Cloudflare Containers
For the autofill workflow (~30 min at 10 CPUs at half-beacon), Cloudflare Container time limits will bite. fly.io is the realistic host for the typesetting runner this week. Cloudflare Worker may still front the MCP adapter; the long-running container belongs on fly.io.

**Rationale:** Operator: *"Cloudflare's not necessarily designed for long running CPU intensive tests... so I think for this week we might have to use fly.io as our solution for hosting the server."*

**Cross-ref:** *resolves* `O-open-P2-001`

### D-009 — Knob-fan-out parallelization is out of v1 scope
Today autofill parallelizes by book (longest book pegs total wall-clock). Fanning out by knob-attempt on the same book is the obvious next optimization but is estimated at ~1 month of work to do correctly. v1 ships with book-level parallelism only.

**Rationale:** Martin (PTXprint dev): *"It would take some redesign and quite a bit of [progress]... it took me a month to do the other one, so it's gonna take me a month to do that fan out... next year maybe that would just be a refinement we get on."*

### D-010 — Progress signaling: per-pass, not per-page
Job status reports per-pass progress (each completed typesetting pass increments a counter). PTXprint does not expose useful per-page progress in headless mode, and pretending otherwise produces misleading UI.

**Rationale:** Martin: *"each time it does a pass through... we don't track pages, we just sort of do a Bayesian reduction."* Operator agreed: *"we can at least say something's happening."* Honest "thing X is happening" beats fake percentages.

### D-011 — Tool surface condensed to ~10 generic tools (soft commitment)
Lean toward condensing the original 17-tool spec into ~10 generic action-only tools. Domain differentiation lives in canon governance articles, not in separate tool calls. Final tool list is in the v1 spec; this decision marks the directional commitment.

**Rationale:** Operator: *"if we have governance in canon it can help differentiate instead of it being explicit separate tool calls."* Not hard-gated until the spec is reviewed, but the direction is set.

---

## O — Observations

### O-005 — Autofill ("page filler") is real, mature, part of PTXprint
Martin's existing capability. Multi-pass statistical optimizer with pathfinding. ~30 minutes for a New Testament on 10 CPUs at "half-beacon" each. Does pruned brute-force search across layout decisions, examines problems after each pass, takes another pass.

**Direct quote:** *"It does a pass, then it looks at the problems and then takes another pass and then it's peeled in statistics... it knows how to stretch and shrink things and then it's got its own pathfinding."*

This is significantly more capable than the original spec acknowledged. Out-of-box typesetting just lays USFM onto pages and leaves whitespace where things don't fit; autofill is what turns it into a finished book.

### O-006 — Today's autofill parallelizes by book; longest book pegs wall-clock
The current job-length characteristic: autofill runs all books concurrently, so total time = max(per-book time). For a New Testament, that's roughly half an hour. Adding more CPUs past the book count doesn't help.

### O-007 — 12 vs 6 CPUs gives the same wall-clock for current autofill
Direct consequence of O-006. *"If you run twelve you go [half-empty], then it's sitting there one to one [waiting on the longest book]."* The only path to faster autofill is fan-out by attempt — which is D-009-deferred.

### O-008 — Operator has ~1000 PTXprint configs locally; private training corpus available
Significantly more than the 150 mentioned in session 1. Permission given to use as private training material for canon-building, but explicitly not for public mirroring.

**Operator:** *"They're all on my system. They shouldn't be made public. They can have 'em yeah and it can use it to learn off them but it shouldn't go anywhere."*

### O-009 — PTXprint has internal progress indicators in the GUI not exposed in headless
"The dot thing." Visible in the GUI during a print. Not surfaced by the headless runner today. Surfacing it in the job-status response would be a useful upgrade but is not required for v1 (per-pass progress per D-010 is sufficient).

### O-010 — `ptx2pdf/docs/documentation/` exists as canon seed
Confirmed by Martin: *"there's docs slash documentation [with] a bunch of markdown files in there that describe various things."* This is the first concrete seed for the PTXprint canon repo. Closes one of the H-001 work items.

### O-011 — UI tooltip dump file exists, captures cfg-key-to-control mapping
Martin confirmed the tooltip dump file exists and is harvestable. This is the second concrete seed for canon — it answers `O-open-P1-001` (incomplete field-level cfg documentation) by giving us the GUI label → cfg key mapping for the 400+ settings.

### O-012 — 450-slide Google Slides deck on PTXprint exists; ESE happening in parallel
Operator received the link from Martin. ESE on the deck is being conducted in a separate Claude conversation. The ESE output will be integrated as a third canon seed when it lands.

### O-013 — WhatsApp / external messaging surfaced as result-delivery channel
Real downstream use case: BT Servant agent sends user a "your job is done, results here" message via WhatsApp. Implications for v1: job-status text needs to be human-readable (not just structured), since downstream agents will relay it. Initiation rules from Meta side are stricter; reply-to-existing-thread is permissive. Not a v1 deliverable but informs the job-status surface design.

---

## L — Learnings

### L-003 — Vodka Architecture applied correctly demands canon-first, server-second
The first-pass spec built the server elaborately while no canon existed for agents to retrieve PTXprint domain knowledge. The vodka-correct ordering is: build the canon first (or in parallel), then a thin server that surfaces it via existing oddkit retrieval. The PTXprint MCP becomes pure action; the canon repo carries the domain.

### L-004 — Cloudflare's serverless paradigm has a CPU-time edge typesetting crosses
Workers cap at 30s. Containers more generous but still bounded. Long-running CPU-intensive jobs (autofill at 30 min) cross out of the Cloudflare paradigm into fly.io territory. Operator's existing Stockfish container experience confirms this. Architectural implication: the MCP adapter (Worker) and the typesetting runner (container/VM) are different deployment shapes and may not co-locate.

### L-005 — "Drop and rebuild" vs. "drift toward vodka": condensing was chosen
The first-pass MCP server has 17 tools. Operator considered keeping them and adding canon alongside (slower drift) vs. condensing to ~10 generic tools (rebuild). Chose condensation because the long-term maintenance cost of 17 domain-shaped tools is permanently higher, and canon-driven differentiation gets stronger as canon grows. Pattern recognized: *"the first few times I built oddkit and other MCP tools, I'd have a ton of tools that did a whole bunch of things, but if I did a cross-section of the functionality, there's similar shapes of things that could do different things in their lane."*

---

## C — Constraints

### C-003 — Single-pass simple typesetting can take minutes for a whole Bible
Two-step async (D-005) is required by physics, not just by autofill. *"Even without doing filling... it can take a couple of minutes to do a whole Bible."* No synchronous shortcut available even for the "simple" path.

### C-004 — Adding CPU does not reduce autofill wall-clock under current parallelism
The single-book bottleneck (O-006) means CPU additions past the book count are wasted. This caps the upper bound on autofill performance until D-009 is built.

### C-005 — Server holds zero PTXprint domain opinions in code
All domain knowledge — file format syntax, cfg section semantics, troubleshooting craft, font requirements, naming conventions — lives in the canon repo (D-006), retrieved via oddkit (D-004). The MCP server treats every file as opaque text and every subprocess invocation as opaque action.

### C-006 — The 1000-config training corpus is private
Per O-008. Used to inform canon authorship and agent reasoning during build, never mirrored publicly. Filtering or sanitization step required before any external exposure.

---

## H — Handoffs

### H-003 — Tomorrow: kick off autonomous coding run with periodic-pause pattern
Operator will set up an autonomous Claude run tomorrow that pauses every 15–30 minutes to surface progress and any optional open questions, then waits for "continue" before resuming. First substantive build pass on the v1 spec. Tonight's job is to make sure the input artifacts (this encoding + the v1 spec) are clean enough that tomorrow's run has a tight scope.

### H-004 — Receive Google Slides ESE from separate conversation; integrate as canon seed
The 450-slide deck ESE is in flight. When it returns, it's a third canon seed (alongside `ptx2pdf/docs/documentation/` and the UI tooltip dump). The integration step is: take the ESE artifact, decide what becomes canon content vs. what stays as reference, write the canon documents.

### H-005 — Verify ptx2pdf licence before mirroring docs
Before any content from `ptx2pdf/docs/documentation/` gets copied into the new canon repo, read the project's LICENSE file. Either the licence permits redistribution (then mirror with attribution), or the canon repo cites and links rather than copies. Five-minute task; do before any canon authoring touches that source.

### H-006 — Filter the 1000-config corpus before agent ingestion
Per C-006. Decide: (a) filtering criterion (any contributor names? embedded paths? project-specific identifiers?), (b) filtering tool (sed pass? Python script?), (c) where the filtered corpus lives (private repo? local-only workspace?). Resolve before the autonomous run touches it.

---

## Q-open — Open Questions

| ID | Question | Resolution path |
|---|---|---|
| Q-open-1 | What is the licence on `sillsdev/ptx2pdf`? | Read LICENSE at repo root. (H-005) |
| Q-open-2 | Final tool surface — does the v1 spec's 10-tool list survive review? | Operator review of v1 spec. (this session's other artifact) |
| Q-open-3 | How does the 1000-config corpus get filtered for sensitivity? | (H-006) |
| Q-open-4 | How does WhatsApp / external messaging hook into job-status? | Deferred past v1; informs status-text design. |
| Q-open-5 | Connector-directory listing: name, branding, public description? | Resolve before public listing. |
| Q-open-6 | Does `resolve_config` (inheritance walker) belong in v1, or do agents resolve via `read_file` + canon? | Tentatively in v1; revisit after first agent reasoning loop tested. |
| Q-open-7 | Where exactly do in-repo PTXprint test projects live? | ESE pass on `ptx2pdf` repo root or `tests/` directory. (carried from session 1 Q4) |

---

## Cross-Reference Summary — Session 1 ↔ Session 2

| Session 1 item | Session 2 outcome |
|---|---|
| D-001 (headless CLI is the agentic surface) | Reaffirmed; D-005 makes the contract async |
| D-002 (English Bibles initial scope) | Reaffirmed; canon will start English-only per H-005-derivative |
| D-003 (data first, code second) | Now explicitly canon first, server second (L-003) |
| O-001 (first-pass MCP doesn't emit PDFs) | Resolved via D-005 architectural shift; first-pass server is scaffolding |
| O-003 (UI introspection mode maps controls to cfg keys) | Confirmed real; tooltip dump file exists (O-011) |
| O-004 (test projects in repo) | Carried forward; specific paths still unverified (Q-open-7) |
| O-open-P1-001 (incomplete field docs) | Resolution path now clear: O-011 + canon authoring |
| O-open-P1-002 (font dependency for headless) | Still open; deferred but informs container build |
| O-open-P2-001 (Cloudflare deployment unconfirmed) | Resolved → fly.io for hackathon week (D-008) |
| H-001 (perform ESE on ptx2pdf) | Done in session 1 (ptx2pdf_surface.md / .json) |
| H-002 (gap-analyze ESE against first-pass MCP) | Done in session 2; produced D-004 through D-011 |

---

*End of session 2 encoding. Companion artifact: `ptxprint-mcp-v1-spec.md` (the tight v1 spec these decisions converge on).*
