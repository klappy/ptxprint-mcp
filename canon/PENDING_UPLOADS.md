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

> **✅ Required uploads complete (2026-04-28).** All bootstrap-required artifacts are in the repo. The only remaining item is §4 (optional pre-v1.2 article drafts for historical archive); the v1.2 build does not need them. This file should be deleted once §4 is either uploaded or explicitly punted. (See `canon/handoffs/documentation-cleanup-handoff.md` §3 P0.2 for context.)

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
| `canon/encodings/transcript-encoded-session-1.md` | ✅ committed |
| `canon/encodings/transcript-encoded-session-2.md` | ✅ committed |
| `canon/encodings/transcript-encoded-session-3.md` | ✅ committed |
| `canon/encodings/transcript-encoded-session-4.md` | ✅ committed |
| `canon/encodings/transcript-encoded-session-5.md` | ✅ committed |
| `canon/articles/_archive/font-resolution-design.md` | ✅ committed (superseded — v1.2 D-021 retired the three-MCP path; archived as design history) |
| `canon/surfaces/ptx2pdf-surface.md` | ✅ committed |
| `canon/surfaces/ptx2pdf-surface.json` | ✅ committed |
| `canon/surfaces/ptxprint-master-slides.surface.md` | ✅ committed |
| `canon/surfaces/ptxprint-master-slides.surface.json` | ✅ committed |
| `canon/derivatives/ptxprint-training-manual.md` | ✅ committed |
| `canon/governance/headless-operations.md` | ✅ committed (full Parts 0–12 + Provenance, v1.2-aligned) |
| `canon/handoffs/governance-update-handoff.md` | ✅ committed (resolved 2026-04-28) |
| `canon/handoffs/missing-uploads-handoff.md` | ✅ committed (Prompts A and B resolved 2026-04-28) |
| `canon/handoffs/session-3-gaps-handoff.md` | ✅ committed |
| `canon/handoffs/oddkit-kb-isolation-feature-request.md` | ✅ committed |
| `canon/handoffs/documentation-cleanup-handoff.md` | ✅ committed |

---

## Files that need to be uploaded

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

For uploads via the operator manually: drag-and-drop on the GitHub web UI works for individual files; `canon/articles/_archive/` already exists for §4.

---

## After all uploads land

This file should be deleted, and a brief note added to [`canon/README.md`](README.md) under "Status of canon content" indicating completion. The v1.2 build's first autonomous coding run can then proceed with full canon context available.