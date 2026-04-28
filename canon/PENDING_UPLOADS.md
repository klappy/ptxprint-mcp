---
title: "Pending Uploads — Files Needed in This Repo"
audience: project
exposure: working
voice: instructional
stability: working
tags: ["pending", "uploads", "instructions", "bootstrap"]
canonical_status: non_canonical
created_at: 2026-04-28T04:20:00Z
---

# `PENDING_UPLOADS.md` — Files Needed in This Repo

> **Why this exists.** This repo was bootstrapped by a single Claude session. That session had direct access to some artifacts but not others — some files were produced by sibling sessions (font work, slides ESE, training manual) or were uploaded as attachments to earlier sessions and didn't survive context compaction. Those files need to land here for the repo to be complete. This document names each missing file, where it should land, and which session is expected to have it.

> **Looking for ready-to-paste prompts to give to the other sessions?** See [`handoffs/missing-uploads-handoff.md`](handoffs/missing-uploads-handoff.md) — three copy-pasteable session prompts (slides-ESE, font-resolution, operator-manual-paste) that another Claude session can act on directly.

> **Who this is for.** The operator, or any session/contributor with access to the missing files, who can clone the repo and push the artifacts at the indicated paths.

---

## What's already in the repo

| File | Status |
|---|---|
| `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `LICENSE`, `.gitignore` | ✅ committed |
| `canon/README.md` | ✅ committed |
| `canon/specs/ptxprint-mcp-v1.0-spec.md` | ✅ committed |
| `canon/specs/ptxprint-mcp-v1.1-spec.md` | ✅ committed |
| `canon/specs/ptxprint-mcp-v1.2-spec.md` | ✅ committed |
| `canon/specs/archive/ptxprint-mcp-first-pass-poc.md` | ✅ committed (the original 17-tool PoC) |
| `canon/handoffs/governance-update-handoff.md` | ✅ committed |
| `canon/encodings/transcript-encoded-session-1.md` | ✅ committed |
| `canon/encodings/transcript-encoded-session-2.md` | ✅ committed |
| `canon/encodings/transcript-encoded-session-4.md` | ✅ committed |
| `canon/encodings/transcript-encoded-session-5.md` | ✅ committed |
| `canon/surfaces/ptx2pdf-surface.md` | ✅ committed |
| `canon/surfaces/ptx2pdf-surface.json` | ✅ committed |
| `canon/governance/headless-operations.md` (Parts 0–2 only, partial) | ⚠️ needs completion — see §1 below |

---

## Files that need to be uploaded

### 1. Headless Operations governance — full Parts 3–12 + Provenance (HIGHEST PRIORITY)

**Target path:** `canon/governance/headless-operations.md` (existing file; replace the "PENDING UPLOAD" section near the bottom)

**Status:** The file currently contains Parts 0–2 only, with a placeholder where Parts 3–12 + Provenance should go.

**Source:** The operator authored this document by extracting content from a PDF of the PTXprint MASTER SLIDES deck. The full document was uploaded as an attachment to an earlier Claude session ("PTXprint training manual creation" — chat URL `claude.ai/chat/fddce82c-e7f8-4c20-9882-b4c4152aa4f6` per session-1's transcript reference, or whichever session received the upload most recently).

**What's needed:** Paste the original Parts 3–12 plus the Provenance section into the existing file, replacing the "PENDING UPLOAD" placeholder block. Authored sections (in order):
- Part 3 — The Configuration Model
- Part 4 — The Override Mechanism
- Part 5 — Settings Cookbook (by user intent)
- Part 6 — Supporting Files
- Part 7 — USFM in Headless Context
- Part 8 — Workflow Recipes
- Part 9 — Diagnostic Patterns
- Part 10 — Conversational Patterns
- Part 11 — Settings That Need Special Handling
- Part 12 — Open Gaps in This KB
- Provenance

**After upload:** apply [`canon/handoffs/governance-update-handoff.md`](handoffs/governance-update-handoff.md) to align the full document with v1.2 conventions. Estimated 30–60 minutes for the alignment pass.

**Why this matters:** Without the full document, `payload-construction.md`, `output-naming.md`, `failure-mode-taxonomy.md`, and the agent-facing operational knowledge are all stuck. The v1.2 build cannot pass its end-to-end smoke test without this content available to the agent via oddkit.

---

### 2. Session 3 artifacts — font resolution work

**Target paths:**
- `canon/encodings/transcript-encoded-session-3.md`
- `canon/articles/font-resolution-design.md` (new directory `canon/articles/` may need creating)

**Status:** Not yet in repo.

**Source:** The "Finding fonts for language support" Claude session. That session produced a font-resolution design document and a session encoding.

**What's needed:** Whichever session/contributor has those files should clone this repo, place them at the indicated paths, and push.

**Why this matters:** The font resolution design work decided that fonts travel with payloads via URL+sha256 (informed v1.2's `fonts` array slot). The session encoding documents the rationale. Without it, the v1.2 build's font-handling design has missing context and the "no system fonts in the Container" decision (per session-5 D-025) lacks its full backing argument.

---

### 3. Slides ESE artifacts and derivative training manual

**Target paths:**
- `canon/surfaces/ptxprint-master-slides.surface.md`
- `canon/surfaces/ptxprint-master-slides.surface.json`
- `canon/articles/ptxprint-training-manual.md`

**Status:** Not yet in repo.

**Source:** The "PTXprint training manual creation" Claude session (chat URL `claude.ai/chat/fddce82c-e7f8-4c20-9882-b4c4152aa4f6`). That session ran ESE on the 438-slide MASTER SLIDES deck and authored a derivative training manual (3 files, ~127 KB total).

**What's needed:** Clone this repo, place the three files at the indicated paths, push.

**Why this matters:** The slides surface is the structural index of the deck (24 lenses, page-range anchored). The training manual is a 12-part linear learning sequence derived from the surface. Both feed canon authoring for the agent-facing articles (`payload-construction.md`, `config-construction.md`, etc.) and provide the structured raw material the operator's PDF extraction was distilled from.

---

### 4. (Optional) Pre-v1.2 canon article drafts

**Target path:** `canon/articles/_archive/` (creating `canon/articles/` if not yet present)

**Status:** Not yet in repo. Drafted in session 4, then subsumed by v1.2's `config-construction.md` approach.

**Source:** This session produced `canon-ptxprint-config-inheritance.md` and `canon-ptxprint-cfg-safe-editing.md` in `/mnt/user-data/outputs/`. They were drafted as v1.1-era canon articles and are now superseded by the broader `config-construction.md` article that needs to be authored for v1.2.

**What's needed (optional):** If historical reference is useful, the operator can ask for these to be uploaded to `canon/articles/_archive/`. Otherwise leave them out — the v1.2 build doesn't need them, and the session-5 encoding already records their disposition.

---

## How to upload (procedure)

For sessions with their own GitHub access:

```bash
git clone https://github.com/klappy/ptxprint-mcp.git
cd ptxprint-mcp
mkdir -p canon/articles                 # if creating articles/ for the first time
# Place files at the indicated target paths
git add <files>
git commit -m "Add <description>"
git push origin main
```

For Claude sessions using the operator's PAT (scope already covers this repo as of the bootstrap commit): same flow, with the PAT inserted into the remote URL.

For uploads via the operator manually: drag-and-drop on the GitHub web UI works for individual files; the directory structure is already in place for §1 and §3.

---

## After all uploads land

This file should be deleted, and a brief note added to [`canon/README.md`](README.md) under "Status of canon content" indicating completion. The v1.2 build's first autonomous coding run can then proceed with full canon context available.