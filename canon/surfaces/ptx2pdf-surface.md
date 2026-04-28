---
title: "Epistemic Surface Extraction — sillsdev/ptx2pdf for PTXprint MCP Server"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ese", "ptxprint", "ptx2pdf", "mcp", "code_repository", "surface"]
subject_uri: "https://github.com/sillsdev/ptx2pdf/tree/master"
generator: "claude-opus-4.7 (interactive session, web_search + web_fetch lens passes)"
created_at: 2026-04-27T20:30:00Z
canonical_status: non_canonical
ese_method_uri: klappy://canon/epistemic-surface-extraction
modality: code_repository
---

# Epistemic Surface Extraction — `sillsdev/ptx2pdf`

> **Purpose.** Surface what an MCP-server-building agent needs to know about the ptx2pdf codebase to drive PTXprint headlessly: entry points, project shape, config schema, inputs, outputs, failure modes, deployment footprint. This is a **surface extraction**, not a specification. Companion machine-readable file: `ptx2pdf.surface.json`.

> **Containment.** This artifact is interpretive and non-canonical. Where it disagrees with the repository, the repository wins. Where it disagrees with canon, canon wins. It illustrates the shape of the codebase; it does not define rules. If any part of this can be safely treated as instruction-to-execute, the surface has failed.

> **Modality note.** Canon's ESE method ([klappy://canon/epistemic-surface-extraction](klappy://canon/epistemic-surface-extraction)) defines modalities for non-text artifacts (screenshots, audio, video, PDF slides). A code repository is text but has the property ESE was designed for: an LLM cannot ingest the whole repo in one pass, and meaning depends on lens-by-lens sweeps. Modality `code_repository` is introduced here with explicit notation. Anchor type is `repo_path` — paths are stable under master refactors but should be re-verified at MCP-build time.

---

## Global Surface

**One-sentence description.** ptx2pdf is the upstream monorepo for PTXprint, a Python/GTK desktop frontend that drives a XeTeX macro engine to typeset Paratext-format scripture (USFM) into PDFs; the Python layer is where MCP-server integration would live.

**Key themes.**
- Two-layer architecture: Python orchestration over XeTeX macros.
- Project-and-configuration data model rooted in Paratext's filesystem conventions.
- GUI-tied workflow with a headless print path the SME confirms exists in conversation.
- Rich peripheral content (covers, diglots, polyglots, cross-references, ornaments) producing a large optional config surface.
- Active development cadence — 3.0.x releasing approximately monthly through 2026.
- Subject repo observed at version **PTXprint 3.0.19** (release 2026-04-19).

**Forbidden moves.**
- Do not treat this surface as a config schema specification — the 400-setting cfg field-set is not enumerated here.
- Do not treat lens 11 (MCP server design surface) as a build spec — it is a candidate set, subject to operator review and gap-analysis against the existing first-pass server.
- Do not assume any path or filename in this surface still exists at MCP-build-time without re-verifying.
- Do not infer headless CLI flags from this document — the SME described their existence in conversation; the actual flag names and behavior must be read from `runjob.py` and any argparse setup before being relied on.

---

## L1 — Repo identity and scope
**Anchors:** `README.md`, `docs/home/README.md`, `https://software.sil.org/ptxprint/`
**Evidence:** Direct.

- Self-description: "XeTeX based macro package for typesetting USFM formatted (Paratext output) scripture files" — sets engine (XeTeX), input grammar (USFM), upstream provenance (Paratext).
- Repo aims to be the common source bringing copies from other repositories together — meaning ptx2pdf consolidates both the macro layer and the Python frontend (PTXprint), which historically lived separately.
- Master branch is the main release branch; "various long term branches" exist beyond master — implying an MCP server should pin to a release tag, not master, for reproducibility.
- External release portal at `software.sil.org/ptxprint` is the user-facing distribution; the GitHub repo is the dev source — different entry points for different audiences.
- License and governance not surfaced in this pass — verify before publishing any MCP server that wraps or redistributes ptx2pdf.

> Quote: *"PTX2PDF is a XeTeX based macro package for typesetting USFM formatted (Paratext output) scripture files."*

**Cross-ref:** *compresses* `transcript-encoded.md#O-002`

---

## L2 — Headless invocation pathway
**Anchors:** `python/lib/ptxprint/` (per `ptxprint.spec`); release-notes reference *"fix typo in runjob"* (3.0.6, 2025-12-03); transcript SME description.
**Evidence:** **Partial.** The module name `runjob` is confirmed in release notes; the actual entry-point CLI signature has not been read from source in this pass.

- SME quote: "all the headless does is read the configuration and hit print" — implies a code path that takes (project_dir, config_name) and produces a PDF without launching GUI.
- Release-notes evidence places this code path in a module named `runjob` (3.0.6 patch references `runjob` by name) — likely `python/lib/ptxprint/runjob.py`.
- Apt-installed CLI binary is `ptxprint`; transcript mentions a runtime introspection flag described as `-I` that exposes UI-control-to-config-key mapping. Inference: the same `ptxprint` binary supports flags routing to either GUI launch or headless run.
- Inference (unverified): the existing first-pass MCP server invokes either `ptxprint` with flags or imports the Python module and calls runjob's entry function directly. Either path needs verification before the MCP server can be hardened.
- An auxiliary script `python/scripts/pdfinish` exists (per `ptxprint.spec`) — likely a post-typesetting PDF post-processor, separate from the main job runner.

**Constraints shown.**
- Headless run is the agentic surface (transcript C-001).
- GUI dependencies (PyGObject, GTK) may still be imported even in headless mode — verify that runjob runs without an X server.

**Cross-ref:** *extends* `transcript-encoded.md#O-001`

---

## L3 — Project shape: the input directory the agent points at
**Anchors:** transcript SME description; issue #587; issue #352.
**Evidence:** Direct.

- Project root is a Paratext-style directory; PTXprint reads project files directly without requiring Paratext to be running.
- Per-config artifacts live under `<project>/shared/ptxprint/<CONFIGURATION>/` — this is where each named config's `ptxprint.cfg`, `ptxprint.sty`, and (post-fix-of-issue-587) per-config changes file live.
- Two load-bearing files per configuration: `ptxprint.cfg` (key-value config, ~400 settings) and `ptxprint.sty` (USFM stylesheet override).
- Project-wide artifacts (USFM source files, `PrintDraftChanges.txt`, fonts referenced) live at the project root, not per-config.
- "Default" is the actual default configuration name; arbitrary config names like `cover`, `NiceLayout` are user-created variants. Configurations are sorted caseless in the UI as of 3.0.19.

> Quote: *"rather lives in the \\shared\\ptxprint\\CONFIGURATION folder"* — issue #587 author describing existing layout for `ptxprint.sty`.

**Cross-ref:** *compresses* `transcript-encoded.md#O-002`

---

## L4 — `ptxprint.cfg` config file shape
**Anchors:** transcript SME; issue #338 (sty file reorder issue, by analogy); `PTXprintTechRef.pdf` (referenced in `ptxprint.spec`, not directly read this pass).
**Evidence:** **Partial.** Shape (~400 settings, key/value, sectioned) is described by SME; section names, types, and field semantics not yet read from source.

- Approximately 400 settings — confirmed by SME as "the main one with four hundred settings in it".
- Inference: Likely a Python `configparser`-style INI file with `[section]` headers and `key = value` lines. The cover-wizard and Pretore wiring (`-E 1`) suggest experimental/feature-flag pattern in keys.
- Field-level docs are incomplete (transcript O-open P1) — the runtime introspection mode (CLI flag exposing tooltip / ID / setting-name per UI control) is the highest-fidelity available source for this mapping.
- `PTXprintTechRef.pdf` is bundled in the installer (per `ptxprint.spec` → `docs/documentation/PTXprintTechRef.pdf` → `ptxprint/PDFassets/reference`) — the canonical technical reference. Reading it is a recommended next pass.
- The existing first-pass MCP server (transcript O-001) was given ~150 real projects' configs as exemplars — that corpus is the empirical schema, more reliable than any one document.

**Constraint shown.**
- An MCP server exposing config edits must validate against the actual schema before writing — silent writes of unknown keys is the documented failure mode (transcript O-open P1).

**Cross-ref:** *extends* `transcript-encoded.md#O-open-P1-001`

---

## L5 — `ptxprint.sty` stylesheet shape
**Anchors:** issue #338; `docs/documentation/snippets.md`; `docs/documentation/figures.md`.
**Evidence:** Direct.

- Content is USFM-style markup definitions; users back up `.sty` files across versions to track tweaks (issue #338).
- PTXprint overrides default USFM styles per configuration; original defaults live in `usfm_sb.sty` (referenced as a file that "went missing" in 2.7.27 release notes).
- Style elements use markers like `\zpa-xc`, `\xt`, `\bd` (snippets.md, figures.md) — opaque to non-USFM readers; an MCP server should treat `.sty` content as opaque key-value configuration of named styles.
- Style editor in PTXprint historically reordered entries on save (issue #338, since fixed) — implies non-canonical write order historically; an MCP server writing `.sty` should preserve user content rather than round-tripping through the editor.
- Style decisions interact with figure placement codes (1–2 letter codes plus optional alignment number), which are PTXprint extensions to USFM-3 (figures.md).

**Cross-ref:** *compresses* `transcript-encoded.md#O-002`

---

## L6 — Inputs: USFM source, fonts, images
**Anchors:** `docs/documentation/figures.md`; `ptxprint.spec` (bundled assets); release-notes 3.0.19 ("Add Charis to bundled fonts").
**Evidence:** Direct.

- USFM files are the primary source; PTXprint converts USFM to USX internally (snippets.md describes "parsing the USFM into USX").
- Image inputs: PTXprint generates a USFM-3 piclist from Paratext figure lines, supports `.png` images (3.0.19 fix). Multiple positioning options beyond USFM-3 spec exist (1–2 letter pgpos codes).
- Font inputs are the dominant runtime dependency. Apt install pulls `fonts-sil-charis` as default; Charis is bundled in 3.0.19 builds. SME identified fonts as the binary blocker for headless container deployment (transcript O-open P1-002).
- Cross-reference data lives in `python/lib/ptxprint/xrefs/` (per `ptxprint.spec`) — bundled with the install, not user-provided.
- Bundled XeTeX binaries (`.tfm`, `.pfm`, `.pfb`) live in `xetex/` in the source tree (per `ptxprint.spec`); installed builds carry their own XeTeX. Source installs require `texlive-xetex` from the OS.

**Constraint shown.**
- Without the right font files in the runtime environment, typesetting fails — the binary blocker for headless container deployment.

**Cross-ref:** *extends* `transcript-encoded.md#O-open-P1-002`

---

## L7 — Outputs: PDF, intermediates, logs
**Anchors:** release notes (multiple versions); issue #20 (catcode failure with `.log` artifact `ptxprint-RUTCABRS.log`); issue #212 (failed run still produces PDF without pictures).
**Evidence:** Direct.

- Final output is a PDF. Naming convention seen in issues: `ptxprint-<PROJECT>.log` for the run log; the PDF naming is project-and-config-derived but exact pattern not surfaced in this pass.
- Intermediate artifacts include `procpdf` (renamed during prepress, 3.0.6) and a `parlocs` file (parallel-locations metadata, "Keep going if no parlocs file" release note).
- PDF-finishing is a separate optional script (`python/scripts/pdfinish`) — implies the main job emits a "pre-finish" PDF that pdfinish post-processes.
- Partial success is possible — issue #212 documents a run that emitted a PDF but skipped all pictures after canonicalisation errors. An MCP server returning success-or-failure should surface non-fatal warnings, not just exit code.
- On 3.0.19, parallel processing for the PDF Viewer pane was added — implies the renderer is multi-process-aware, with `page_filler` doing concurrent layout.

**Constraints shown.**
- Validation cannot rely on exit code alone (issue #212): a "successful" run can be silently degraded.
- An MCP server's render tool should return: PDF path, log path, warning list, and a structural assertion (e.g., "pictures: N expected, N actual").

---

## L8 — Failure modes and validation surface
**Anchors:** issues #1, #20, #212, #235; release-notes 3.0.9 ("Add check for content in scripture file to catch it before TeX gives an unhelpful error").
**Evidence:** Direct.

- Hard failures surface as TeX errors with line numbers (e.g. "Missing number, treated as zero" from issue #20). The `.log` file is the diagnostic artifact; the user-facing error is often opaque without it.
- Soft failures: PDF is produced but degraded (no pictures, no TOC, etc.). Detection requires inspecting the PDF, the log, and possibly the parlocs file.
- Performance failures: long hangs (multi-minute) on first project access (issue #1) and on print (issue #235). An MCP server must set sensible timeouts and surface "still working" progress, not "unresponsive".
- Pre-flight checks are an active development direction (3.0.9 release note: catch empty scripture files before TeX). An MCP server can wrap the run with the same checks PTXprint runs internally — exposing them as a separate tool would let the agent fail fast without invoking XeTeX.
- Release-note signal: "truthful and informative" mismatch warnings are in 3.0.8 — implies the team values legible error surfaces. An MCP server should mirror this — opaque pass-through of TeX errors is a regression.

**Constraint shown.**
- An MCP server's render tool MUST distinguish: (a) hard failure (no PDF), (b) soft failure (degraded PDF), (c) success — by inspecting both exit code and post-conditions.

---

## L9 — Test fixtures in repo
**Anchors:** transcript SME; release-notes 2.7.27 ("Update test standards and add more tests").
**Evidence:** **Partial.** Existence asserted by SME, corroborated by release notes; specific paths not surfaced in this pass.

- SME confirmed test projects exist in-repo with a README. Walked example: a project with three configurations — `cover`, `default`, and a third — accessed via the GUI's project picker.
- Specific test-project paths (likely under `tests/` or a similarly named top-level directory) were not surfaced via the search-based passes; a follow-up directory listing of the repo root or fetch of a paths-listing file is the next step.
- Release notes 2.7.27 confirms an active "test standards" practice — implies golden output PDFs may exist and could be reused as MCP-server smoke-test fixtures.
- Inference: the SME's reference to ~150 real projects is likely external (their personal corpus), not in-repo. The in-repo fixtures are the small canonical set; the 150 are the empirical training set the existing first-pass MCP server learned from.
- MCP-server next step: enumerate in-repo test projects, run each through the proposed render tool, diff the resulting PDF (or its parlocs/log) against a checked-in expected output.

**Constraint shown.**
- Per transcript C-002, fixtures come from the in-repo test corpus, not a parallel dataset.

**Cross-ref:** *extends* `transcript-encoded.md#C-002`

---

## L10 — Deployment and runtime requirements (Docker / container shape)
**Anchors:** `python/readme.md`; `ptxprint.spec`; `InnoSetupPTXprint.iss`.
**Evidence:** Direct for source-install. **The SME-mentioned Dockerfile was NOT directly observed in repo searches in this pass.**

- Source-install runtime (Ubuntu 20.04 baseline): `python3-gi gobject-introspection gir1.2-gtk-3.0 libgtk-3-0 gir1.2-gtksource-3.0 python3-cairo python3-regex python3-pil texlive-xetex fonts-sil-charis` — apt install footprint.
- Apt-package install adds 86 packages, 187 MB of archives, 628 MB additional disk space — material container-size budget for any deployment.
- Python deps (per `python/readme.md`): PyGObject, regex, PIL, fonttools, cairo. Hidden imports (per `ptxprint.spec`): `gi.repository.fontconfig`, `gi.repository.Poppler`, `numpy._core._exceptions`.
- Inference (unverified): SME mentioned "we have a Docker file so you can actually quite easily deploy at least the headless version". A Dockerfile was not surfaced via the search passes — it may live in a path the searches did not surface, in a sibling repo, or have been added recently. Confirm before relying on it.
- PyInstaller spec for Windows packages everything as a self-contained `PTXprint.exe`. Linux/Mac use system-installed XeTeX. For containers, the bundled-xetex Windows pattern may be the more robust template.

**Constraint shown.**
- An MCP server deployed in a container must include: Python 3.x, PyGObject + GTK, XeTeX, fonts (at minimum SIL Charis for English-only scope per transcript D-002), and all `python/lib/ptxprint/` resources.

**Cross-ref:** *extends* `transcript-encoded.md#O-open-P1-002`

---

## L11 — MCP server design surface (candidate tools)
**Anchors:** synthesis from L1–L10; transcript O-001 (existing server exposes projects/configs/overrides).
**Evidence:** **Design proposal** — derived from observed surface, not read from existing first-pass MCP server's source.

| Tool category | Tool | Purpose |
|---|---|---|
| **Read** | `list_projects(root)` | Enumerate Paratext-shaped project directories |
| **Read** | `list_configurations(project)` | Enumerate `<project>/shared/ptxprint/*` |
| **Read** | `get_config(project, config_name)` | Return parsed `ptxprint.cfg` |
| **Read** | `get_stylesheet(project, config_name)` | Return `ptxprint.sty` content |
| **Read** | `describe_setting(setting_name)` | Wrap PTXprint's runtime `-I` introspection |
| **Read** | `list_test_fixtures()` | Enumerate in-repo test projects |
| **Write (staged)** | `set_config_overrides(project, config, overrides)` | Stage edits in working copy |
| **Write (staged)** | `create_configuration(project, name, base="default")` | Stage new config |
| **Execute** | `render(project, config, overrides=None, books=None) → {pdf_path, log_path, warnings[], structural_checks{}}` | The headless print — the gap the existing first-pass server has |

- All read tools are idempotent and exposable to an agent without write risk.
- Writes stage into a working copy, not the project on disk, until an explicit commit step.
- `render` is the tool the existing first-pass MCP server is reportedly missing or returning empty (transcript O-001).
- Out of scope for v1 by design: GUI tools, font installation, project creation from scratch, Paratext-server integration. Each is a meaningful surface but expanding initial scope past "render an existing project's existing config" is the failure mode the operator's two-phase direction (transcript D-003) was guarding against.

**Constraints shown.**
- Tool surface mirrors the headless contract (transcript C-001): inputs are project + config + overrides; output is PDF or legible failure.
- Validation is the hardest part (transcript O-001 SME quote) — every render result includes structural assertions, not just success/failure.

---

## L12 — Open questions / gaps in this surface
**Anchors:** self-audit.

| ID | Question | Resolution path |
|---|---|---|
| Q1 | What is the exact argv for invoking PTXprint headlessly, and does it bypass GTK init? | Read `python/lib/ptxprint/runjob.py` and any `__main__` entry in the ptxprint package. |
| Q2 | What are the 400 setting names, types, valid values, and which are user-facing vs internal-derived? | Parse the GTK Glade XML (UI definitions), correlate to runtime `-I` flag output, cross-check against `PTXprintTechRef.pdf`. |
| Q3 | Does an actual Dockerfile exist in this repo (or sibling)? SME asserted it does. | Targeted search for `Dockerfile`, `docker-compose.yml`, or container build CI under `.github/workflows/`. |
| Q4 | Where exactly do in-repo test projects live, and what golden outputs accompany them? | Directory listing of repo root and `tests/` (or equivalent). |
| Q5 | What license does ptx2pdf carry? | Read `LICENSE` at repo root. Required before publishing any MCP server that wraps or distributes ptx2pdf code. |

---

## Promotion Rule

Per [klappy://canon/epistemic-surface-extraction](klappy://canon/epistemic-surface-extraction), surfaces inform but do not become canon. Durable insights from this ESE — for example, the principle that an MCP server's render tool must distinguish hard / soft / success failures — should be promoted by editing canon directly (e.g., a new principle under `canon/principles/`), not by linking this surface as authority.

---

## Provenance

- **Extraction method:** lens-based passes via `web_search` + `web_fetch` over robots-allowed `raw.githubusercontent.com` paths and search-result URLs. GitHub HTML rendering is robots-disallowed; raw URLs accessible only after surfacing via search.
- **Passes executed (this session):** transcript re-read for lens inventory; canon search for ESE method; repo root search; python/readme fetch; ptxprint.spec search; config-layout search; release-notes full fetch; headless-runner search; deployment search.
- **Human review status:** not reviewed.
- **Recommended next passes:** fetch and read `python/lib/ptxprint/runjob.py`; fetch and read `PTXprintTechRef.pdf`; directory listing of repo root and `tests/`; search for Dockerfile presence; read `LICENSE`.
