---
title: "Font Resolution Design v2 — Three-MCP Architecture"
subtitle: "Content-cache MCP, fonts MCP, and the thin PTXprint integration"
audience: project
exposure: working
voice: neutral
stability: working
tags: ["ptxprint", "mcp", "fonts", "content-cache", "design", "vodka-architecture", "lff", "r2", "cloudflare"]
version: "v0.2-draft"
date: 2026-04-28
supersedes_partial: "font-resolution-design.md (session 3 v1)"
companion_to: "ptxprint-mcp-v1-spec.md, transcript-encoded-session-3-1.md"
addresses: "transcript-encoded.md#O-open-P1-002"
applied_canon:
  - klappy://canon/principles/vodka-architecture
  - klappy://canon/principles/kiss-simplicity-is-the-ceiling
  - klappy://canon/principles/dry-canon-says-it-once
  - klappy://odd/constraints/anti-cache-lying
status: draft_for_review
---

# Font Resolution Design v2 — Three-MCP Architecture

> The font dependency for headless PTXprint deployment is not one problem; it is three. Bytes need a home, font catalogues need a translator, and PTXprint needs fonts in the right place at job time. Three concerns, three MCPs, three thin servers. None hold opinions about the others' domains. The cache cannot lie because its key is the content's identity. The fonts MCP knows about LFF and nothing else. PTXprint MCP knows about typesetting and accepts opaque file tuples at job submit. This document specifies all three.

---

## 0. What Changed from v1

**Survives:** the lifecycle (resolve / verify / run), the lock-file concept, the container-minimums commitment, the failure-mode catalogue (mostly), the validation surface.

**Replaced:** the `install_fonts` tool placement (it was on PTXprint MCP — wrong server). The host-local `managed-fonts` tree (bytes live in R2, not on the typesetting host). The lock-file's LFF-shaped schema (becomes a thin tuple list with metadata). The single-server framing.

The v1 design is retained as a lifecycle/failure-mode reference. Its architecture sections are superseded by this document.

---

## 1. The Three Servers, At a Glance

| MCP | Concern | Holds opinions about | Holds zero opinions about |
|---|---|---|---|
| **content-cache MCP** | Bytes addressable by content hash | URL fetching, SHA verification, R2 storage, Cloudflare Cache API integration | What the bytes *are*. Fonts, images, PDFs, source bundles — all the same to it. |
| **fonts MCP** | Translating "what font does this language need?" into specific files | LFF API, BCP 47 tag normalisation, font roles, license/distributability policy | Where bytes are stored, who consumes the resolved set, project layout |
| **PTXprint MCP** | Typesetting Paratext projects via PTXprint subprocess | Project trees, configurations, USFM, XeTeX invocation, fontconfig job-scope | Font catalogues, content caching, what fonts mean for which language |

Each server is independently useful. Content-cache is a generic CDN-shaped primitive. Fonts MCP serves any consumer wanting language-to-font mapping. PTXprint MCP could ship without ever knowing about the other two — it accepts opaque file tuples at job-submit time and trusts the agent to provide whatever's needed.

---

## 2. The Content-Cache MCP

### 2.1 Purpose

A content-addressed read-through cache for arbitrary URLs. SHA-keyed R2 storage with the Cloudflare Cache API in front. The key IS the identity of the content, per `klappy://odd/constraints/anti-cache-lying`. Stale-cache lying is structurally impossible: changing content changes the key.

### 2.2 What it is, in one sentence

A tool that takes `(url, expected_sha256)` and returns bytes — fetching and storing on first call, serving from cache on every subsequent call — with the guarantee that the bytes returned hash to the SHA the caller asked for, or the call fails.

### 2.3 Storage layout

```
R2 bucket: content-cache
Key pattern: sha256/<hex>
Value: the file bytes
Metadata (as R2 customMetadata or a sibling key):
  - first_seen_url: the URL where this content was first observed
  - first_seen_at: timestamp
  - bytes: file size
  - content_type: as observed (informational only)
```

The originating URL is metadata, not part of the key. Two URLs that serve the same content resolve to the same R2 object. A single URL serving different content over time produces different keys for different SHAs (and the old SHA's blob lives on, immutable).

### 2.4 Cloudflare Cache API in front

Reads against `https://content-cache.<host>/sha256/<hex>` are cacheable URLs from the Worker's perspective. Cache API stores them at the edge. Because the URL contains the SHA, the cached response is bound to immutable content. No TTL required for correctness; long Cache-Control max-age is a pure latency optimisation that cannot drift from truth.

### 2.5 Tool surface (proposed)

| Tool | Inputs | Returns | Notes |
|---|---|---|---|
| `get_content` | `sha256` (hex), optional `url_hint` | `{bytes, sha256, content_type, bytes_size, source: "cache" \| "r2" \| "origin"}` | If R2 has it, return. If not and `url_hint` provided, fetch, verify SHA, store, return. If not and no hint, return `{found: false}`. |
| `register_content` | `url`, optional `expected_sha256` | `{sha256, bytes, source: "cache_hit" \| "fetched"}` | Fetches the URL, computes SHA (and verifies if `expected_sha256` provided), stores in R2. Returns the canonical SHA the agent should pin. Idempotent — calling twice on the same URL with stable content returns the same SHA from cache without re-fetching. |
| `head_content` | `sha256` | `{exists: bool, bytes?: int, first_seen?: timestamp}` | Cheap existence check. Useful for the PTXprint MCP's pre-job verification step. |

Three tools. Possibly two — `get_content` could merge with `head_content` via an `include_bytes: bool` flag — but split feels right because the bytes-loaded path is operationally different (large transfer) from the existence-only path (metadata only).

### 2.6 Anti-cache-lying compliance

Per `klappy://odd/constraints/anti-cache-lying`:

- ✅ Rule 1 (no TTL on derived/mutable): content stored under SHA keys is by definition immutable.
- ✅ Rule 2 (key IS identity): `sha256/<hex>` is the identity; the key cannot drift from the content.
- ✅ Rule 3 (no flush for correctness): there is no flush mechanism. R2 is forever (modulo storage hygiene per rule 5 below).
- ✅ Rule 4 (TCO measured before claiming "faster"): the architecture is faster *and* truthful. The latency win is a pure architectural artifact, not a staleness gamble.
- ✅ Rule 5 (speed from architecture): R2 + Cache API at the edge IS the architecture. No pretending yesterday's answer is today's.

Storage hygiene: orphaned SHAs (content nothing references anymore) can be garbage-collected on a schedule. This is the only valid "cleanup" — it never affects correctness because nothing pointed at the GC'd SHA when collection happens.

### 2.7 What it deliberately does not do

- Does not know about content types beyond informational metadata.
- Does not validate license, distributability, or any other policy.
- Does not know who its consumers are.
- Does not provide URL-keyed lookup (only SHA-keyed). The originating URL is metadata, not an addressing primitive.
- Does not implement TTL, flush-for-correctness, or any other lying mechanism.

---

## 3. The Fonts MCP

### 3.1 Purpose

Translate language-and-script input (BCP 47 tag, primarily) into a set of font records, each containing a SHA pre-registered with the content-cache MCP. Wraps SIL Language Font Finder (LFF) at `https://lff.api.languagetechnology.org`. Knows about font catalogues; knows nothing about who consumes the answer.

### 3.2 Why a separate MCP and not just direct LFF calls from the agent

Three reasons, in order of importance:

1. **Vodka.** LFF's response shape, the BCP 47 normalisation rules, the distributability policy, the role-mapping logic — all of these are font-domain opinions. They belong in one server, not in every agent's prompt and not in PTXprint MCP.
2. **Pre-registration.** When the fonts MCP returns a record, the SHA in that record is already in the content-cache. The agent doesn't have to call LFF, then download to compute SHAs, then register. The fonts MCP does the LFF→cache leg as part of resolution, returning records the agent can pin immediately.
3. **Substitutability.** LFF is one source. Future sources (Noto's own catalogue, custom font pools, operator-provided URL stashes) plug in behind the same fonts MCP surface without changing consumers.

### 3.3 Tool surface (proposed)

| Tool | Inputs | Returns | Notes |
|---|---|---|---|
| `resolve_language_fonts` | `bcp47_tag` (e.g. `"eng-Latn"`, `"und-Bali"`), optional `roles_needed` (default: regular, bold, italic, bold-italic) | `[{family, family_id, version, license, distributable, role, url, sha256, bytes, source: "lff"}, ...]` | Calls LFF, applies distributability/license policy, follows fallback chains for non-distributable results, registers each chosen file with content-cache MCP, returns records with SHAs. |
| `describe_family` | `family_id` | `{family, family_id, version, license, distributable, files: [...]}` | Direct LFF lookup by familyid for cases where the agent knows the family it wants but not via a language tag. Optional v1 — not strictly needed if resolution is the main path. |
| `list_sources` | — | `[{source_id, name, base_url, status}]` | Reports which catalogues this fonts MCP knows about. v1: just `lff`. |

Two tools probably suffice for v1. `describe_family` is a convenience for the rare "I know the family, just give me the SHA" case.

### 3.4 Policy that lives here

- BCP 47 normalisation (raw `eng` vs `eng-Latn` vs `und-Latn`).
- Distributability gate: records with LFF's `distributable: false` are rejected; the configured fallback familyid is followed if present; otherwise the record is returned with `available: false` and the reason.
- License preference order (configurable, default OFL > Apache > others).
- Role mapping: turning LFF's per-file `axes` (weight/italic) into role names PTXprint understands (Regular, Bold, Italic, BoldItalic).
- LFF version drift handling: each `resolve` call reflects LFF *now*. Pinning across drift is the consumer's responsibility (PTXprint MCP's lock file).

### 3.5 What it deliberately does not do

- Does not store bytes. All byte storage is content-cache MCP's concern. Fonts MCP holds metadata and returns pointers.
- Does not understand projects, configurations, or PTXprint. Its consumers can be anything.
- Does not pin versions across calls. Idempotency is a property of stable LFF responses, not internal fonts-MCP state.
- Does not know about XeTeX, fontconfig, or rendering. It returns metadata; consumers materialise.

---

## 4. The PTXprint MCP — Font Integration Surface

### 4.1 What changes vs the v1 spec

Almost nothing. PTXprint MCP gains zero new tools. The existing `submit_typeset` tool gets one optional parameter, and the runner inside it gains one pre-flight step.

### 4.2 The optional parameter on `submit_typeset`

Add `materialize_files: list[FileTuple]` (optional, default empty):

```
FileTuple {
  sha256: string,           # the content-cache SHA
  target_relpath: string,   # path within the job's font dir, e.g. "charissil/CharisSIL-Regular.ttf"
  url_hint: string?         # optional, passed to content-cache if SHA isn't in cache yet
}
```

The agent constructs this list from the project's `fonts.lock.json` (see §5) and passes it on every `submit_typeset` call. The PTXprint MCP runner, before launching XeTeX:

1. For each tuple, calls content-cache MCP (`get_content` or `head_content`) to confirm the SHA is available.
2. Materialises the bytes into a job-scoped directory (e.g. `/tmp/ptxprint-job-<id>/fonts/<target_relpath>`).
3. Composes a job-scoped fontconfig context that points at that directory only (per v1 §9 — mechanism unchanged).
4. Runs `fc-cache -f` against the job dir.
5. Launches XeTeX with the fontconfig environment scoped to the job.
6. On job completion (success or failure), tears down the job dir.

If `materialize_files` is empty and the project has any font requirements, XeTeX will fail to find fonts — surfaced as a hard failure. The runner does not silently fall back to system fonts (system has none, per container minimums).

### 4.3 What PTXprint MCP knows about fonts

Nothing beyond "files that go in a directory before XeTeX runs." It does not know what makes a font a font. It does not know which consumer or fonts MCP produced the tuple list. It does not parse `fonts.lock.json` (the agent does, before calling).

### 4.4 What changes in the lock file

`<project>/shared/ptxprint/fonts.lock.json` becomes thinner. It pins SHAs (the immutable identity) and target paths (where they go in the job dir). Non-SHA metadata is for human readability; the SHA is what's load-bearing.

```json
{
  "$schema": "klappy://canon/ptxprint/fonts-lock-schema/v2",
  "lock_version": "2",
  "generated_at": "2026-04-28T03:55:00Z",
  "generated_by": "agent-id-or-tool-version",
  "resolver": {
    "service": "lff",
    "service_url": "https://lff.api.languagetechnology.org",
    "queried_tags": ["eng-Latn"]
  },
  "files": [
    {
      "sha256": "abc123...",
      "target_relpath": "charissil/CharisSIL-Regular.ttf",
      "family": "Charis SIL",
      "family_id": "charissil",
      "version": "7.000",
      "role": "regular",
      "license": "OFL",
      "url_hint": "https://software.sil.org/.../CharisSIL-Regular.ttf"
    }
  ],
  "rejected": [
    {
      "family_id": "someproprietary",
      "reason": "distributable=false",
      "fallback_used": "charissil"
    }
  ]
}
```

The shape parallels v1 but the load-bearing fields are `sha256` and `target_relpath`. Everything else is metadata for humans, debugging, and re-resolution.

---

## 5. The Lifecycle, Now Across Three Servers

### 5.1 Phase 1 — Resolve and pin (one-shot per project, or on language change)

```
Agent reads <project>/Settings.xml (and any other PTXprint metadata).
Agent constructs a BCP 47 tag (canon documents the mapping).

→ Agent calls fonts MCP: resolve_language_fonts(tag="eng-Latn")
    → fonts MCP calls LFF
    → fonts MCP applies policy (distributability, fallbacks, role mapping)
    → fonts MCP calls content-cache MCP register_content(url, expected_sha256)
       for each chosen file (cache fetches from origin, computes SHA, stores in R2)
    → fonts MCP returns records with SHAs

Agent writes <project>/shared/ptxprint/fonts.lock.json with the SHAs and target paths.
```

Phase 1 runs once. The SHAs are immutable. The lock file is now the project's font identity.

### 5.2 Phase 2 — Verify (every typesetting run, before XeTeX launch)

```
Agent calls submit_typeset(project, config, materialize_files=<from lock>).
PTXprint MCP runner:
  For each FileTuple:
    → content-cache head_content(sha256)
       If not present:
         → content-cache get_content(sha256, url_hint)
            (re-fetches from origin if R2 also missed; verifies SHA)
         If still missing → hard fail with the missing SHA.
    → Materialise bytes into job-scoped dir at target_relpath.
  Run fc-cache against job dir.
  Run fc-match for each declared family to verify resolvability.
  If any fail → hard fail before launching XeTeX.
```

### 5.3 Phase 3 — Run

XeTeX runs in the job-scoped fontconfig context. Same as v1.

---

## 6. Failure Modes (delta from v1)

Most of v1's catalogue carries forward. The relevant changes:

| Failure (new or changed) | Caught at | Disposition |
|---|---|---|
| Content-cache MCP down | Phase 2 | Hard fail. The MCP is on the critical path; no fallback. (If high availability becomes a requirement, that's a v2 concern — multiple regions, replicated R2.) |
| SHA in lock not in cache and `url_hint` is dead | Phase 2 (cache fall-through) | Hard fail with the dead URL. Agent re-runs fonts MCP `resolve` to refresh the lock. |
| Cache contains content that doesn't hash to the requested SHA | Cannot happen by construction | The cache verifies on store; serving violates anti-cache-lying. If somehow it does, the response includes the actual SHA and the consumer detects the mismatch. |
| LFF schema changes | fonts MCP | Surfaces as resolution failure. fonts MCP gets a code update; PTXprint MCP and content-cache are unaffected. |
| Two projects pin the same SHA | Cannot fail; the cache deduplicates by definition | Cost saving, not a hazard. |

The host-local-tree failure modes from v1 (managed tree corruption, version-collision via fontconfig name collisions) **disappear** because there is no host-local persistent tree and the job-scoped dir contains only what this job needs.

---

## 7. Agent Reasoning Loop (to be authored as canon)

Across the three MCPs, the agent's loop is:

1. **Detect.** No `fonts.lock.json` present, or refresh requested, or Phase 2 verification failed.
2. **Read project metadata.** Construct BCP 47 tag from `Settings.xml` (canon documents the mapping).
3. **Call `fonts.resolve_language_fonts(tag)`.** Receive records with SHAs.
4. **Apply project-specific policy.** Add or remove roles based on the project's stylesheet. Override fallbacks if the project has explicit preferences. (Most projects have none of this.)
5. **Write `fonts.lock.json`.** Via PTXprint MCP `write_file`.
6. **(All future typesetting runs.)** Read lock, pass `materialize_files` to `submit_typeset`.

Canon authoring is needed for steps 2 and 4 specifically. Step 3 is mechanical (one MCP call). Steps 5 and 6 are file IO.

---

## 8. Container Minimums (v1 §4 carries forward, lightly amended)

Unchanged:
- `texlive-xetex` with `--no-install-recommends`
- `fontconfig` and CLI utilities
- Python 3.11+
- PTXprint and its Python deps
- `ca-certificates`
- The PTXprint MCP server

Removed (was in v1, no longer needed):
- The empty managed-fonts root `/var/lib/ptxprint/managed-fonts/`
- The fontconfig include file at `/etc/fonts/conf.d/50-ptxprint-managed.conf`

(Both replaced by per-job dirs and per-job fontconfig contexts.)

Added:
- Network access to the content-cache MCP at runtime (for `get_content`/`head_content`)
- Network access to the fonts MCP at agent-resolve time (Phase 1 only — runtime is offline against cache)

The container itself stays as small as v1 promised; the addition is two HTTP endpoints to reach.

---

## 9. Open Questions (v2 set; v1's §12 carries forward, intersected with the new architecture)

| ID | Question | Resolution path |
|---|---|---|
| F-Q1 | BCP 47 tag construction from Paratext `LanguageIsoCode` (carried from v1) | Probe LFF; canon documents the mapping; lives in fonts MCP. |
| F-Q2 | Canonical source(s) of project language metadata (carried from v1) | Read `Settings.xml`; canon. |
| F-Q3 | Does `--no-install-recommends` cleanly exclude font packages? (carried from v1) | Test in clean container. |
| F-Q4 | LFF rate limits / auth (carried from v1) | Surfaces in fonts MCP. |
| F-Q5 | Diglot lock semantics (carried from v1) | Walk through real diglot project. |
| F-Q6 | PTXprint font-selection mechanism (carried from v1) | Read PTXprint Python source. |
| F-Q9 | Server-to-server cache fetch vs agent-passes-bytes | Server-to-server. PTXprint MCP holds a cache MCP client URL. (Resolution: see §4.2.) |
| F-Q10 | Lock file location now that bytes don't live locally | `<project>/shared/ptxprint/fonts.lock.json`. (Resolution: see §4.4.) |
| F-Q11 | Cache MCP fetch-on-miss vs pre-warm tool | Fetch-on-miss for v1. Pre-warm via `register_content` exists implicitly (the agent can call it eagerly). No separate "pre-warm" tool. |
| F-Q12 | Cache MCP license/distributability awareness | None. Cache caches anything. Policy lives in fonts MCP and the agent. |
| F-Q13 | What happens when `register_content` is called for a URL that returns different bytes than `expected_sha256` says? | `register_content` returns failure with the actual SHA. Agent decides whether to pin to actual or treat as upstream regression. The cache stores under the actual SHA regardless (immutable). |
| F-Q14 | How does the agent ensure SHA pinning means the same content years from now if R2 storage costs force eviction? | R2 doesn't auto-evict. If a project's SHA is gone from R2, `url_hint` is the rebuild hint; if that's also dead, the project is broken and a re-resolve via fonts MCP is the recovery. This is acceptable. |

(F-Q7 and F-Q8 from v1 — cross-project sharing and version eviction — become non-issues because per-job dirs are ephemeral and R2 dedupes by SHA naturally.)

---

## 10. Acceptance for This Design

This design is acceptable for review when:

- The three MCPs in §1 each pass the vodka test (single concern, generic across consumers).
- The content-cache MCP in §2 satisfies every rule of `klappy://odd/constraints/anti-cache-lying`.
- The fonts MCP in §3 has a tool surface justified by KISS — every tool justifies itself against the alternative of not existing.
- The PTXprint MCP integration in §4 is genuinely thin — the spec change is one optional parameter and a runner pre-flight step, no new tool, no domain knowledge added.
- The lifecycle in §5 closes the loop from "no lock" to "PDF emitted" with named server boundaries at every step.
- Open questions in §9 are framed as resolution-paths.

This design is *not* acceptable for implementation until:

- Transcript O-001 closes (PTXprint MCP observed emitting a PDF end-to-end).
- The canon repo (session 2 D-006) exists and carries the agent reasoning loop and BCP 47 mapping.
- Naming for content-cache and fonts MCPs is decided (handoffs H-012, H-013 in session 3.1).

---

## 11. What This Architecture Buys

1. **Anti-cache-lying compliance by construction.** Cannot drift; cannot lie.
2. **Reusable cache primitive.** Pictures, source bundles, anything URL-addressable benefits from the same MCP.
3. **PTXprint MCP stays vodka.** Zero new tools for fonts; one optional parameter is the entire surface change.
4. **Fonts MCP can grow new sources.** LFF today; tomorrow's catalogue plugs in without disturbing PTXprint MCP or the cache.
5. **Per-job ephemeral storage.** No managed-tree maintenance, no version-collision hazards on the host.
6. **Server-to-server byte transfer.** Avoids base64-shuttling binaries through MCP envelopes.
7. **Per-project pinning preserved.** The lock file is the long-term memory; it just points at SHAs instead of paths.

---

*End of v2 design. Companion encoding: `transcript-encoded-session-3-1.md`. Open questions tracked here as F-Q1 through F-Q14. Implementation deferred until O-001 closes and canon exists for the agent loop.*
