---
title: "PTXprint MCP Server — Transcript Encoding (2026-04-27)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "transcript", "dolceho"]
source_artifact: "1777320589398_2026-04-27-convo-A_detailed_look_at_the_config_file_revealed_its_400_setting.txt"
source_lines: 467
encoded_at: 2026-04-27T20:17:55.816Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
---

# PTXprint MCP Server — Transcript Encoding

> Source: 467-line conversation transcript dated 2026-04-27, multi-speaker, attribution unavailable. Encoded via `oddkit_encode` (batch mode, 15 artifacts). All quotes are SME or operator words from the transcript; inferences are labeled.

---

## D — Decisions

### D-001 — Headless CLI is the agentic surface
The PTXprint MCP server will be built around the headless CLI invocation path, not the GUI.

**Rationale (from SME, lines 220–228):** "all the headless does is read the configuration and hit print basically… it's a command line option it goes and says this is directory, it reads the stuff in and then us hits print without pulling in any GUI code whatsoever." A Docker file already exists for the headless version (line 282). GUI install is painful; headless is deployable.

### D-002 — Initial scope is English Bibles (BSB / ULT / UST)
First-iteration target is English Bibles to bypass the multi-script font logistics problem.

**Rationale (operator, lines 292–294):** "I say we start with doing an English Bible like BSB and ULT, US T and then we know we can scale it with the other fonts."

### D-003 — Two-phase agent direction: data first, code second
Project instructions for the building agent were directed in two phases: (1) "look at 150 projects and learn from the configurations"; (2) "go look at the code."

**Rationale (operator, lines 36–46):** Configuration patterns were the easier surface to learn from before the code itself.

---

## O — Observations (closed)

### O-001 — A first-pass MCP server already exists, runs, but does not yet emit PDFs
The MCP server is invokable from LM Studio with Gemma. It exposes the project / config / override concepts and is "doing some stuff" but no PDF has been produced yet. The validation surface (does a PDF actually come out?) is the open gap.

**SME quote (line 58):** "Validation is always the hardest part."

### O-002 — Canonical project shape: directory + two load-bearing files
A PTXprint project is a directory containing everything PTXprint needs. The two files that matter are `ptxprint.cfg` (the main config, ~400 settings) and `ptxprint.sty` (style overrides on the USFM defaults). Multiple named configurations can coexist in one project (`default`, `cover`, etc.). `default` is the actual default; `cover` originated for cover generation but is now used more broadly as a layout variant.

**SME quotes (lines 164–168, 192):** "this is directory contains everything you need for PTX print to print headers… the only two files you really need to know about are ptxprint.config and ptxprint.sty." "cover is like a default, but it also produces a cover."

### O-003 — Runtime introspection mode maps every UI control to a config setting (high-value lens)
PTXprint can be launched with a CLI flag (operator recalled `-I` or similar) that surfaces, for every UI control, a tooltip, an ID, and the corresponding config setting name. This is the highest-value lens for mapping the 400-setting config space because GUI labels are the human-facing names that documentation may otherwise lack.

**SME quote (lines 248–254):** "if you run PTX print you can run PTX print in a way that pretty much every control has a tooltip on it and every element of the UI has an ID and also a corresponding config setting… If you run it with this I option it'll show it to you and hover and goes oh that's that and that's that."

### O-004 — Test projects already live in-repo
There are test projects committed to `sillsdev/ptx2pdf` along with a README. The `cover` configuration was used as a walked example; it includes the cover generator originally tied to Bible layouts, now used more broadly.

**SME quotes (lines 134–142, 160):** "even the test projects that are on the repository… there's a few. And the README file afterwards, which you can build on."

---

## O-open — Observations still open

### O-open-P1-001 — Field-level documentation for ptxprint.cfg is incomplete
**Priority:** P1 (blocks meaningful agent-driven overrides)

**SME quote (line 246):** "We don't have every field documented."

The 400-setting config is the dominant friction surface. An agent setting fields it doesn't understand will produce nondeterministic output. Mitigation candidates surfaced in the conversation: the runtime introspection flag (O-003), generating a template config with empty/default fields (line 242), and learning from the ~150 existing projects' configurations (D-003).

### O-open-P1-002 — Font dependency management is unresolved for headless deployment
**Priority:** P1 (binary blocker between local and container deployment)

**SME quote (line 286–288):** "make sure you got the right fonts. You've got the right font files that you need or any image files you need or everything you need to actually do the typesetting but the big one is the fonts."

Without the right font files present in the container, typesetting fails. The English-only initial scope (D-002) defers but does not eliminate this.

### O-open-P2-001 — Cloudflare deployment target is named but unconfirmed
**Priority:** P2 (deployment shape, not blocking design)

**Operator quote (line 284):** "we get that accessible to Cloudflare with its what's their Docker container service for the call. Sandbox or the the code sandboxes."

No commitment to a specific Cloudflare product yet (Containers, Sandbox, Workers, etc.).

---

## L — Learnings

### L-001 — ESE is the operator's pattern for artifacts that resist single-pass extraction
When LLMs don't parse an artifact efficiently in one pass, the operator's pattern is to define a set of lenses and run multiple targeted passes — not to throw the artifact at the model repeatedly. Named in conversation as "Epistemic Surface Extraction (ESE)."

**Operator quote (lines 258–260):** "epistemic surface extraction is a term I I and Claude made up… so basically give it a set of lenses and make all of your passes you need to to extract out this type of information."

**Canon reference:** `klappy://canon/epistemic-surface-extraction` — already promoted to canon, modality list focuses on non-text artifacts (screenshots, audio, video, PDF slides). Spirit applies to text artifacts (e.g., a code repo) but the modality is unspecified there; this work extends the pattern to `code_repository` modality with explicit notation.

### L-002 — Current model-selection practice for the building agent
Opus for thinking/planning; Sonnet for coding execution (faster); Sonnet or GPT Codex for evaluation/bug-finding. This was a refinement from earlier Opus-everywhere practice.

**Operator quotes (lines 74–84):** "I always use Opus to do the thinking. Um I'm actually finding Sonnet to do the coding is actually faster… Sonnet or Codex, GPT Codex. Um those are good models for evaluating and um doing like looking for bugs."

---

## C — Constraints

### C-001 — The MCP server respects the headless contract
Input: a project directory + a chosen configuration name (with optional overrides). Output: a PDF, or a failure with a legible reason. Anything requiring GUI interaction is out of scope for the agentic surface.

### C-002 — Fixtures come from the in-repo test corpus
The MCP server's test fixtures and the agent's "learn from configurations" discovery phase should be sourced from `sillsdev/ptx2pdf` test projects — not a parallel dataset.

---

## H — Handoffs

### H-001 — Perform ESE on sillsdev/ptx2pdf next
Lenses must include at minimum: headless invocation, project directory shape, `ptxprint.cfg` schema (best-effort given incomplete docs), `ptxprint.sty` schema, USFM / font / image inputs, output paths, failure modes, test fixtures, Docker deployment.

**Companion deliverable:** `ptx2pdf.surface.json` + `ptx2pdf.surface.md` (this session produces both).

### H-002 — Gap-analyze ESE against the existing first-pass MCP server
Once the surface exists, the next planning step is to identify whether the missing-PDF symptom (O-001) is a tool-surface gap (server doesn't actually invoke render), a font/runtime gap (O-open-P1-002), or a config-completion gap (O-open-P1-001).
