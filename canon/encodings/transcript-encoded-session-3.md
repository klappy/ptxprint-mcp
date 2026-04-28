---
title: "PTXprint MCP Server — Transcript Encoding Session 3 (2026-04-27 Late PM → 2026-04-28 Early AM)"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "encoding", "transcript", "dolceho", "fonts", "content-cache", "session-3"]
extends: "transcript-encoded-session-2.md"
encoded_at: 2026-04-28T03:50:00Z
governance_source: knowledge_base
governance_uri: klappy://canon/definitions/dolcheo-vocabulary
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/principles/kiss-simplicity-is-the-ceiling
  - klappy://canon/principles/dry-canon-says-it-once
  - klappy://odd/constraints/anti-cache-lying
  - klappy://canon/bootstrap/model-operating-contract
companion_artifact: "_archive/font-resolution-design.md (superseded by v1.2 D-021; pending replacement at canon/articles/font-resolution.md)"
---

# PTXprint MCP Server — Transcript Encoding Session 3

> Continues sessions 1 and 2. Session 3 picked up `O-open-P1-002` (font dependency for headless deployment) after the operator added a hint pointing at SIL's Language Font Finder service. The session ran in two halves: a first-pass design that placed font installation on the PTXprint MCP server, and a late-night architectural correction (operator pushback) that split the work across three thin MCPs — content-cache, fonts, and PTXprint — each holding a single concern. The first half's decisions D-012–D-014 are recorded for historical accuracy and explicitly marked where superseded; D-015–D-018 are the canonical outcomes. The companion design `font-resolution-design.md` reflects the corrected (three-MCP) architecture.

---

## D — Decisions

### D-012 — Font resolution strategy is "Pure C": per-project resolve and pin, no baked fonts beyond container minimums **(superseded in part by D-015–D-018)**
The container ships with `texlive-xetex` + `fontconfig` and an empty managed-font tree. Every font a project needs is resolved at setup time via the SIL Language Font Finder (LFF) service, downloaded, installed under a project-scoped subtree, and pinned in `<project>/shared/ptxprint/fonts.lock.json`. Subsequent typesetting runs are offline against the lock.

**Rationale (operator selection from four placement options):** the alternatives all fail at scale or fail at determinism. Pure A (bake-in) doesn't scale beyond predicted scripts. Pure B (run-time resolve every time) is non-deterministic. Hybrid (A+C) was the assistant's lean but still ships with assumptions. Pure C makes the container fail loudly when font resolution hasn't run, eliminates accidental fall-back to system fonts, and gives every project a verifiable, reproducible font set.

**Subsequent correction:** the per-project pin survives. The host-local managed-font tree does not — bytes belong in R2 (content-addressed), not on the typesetting host. See D-015–D-018.

### D-013 — Session 3 scope is design-doc-only; implementation deferred until O-001 closes
The session produced a design artifact only. No code, no Dockerfile changes, no MCP server modification. Implementation waits until the typesetting path itself is verified to emit PDFs end-to-end (transcript session 1 O-001).

**Rationale (operator selection):** committing font code before the typesetting path is verified risks rework if the typesetting path reshapes. Planning is the cheapest place to absorb that risk.

### D-014 — One new MCP tool (`install_fonts`) on PTXprint MCP **(superseded by D-017)**
The original v1 design proposed `install_fonts` on the PTXprint MCP server: takes a manifest of `(family_id, version, filename, url, expected_sha256)` tuples and, for each, fetches the URL, verifies hash/size, places at a deterministic path under the project's managed-font tree (`/var/lib/ptxprint/managed-fonts/<project_id>/`), and refreshes fontconfig.

**Why this was wrong:** the tool fused two concerns. The fetch-URL-into-storage concern is generic (cache); the place-at-project-relpath-for-typesetting concern belongs to the consumer (PTXprint MCP). Putting both on PTXprint MCP made it know about font catalogues, byte storage, AND typesetting — three concerns in one server, none of them clean. See O-019 for the smell that was missed mid-design.

**Replaced by D-015–D-017:** the work splits across three MCPs. PTXprint MCP gains zero new tools; one optional parameter on `submit_typeset` materialises a tuple list into a job-scoped dir.

### D-015 — Content cache is its own MCP server, separate from fonts and PTXprint
A general-purpose content-cache MCP exposes a small action surface over a content-addressed store backed by Cloudflare R2 (keyed by SHA, with originating URL as metadata) and fronted by the Cloudflare Cache API for warm reads. Source of truth: any URL on the internet. Scope: not font-specific. Pictures, USFM source bundles, anything fetchable benefits from the same primitive.

**Operator quote:** *"all vodka architecture and MCP servers oddkit helps create use any file on the internet as the source, R2 on CF with the url and sha as the filename/key for deterministic lookup. Then the cache api for faster access. That should be the access of the fonts."*

**Cross-ref:** *applies* `klappy://odd/constraints/anti-cache-lying` (content-addressed key, no TTL, no flush-for-correctness); *applies* `klappy://canon/principles/vodka-architecture` (one server, one concern, generic across consumers).

### D-016 — Font resolution is its own MCP server, separate from PTXprint
A fonts MCP wraps SIL Language Font Finder (LFF) and translates a language input (BCP 47 tag, or similar) into a set of `(url, sha, family, role, version, license)` records. The fonts MCP delegates byte access to the content-cache MCP. The fonts MCP knows about fonts and font catalogues; it knows nothing about PTXprint.

**Operator quote:** *"It should be a separate MCP server for font tool(s) for fonts vs the ptxprint MCP server."*

**Cross-ref:** *applies* `klappy://canon/principles/vodka-architecture` (the fonts MCP holds opinions about fonts only, not about who consumes them); *applies* `klappy://canon/principles/dry-canon-says-it-once` (LFF semantics live in one server, not duplicated into PTXprint).

### D-017 — PTXprint MCP holds zero opinions about fonts
PTXprint MCP accepts, at job-submit time, a generic list of `(url, sha, target_relpath)` tuples to materialize into the job's font directory before XeTeX runs. It treats them as opaque files. It does not call LFF, does not understand font roles, does not know the difference between a font and any other binary the agent might want available at job time. The only PTXprint-specific behaviour is composing the job-scoped fontconfig context (existing concern, unchanged).

**Cross-ref:** *applies* `klappy://canon/principles/vodka-architecture`; *applies* `klappy://canon/principles/dry-canon-says-it-once`. *Foreshadows session 5 D-024* — the typesetting MCP's surface stays narrow because everything that isn't typesetting belongs elsewhere.

### D-018 — The first-pass design (`install_fonts` on PTXprint MCP) is partially superseded
The lifecycle (Phase 1 / 2 / 3), the lock-file concept, container minimums, validation surface, failure-mode catalogue, and most of the open questions survive. What does **not** survive: the `install_fonts` tool placement (it was on PTXprint MCP — wrong server), the `/var/lib/ptxprint/managed-fonts/<project_id>/` host-local managed tree (wrong storage location — bytes live in R2, host has only ephemeral job-scoped dirs), and the lock-file's LFF-shaped schema (becomes leaner: tuples plus thin metadata, not LFF records embedded).

The companion design `font-resolution-design.md` reflects the corrected (three-MCP) architecture. The first-pass content survives only as historical reference.

---

## O — Observations

### O-014 — LFF API verified; schema and response shape confirmed against a real call
The Language Font Finder service at `https://lff.api.languagetechnology.org` accepts BCP 47 tags including the `und-<Script>` "undetermined language with explicit script" form. Verified by direct fetch of `/lang/und-Bali` — returned a JSON object with `defaultfamily`, `roles.default`, and per-family records containing `family`, `familyid`, `version`, `license`, `distributable`, `defaults` (regular file pointer), `files[]` (per-file URLs with `axes`, `packagepath`, `zippath`), `packageurl`, `siteurl`, `source`, `status`, `ziproot`. The schema is documented at `silnrsi/langfontfinder/docs/results.md` and shared with `silnrsi/fonts/documentation/families.md`. The service is FastAPI/uvicorn with its own Dockerfile in-repo — self-hostable if SIL availability becomes a concern.

### O-015 — fontconfig version-collision is solvable without per-host version uniqueness
Initial concern (under D-014's host-local managed tree): if two projects pin different versions of the same family, fontconfig would pick one arbitrarily for both, breaking determinism. Resolution: per-job fontconfig isolation in `submit_typeset`. The runner composes a job-scoped fontconfig context (via `OSFONTDIR`, `FONTCONFIG_FILE`, or scoped `XDG_CONFIG_HOME`) that exposes only the current project's locked fonts. Multiple versions can coexist on disk; runtime selection is deterministic.

**Note after correction (D-015):** the version-collision problem disappears entirely once bytes don't live on the host. Each job materialises only what it needs into an ephemeral dir; nothing else exists to collide with. Per-job fontconfig isolation remains the right pattern, but its purpose is now scope hygiene, not version disambiguation.

### O-016 — Phase 1 is the only network-requiring phase; Phases 2 and 3 are offline by design
The lifecycle splits cleanly: resolve (network), verify (offline file checks + `fc-match`), run (offline subprocess). Once `fonts.lock.json` and the referenced files exist, the project is independent of LFF availability for typesetting.

**Refined after correction:** Phase 1 now means "agent populates the cache via cache MCP via fonts MCP via LFF." Phase 2/3 are offline against the cache (R2 cold or Cache API warm). The cache MCP is on the critical path at job time, but it's not LFF and it's not the origin font sites.

### O-017 — Session 1's H-002 (gap-analyze ESE vs first-pass spec) was bypassed, not closed
The session went directly from O-open-P1-002 to font design without performing the gap analysis named as the next handoff in transcript session 1. The choice was operator-driven and rational — the font-finder hint was a fresh datum begging investigation — but the gap analysis remains owed work. Restated as H-015.

### O-018 — Anti-cache-lying constraint already covers the cache pattern
Canon constraint `klappy://odd/constraints/anti-cache-lying` (E0005, stable) prohibits TTL-based caching of derived/mutable content and mandates content-addressed storage as the only acceptable form. The operator's R2-by-SHA + Cache API design is a textbook implementation of the canonical pattern. The cache cannot lie because the key IS the content identity; if the content changes, the key changes; nothing is ever served as something it isn't.

**Implication:** the content-cache MCP design surfaces this as its load-bearing principle — speed comes from architecture, not from staleness windows. The op of the cache is "hash-keyed read-through to R2"; the op is **not** "TTL eviction."

### O-019 — The `install_fonts` smell from the first-pass design was a missed vodka boundary
Mid-design in the first half of the session, the assistant noticed that `install_fonts` "knows about projects" and rationalised it as Pure-C path-pinning. The smell was correct; the rationalisation was wrong. The right boundary, surfaced by the operator, is one server up: the project-pinning concern lives in PTXprint MCP, the font-knowledge concern lives in fonts MCP, and the byte-fetch concern lives in content-cache MCP. Three thin servers, three clean boundaries. The first-pass design fused two of them.

**Cross-ref:** *amends* L-006 — the lesson stands but its reach was insufficient.

### O-020 — Cloudflare Cache API in front of R2 is structurally correct, not a TTL admission
Putting the Cloudflare Cache API in front of an R2 bucket is **not** a TTL-based cache of derived content. The R2 keys are SHAs (immutable identities); the Cache API caches the response for those immutable URLs. A SHA either matches existing storage or it doesn't — the cache has no TTL semantics that affect correctness. This conforms to anti-cache-lying because the key cannot drift from truth: if the content the agent wants changes, the SHA the agent asks for changes, and the Cache API has no entry under the new key, so it falls through to R2 (which also has no entry under the new key, so it falls through to origin). No flush needed; no staleness possible.

---

## L — Learnings

### L-006 — Vodka-correct font installer is one URL-fetch primitive; everything domain-shaped lives upstream
The instinct toward a "smart" `prepare_project_fonts` tool that reads Paratext metadata, calls LFF, and decides what to install was rejected mid-design. That tool would embed three layers of domain knowledge (Paratext, LFF, font policy) in the server. The canon-correct alternative — agent does the reasoning, server does one sandboxed fetch — keeps the server thin and lets canon teach the agent without server redeployment.

**Quote (assistant's mid-design self-correction):** *"This is interesting. Pure-C font resolution actually has a vodka tension. ... Option 3 feels right per vodka. The agent's reasoning loop ... only the install-into-fontconfig step needs server help."*

**Amended by L-008:** the lesson stands but its reach was insufficient. Knowing the operation should be primitive isn't enough; the primitive also needs to be on the right server.

**Cross-ref:** *applies* `klappy://canon/principles/vodka-architecture`

### L-007 — Pre-verifying every fork burns the bottleneck; flag and defer is cheaper than probe-now
The first-pass design surfaced eight open questions (F-Q1 through F-Q8) — BCP 47 mapping, no-recommends behaviour, LFF rate limits, diglot lock semantics, and so on. The temptation was to probe them now. The discipline was to flag them with resolution paths and move on. Probing each would have consumed operator time across multiple round-trips for marginal design gain; the design is robust to any reasonable resolution of those questions.

**Cross-ref:** *applies* `klappy://canon/constraints/mode-discipline-and-bottleneck-respect`

### L-008 — The vodka boundary is "concerns," not "lifecycles"
The first-pass design grouped tools by *when* they ran (Phase 1, Phase 2, Phase 3). That's a lifecycle decomposition, not a concern decomposition. Concerns split by *what they hold opinions about*: bytes-on-disk (cache), fonts-as-fonts (fonts MCP), typesetting (PTXprint MCP). Lifecycle tells you when a tool gets called; concern tells you which server owns the tool. Confusing the two produced a tool that did the right operation in the wrong place.

**Heuristic:** before placing a tool, ask "what does this tool know that no other consumer of its operation would know?" If the answer involves the consumer (e.g., "PTXprint" or "this specific project"), the tool is on the wrong server. If the answer is generic (e.g., "URL → bytes," "language → font family"), the server choice is determined by the answer.

### L-009 — When `oddkit_search` returns prior canon that matches a sketch, the sketch is probably canon-aligned (not coincidence)
The operator's content-cache sketch arrived without reference to canon. A search for "content addressed cache" surfaced `klappy://docs/oddkit/IMPL-content-addressed-caching` and `klappy://odd/constraints/anti-cache-lying` — which describe the exact pattern. The convergence is a signal: the operator is applying internalized canon, not improvising. Worth recognising in the moment so the rewrite doesn't reinvent vocabulary canon already provides.

---

## C — Constraints

### C-007 — Container minimums explicitly exclude all `fonts-*` and `texlive-fonts-*` apt packages
The Dockerfile must use `--no-install-recommends` on `texlive-xetex` to suppress recommends like SIL Charis and Latin Modern user fonts. No `fonts-sil-charis`, no `fonts-noto-*`, no `fonts-liberation`. The image fails loudly when font resolution hasn't run, with no accidental fall-back to system fonts that masks broken locks.

**Note:** TeX-internal Computer Modern / Latin Modern fonts arrive with `texlive-xetex` itself. They are TeX infrastructure, not fontconfig user fonts, and they are not "baked fonts" in the sense this constraint rejects.

**Cross-ref:** *informed* session 5 D-025 ("no system fonts in the Container" decision) — the v1.2 Container image inherits this constraint.

### C-008 — Phase 1 (resolve) is the only network-requiring phase; Phase 2 (verify) and Phase 3 (run) are offline against the cache
After first resolution, a project's typesetting must work without reaching LFF or font origin sites. The lock plus the content-cache (R2) is the long-term memory. The cache MCP itself remains on the critical path at job time, but it's on the same Cloudflare network as the runner, not the open internet.

### C-009 — Storage is R2 only; no host-local font caches
Bytes live in R2, keyed by SHA. The Cloudflare Cache API may serve warm reads. No persistent host-local "managed font tree" of any kind. Each PTXprint job, when launched, materialises only the fonts it needs into a job-scoped ephemeral directory, populated from the cache MCP, and that directory is torn down at job end (or at most, lives as long as the runner instance does as opportunistic warm cache).

This eliminates the version-collision problem that motivated per-job fontconfig isolation in the first-pass design — *not because the problem disappears*, but because the bytes were never co-located in the first place. Per-job fontconfig isolation remains the right pattern, but its purpose is now scope hygiene, not version disambiguation.

### C-010 — Cache key construction is governed and not negotiable
R2 keys must be `sha256:<hex>` or equivalent prefix-namespaced SHA. The originating URL is metadata, not part of the key, because two URLs serving the same content should resolve to the same blob and a single URL serving different content over time must produce different keys. This direction is the only direction that preserves the anti-cache-lying property.

### C-011 — The fonts MCP must not pin font versions implicitly
When the agent asks the fonts MCP to resolve a language tag, the response includes the SHA of each file. If the agent re-asks later, the response may contain different SHAs (LFF updated, new font version). The fonts MCP returns truth about *now*; the agent and the PTXprint lock-file decide *what to pin*. Pinning is a downstream concern, not a fonts-MCP concern. This keeps the fonts MCP idempotent across LFF version drift instead of stateful across it.

---

## H — Handoffs

### H-007 — Author canon article documenting the agent reasoning loop (font resolution)
Before implementation, the canon repo (per session 2 D-006) needs an article describing: detection triggers, project-metadata reading, LFF query patterns, distributable/license policy, manifest construction, and lock-write discipline. Without this, the agent has no canonical guide for the loop the design assumes exists. **Loop now spans three MCPs (cache, fonts, PTXprint) instead of one.**

### H-008 — Resolve F-Q1 and F-Q2 (BCP 47 tag mapping from Paratext)
Probe LFF with `eng`, `eng-Latn`, `swh`, `swh-Latn`, `und-Latn`, and several real Paratext `LanguageIsoCode` values from the in-repo `ptx2pdf/tests/` projects. Document the canonical transformation in canon. Gates the agent's ability to construct LFF queries reliably.

### H-009 — Verify F-Q3 (`--no-install-recommends` behaviour) in a clean Ubuntu container
Build a minimal image with `apt-get install --no-install-recommends texlive-xetex fontconfig ca-certificates`. Run `dpkg -l | grep -i font`. Confirm no `fonts-*` packages present. Confirm `fc-list` returns only Computer Modern and similar TeX-internal fonts. Gates the Dockerfile commit.

### H-011 — Read `klappy://docs/oddkit/IMPL-content-addressed-caching` before writing the content-cache MCP
The implementation doc surfaced in search but was not read in this session. Read before any code goes on the content-cache MCP — the patterns oddkit already uses for SHA-keyed R2 storage are the reference implementation; the new MCP should mirror them, not diverge.

### H-012 — Decide naming for the content-cache MCP
Candidates surfaced in passing: `cdn`, `blobcache`, `content-cache`, `bytes`, `fetch-cached`. Naming has design consequences (the more generic, the more reusable; the more specific, the more its scope is self-policing). Defer until at least one other MCP has a use for it beyond fonts — name it for the second consumer, not the first.

### H-013 — Decide naming and tool surface for the fonts MCP
Candidates: `fonts`, `lff`, `language-fonts`. The proposed tool surface is small — likely `resolve_language_fonts(tag) → [{family, role, url, sha, version, license, distributable}]` and possibly `list_supported_scripts()`. Surface review goes in the design doc.

### H-014 — The first-pass design retains value as a lifecycle reference
Don't delete the v1 design content. The architecture sections (tool placement, host-local managed tree) are wrong; the rest is reusable. The companion `font-resolution-design.md` carries the corrected (three-MCP) architecture forward.

### H-015 — Restated from session 1 H-002: gap-analyze ESE surface against first-pass MCP spec
This session deferred this. Should be picked up before implementation or in parallel with H-007. The first-pass spec describes 17 tools claiming to emit PDFs; the v1 spec describes 10. The ESE describes the upstream codebase. Whether the v1 spec captures everything the codebase actually does (and nothing extra) is the analysis the prior session named and the project still owes itself.

---

## Q-open — Open Questions

| ID | Question | Resolution path |
|---|---|---|
| F-Q1 | BCP 47 tag construction from Paratext `LanguageIsoCode` | Probe LFF with sample tags; author canon. (H-008) |
| F-Q2 | Canonical source(s) of project language metadata | Read `Settings.xml` from `ptx2pdf/tests/`; author canon. (H-008) |
| F-Q3 | Does `--no-install-recommends` cleanly exclude font packages? | Test in clean container. (H-009) |
| F-Q4 | LFF rate limits, auth, change risk | Read silnrsi/langfontfinder deployment docs; check with SIL team if needed. |
| F-Q5 | Diglot configurations: union lock or per-config locks? | Walk through a real diglot project. |
| F-Q6 | PTXprint font-selection mechanism: name-based via fontconfig, or axis-based? | Read PTXprint Python source. |
| F-Q7 | Cross-project font sharing (storage optimisation) | Non-issue once bytes live in R2 — SHA dedupe is automatic. |
| F-Q8 | Eviction policy for older font versions | Non-issue once per-job dirs are ephemeral. |
| F-Q9 | When the agent does `submit_typeset` with a font tuple list, does the PTXprint MCP fetch from cache MCP itself (server-to-server), or does the agent fetch via cache MCP and pass bytes? | Server-to-server is faster and means PTXprint MCP holds a content-cache MCP client. Agent-passes-bytes is purer vodka but base64-shuttles binaries — unworkable. Lean: server-to-server, with the cache MCP exposed as a runtime URL that the PTXprint MCP knows. |
| F-Q10 | Where does the fonts.lock.json live now that the bytes don't live in `<project>/managed-fonts`? | `<project>/shared/ptxprint/fonts.lock.json` — it's project metadata, not byte storage. The lock points at SHAs in the cache, not local paths. |
| F-Q11 | Cache MCP's storage rules — does it fetch on every miss, or does it expose a "register this URL+SHA" pre-warm? | First pass: fetch-on-miss. Pre-warm via `register_content` exists implicitly (the agent can call it eagerly). No separate pre-warm tool. |
| F-Q12 | License gate — does the cache MCP know about distributability, or does it cache anything the agent throws at it? | Cache MCP caches anything (it's storage, not policy). License policy lives in the fonts MCP and in the agent's reasoning. The cache MCP cannot distinguish a font from a video; it shouldn't. |
| F-Q13 | What happens when `register_content` is called for a URL that returns different bytes than `expected_sha256` says? | `register_content` returns failure with the actual SHA. Agent decides whether to pin to actual or treat as upstream regression. The cache stores under the actual SHA regardless (immutable). |
| F-Q14 | How does the agent ensure SHA pinning means the same content years from now if R2 storage costs force eviction? | R2 doesn't auto-evict. If a project's SHA is gone from R2, `url_hint` is the rebuild hint; if that's also dead, the project is broken and a re-resolve via fonts MCP is the recovery. This is acceptable. |

---

## Cross-Reference Summary — Sessions 1, 2, 3

| Prior session item | Session 3 outcome |
|---|---|
| Session 1 D-001 (headless CLI is the agentic surface) | Reaffirmed; Phase 3 is the headless run unchanged |
| Session 1 D-002 (English Bibles initial scope) | Reaffirmed; trivially handled by the design (one family, OFL, distributable) |
| Session 1 O-001 (no PDF emitted yet) | Used as the explicit gate for D-013 — implementation waits on this |
| Session 1 O-open-P1-002 (font dependency) | Resolved at design level; impl deferred per D-013 |
| Session 1 H-002 (gap-analyze ESE vs first-pass spec) | Carried forward as H-015 |
| Session 2 D-004 (action-only MCP, no bundled retrieval) | Reaffirmed; agent does LFF, server does one fetch primitive |
| Session 2 D-006 (canon in separate repo) | Depended on by H-007 — canon must exist for the agent loop |
| Session 2 D-008 (fly.io for hackathon) | No change in this session; later reversed by session 5 D-025 (CF Containers) |
| Session 2 D-011 (10-tool surface, soft commitment) | Maintained; **zero new tools added to PTXprint MCP** by the corrected design (D-017). One optional parameter on `submit_typeset`. |
| Session 2 H-005 (verify ptx2pdf licence before mirroring docs) | Independent; still owed |
| Session 2 H-006 (filter 1000-config corpus) | Independent; still owed |

---

*End of session 3 encoding. Companion artifact: `font-resolution-design.md` (the corrected three-MCP architecture). The architecture decisions in this encoding (D-015 through D-018) foreshadow session 5 D-021 (binary inputs by URL+sha256) and D-024 (tool surface stays narrow because everything that isn't typesetting belongs elsewhere).*
