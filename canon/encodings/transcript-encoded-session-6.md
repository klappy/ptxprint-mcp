---
title: "PTXprint MCP Server — Transcript Encoding Session 6 (2026-04-28 PM)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "transcript", "dolceho", "session-6", "hackathon-scope", "presets", "governance-split"]
source_artifact: "1777399347817_2026-04-28-convo-A_clear_job_execution_flow_is_outlined_each_job_runs_in_a_f.txt"
source_lines: 568
extends: "transcript-encoded-session-5.md"
encoded_at: 2026-04-28T19:55:00Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/principles/kiss-simplicity-is-the-ceiling
  - klappy://canon/constraints/oddkit-prompt-pattern
  - klappy://canon/bootstrap/model-operating-contract
companion_artifact: "ptxprint-mcp-v1.2-spec.md (session-6 challenges D-021; resolution required before next spec rev)"
---

# PTXprint MCP Server — Transcript Encoding Session 6

> Continues sessions 1–5. Session 6 was a working conversation between the operator, Martin (PTXprint domain expert), and Ian about how a downstream agent (BT Servant) actually constructs payloads for the v1.2 MCP server. Two outcomes dominate: a hackathon-scope reduction toward preset templates, and a recognition that the existing 67kb headless-operations governance doc must be split for progressive disclosure before agents can use it well. A live tension between "send a zip" (Martin) and v1.2's structured-payload-with-URLs (D-021) was raised but not resolved. New IDs continue from session 5.

---

## D — Decisions

### D-022 — Hackathon scope: ship 3–4 preset config templates; canon-driven generation is stretch
For hackathon week, the agent picks from a small set of pre-built config presets rather than constructing configs from canon at submission time. Canon-driven free-form generation becomes the stretch goal.

**Operator framing (lines 520–526):** *"What I feel the atmosphere in the room is telling me, let's simplify this. We need some sort of default templating system first. And maybe for the hackathon, we just say here's three or four, and the stretch goal of using the governance to figure out how to do more."*

**Rationale:** BT Servant has a latency budget (C-009). Iterative config-fixing through XeTeX failure logs is slow. Templates are deterministic; the agent maps user intent to one of N presets. Canon-driven generation, when done, must respect that budget.

**Cross-ref:** *narrows* `v1.2-spec §9 DoD item 2` (agent constructs valid payload by following canon's payload-construction article); *applies* `klappy://canon/principles/kiss-simplicity-is-the-ceiling`

### D-023 — Split the 67kb headless-operations governance doc into chapter-sized articles + map
The existing `canon/governance/headless-operations.md` (68,200 bytes) is a single large file that the team agrees is "not oddkit-ready." Plan: split by section (file-system map, output convention, merge configs, failure modes, font handling, AdjList format, piclist format, config inheritance/import, etc.); add an overview map; rely on oddkit's progressive disclosure so the agent fetches only the chapter it needs.

**Operator framing (line 420–430):** *"this is not oddkit ready because it's just one large governance file… this needs to be split up into something more usable. And once it does, it'll give you a map of all the other smaller governance files… as you need something, then it'll go fetch the smaller ones with progressive disclosure."*

**Rationale:** The five articles named in v1.2 §2 as "required for v1.2 to be agent-usable" don't need to be authored from scratch — the source material exists in the monolith. The work is curation + map authoring, not writing.

**Cross-ref:** *reframes* `v1.2-spec §2` (canon articles required) as a curation task rather than authoring task; *resolves the cause of* the gap surfaced by session-6-pre-search ("five articles named, none findable")

### D-024 — Failure signal is the job log; no pre-flight config validator in v1.2
A pre-flight validator that catches config errors before XeTeX runs was raised and explicitly declined. The agent learns from the XeTeX log, copies the relevant section back into the next attempt, and resubmits. Content-addressed caching makes resubmission of unchanged inputs free.

**Direct quotes (lines 550–568):**
- *"It's not like it can submit some config file and say validate this, right?"* — *"We can."* (capability acknowledged)
- *"When does BT Server know it got the config file wrong? — Job failure."* (decision made)
- *"If I was trying to do this in cloud code and then I got that whatever's in that log back, I would just literally copy that back into cloud code and say, fix it."* (the recovery loop)

**Rationale:** A separate validator would duplicate logic PTXprint already has (it fails on bad input). The cheaper move is to ensure `log_url` and `log_tail` in `get_job_status` give the agent enough context to self-correct.

**Cross-ref:** *complements* `v1.2-spec §3 get_job_status` (`log_tail`, `log_url`, `errors[]` fields); *informs* `O-open-P2-003` below

---

## O — Observations (closed)

### O-016 — "The MCP server is stupid" — Martin independently articulates the vodka boundary
Martin (PTXprint domain expert) reaches the vodka principle without reading canon, while pushing back on the agent's role.

**Direct quote (line 292):** *"Really the intelligence has to be in the servers because the MCP server is stupid. Right? So the thing that's going to make a decision about what's going to go on and how you actually configure it needs to be the [agent]."*

This is `klappy://canon/principles/vodka-architecture` reached from outside the canon system. Strong external validation that v1.2's vodka stance matches deep PTXprint domain intuition — the boundary isn't a peculiar convention; it's the natural division of labor for someone close to the problem.

**Cross-ref:** *reinforces* `klappy://canon/principles/vodka-architecture`; *reinforces* `Session 2 D-004` (PTXprint MCP is action-only)

### O-017 — PTXprint output PDFs are zip archives carrying the config that produced them
PTXprint emits a PDF that is a valid zip archive — unpack it and you get the config directory used to produce it.

**Direct quotes (lines 494–516):**
- *"You can actually generate an archive, which has the PDF in it, has all the generated files, and has the config in it… PDF has the config in it."*
- *"You could even get BT Servant to slurp that out because all it is is a standard zip file which unpacks to be a config directory."*

**Implication:** Enables a "make mine like that" UX pattern. User uploads a reference PDF; BT Servant extracts the embedded config; tweaks for the user's content; submits. Config-by-example workflow without ever exposing config syntax to the user.

**Note:** This is a property of PTXprint's output, not a v1.2 MCP feature. Whether the MCP server gets a tool for it (e.g., `extract_config_from_pdf`) or whether BT Servant handles it client-side via the PDF binary is `Q-open-13`.

### O-018 — Three required payload inputs: USFM, font (optional), config
Confirms the v1.2 payload-schema shape from the conversation side.

**Direct quotes (lines 18–22):**
- *"The USFM file in the future we'll need USFM files as input."*
- *"The second input is another URL for the font, if needed."*
- *"And the third one, which is the most important one, which is the config."*

Aligns with `v1.2-spec §4`: `sources[]`, `fonts[]`, `config_files{}`. Figures (images) noted separately in v1.2 §4 — the conversation didn't dwell on them but didn't contradict.

### O-019 — "Upload URL" vs "download URL" naming is perspective-dependent
Recognized in-conversation as a confusing naming surface.

**Direct quote (lines 172–176):** *"The URL we're talking about, the upload URL — it's an upload to the worker. It's a download for us. So we need to rename that because that's confusing."*

**Status:** v1.2's `get_upload_url` mints both a `put_url` (for the agent to PUT to R2) and a `get_url` (for subsequent payloads to fetch from R2). The response field naming already disambiguates — the tool name ("upload" from whose perspective?) is the only residual ambiguity. **No rename required** for v1.2 if `put_url`/`get_url` are documented clearly. Flag for canon's `payload-construction.md` chapter to address explicitly.

---

## O-open — Observations still open

### O-open-P1-005 — Zip-payload vs structured-URL-payload: a live tension with v1.2 D-021
**Priority:** P1 (changes the v1.2 contract if zip wins)

Martin pushed for a zip-archive payload format throughout the conversation, framing it as the simpler agent ergonomic. v1.2 D-021 chose structured JSON with inline text + URL'd binaries.

**The case for zip (Martin's frame):**
- Diglot/triglot configs naturally bundle: 3 configs + 3 USFM sources move together (line 286–290).
- "It's just a zip" reduces agent reasoning load (line 78–80, 116–122).
- Maps to existing PTXprint mental model: PDF carries zip (O-017); GitHub repo *is* a zip; users already think in archives.
- BT Servant can be taught to construct a zip from URLs at any time (line 88–96).

**The case against zip (v1.2 D-021's frame):**
- Content-addressing works on the structured payload's logical hash, not on zip-byte equality. A zip with same logical contents but different timestamps or member order would hash differently → cache misses on otherwise-identical work.
- Inline text + URL'd binaries lets the Worker hash the payload without materializing multi-MB files into the MCP envelope.
- Schema versioning is cleaner for structured JSON than for opaque archives.
- Schema validation (`schema_version: "1.0"`) is impossible if payload is opaque-zip.

**Resolution path:** Operator decision after weighing diglot/triglot ergonomics vs. content-addressing benefits. **Do not silently change v1.2.** Either (a) v1.2 D-021 stands and Martin's framing becomes a BT-Servant-side concern (the agent assembles a structured payload from whatever input shape the user provides, including zips), or (b) v1.3 reverts to zip-payload and the content-addressing scheme adapts (e.g., normalize-then-hash, or hash the unpacked logical contents).

**Cross-ref:** *challenges* `Session 5 D-021`; *carried forward* as the headline open question for the next spec rev

### O-open-P1-006 — The 3–4 preset templates aren't enumerated
**Priority:** P1 (blocks D-022 implementation)

D-022 commits to 3–4 presets but the conversation didn't specify which. Candidates implied:
- single-column English New Testament
- two-column English New Testament
- some diglot configuration
- single-book quick print

The actual list — including names, what each one's `ptxprint.cfg` body looks like, and which are bundled with the v1.2 deployment — needs operator + Martin specification. Until this is resolved, the hackathon agent has no catalog to pick from.

**Cross-ref:** *resolves to* `H-012` below

### O-open-P2-003 — How does failure-mode info actually get back to BT Servant?
**Priority:** P2 (degrades agent error-recovery loop, not blocking)

D-024 declined a pre-flight validator and said "the log goes back." But what *exactly* goes back?

v1.2 §3 already specifies:
- `log_url` — R2 presigned GET URL for the full log
- `log_tail` — last 100 lines inline in `get_job_status`
- `errors[]` — string array of extracted `^!` TeX errors
- `overfull_count` — number

Question is whether that's enough surface for an agent to reliably recover, or whether richer structured extraction (typed error categories, line-number references, suggested fixes) needs to be added. Empirically determinable on the first hackathon smoke test. If `log_tail` + `errors[]` is sufficient for Claude/BT Servant to self-correct on common failures (missing font, malformed cfg key, bad reference), the surface is enough. If the agent needs more, structure can be added in v1.3.

---

## L — Learnings

### L-009 — Vodka boundary is intuitive to domain experts when articulated, even without canon
Martin reached "the MCP server is stupid; intelligence has to be in the agents" without reading `klappy://canon/principles/vodka-architecture`. The principle isn't a peculiar canon convention — it's how someone with deep domain context naturally describes the right division of labor.

**Pattern:** When a canon principle is reached independently by someone close to the problem, that's signal it's load-bearing rather than prescriptive. Canon should track these convergence points; they're evidence that the rule is real.

**Cross-ref:** *strengthens* `klappy://canon/principles/vodka-architecture` with an external-validation data point

### L-010 — Token-cost intuition vs. reality: 67kb feels big but isn't
The team's in-conversation gut-check on the governance doc's size was off in two directions at once.

**Direct quote (line 410–416):** *"I'm just looking at the size of the scroll bar… this is gonna be an outlandish amount of tokens per it's gonna hit this thing."* → *"67k in the grand scheme of things, if you look at a lot of the stuff that it normally hits regularly, this is a drop in bucket."*

**Real friction wasn't bytes** — it's that a single doc can't be progressively disclosed. The split (D-023) is for retrieval shape, not for size. A 67kb chunk fetched per query when only a 3kb section is needed is the actual cost.

---

## C — Constraints

### C-009 — BT Servant has a latency budget
Downstream agent operating constraint. Surfaces the cost of multi-turn config-construction loops.

**Direct quote (lines 544–548):** *"BT Servant has the burden of latency. Like it can't take you know, four minutes of back and forth of it trying stuff."*

**Implications:**
- For D-022: deterministic preset selection beats iterative governance-driven config construction.
- For O-open-P2-003: the failure→fix loop has to converge in 1–2 retries, not 5–10.
- For canon authoring (D-023, H-011): keep chapters small enough that one search → one chapter → enough context to act.

---

## H — Handoffs

### H-011 — Split `canon/governance/headless-operations.md` into chapter articles + overview map
**Concrete unit of work.** Suggested chapter boundaries from the conversation and from v1.2 §2's "five required articles":

| Proposed chapter | Source section in monolith | Maps to v1.2 §2 |
|---|---|---|
| `canon/articles/payload-construction.md` | (curate from §1, §2 of monolith) | yes |
| `canon/articles/output-naming.md` | output convention section | yes |
| `canon/articles/config-construction.md` | flags + cfg structure sections | yes |
| `canon/articles/font-resolution.md` | font handling section | yes |
| `canon/articles/failure-mode-taxonomy.md` | Part 9 of monolith | yes |
| `canon/articles/file-system-map.md` | file system map section | new |
| `canon/articles/merge-config-handling.md` | merge-chapter / merge-normal / merge-verse content | new |
| `canon/articles/adjlist-format.md` | adjlist syntax | new (already partially in v1.0 spec) |
| `canon/articles/piclist-format.md` | piclist syntax | new |
| `canon/articles/config-inheritance.md` | `[import]` walking | new |
| `canon/governance/headless-operations.md` | becomes overview/map only | reframe |

**Owner:** operator + Martin. The transcript says *"we'll have to do one more pass"* (line 462). This handoff names that pass concretely.

**Critical-path subset (from v1.2 §10):** `payload-construction.md` and `output-naming.md` must exist before the smoke test runs end-to-end.

### H-012 — Specify the 3–4 preset templates for hackathon week
**Owner:** operator + Martin. Decide and document:
1. Which configs ship as built-in presets (names + descriptions).
2. The body of each preset's `ptxprint.cfg`.
3. Where the presets live: bundled with the MCP container? In a separate canon `presets/` directory the agent fetches via oddkit?
4. The agent-facing decision rule for picking among them.

Resolves `O-open-P1-006`. Without this, D-022 is a commitment without a concrete catalog.

### H-013 — Smoke-test the agent loop with Claude before BT Servant
**Direct quote (lines 386–390):** *"May it be interesting to do a quick test at some point to just see if Claude can do this, because BT Servant underneath the hood is just using [Claude]. That's what we should probably do. And Claude consume these documents and then call the CLI correctly."*

Run the full agent loop — read canon → pick preset → construct payload → submit job → poll → handle log on failure — using Claude (this conversational interface or Claude Code) before wiring through BT Servant. Cheaper diagnostic; same underlying model.

**Pre-condition:** at least `payload-construction.md` and `output-naming.md` exist (H-011 critical-path subset), and the v1.2 server is deployed to a workers.dev endpoint.

### H-014 — Resolve O-open-P1-005 (zip vs structured payload) before next spec rev
**Owner:** spec author + Martin. Either ratify v1.2 D-021 with documentation of why structured-payload was chosen over zip (and where the zip-from-PDF UX lives — agent-side, not MCP-side), or revert to zip-payload and revise the content-addressing scheme.

**Trigger:** before any v1.3 draft. If v1.2 ships unchanged through hackathon and zip never bites, the question can stay open. If it does bite (cache misses on logically-identical builds; agent assembly burden too high), this becomes blocking.

---

## Q-open

| ID | Question | Resolution path |
|---|---|---|
| Q-open-12 | Zip-payload vs structured-payload — does v1.2 D-021 stand? | H-014 |
| Q-open-13 | PDF-as-carrier ("make mine like that"): MCP tool or agent-side concern? | Defer to post-hackathon; first observe whether users actually ask for it |
| Q-open-14 | Is `log_tail` + `errors[]` enough for the agent recovery loop, or does failure surface need richer structure? | Empirical — first hackathon smoke test |
| Q-open-15 | Where do preset templates live (bundled in container vs. canon `presets/` vs. separate repo)? | H-012 sub-decision |
| Q-open-16 | Should `get_upload_url` be renamed for clarity, or is `put_url`/`get_url` field naming sufficient? | Document in `payload-construction.md`; rename only if real users still trip over it |

---

## Cross-Reference Summary — Earlier sessions ↔ Session 6

| Earlier session item | Session 6 outcome |
|---|---|
| Session 1 D-002 (English Bibles initial scope) | Reaffirmed; D-022 sharpens to "3–4 English presets" |
| Session 2 D-004 (action-only; canon via oddkit) | **Reinforced externally** — Martin reaches the same conclusion (O-016, L-009) without reading canon |
| Session 2 D-005 (two-step async) | Reaffirmed; not discussed |
| Session 2 D-007 (audience: normal users via conversational agents) | Sharpened by D-022 — for hackathon, normal-user path is preset selection, not free-form config |
| Session 2 L-003 (canon-first, server-second) | **Refined** — canon-first work is *curation* of an existing monolith (D-023, H-011), not from-scratch authoring |
| Session 5 D-021 (structured payload, URLs for binaries) | **CHALLENGED but not overturned** — see O-open-P1-005, H-014 |
| v1.2 §2 (five required canon articles) | **Reframed**: not "author 5 articles" but "split 67kb monolith + add map" — H-011 |
| v1.2 §9 DoD item 2 (agent constructs payload from canon) | **Rescoped** by D-022 to "agent picks from 3–4 presets" for hackathon; canon-driven construction is the stretch goal |
| v1.2 §10 critical-path canon articles | Confirmed scope; H-011 names the curation work that produces them |
| v1.2 §3 `get_job_status.log_tail` / `errors[]` | **Validated as the recovery channel** by D-024 (no separate validator); empirical adequacy is Q-open-14 |
| Session 1 H-002 (gap-analyze ESE against first-pass MCP) | **Closed-by-extension**: the gap is now actionable as H-011, H-012, H-013 |

---

*End of session 6 encoding. Companion artifact: the existing `ptxprint-mcp-v1.2-spec.md` requires a follow-up rev addressing O-open-P1-005 (zip vs structured payload) and a §10 update to reflect the hackathon scope reduction in D-022. This encoding is the input to that rev, not the rev itself — per `klappy://canon/principles/contract-governs-handoff-drift`, canon (the spec) wins when this encoding and canon disagree; this encoding's role is to surface the disagreements, not silently resolve them.*
