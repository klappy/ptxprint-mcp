---
title: "Font Resolution — How Fonts Reach the Worker"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "fonts", "lff", "sha256", "manifest"]
derives_from: "canon/governance/headless-operations.md (font references), canon/articles/_archive/font-resolution-design.md (design history)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

> ⚠️ **Phase 1 (hackathon week, per session 7 D-025).** Phase 1's Container image bundles SIL Charis system-wide; the agent leaves the payload's `fonts` array empty and PTXprint resolves Charis via fontconfig. The strict "no system fonts; everything via payload" stance described in the rest of this article is the **Phase 2/3** target, when payload-fetched fonts replace the bundled set and multi-script support is added. For Phase 1 English-Bible work, `fonts: []` is the correct value.

# Font Resolution

> **What this answers.** How does the worker get fonts? What goes in the payload's `fonts` array? What if a font is missing?
>
> **Related articles.** `klappy://canon/articles/payload-construction` · `klappy://canon/articles/failure-mode-taxonomy`

---

## The contract

In v1.2, every font the project references is a payload entry with a URL and sha256:

```json
"fonts": [
  {
    "family_id": "charissil",
    "version": "7.000",
    "filename": "CharisSIL-Regular.ttf",
    "url": "https://lff.api.languagetechnology.org/...",
    "sha256": "<sha256 of the file at the url>"
  },
  {
    "family_id": "charissil",
    "version": "7.000",
    "filename": "CharisSIL-Bold.ttf",
    "url": "...",
    "sha256": "..."
  }
]
```

The Container worker fetches each URL in parallel, hashes the bytes as they arrive, and aborts the job with a hard failure if any sha256 doesn't match. Fonts that pass verification are placed where PTXprint can find them via fontconfig.

**The worker has no font cache shared with other jobs.** Every job re-fetches its fonts. URL stability matters for performance.

**The worker excludes system fonts.** Per session 3 C-007, the Container does not install `fonts-sil-charis`, `fonts-noto-*`, or any `fonts-*` package. If a font isn't in the payload, PTXprint won't find it, and the run fails loudly. There is no silent fallback.

## Per-style entries

Most font families have multiple style files (Regular, Bold, Italic, Bold Italic). Each is a separate `fonts` array entry. PTXprint picks the right one by querying fontconfig at typeset time; the agent's job is to put all required styles in the array.

Common scriptural fonts and their typical files:

| Family | Common files |
|---|---|
| Charis SIL | `CharisSIL-Regular.ttf`, `CharisSIL-Bold.ttf`, `CharisSIL-Italic.ttf`, `CharisSIL-BoldItalic.ttf` |
| Andika | `Andika-Regular.ttf`, `Andika-Bold.ttf`, `Andika-Italic.ttf`, `Andika-BoldItalic.ttf` |
| Doulos SIL | `DoulosSIL-R.ttf` (single weight) |
| Noto Sans | per-script: `NotoSansHebrew-Regular.ttf`, `NotoSansArabic-Regular.ttf`, etc. |

When in doubt about which styles a font family ships, query the source (LFF, the foundry's site, etc.) for its file inventory.

## Where fonts come from

The agent has three typical paths to a font URL:

### 1. SIL Language Font Finder (LFF)

For SIL fonts and many open-script fonts, LFF (`lff.api.languagetechnology.org`) provides versioned, content-addressed downloads. The URL stays stable as long as the version is referenced. Recommended for English Bibles per session 1 D-002 (initial scope: English with Charis SIL).

### 2. R2 staging via `get_upload_url`

When the user has a font on local disk that's not on a public CDN:

```
get_upload_url(filename="CharisSIL-Regular.ttf", content_type="font/ttf")
→ { put_url, get_url, expires_at }
```

The agent (or its host) HTTP PUTs the file to `put_url`, computes its sha256, and includes `get_url` + the sha256 in the payload. Uploads expire after 24 hours.

### 3. Other URL sources

Any HTTPS-fetchable URL works as long as the worker can reach it without auth. Foundry CDNs, the user's own server, content-addressed CDNs. The agent verifies that the URL returns the expected content (or computes the sha256 from a known-good copy first).

## Computing the sha256

The agent has a few options:

- **From a local file:** standard `sha256sum file.ttf` or equivalent in the agent's host environment.
- **From a known-good source:** if LFF or the foundry publishes hashes, use those.
- **By staging-then-hashing:** PUT to R2 via `get_upload_url`, then have the agent's host fetch the same URL back and compute the hash.

The hash must be hex-encoded lowercase, 64 characters. The worker is strict about format.

## Which fonts the project references

Two ways to know:

### From the cfg

The `[document]` section's font keys (exact names vary; verify against canon's tooltip-derived index) name the body, italic, bold, and special-purpose fonts. For diglot, `[diglot_L]` and `[diglot_R]` carry their own font keys.

### From inspection

The agent reads the project's existing `ptxprint.cfg` from project state, grep for keys mentioning `font`, and assembles the list.

For brand-new configs, default fonts apply. For Bible-scope configs in English, Charis SIL is the standard starting point.

## What happens if a font is missing

The job fails hard:

```
exit_code: 4
errors: ["! Font \\xyz not loadable"]
failure_mode: "hard"
```

The fix is to add the missing font to the payload's `fonts` array and re-submit. New `payload_hash`, fresh run.

## What happens if a font's sha256 doesn't match

The worker aborts before invoking PTXprint:

```
exit_code: 1
errors: ["sha256 mismatch on fonts[2]: CharisSIL-Bold.ttf"]
failure_mode: "hard"
```

The fix is to recompute the hash from the actual content at the URL, update the payload, and re-submit. If the URL's content has changed since the agent last verified it, that's a different problem (URL instability) — see below.

## URL stability and the cache

`payload_hash` includes the URLs in `fonts`, `sources`, `figures`. Two payloads pointing at the same font via different URLs hash differently and miss the cache. Two payloads pointing at the same URL but the URL's content has changed will both fail sha256 verification (because the agent's recorded hash was for the old content).

For best cache effectiveness:

- Prefer LFF or content-addressed URLs (the hash is in the URL — same content, same URL, forever).
- Avoid presigned URLs with short expiry as font sources unless the alternative is no font at all.
- When a font is updated upstream, the agent's stored hash becomes obsolete; surface this to the user before re-running.

## Multi-script projects

Out of scope for v1.2 hackathon (per session 1 D-002, initial scope is English Bibles). Notes for future:

- Each script needs its own font(s) installed. Hebrew, Arabic, CJK, Indic, Myanmar all have specific font requirements.
- Some scripts need shaping engines (HarfBuzz). PTXprint handles this when fonts are present; the agent doesn't configure it.
- The cfg's `[scripts]` section gates per-script behaviour. Don't enable scripts the project doesn't actually use.

## A worked-minimum English-Bible payload

```json
"fonts": [
  {
    "family_id": "charissil",
    "version": "7.000",
    "filename": "CharisSIL-Regular.ttf",
    "url": "https://lff.api.languagetechnology.org/charissil/7.000/CharisSIL-Regular.ttf",
    "sha256": "<sha256>"
  },
  {
    "family_id": "charissil",
    "version": "7.000",
    "filename": "CharisSIL-Bold.ttf",
    "url": "https://lff.api.languagetechnology.org/charissil/7.000/CharisSIL-Bold.ttf",
    "sha256": "<sha256>"
  },
  {
    "family_id": "charissil",
    "version": "7.000",
    "filename": "CharisSIL-Italic.ttf",
    "url": "https://lff.api.languagetechnology.org/charissil/7.000/CharisSIL-Italic.ttf",
    "sha256": "<sha256>"
  },
  {
    "family_id": "charissil",
    "version": "7.000",
    "filename": "CharisSIL-BoldItalic.ttf",
    "url": "https://lff.api.languagetechnology.org/charissil/7.000/CharisSIL-BoldItalic.ttf",
    "sha256": "<sha256>"
  }
]
```

Four entries, one per style. URLs are placeholder shapes — the actual LFF URL pattern may differ at fetch time; verify against the LFF API's current responses.

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`. See also: `klappy://canon/articles/_archive/font-resolution-design` for the (superseded) three-MCP design that v1.2 D-021 retired.*
