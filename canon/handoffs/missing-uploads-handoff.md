---
title: "Session Handoffs — Upload Prompts for Other Claude Sessions"
audience: operator
exposure: working
voice: instructional
stability: working
tags: ["handoff", "uploads", "session-prompts", "v1.2-bootstrap"]
canonical_status: non_canonical
created_at: 2026-04-28T04:30:00Z
companion_to: "canon/PENDING_UPLOADS.md"
---

# Session Handoffs — Upload Prompts

> **✅ Prompts A and B resolved 2026-04-28.** All target files are in the repo: slides ESE surfaces (`canon/surfaces/ptxprint-master-slides.surface.md/.json`), training manual (`canon/derivatives/ptxprint-training-manual.md`), governance Parts 0–12 + Provenance (`canon/governance/headless-operations.md`), session-3 encoding (`canon/encodings/transcript-encoded-session-3.md`), and the font-resolution-design article (now archived per v1.2 D-021 at `canon/articles/_archive/font-resolution-design.md`). Prompt C was contingent on Prompt A failing and is also moot. This document is retained as a historical record of the bootstrap upload coordination; **do not re-paste any prompt**. (See `canon/handoffs/documentation-cleanup-handoff.md` §3 P0.2 for context.)

> **What this document is.** Three copy-pasteable prompts, one per Claude session that holds files the bootstrap session didn't have access to. Each prompt is self-contained: paste it into the relevant session's chat (or open a new conversation in that session's project) and the receiving Claude will know what to do, where to put the files, and how to push. Companion: [`PENDING_UPLOADS.md`](../PENDING_UPLOADS.md) (the inventory).

> **How to use.** Identify which session holds which files (see PENDING_UPLOADS.md for context). Open that session's chat. Paste the corresponding prompt below verbatim. Wait for the session to confirm it has the files and execute the upload.

---

## Prompt A — For the Slides ESE / Training Manual session

> **Context for the operator before pasting:** This is the session in which Claude ran ESE on the 438-slide PTXprint MASTER SLIDES deck and authored the training-manual derivative. Per `canon/PENDING_UPLOADS.md`, that session also received the operator's PDF extraction of the deck which became the headless-operations governance document. The chat URL noted in session-1's transcript is `claude.ai/chat/fddce82c-e7f8-4c20-9882-b4c4152aa4f6` — verify before pasting in case the operator has the artifacts in a different session.

```
=== PASTE BELOW THIS LINE ===

You ran ESE on the PTXprint MASTER SLIDES deck and authored a training-manual derivative in this conversation. You should have the following files in your context or outputs:

1. ptxprint-master-slides.surface.md
2. ptxprint-master-slides.surface.json
3. ptxprint-training-manual.md
4. The operator-authored "PTXprint Headless Operations" governance document (extracted from the PDF deck) — full text including Parts 0 through 12 plus Provenance

A new public repo has been bootstrapped at https://github.com/klappy/ptxprint-mcp to hold both the MCP server code and the governance KB. The bootstrap session did not have direct access to your files. Your job is to upload them.

**Target paths in the repo:**
- canon/surfaces/ptxprint-master-slides.surface.md
- canon/surfaces/ptxprint-master-slides.surface.json
- canon/derivatives/ptxprint-training-manual.md   (create canon/derivatives/ if not present)
- canon/governance/headless-operations.md         (REPLACE the existing partial file — Parts 0-2 are already there but Parts 3-12 + Provenance are missing)

**For headless-operations.md specifically:**
The existing file in the repo has:
- A frontmatter block (preserve verbatim — including the status_note field)
- A top-of-file STATUS note as a blockquote (preserve verbatim)
- The full text of Parts 0, 1, and 2 (preserve verbatim)
- A placeholder section "## Parts 3–12" with a description of what's missing (REPLACE with the actual Parts 3-12 + Provenance)

After your replacement, the file should have: frontmatter + STATUS note + Parts 0 through 12 + Provenance, all from the operator's source document. Do not modify Parts 0-2 — they were reproduced from the operator's original. Just append Parts 3-12 + Provenance in place of the placeholder.

**Procedure:**

1. Verify you have all four files. If you don't have one or more, say so and stop — the operator will route to a different session.

2. Read canon/PENDING_UPLOADS.md from the repo for additional context (use web_fetch on the raw GitHub URL if your environment supports it):
   https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/canon/PENDING_UPLOADS.md

3. Read the existing canon/governance/headless-operations.md to understand its current shape:
   https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/canon/governance/headless-operations.md

4. Authenticate with the GitHub PAT from your project instructions (the same PAT that bootstrapped the repo — fine-grained, scoped to klappy/ptxprint-mcp with contents + PRs).

5. Clone the repo and place the files:
   git clone https://${GH_PAT}@github.com/klappy/ptxprint-mcp.git
   cd ptxprint-mcp
   mkdir -p canon/derivatives
   # Place ptxprint-master-slides.surface.{md,json} in canon/surfaces/
   # Place ptxprint-training-manual.md in canon/derivatives/
   # Open canon/governance/headless-operations.md, replace the Parts 3-12 placeholder with the full authored text
   git add canon/surfaces/ptxprint-master-slides.surface.md \
           canon/surfaces/ptxprint-master-slides.surface.json \
           canon/derivatives/ptxprint-training-manual.md \
           canon/governance/headless-operations.md
   git commit -m "uploads: slides ESE surface + training manual; complete governance Parts 3-12 + Provenance"
   git push origin main

6. Update canon/PENDING_UPLOADS.md to remove the entries you just resolved (sections 1, 3 — and item 4 of the status table). Commit and push that change separately:
   git commit -am "PENDING_UPLOADS: remove resolved entries (slides ESE, training manual, governance Parts 3-12)"
   git push origin main

7. Report back: list the four files uploaded with sizes, confirm both commits pushed, and surface any deviations from the procedure (e.g. files missing from your context, paths that needed adjustment).

Mode discipline: this is execution mode. Don't ask clarifying questions about which files or where — they're specified above. If something is genuinely missing or contradictory, name the specific gap in one sentence and stop; do not infer.

=== PASTE ABOVE THIS LINE ===
```

---

## Prompt B — For the Font Resolution session

> **Context for the operator before pasting:** This is the session in which Claude worked through PTXprint's font resolution problem (LFF lookup, sha256 verification, per-job fontconfig) and produced a session-3 encoding plus a font-resolution-design document.

```
=== PASTE BELOW THIS LINE ===

You worked through PTXprint's font resolution problem in this conversation — Language Font Finder (LFF) lookup, sha256 verification, per-job fontconfig generation, and the design choice to fail loudly when fonts cannot be resolved rather than silently falling back to system fonts. You should have produced two artifacts:

1. transcript-encoded-session-3.md — the DOLCHEO+H encoding of this session
2. font-resolution-design.md — the design notes covering the font resolution loop, verification, manifest building, and the no-system-fonts-in-Container decision

A new public repo has been bootstrapped at https://github.com/klappy/ptxprint-mcp to hold both the MCP server code and the governance KB. The bootstrap session did not have direct access to your files. Your job is to upload them.

**Target paths:**
- canon/encodings/transcript-encoded-session-3.md
- canon/articles/font-resolution-design.md   (create canon/articles/ if not present)

**Procedure:**

1. Verify you have both files. If either is missing, say so and stop.

2. Read canon/PENDING_UPLOADS.md and canon/encodings/transcript-encoded-session-5.md from the repo for context — session 5 references your work in D-025 (no system fonts in the Container) and the Q-open-list:
   https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/canon/PENDING_UPLOADS.md
   https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/canon/encodings/transcript-encoded-session-5.md

3. Authenticate with the GitHub PAT from your project instructions (fine-grained, scoped to klappy/ptxprint-mcp with contents + PRs).

4. Clone the repo and place the files:
   git clone https://${GH_PAT}@github.com/klappy/ptxprint-mcp.git
   cd ptxprint-mcp
   mkdir -p canon/articles
   # Place transcript-encoded-session-3.md at canon/encodings/
   # Place font-resolution-design.md at canon/articles/
   git add canon/encodings/transcript-encoded-session-3.md canon/articles/font-resolution-design.md
   git commit -m "uploads: session 3 encoding (font resolution); article: font-resolution-design"
   git push origin main

5. Update canon/PENDING_UPLOADS.md to remove the entry you just resolved (section 2). Commit and push separately:
   git commit -am "PENDING_UPLOADS: remove resolved entry (session 3 / font resolution)"
   git push origin main

6. Report back: list the two files uploaded with sizes, confirm both commits pushed.

Mode discipline: execution mode. Specifications above are sufficient; don't ask for clarification on paths or commit messages.

=== PASTE ABOVE THIS LINE ===
```

---

## Prompt C — For the operator (manual paste of governance Parts 3–12)

> **Context:** This prompt is for the case where the slides-ESE session (Prompt A) cannot find the operator-authored governance document in its outputs — perhaps because the operator authored it directly outside any session, or because the session that has it can't be reached. In that case, the operator pastes the source content manually.

```
=== USE WHEN PROMPT A CAN'T REACH THE GOVERNANCE DOC ===

The operator (you) authored the "PTXprint Headless Operations" governance document by extracting Parts 0 through 12 plus Provenance from the PDF of the PTXprint MASTER SLIDES deck. The bootstrap session reproduced Parts 0-2 verbatim from a partial copy in its context, but Parts 3-12 + Provenance did not survive into that context.

The full document needs to land at:
  canon/governance/headless-operations.md

The current file there has Parts 0-2 plus a frontmatter block plus a top-of-file STATUS note. Parts 3-12 + Provenance are placeholder text that needs to be replaced.

**Operator action:**

1. Locate the source — your original markdown extraction from the PDF deck, or the original session's outputs.

2. Open the existing file in the repo (browser: https://github.com/klappy/ptxprint-mcp/edit/main/canon/governance/headless-operations.md)

3. Find the section starting "## Parts 3–12" and ending with "## Provenance" (placeholder content). Replace that block with your authored Parts 3 through 12 plus the Provenance section from your source.

4. Commit via the GitHub web UI with message: "governance: complete Parts 3–12 + Provenance from operator source"

5. After the upload, edit canon/PENDING_UPLOADS.md to remove section 1 (the highest-priority entry); commit with message "PENDING_UPLOADS: remove resolved entry (governance Parts 3-12)"

After both commits, the v1.2-alignment handoff at canon/handoffs/governance-update-handoff.md can be applied to bring the now-complete document up to v1.2 conventions. That's a separate ~30-60 minute task.

=== END ===
```

---

## Common notes

### Authentication

All three prompts assume the receiving session has the GitHub PAT from the project instructions:
- Fine-grained PAT, format `github_pat_11AAA...`
- Scoped to `klappy/ptxprint-mcp` (contents + PRs) — verified working as of bootstrap commit
- Same PAT used for all three sessions; coordinate via session encodings if multiple sessions push concurrently to avoid merge conflicts

### After all three prompts have been applied

1. The repo has all the canon material the v1.2 build needs.
2. `canon/PENDING_UPLOADS.md` should have only items 4 (optional pre-v1.2 article archive) and 5 (UI tooltip dump) remaining, both labelled optional or low-priority.
3. The headless-operations governance doc still needs the v1.2-alignment edits applied (separate handoff: `canon/handoffs/governance-update-handoff.md`).
4. Tomorrow's autonomous coding run can clone the repo and have full context.

### If a prompt fails partway

Each prompt is idempotent for the file-placement steps (cp + git add are repeatable). If `git push` fails due to a concurrent push from another session, the receiving session should `git pull --rebase`, resolve any conflicts in `canon/PENDING_UPLOADS.md`, and re-push. If the failure is something else, surface it and stop — don't improvise.

### When this handoff doc itself becomes stale

When all three prompts have been applied and PENDING_UPLOADS reflects the resolution, this file can be moved to `canon/handoffs/_archive/` or deleted. It captures a moment-in-time bootstrap and has no durable value once executed.
