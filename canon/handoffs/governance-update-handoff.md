---
title: "Governance Update Handoff — Aligning the Headless KB with v1.2"
audience: operator
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "governance", "handoff", "v1.2-alignment"]
created_at: 2026-04-28T03:45:00Z
companion_to: "ptxprint-mcp-v1.2-spec.md"
target_document: "PTXprint Headless Operations — Knowledge Base for AI Agents and Assistants (the document the operator extracted from the deck PDF)"
---

# Governance Update Handoff — Aligning the Headless KB with v1.2

> **What this document is.** A specific set of edits to apply to the headless operations governance document so it speaks v1.2's stateless build-system architecture instead of v1.0/v1.1's filesystem-edit-in-place model. Most of the governance survives untouched; the changes are surgical. Estimated effort: 30–60 minutes for a careful pass, faster if delegated to another session with this document as input.

> **How to use this.** Apply edits in the order listed. Each edit names the section, the change, and a suggested replacement (where text is being added or modified). Sections not mentioned do not need changes.

---

## Pre-edit: framing changes for the document as a whole

### Add to the front matter / opening summary

Current framing positions the agent as one that edits files in a project tree on disk. v1.2's framing is that the agent **constructs payloads** and **submits jobs** to a stateless build system, with project state managed elsewhere.

**Suggested addition near the top of the doc** (e.g. as a new paragraph in the opening blockquote section):

> **Architecture context.** The PTXprint MCP server is a stateless content-addressed build system. The agent does not edit files inside a sandboxed project tree on the server — it reads project state from wherever the user keeps it (Claude Desktop's filesystem access, Git, DBL, the user's Paratext server) and constructs a payload describing one typesetting job. The payload is submitted to the server, which dispatches it to an ephemeral worker container that materializes the inputs, runs PTXprint, and uploads the PDF to R2. The agent receives a job_id and polls for status.
>
> Iterative editing in this model means re-submitting an updated payload, not editing files in place. Each typesetting run is fully reproducible from its payload; outputs are content-addressed by sha256 of the payload, so re-submitting an unchanged build returns the cached result for free.

---

## Part 0 — The Headless Operating Contract

### Edit 0.1 — Replace the "What 'headless' means here" subsection

**Find:** the paragraph beginning *"A headless PTXprint run is a subprocess invocation that takes a project directory plus a named configuration plus optional book and setting overrides..."*

**Replace with:**

> A headless PTXprint run from the agent's perspective is a job submission. The agent constructs a payload containing the configuration files (inline text), URLs for the binary inputs (USFM source, fonts, figures), and the books to typeset. The payload is submitted via `submit_typeset` and returns a job_id immediately. An ephemeral Cloudflare Container worker picks up the job, materializes a working directory from the payload, runs PTXprint, and uploads the resulting PDF to R2. The agent polls `get_job_status` to track progress and retrieve the result URL.

### Edit 0.2 — Update the inputs/outputs table

**Find:** the table with `Inputs / Inputs (optional) / Outputs (success) / Outputs (failure) / Side effects` rows.

**Replace with:**

| Inputs | A payload (see §X for schema) containing: project_id, config_name, books, mode (simple\|autofill), inline `config_files` (cfg, sty, changes.txt, FRTlocal.sfm, AdjLists, piclist, override files), and URL+sha256 references to USFM sources, fonts, and figures |
| Outputs (success) | A presigned R2 URL to a PDF at `outputs/<payload_hash>/<PRJ>_<Config>_<bks>_ptxp.pdf` plus a presigned URL to the corresponding XeTeX log |
| Outputs (failure) | A `failure_mode: hard \| soft` classification, a log_tail, an `errors` list, and (if soft failure) a presigned URL to the degraded PDF |
| Side effects | None on the agent's side. Worker scratch dir is wiped when the Container sleeps. R2 outputs persist per the configured retention policy. |

### Edit 0.3 — The "Three failure modes" subsection survives intact

No changes needed. The hard/soft/success taxonomy is exactly what `get_job_status.failure_mode` carries.

### Edit 0.4 — Replace the "What headless cannot do that the GUI can" introduction

The list of GUI-only features is still accurate, but the substitutes need updating since file edits no longer happen on a server-side filesystem.

**Find:** *"The agent's substitute is to write AdjList files (see Part 7)"* and similar phrases.

**Replace each occurrence with:** *"The agent's substitute is to include the AdjList content as part of the payload's `config_files` map at the appropriate relative path."*

Apply the same pattern to the piclist and FRTlocal.sfm references — they all become payload inclusions, not direct file writes.

### Edit 0.5 — Update "Where this knowledge lives at runtime"

The escalation ladder is still right, but step 3 references a `describe_setting` tool that doesn't exist in v1.2.

**Find:** *"If the MCP server exposes a `describe_setting` tool, query it for the running tooltip and the cfg-key mapping."*

**Replace with:** *"Search canon for the cfg-key mapping (the tooltip dump is canon-seeded). If the operator has exposed the running tooltip dump as a separate canon document, retrieve that for authoritative current-version info."*

---

## Part 1 — The CLI Reference

### Edit 1.1 — Reframe as "what the worker invokes," not "what the agent invokes"

**Find:** the section heading *"## Part 1 — The CLI Reference"* and its introductory framing.

**Insert at the top of the section:**

> **In v1.2, the agent does not invoke this CLI directly.** The Container worker invokes it on behalf of the agent's submitted payload. This reference is here because the payload's `define`, `books`, `config_name`, and `project_id` fields map directly to PTXprint's CLI flags, and understanding the CLI surface helps the agent construct payloads that will work.

The rest of Part 1 (flag reference, exit codes, `-D` mechanism) survives intact.

### Edit 1.2 — Update the "When to use `-D` instead of writing to `ptxprint.cfg`" subsection

The dichotomy "use -D vs write to cfg" is now "use the payload's `define` field vs include the override in `config_files`." Same trade-off, different mechanics.

**Replace the entire subsection** with:

> **When to use the payload's `define` field:**
> - The override is for this run only (e.g., "produce a draft with 13pt spacing" without changing the working ptxprint.cfg state)
> - The user is exploring options and the agent doesn't want to mutate the working config
> - The run is parameterised (quarterly auto-generation with rotating output formats)
>
> **When to include the change in `config_files["shared/ptxprint/<config>/ptxprint.cfg"]`:**
> - The change should persist across iterations (the agent updates its working config state and includes the new content in subsequent payloads)
> - The user is committing to a finalised configuration
> - The change is part of a config the user will eventually push back to their project store (Git / Paratext / wherever they keep it)

### Edit 1.3 — Drop the "subprocess vs Python module" subsection

The v1.2 Container uses subprocess invocation as a settled implementation detail. The trade-off discussion is no longer agent-relevant.

**Action:** delete the subsection *"### The relationship to the Python module"* through the end of Part 1.

---

## Part 2 — File System Map

### Edit 2.1 — Reframe as "what the worker materializes," not "what the agent navigates"

**Insert at the top of Part 2:**

> **In v1.2, this filesystem layout is what the Container worker materializes inside its scratch directory before running PTXprint.** The agent does not see this tree; it sees the payload (described in Part X). The `config_files` map keys map directly to relative paths in this tree; the `sources` array entries become USFM files at appropriate locations; the `fonts` and `figures` arrays populate the worker's font and image directories. Understanding this layout helps the agent choose correct relative-path keys when constructing the payload's `config_files` map.

### Edit 2.2 — Drop the "What the agent reads vs. writes" subsection

This entire subsection assumes filesystem access. **Action:** delete the subsection.

**Replace with a new subsection:**

> ### What the agent constructs in the payload
>
> The agent's reasoning surface for "what files matter" maps onto payload slots:
>
> - **`config_files`** map (inline text):
>   - `shared/ptxprint/<config>/ptxprint.cfg` — primary settings
>   - `shared/ptxprint/<config>/ptxprint.sty` — config-level stylesheet
>   - `shared/ptxprint/<config>/ptxprint-mods.sty` — additional style mods (optional)
>   - `shared/ptxprint/<config>/changes.txt` — config-level USFM transforms (optional)
>   - `shared/ptxprint/<config>/FRTlocal.sfm` — front matter content (optional)
>   - `shared/ptxprint/<config>/<PRJ>-<config>.piclist` — picture placements (optional)
>   - `shared/ptxprint/<config>/AdjLists/<num><BOOK><PRJ>-<config>.SFM.adj` — paragraph adjustments (optional, one per book that has adjustments)
>   - `shared/ptxprint/ptxprint_project.cfg` — project-level overrides (optional, see Part 4)
>   - `shared/ptxprint/<config>/ptxprint_override.cfg` — config-level overrides (optional, see Part 4)
> - **`sources`** array (URL + sha256): one entry per book being typeset
> - **`fonts`** array (URL + sha256): one entry per font file the project references
> - **`figures`** array (URL + sha256, optional): one entry per image file referenced by the piclist

### Edit 2.3 — Update the output-filename-convention paragraph

The convention itself is unchanged. The paragraph just needs a reframing of where the file appears.

**Find:** *"The agent can predict the output path before running by reading `[project] bookscope`..."*

**Replace with:**

> The PDF output appears at `r2://ptxprint-outputs/<payload_hash>/<PRJ>_<Config>_<bks>_ptxp.pdf` where `<payload_hash>` is the sha256 of the canonical payload. The Worker returns a presigned URL to this path. `submit_typeset` also returns a `predicted_pdf_url` field synchronously when the payload is submitted, computed before the typeset job runs — the agent can use it to construct download links in advance.

---

## Part 3 — The Configuration Model

### Edit 3.1 — Section preamble update

**Insert at the top of Part 3:**

> **In v1.2, the agent reads existing configs from project state (wherever the user keeps it) and writes the resulting cfg content into the payload's `config_files` map at the right relative-path key. There is no edit-in-place against the server.**

### Edit 3.2 — The inheritance subsection — flag a change in agent responsibility

**Find:** the *"### Config inheritance: the [import] section"* subsection.

**Replace the "Implications for the agent" sub-bullets** with:

> Implications for the agent in v1.2:
>
> - The agent walks the inheritance chain itself before constructing the payload. Canon's `config-construction.md` article describes the algorithm.
> - The agent decides whether to include only the child config in the payload's `config_files` (relying on the worker to walk inheritance just like the GUI would) or whether to flatten the chain and include only the merged result. **Recommended: include the chain explicitly.** The worker materializes parent configs at their expected paths and PTXprint resolves the inheritance the way it always does. This preserves the user's intent and makes the payload roundtrip-able to a real project tree.
> - There is no `resolve_config` server tool. If the agent needs effective settings for reasoning, it computes them from the payload's `config_files` content (or from project state before payload construction).

### Edit 3.3 — "Creating a new config" subsection

**Find:** the four-step list under *"### Creating a new config"*.

**Replace with:**

> Creating a new config in v1.2 is an agent-side operation against project state, not a server operation:
>
> 1. The agent updates its working representation of the project to include a new config folder under `shared/ptxprint/<NewName>/`.
> 2. The agent writes a minimal `ptxprint.cfg` for the new config: only `[config] name = NewName` and `[import] config = Default` (or whichever parent makes sense).
> 3. When the user wants to typeset using the new config, the agent constructs a payload with `config_name = "NewName"` and includes both the new config's files and the parent config's files in `config_files` (so inheritance resolves correctly inside the worker).
> 4. After successful typesetting, the agent persists the new config back to project state (Git commit, file write via Claude Desktop, etc.) so it's available next session.

The "Avoid" list survives intact.

### Edit 3.4 — "When a config is 'ready to share'" subsection survives intact

No changes. The checklist is agent-layer governance independent of architecture.

---

## Part 4 — The Override Mechanism

### Edit 4.1 — Survives almost intact, with one reframing

The semantics of override files are unchanged in v1.2. The agent still must respect them when constructing payloads.

**Insert at the top of Part 4:**

> **In v1.2, override files are part of the payload.** When the agent's payload includes `shared/ptxprint/ptxprint_project.cfg` in `config_files`, the worker materializes it and PTXprint applies it as it always does. The override semantics described in this section are unchanged. The agent's responsibility shifts from "check override files on disk before writing" to "check override files in the payload (and in project state) before changing a setting in the payload's main config."

### Edit 4.2 — Failure modes list update

**Find the three failure modes** (silent override / breaking cluster lockdown / orphaned override).

**Update Failure Mode 1's mitigation** to read:

> **Mitigation:** Before adding a setting to the payload's `config_files["shared/ptxprint/<config>/ptxprint.cfg"]`, check both override files in project state. If the key is locked there, surface that to the user: "I'm about to set `[paper] pagesize = A5`, but the project-level override at `ptxprint_project.cfg` has it locked to `Letter`. To change it for real, I'd need to update the override file too. Do you want me to?"

**Update Failure Mode 2's mitigation** to read:

> **Mitigation:** Treat override files as administrator-controlled. The agent must not modify them in project state — and therefore must not include modified versions in the payload — without explicit user confirmation, with cluster propagation implications spelled out.

**Failure Mode 3 is about orphaned overrides** — adapt the mitigation to apply to project state rather than disk reads. Otherwise unchanged.

### Edit 4.3 — Authoring override files subsection

The pattern is the same; the storage moves from disk to project-state-and-payload.

**Light edit:** replace "Headlessly the agent does the same: read the relevant section..." with "The agent does the same: read the relevant section of the working `ptxprint.cfg`, extract the keys to lock, write a new override file at the appropriate path in project state, and include both the modified main cfg and the new override file in subsequent payloads."

---

## Part 5 — Settings Cookbook (by user intent)

**No structural changes needed.** The cookbook is intent-keyed and architecture-neutral. The only edit is in the "Hide / show pictures globally" entry, which currently reads:

> Use the `-D` flag for run-time

**Update to:**

> Use the payload's `define` field for run-time-only override (`define: { "c_fighiderefs": "True" }`). For per-picture control, modify the piclist content in `config_files`.

That's the only intent that explicitly references CLI mechanics.

---

## Part 6 — Supporting Files

### Edit 6.1 — Reframe each file's "lives at" line

Throughout Part 6, each supporting-file subsection has a "Lives at: `<path>`" line. These are correct as descriptions of the project tree shape, but they need a clarifying note that the agent constructs them as payload entries.

**Insert at the top of Part 6 (before the "changes.txt" subsection):**

> **In v1.2, the file paths described below are not paths the agent writes to on the server. They are relative-path keys in the payload's `config_files` map. The worker materializes these files at the corresponding paths in its scratch dir before running PTXprint. The agent reads the existing content from project state, modifies it as needed, and includes the new content in the next payload submission.**

### Edit 6.2 — `changes.txt` subsection survives intact

The five-scope grammar (global / book-restricted / chapter / verse / environment / combined) is unchanged.

### Edit 6.3 — `ptxprint.sty` and AdjLists subsections survive intact

Format descriptions unchanged. The "When to edit" / "When NOT to edit" sub-lists survive but interpret "edit" as "modify in project state and include in payload."

### Edit 6.4 — Piclist subsection — drop the MCP-tool reference

**Find:** *"The MCP server's `set_piclist` tool parses and writes these."*

**Replace with:** *"The agent constructs the piclist content as text and includes it in the payload's `config_files` at the appropriate path. Canon's `payload-construction.md` documents the line format with examples."*

### Edit 6.5 — `FRTlocal.sfm` subsection survives intact

The three modes (Basic / Advanced / Paratext copy) and the special PTXprint codes are all about content, not transport.

### Edit 6.6 — Cover periphs subsection survives intact

The four periph IDs (coverback / coverfront / coverspine / coverwhole) are content; the agent constructs them in `FRTlocal.sfm` content and includes that in the payload.

---

## Part 7 — USFM in Headless Context

**No changes.** This section is pure USFM reference material. Architecture-neutral.

---

## Part 8 — Workflow Recipes

Each recipe needs cosmetic edits to replace "edit file, re-run" mechanics with "update payload, re-submit" mechanics. Keep the recipes' structure and decision logic.

### Edit 8.1 — Recipe: "Help me create a draft PDF for review"

**Find step 4** in the recipe: *"Run: ptxprint -P <prj> -c Default -b "<book>" -D output_format=Screen-Quickest"*

**Replace with:**

> 4. Construct payload with project_id, config_name="Default", books=[<book>], mode="simple", define={"output_format": "Screen-Quickest"}. Submit via `submit_typeset`. Receive job_id.
> 5. Poll `get_job_status` until state in {succeeded, failed}.
> 6. Read the log_tail and the errors list for warnings.
> 7. Surface the pdf_url to the user, plus any non-trivial warnings.

(Renumber subsequent steps accordingly.)

### Edit 8.2 — Recipe: "Create a print-ready New Testament"

Apply the same transformation: replace direct CLI invocation with payload construction + submission + polling.

### Edit 8.3 — Recipe: "Modify a single setting and re-run"

This is the recipe most affected by the architectural change. Rewrite:

> **Context:** User wants to change one thing in an existing config and see the result.
>
> 1. Read the current value of the setting from project state (or from the working payload state if the agent has been iterating).
> 2. Surface: "Current value is X. You want to change to Y?" If unclear, ask.
> 3. Check both override files (in project state and/or working state) for this key. If locked, surface that and stop.
> 4. Update the working `ptxprint.cfg` content — either modify project state (write to disk via Claude Desktop file access, or stage in working memory).
> 5. Construct a new payload with the updated `config_files` content. Submit.
> 6. Poll for completion. Receive new pdf_url.
> 7. Surface the change visually (compare against previous pdf_url, if available) or numerically (page count delta, overfull count delta).

For exploratory changes, use the payload's `define` field instead of mutating `config_files["...ptxprint.cfg"]` — preserves the saved state.

### Edit 8.4 — Recipe: "Set up a diglot publication"

Steps 1–9 are agent-side reasoning about which configs and projects to use. The architectural change only affects step 10 ("Iterate") — make explicit that iteration means submitting new payloads.

### Edit 8.5 — Recipe: "Lock down house style for a cluster"

This recipe is about modifying override files in project state. The mechanics are: agent updates project state → agent persists back to the user's storage (Git, Paratext, etc.) → user runs Send/Receive. The MCP server is not involved in the lock-down step. The recipe survives with one clarifying sentence:

**Insert at the top of the recipe:** *"Note: this recipe operates on project state (the user's filesystem, Git, Paratext server, etc.), not on the typesetting MCP server. The MCP server only sees the resulting payloads at typesetting time."*

### Edit 8.6 — Recipe: "Diagnose 'PDF was produced but pictures are missing'"

The seven-point checklist is correct as-is. Only the "search paths" item needs adapting — in v1.2, the worker's search path is whatever the worker materializes from the payload's `figures` array.

**Replace step 2** of the checklist:

> 2. Are the picture files in the payload's `figures` array, with valid URLs and matching sha256 hashes?
>    → Inspect the payload (the agent has the working copy). Verify that the figures referenced by the piclist are present in the array and that their URLs return content matching the declared hashes.

The other steps survive.

### Edit 8.7 — Recipe: "Recover from 'I can't make this setting change take effect'"

Steps 1–4 are decision logic about override files and inheritance. Adapt step 1 to "Confirm the cfg key was actually changed in the payload that was submitted. Read it back from the working payload."

---

## Part 9 — Diagnostic Patterns

### Edit 9.1 — Reframe "Reading the XeTeX log"

**Find:** *"The log lives at `<project>/local/ptxprint/<Config>/<PRJ>_<Config>_<bks>_ptxp.log`."*

**Replace with:** *"The log is uploaded to R2 alongside the PDF and surfaced via `get_job_status.log_url` (presigned R2 URL) or trimmed to the last 100 lines in `get_job_status.log_tail`. For long jobs, use `log_tail` for incremental visibility during the run; fetch the full log via `log_url` after completion."*

### Edit 9.2 — Distinguishing failure modes table

The truth table is correct. Add one row at the top noting that v1.2 surfaces this directly:

> **In v1.2, `get_job_status.failure_mode` carries the classification result (one of `hard | soft | success`). The truth table below describes how that field is computed inside the worker; the agent reads the field directly without re-deriving.**

### Edit 9.3 — "Overfull box count" subsection survives intact

The thresholds (< 20 excellent, 20–50 normal, etc.) are surfaced via `get_job_status.overfull_count`. Architecture-neutral.

---

## Part 10 — Conversational Patterns

**No changes.** This entire section is about the user-facing rhythm of conversation. Architecture-neutral.

---

## Part 11 — Settings That Need Special Handling

### Edit 11.1 — "Test before committing" subsection

**Find:** *"Make the change as a `-D` runtime override or in a copy of the config."*

**Replace with:** *"Make the change as a payload `define` field (transient) or by including a modified `ptxprint.cfg` in the payload (mutating only the working state, not yet persisted to project storage). Submit and observe."*

### Edit 11.2 — "Rollback patterns" subsection

The `.bak` file mechanism is irrelevant in v1.2. Replace the entire subsection:

> ### Rollback patterns
>
> Every payload submission produces a content-addressed result in R2. The agent maintains a small history of submitted payloads (in working memory or persisted, depending on the host environment). To roll back: re-submit the prior payload. The cached output URL returns immediately — no re-run.
>
> For changes that span multiple files, the rollback unit is the payload, not individual files. Maintaining payload history is the agent's responsibility; canon's `payload-construction.md` recommends keeping the last N payloads keyed by user-meaningful labels ("before-margin-change", "v1-final", etc.).

---

## Part 12 — Open Gaps in This KB

### Edit 12.1 — Drop items 1, 4, 5, 7

Item 1 (widget-identifier names for `-D` overrides) — survives.
Item 2 (400+ settings catalog) — survives.
Item 3 (PTXprint USFM extensions) — survives.
Item 4 (picture catalogue download workflows) — adapt: in v1.2, the agent uses LFF-equivalent or other URL-providing mechanisms to source images, then references them by URL in the payload's `figures` array. Update the gap statement accordingly.
Item 5 (cover wizard equivalents) — adapt: agent constructs cover periphs in `FRTlocal.sfm` content and includes in payload.
Item 6 (TeX macro injection) — survives, deferred.
Item 7 (validation surface) — adapt: in v1.2, the worker performs the structural checks (per failure-mode taxonomy). The agent receives the classification.
Item 8 (diglot two-config concurrency) — survives.

### Edit 12.2 — Add new gaps to track

> 9. **Project state read/write mechanism.** The agent needs read/write access to the user's project storage (filesystem, Git, Paratext server, etc.) but the typesetting MCP does not provide it. For Claude Desktop users with native filesystem access, this is implicit. For other agent hosts, a separate mechanism is required and must be documented per host.
> 10. **Payload history persistence.** Whether the agent maintains payload history in volatile memory (current session only), persistent agent state, or external storage (Git, R2 itself, etc.) — and how to surface that history to the user for rollback purposes.
> 11. **Cache hit observability.** Whether the agent should distinguish "this PDF was just generated" from "this PDF was returned from cache" in user-facing messaging. Currently `submit_typeset` returns a `cached: bool` flag; canon should describe when to surface it.

---

## Provenance update

### Edit P.1 — Update the source materials list

**Find:** the *"Source materials"* line at the bottom of the document.

**Replace with:** *"Source materials: `ptxprint-master-slides.surface.json`, `ptx2pdf.surface.json`, `transcript-encoded.md` (sessions 1–5), `ptxprint-mcp-v1.2-spec.md`, the operator's PDF deck extraction. Updated 2026-04-28 to align with v1.2 stateless architecture."*

---

## Final pass: search for stale references

After applying the edits above, search the document for these strings and verify each occurrence has been addressed:

- `read_file` — should not appear except in historical/comparative context
- `write_file` — same
- `set_config_values` — same
- `set_piclist` — same
- `resolve_config` — same
- `predict_output_paths` — same
- `get_config` — same
- `describe_setting` — same
- `.bak` — same
- `<projects_root>` (when describing where the agent operates) — should be reframed as "payload" or "project state"

If any of these remain in unintended places, update them per the patterns established above.

---

*End of governance update handoff. Apply these edits in order; the doc should be coherent at any point during the pass (each edit is local). Estimated effort: 30–60 minutes for a careful single-session pass.*
