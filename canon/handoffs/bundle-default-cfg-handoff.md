---
title: "Container Handoff — Bundle Default Cfg as the Phase-0 Floor"
audience: "next-session-claude | autonomous-coding-agent | container-maintainer"
exposure: working
voice: instructional
stability: working
tags:
  - ptxprint
  - mcp
  - handoff
  - container
  - default-cfg
  - bundle
  - phase-0
  - bootstrap
  - vodka-architecture
canonical_status: non_canonical
date: 2026-04-30
written_at: 2026-04-30T19:35:00Z
session_window: "2026-04-30T18:10Z–2026-04-30T19:35Z (~85 min wall-clock; planning + smoke test + canon authoring)"
companion_to:
  - canon/articles/bundled-default-cfg.md
  - canon/articles/progressive-customization.md
  - canon/articles/payload-construction.md
  - canon/articles/phase-1-poc-scope.md
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/principles/dry-canon-says-it-once
  - klappy://canon/principles/maintainability-one-person-indefinitely
  - klappy://canon/principles/verification-requires-fresh-context
governs: "the Container-side change that lands the bundled default cfg, completing the Phase-0 floor"
---

# Container Handoff — Bundle Default Cfg as the Phase-0 Floor

> **One-line scope.** The Container ships with the upstream default cfg pre-staged so that a payload of `{books, sources}` produces a publication-quality A5 two-column Bible book with no further input from the caller.

> **Why this handoff exists.** Empirical testing on 2026-04-30 found that Phase-1-strict payloads (no `config_files`) fail hard today: `"PTXprint produced no output (silent exit)"`. The canon claimed Phase 1 worked with PTXprint's compiled defaults, but the running Container has no such defaults available to the worker's scratch project layout. This handoff closes the gap. The cfg to bundle has been validated end-to-end: same payload minus the cfg-only `config_files` succeeded in 14.8 s with 37 pages, 0 errors. See `klappy://canon/articles/bundled-default-cfg` for the cfg itself and the empirical baseline.

---

## What changes

The Container repo gains:

1. **A bundled cfg** at a deterministic path inside the image, source-of-truth being `klappy://canon/articles/bundled-default-cfg`.
2. **Build-time logic** that copies that cfg from the canon source into the image at the path PTXprint expects when its scratch project lacks one.
3. **Run-time logic** (in the Container's job runner) that, when the caller's payload has no `shared/ptxprint/Default/ptxprint.cfg` entry, stages the bundled cfg into the scratch project's Default config dir before invoking PTXprint.

The Worker is unchanged. The MCP schema is unchanged. The `submit_typeset` API surface is unchanged. The only delta is that an empty-`config_files` payload now succeeds where it used to fail.

---

## Vodka constraints to honor

These are the load-bearing principles for this change. If you find yourself violating one, stop — the design is wrong, not the principle.

### 1. Worker holds zero domain opinion (`klappy://canon/principles/vodka-architecture`)

The Worker must not:

- Detect missing `config_files` and inject a default cfg before forwarding to the Container.
- Read this canon article at request time to fetch the bundled cfg.
- Have any awareness that a "default cfg" exists.

The Worker stages exactly what the caller sent. The Container handles the absence of caller-supplied cfg files. This boundary keeps the Worker generic — vodka.

**Test:** if you removed all references to "default" from the Worker source and the change still works, vodka holds.

### 2. The cfg has one home (`klappy://canon/principles/dry-canon-says-it-once`)

The cfg lives in `klappy://canon/articles/bundled-default-cfg` (the fenced INI block at the bottom of that article). The Container build derives from it. Nothing else holds a copy.

Acceptable derivation patterns at build time:

- A build script extracts the INI block from the article (parse the fenced ` ```ini ... ``` ` block) and writes it to the image's bundle path.
- A pre-build step pulls the article via `oddkit_get` or raw GitHub URL, extracts, writes.
- A submodule or vendored copy of the canon repo with the article checked in — the build reads the article from the local path.

Unacceptable patterns:

- Hardcoding the cfg content into a Dockerfile or shell script.
- Copying the cfg content into a separate file in the Container repo.
- Embedding the cfg in the worker, the runner, or any container application code.

Any of those creates two homes for the cfg, and the article and the Container will drift the moment the upstream team sends an update.

**Test:** if the article changes, the next Container build picks up the change without any other repo edits. If you have to edit a Container-repo file when the cfg changes, you have two homes — refactor.

### 3. The bundle is content-addressed by the Container build

The Container image hash captures the bundled cfg. If the cfg changes, the Container hash changes. Downstream cache hits / misses respect this naturally — no special handling needed.

The Worker's payload-hash computation is unchanged: same caller payload always hashes the same regardless of what cfg the Container bundles internally. This is intentional; it means callers re-rendering the same payload after a Container rebuild may pick up a different cfg without their payload-hash changing. That's the right behavior for the bundle (callers who want immutability supply their own cfg in `config_files`, locking the cfg into the payload hash).

### 4. Maintainability — one person, indefinitely (`klappy://canon/principles/maintainability-one-person-indefinitely`)

The change must be small enough that a single maintainer can understand and modify it without specialized context:

- One additional path in the Dockerfile (or equivalent build manifest)
- One additional check in the runner (~5–15 lines: "if scratch project lacks shared/ptxprint/Default/ptxprint.cfg, copy from bundle path")
- A regression test that submits the Phase-0 minimum payload and asserts success

Anything more is over-design for what's structurally a simple staging operation.

---

## Implementation sketch

This is illustrative. The Container repo's actual layout dictates the exact file paths and tooling.

### Dockerfile / build manifest

```dockerfile
# Existing: install PTXprint, Charis, etc.
# ...

# NEW: stage the bundled default cfg
# The path inside the image is /opt/ptxprint-mcp/bundle/ptxprint.cfg (illustrative)
# The build pulls from canon — choose ONE pattern:

#   Pattern A: extract from a local checkout of the canon repo (vendored or submodule)
COPY canon-repo/canon/articles/bundled-default-cfg.md /tmp/bundled-default-cfg.md
RUN python3 /opt/build-scripts/extract-ini-block.py \
        /tmp/bundled-default-cfg.md \
        /opt/ptxprint-mcp/bundle/ptxprint.cfg

#   Pattern B: fetch at build time from raw GitHub
RUN curl -fsSL \
        https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/canon/articles/bundled-default-cfg.md \
        -o /tmp/bundled-default-cfg.md \
    && python3 /opt/build-scripts/extract-ini-block.py \
        /tmp/bundled-default-cfg.md \
        /opt/ptxprint-mcp/bundle/ptxprint.cfg
```

The `extract-ini-block.py` helper is roughly 20 lines: open the file, find the fenced ` ```ini ` block, write the content between the fences. No heuristic parsing, no AST — just substring extraction.

### Runner-side staging

The Container's job runner already builds a scratch project from the caller's `config_files` map before invoking PTXprint. Add this logic at the point where the project's Default config dir is being assembled:

```python
# Inside the runner, after staging caller-supplied config_files into scratch dir
default_cfg_path = scratch_dir / "shared" / "ptxprint" / "Default" / "ptxprint.cfg"
if not default_cfg_path.exists():
    bundle_cfg_path = Path("/opt/ptxprint-mcp/bundle/ptxprint.cfg")
    default_cfg_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(bundle_cfg_path, default_cfg_path)
    log.info("staged bundled default cfg (caller did not supply one)")
```

That's the entire run-time change. Five working lines plus logging.

### What does NOT need staging from the bundle

We empirically validated on 2026-04-30 that the cfg alone is sufficient — no Settings.xml, no sty, no mods, no fonts manifest. PTXprint resolves:

- USFM filename pattern from the cfg's `[project] id` and the source filename
- Font (`Charis`) from the Container's installed `fonts-sil-charis` via fontconfig
- Stylesheet defaults from PTXprint's compiled-in marker definitions

So the bundle is **the cfg only.** Nothing else needs to be staged. If a future render uncovers a missing-asset issue (e.g., a request for a non-Latin script trips up the bare-cfg path), that's a Level-3+ concern, not a bundle concern.

---

## Smoke test contract

A regression test must accompany the change. The test:

### Inputs

```json
{
  "schema_version": "1.0",
  "project_id": "BSB",
  "books": ["JHN"],
  "sources": [
    {
      "book": "JHN",
      "filename": "44JHNBSB.usfm",
      "url": "https://raw.githubusercontent.com/usfm-bible/examples.bsb/48a9feb71f0a66f9b8f418b11ae25b7ad2e49a0d/44JHNBSB.usfm",
      "sha256": "f6220aa81c8143cb66a86d775fa3cdfe10efcb52dad135dfc498baeac260103d"
    }
  ]
}
```

(Note: no `config_files`, no `fonts`, no `figures`, no `define`.)

### Expected outputs

- `state: "succeeded"`
- `failure_mode: "success"`
- `exit_code: 0`
- `errors: []`
- `overfull_count: 0`
- `pdf_url` non-null
- Wall-clock: target ≤25 s container time (empirical baseline 14.8 s; budget 25 s allows headroom)
- PDF: ~37 pages, ~377 KB ± 20%
- PDF/X-4 conformance
- PDF text on page 1 contains the string "In the beginning was the Word"

### Test failure modes that block the merge

- `state == "failed"` with `errors: ["PTXprint produced no output (silent exit). ..."]` → bundle staging is broken
- PDF size <50 KB or >2 MB → render is degenerate or generating filler
- Wall-clock >60 s → something's catastrophically wrong (cold container shouldn't exceed 30 s; 60 is the safety net)
- PDF text doesn't contain expected verse → font/encoding issue (likely Charis substitution failure)

### Reference artifacts

The 2026-04-30 baseline render is available at:

- PDF: `https://ptxprint-mcp.klappy.workers.dev/r2/outputs/d37778c8c2467a07e395718fe1a3477f25cec7b8a55dfd4927af72bee75ba29d/BSB_Default_JHN_ptxp.pdf`
- Log: `https://ptxprint-mcp.klappy.workers.dev/r2/outputs/d37778c8c2467a07e395718fe1a3477f25cec7b8a55dfd4927af72bee75ba29d/BSB_Default_JHN_ptxp.log`
- Payload hash: `d37778c8c2467a07e395718fe1a3477f25cec7b8a55dfd4927af72bee75ba29d`

Note: that baseline was produced with the cfg explicitly in `config_files`. The Phase-0 (no-cfg) payload hash will be different — that's correct, it has different inputs. The PDF should be visually equivalent.

---

## Architectural decisions made in the canon authoring (carry these into the implementation)

### Decision: replacement-only when caller supplies a cfg

The Container stages caller-supplied `config_files` exactly as sent. If the caller supplies `shared/ptxprint/Default/ptxprint.cfg`, the bundle is ignored entirely for this run. **No section-level merging.** This was a deliberate call to avoid silent surprises in mixed-cfg renders.

Implementation implication: in the runner staging logic above, the `if not default_cfg_path.exists()` check guarantees this. Don't add merge logic.

### Decision: `define` is the override path for one-knob changes

Callers wanting to tweak one cfg value without replacing the whole cfg use `define = {"<widget_id>": "<value>"}`, which the Container passes as `-D key=value` flags to PTXprint. This is already in the schema and already implemented; this handoff doesn't change it.

### Deferred: parent-config inheritance via `[import] config = Default`

A future enhancement: PTXprint's native `[import] config = Parent` inheritance would let callers send a partial cfg with the bundle as the parent. This requires the Container to keep the bundled cfg accessible at a parent-config path AND callers to declare the import correctly. Not in scope for this handoff.

If you implement this later, the Container would stage the bundle at `shared/ptxprint/Default/ptxprint.cfg` regardless of caller input, and callers would supply child configs at e.g. `shared/ptxprint/MyChild/ptxprint.cfg` declaring `[import] config = Default`. The runtime `config_name` flag would target the child. This works in PTXprint today; the only blocker is naming the bundle's parent path consistently and documenting it. Out of scope for this PR.

---

## Definition of done for this handoff

The handoff is complete when all of the following are true:

1. **Container build** stages the bundled cfg from `klappy://canon/articles/bundled-default-cfg` at a deterministic path inside the image.
2. **Container runner** copies the bundle into the scratch project's Default config path when caller-supplied `config_files` lacks one.
3. **Worker source** has not been modified.
4. **Smoke test** (the one above) passes against the rebuilt Container.
5. **Canon updates** land in the same coordinated PR or sequence:
   - `canon/articles/bundled-default-cfg.md` (the source of truth) — already drafted
   - `canon/articles/progressive-customization.md` — already drafted
   - `canon/articles/payload-construction.md` — top caveat-box rewritten per `payload-construction.EDIT.md`
   - `canon/articles/phase-1-poc-scope.md` — supersession frontmatter + redirect note per `phase-1-poc-scope.EDIT.md`
6. **Fresh-context validation** (`klappy://canon/principles/verification-requires-fresh-context`): a separate session retrieves the new articles via `docs`, builds a Phase-0 payload from the canon-described pattern, submits it against the rebuilt Container, and confirms success.

The fresh-context validation is what closes the loop. Same-session "looks done" doesn't count; another agent should be able to read only the canon and produce a working Phase-0 render. If that agent has to ask any clarifying question, the canon is incomplete — fix the canon, then re-validate.

---

## Open items the next session should be aware of

These are not blockers for this handoff, but they're flagged so the next session catches them:

1. **The `english-single-book` template is now Level-4-overkill for new agents.** It carries Settings.xml, custom.sty, ptxprint.sty, ptxprint-mods.sty, and a Gentium fonts manifest — all useful as a reference, but no longer the bootstrap surface. Consider reframing the template's frontmatter: `applies_to` should mention "fully-customized example for diglot-ready, picture-list-ready Gentium publishing"; `caller_supplies` is unchanged. A separate `english-single-book-default` template wrapping just the Phase-0 payload could land later as a Level-0 template. Not urgent; doesn't block this PR.

2. **The "bundled cfg" article's `[import]` section caveat (item 5 in "Known characteristics worth knowing as an agent") deserves cross-linking from `config-inheritance-and-overrides.md`.** Right now an agent reading the inheritance article might assume the upstream cfg's `[import]` section uses the inheritance pattern. It doesn't — the section is for the GUI's import-settings workflow. Adding a one-paragraph "Note: not all `[import]` sections are inheritance declarations" cross-ref would prevent confusion.

3. **Underfill rate observation (~59% on John).** The bundled cfg's tight typography produces visible underfill on light-content pages. This is documented in the bundled-default-cfg article as Known Characteristic #3 with mitigations. If user feedback says "the pages look empty," the response is to switch to autofill mode (deferred upstream) or to relax the typography via `define = {"s_linespacing": "13"}` etc. Not a bundle bug; a bundle characteristic.

4. **The cfg has no `[vars]` section.** PDF metadata `Title` shows `[Unknown]`. Most production agents will want to set `vars.maintitle`. The progressive-customization article documents this at Level 1 (`define = {"vars_maintitle": "John"}` or equivalent — the exact widget ID is worth verifying against the PTXprint UI introspection dump). If the widget ID differs from `vars_maintitle`, update the progressive-customization article's Level-1 examples.

---

## How this handoff was produced

This document was authored in the same Claude session as the empirical validation that revealed the gap. The session:

1. Loaded canon catalog (60 docs) and read `composition-and-templates`, `english-single-book`, `payload-construction`, `phase-1-poc-scope`, and `bundled-default-cfg` (which didn't exist yet).
2. Submitted a cfg-only payload to the running PTXprint MCP — succeeded in 14.8 s with 37-page PDF.
3. Submitted a Phase-1 strict payload (no cfg) — failed hard, exposing the canon-vs-reality drift.
4. Drafted four canon updates (bundled-default-cfg new article, progressive-customization new article, payload-construction edit instructions, phase-1-poc-scope supersession instructions).
5. Drafted this Container handoff.

Per `klappy://canon/principles/verification-requires-fresh-context`, this same session is **not** the right place to validate the canon. A fresh session should:

- Read `progressive-customization.md` from canon.
- Build the Phase-0 payload it describes against a fresh USFM source.
- Submit. Observe. Compare to the smoke-test contract above.
- Report drift, if any. Cross-check against `bundled-default-cfg.md`'s claims about what the bundle produces.

That fresh-context loop closes the validation. This document is a planning artifact + execution-ready spec; it is not itself the validation.

---

## See also

- `klappy://canon/articles/bundled-default-cfg` — the cfg this handoff is bundling
- `klappy://canon/articles/progressive-customization` — the override ladder this handoff enables
- `klappy://canon/articles/payload-construction` — schema reference (post-edit)
- `klappy://canon/articles/phase-1-poc-scope` — historical reference (post-supersession)
- `klappy://canon/specs/ptxprint-mcp-v1.2-spec` — the spec this handoff conforms to (no spec changes needed)
- `klappy://canon/principles/vodka-architecture` — the boundary this handoff respects
- `klappy://canon/principles/verification-requires-fresh-context` — why the next session validates, not this one

---

*The cfg is in canon. The Container reads canon. The Worker reads neither. The bundle is the floor; everything else stacks on top.*
