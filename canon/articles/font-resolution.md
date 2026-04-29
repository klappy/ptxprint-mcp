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

> ⚠️ **Phase 1 (hackathon week, per session 7 D-025).** Phase 1's Container image bundles SIL Charis system-wide; for projects whose `ptxprint.cfg` only references Charis, the agent leaves the payload's `fonts` array empty and PTXprint resolves Charis via fontconfig. **Empirically as of session 11 (2026-04-29)**, payload-supplied fonts also work end-to-end without any container changes — see the worked Gentium Plus example below. So the practical Phase 1 contract is: `fonts: []` for Charis-only projects, populated for anything else. The strict "no system fonts; everything via payload" stance described in the rest of this article is the **Phase 2/3** target, when Charis itself moves into the payload and multi-script support is added.

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

The agent has four typical paths to a font URL:

### 1. SIL Language Font Finder (LFF)

For SIL fonts and many open-script fonts, LFF (`lff.api.languagetechnology.org`) provides versioned, content-addressed downloads. The URL stays stable as long as the version is referenced. Recommended for English Bibles per session 1 D-002 (initial scope: English with Charis SIL).

### 2. Hosting is the agent's concern

When the user has a font on local disk that's not on a public CDN, the agent's host environment is responsible for making it reachable at an HTTPS URL — not the typesetting MCP server. The MCP server has no `get_upload_url` tool and does not stage input files. Common patterns:

- The agent's host already runs an HTTP server with file access (Claude Desktop's filesystem MCP plus a separate static file server, a developer machine with a tunnel, etc.).
- The user puts the font in a Git repo, S3 bucket, or any HTTPS-reachable location they already control.
- The font is stored alongside the Paratext project on a server the agent's host can read from.

Whichever pattern the agent's environment provides, the agent supplies a final HTTPS URL and a sha256 in the payload. The `fonts` array does not assume any particular hosting.

### 3. Other URL sources

Any HTTPS-fetchable URL works as long as the worker can reach it without auth. Foundry CDNs, the user's own server, content-addressed CDNs. The agent verifies that the URL returns the expected content (or computes the sha256 from a known-good copy first).

### 4. R2-staged fixtures (this Worker's OUTPUTS bucket)

Some upstream fonts ship only as ZIPs (`silnrsi/font-gentium`'s GitHub releases, for example) — fine for desktop install, awkward for the per-file URL contract this schema requires. The pragmatic answer: stage the extracted TTFs once into the Worker's existing OUTPUTS bucket under a stable `outputs/fixtures/fonts/<family>-<version>/` prefix, then reference those URLs in payloads. Session 11 used this for Gentium Plus 6.200; the resulting URLs are content-addressed by both the bucket key and the embedded sha256, and persist as long as the bucket does. To stage:

```bash
# Extract from the upstream ZIP, then PUT into R2 via the Worker's internal upload route.
# (Day-2 will replace this with presigned URLs; for now /internal/upload is unauthenticated
# and accepts keys under outputs/.)
unzip -j GentiumPlus-6.200.zip "*/GentiumPlus-Regular.ttf" -d /tmp
curl -X PUT --data-binary @/tmp/GentiumPlus-Regular.ttf \
  -H "Content-Type: font/ttf" \
  "$WORKER_URL/internal/upload?key=outputs/fixtures/fonts/gentium-plus-6.200/GentiumPlus-Regular.ttf"
# Then sha256sum the local file and reference both URL and sha256 in the payload.
```

This is appropriate for stable test fixtures and reusable canonical fonts. It is **not** appropriate for per-job user font supply — the `fonts` array in a normal payload should reference the user's own URL, not require pre-staging into our bucket.

## Computing the sha256

The agent has a few options:

- **From a local file:** standard `sha256sum file.ttf` or equivalent in the agent's host environment.
- **From a known-good source:** if LFF or the foundry publishes hashes, use those.
- **By staging-then-hashing:** make the file reachable at an HTTPS URL via the agent's host, then fetch it back and compute the hash.

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

Session 11 demonstrated this concrete payload end-to-end (job `802e42e7d549cf9f827cbbcff69a6354e1b968a23084e5f2485f93cde52fc4bd`, 2026-04-29, 4.7s wall-clock, two-page PDF, all four faces embedded per `pdffonts`). Sha256s are computed from the original `GentiumPlus-6.200.zip` ZIP extract and verified to match the bytes served by these URLs:

```json
"fonts": [
  {
    "family_id": "gentiumplus",
    "version": "6.200",
    "filename": "GentiumPlus-Regular.ttf",
    "url": "https://ptxprint-mcp.klappy.workers.dev/r2/outputs/fixtures/fonts/gentium-plus-6.200/GentiumPlus-Regular.ttf",
    "sha256": "2c27e7da23ba44d135685836056833b304a388d3da346813189c60656dc02019"
  },
  {
    "family_id": "gentiumplus",
    "version": "6.200",
    "filename": "GentiumPlus-Bold.ttf",
    "url": "https://ptxprint-mcp.klappy.workers.dev/r2/outputs/fixtures/fonts/gentium-plus-6.200/GentiumPlus-Bold.ttf",
    "sha256": "622ea9f2709d74f99d45c08d93cdf2a6d096406d3a1ec2939d02714f558b3dac"
  },
  {
    "family_id": "gentiumplus",
    "version": "6.200",
    "filename": "GentiumPlus-Italic.ttf",
    "url": "https://ptxprint-mcp.klappy.workers.dev/r2/outputs/fixtures/fonts/gentium-plus-6.200/GentiumPlus-Italic.ttf",
    "sha256": "fedc1acdd2f1080941ed998cabee9759456f0e486fbd8169ff4238b37d3ac60d"
  },
  {
    "family_id": "gentiumplus",
    "version": "6.200",
    "filename": "GentiumPlus-BoldItalic.ttf",
    "url": "https://ptxprint-mcp.klappy.workers.dev/r2/outputs/fixtures/fonts/gentium-plus-6.200/GentiumPlus-BoldItalic.ttf",
    "sha256": "960e0a58ce1d7849c7a3e49f4fbc1ac4a27b58ef19a2d013ce637fe364b0a1f0"
  }
]
```

For a Charis SIL payload, the same shape applies — four entries, one per style file (Regular, Bold, Italic, BoldItalic), each with its own URL and sha256. When constructing a Charis SIL fonts array, source files from `silnrsi/font-charis` GitHub releases (or any of the LFF / R2 / generic-URL paths in the previous section) and verify the hash before submitting.

### What PTXprint does with materialised fonts

The container materialises payload fonts into `<scratch>/<project_id>/shared/fonts/<filename>` (per `container/main.py: fetch_inputs`) before invoking PTXprint. **No `fc-cache` invocation or `OSFONTDIR` env var is required** — PTXprint's own startup logic adds the project's `shared/fonts/` directory to XeTeX's font resolution paths automatically. This was an open empirical question through session 10 and was confirmed working in session 11. Future sessions revisiting font wiring should not assume fontconfig refresh is needed unless a specific failure points there.

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`. See also: `klappy://canon/articles/_archive/font-resolution-design` for the (superseded) three-MCP design that v1.2 D-021 retired.*
