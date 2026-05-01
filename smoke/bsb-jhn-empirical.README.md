# `bsb-jhn-empirical.json` — BSB Gospel of John, demo fixture

> **Status:** working demo. Renders the BSB Gospel of John end-to-end through the deployed worker. The cleanup pattern is documented inline below; the cross-reference behavior is canon-grounded (see "How this fixture evolved").

## What this fixture demonstrates

Real Bible content (BSB Gospel of John, 21 chapters) rendered end-to-end through PTXprint MCP, with the testcase decorations stripped from the upstream minitests config and parallel-passage references intact.

- **Source:** `usfm-bible/examples.bsb` at commit `48a9feb71f0a66f9b8f418b11ae25b7ad2e49a0d`, file `44JHNBSB.usfm`, materialized as `44JHNtest.usfm` to satisfy minitests' `Settings.xml` filename convention.
- **Config base:** session-11's `fonts-payload.json` (minitests-derived).
- **Cleanup applied:** see "What was changed" below.

## How to use

```bash
curl -sS -A "your-app/0.1" -X POST \
  -H "Content-Type: application/json" \
  https://ptxprint.klappy.dev/mcp/submit_typeset \
  --data @smoke/bsb-jhn-empirical.json
```

(or via the smoke runner script — same JSON-RPC envelope as `fonts-payload.json`.)

Expected outcome: `failure_mode: success`, exit_code 0, ~13s wall-clock, ~360 KB PDF, 61 pages, Gentium Plus throughout, parallel-passage references rendered.

## How this fixture evolved (v3 → v6)

This fixture was iterated visually across four versions during session 12. The final state (v6) is what's checked in here. Each version was reproducible from the worker's content-addressed cache:

| Version | What changed | Outcome |
|---|---|---|
| v3 | Source-URL swap only (BSB JHN into unchanged minitests config) | Real content rendered, but with thick decorative box around every section heading |
| v4 | cfg-section cleanup — disabled fancy borders, plugins, vertical column rule, cropmarks, etc. | Boxes still present (mechanism not in cleared cfg keys); cross-references silently dropped |
| v5 | Stylesheet hack — appended `\Marker` blocks with `\Border None / \BorderWidth 0 / \BgColor 1 1 1 / \Alpha 0` to neuter `cat:headingsbox\|esb` | Boxes gone, cross-references still missing |
| **v6** | Diff'd v3 vs v4 cfg → found `[document] parallelrefs` had been flipped from `True` to `False` in v4. Toggled it back. | **Boxes gone, cross-references restored. One canon-grounded cfg key.** |

The v5 stylesheet hack remains in place in this fixture (it does no harm and v6 layered on top of v5), but the **single load-bearing change** for cross-references is the cfg key. The session-12 encoding L-006 — *"read canon once at orientation, then wing it" is canon-flavored intuition* — is the lesson this iteration carries forward. The empirical stylesheet path got there eventually; the canon-grounded path got there in one step.

## What was changed from `fonts-payload.json`

### `[document]` section (cfg)

```ini
multibook = False
bookintro = False
ifusepiclist = False
ifinclfigs = False
parallelrefs = True   ; was True in original; explicitly preserved
```

We have one book and no figures. The `parallelrefs` line is the canon-grounded key for showing `\r` parallel-passage references — see `klappy://canon/articles/settings-cookbook` "Show / hide parallel-passage references".

### `[fancy]` section (cfg)

```ini
endofbookpdf =
pageborderpdf =
sectionheaderpdf =
versedecoratorpdf =
versedecoratorshift = 0
```

Stripped the testcase's decorative-border PDF asset references.

### `[paper]` section (cfg)

```ini
ifverticalrule = False
cropmarks = False
ifgrid = False
```

Removed the column-gutter vertical rule and debug grid.

### `[project]` section (cfg)

```ini
ifcolophon = False
inclcoverperiphs = False
iffrontmatter = False
ifusemodstex = False
ifusepremodstex = False
usechangesfile = False
ifusecustomsty = False
ifusemodssty = False
plugins =
```

Stripped plugin loading and TeX/style mod chains. (Note: see "Open question" below — `ifusecustomsty=False` may be why the v5 stylesheet hack still has an effect; mechanism not fully traced.)

### `[cover]` section (cfg)

```ini
makecoverpage = False
makeseparatepdf = False
```

No cover.

### `[snippets]` section (cfg)

```ini
fancyborders = False
```

### `[vars]` section (cfg)

```ini
maintitle = John
subtitle = Berean Standard Bible
languagename = English
```

### Stylesheet (`shared/ptxprint/Default/ptxprint.sty`)

> ⚠️ **Empirical, not canon-grounded.** These edits use stylesheet properties (`\Border`, `\BorderWidth`, `\BgColor`, `\Alpha`) that are not in the documented property table at `klappy://canon/articles/stylesheet-format`. They work on this fixture; canon authoring (H-027 / H-028) is the path to validating them across other content.

- Replaced `\Marker cat:headingsbox|esb` block to neuter its decoration:
  `\BorderWidth 0`, `\Border None`, `\BgColor 1 1 1`, `\Alpha 0`.
- Appended `\Marker s / s1 / s2 / r` blocks with the same neutralizing properties
  plus `\Justification Center` and `\Bold` on heading markers, `\Italic` on `\r`.

## ⚠️ Known limitations

1. **Stylesheet properties used are not in canon.** See above. Tracked at `O-open-12-002` in `canon/encodings/transcript-encoded-session-12.md`.

2. **Mechanism not understood.** The mechanism by which standard `\s1` markers in the BSB USFM get `cat:headingsbox|esb` styling applied is invisible in current canon. The cleanup neutralizes the style; it does not explain the trigger. Tracked at `O-open-12-001`.

3. **Underfilled pages.** Single-pass typesetting leaves whitespace at page bottoms where text doesn't fill the column. Resolved only by `autofill` mode, which remains deferred per the v1.2 spec.

4. **Hash non-determinism observed.** The same canonical payload produced different job IDs across sessions (session-12 evening vs morning) — `2818709c…` vs `a83efd49…`, with PDF size differing by 2 bytes. Likely the worker mixes a deployed-version field into the canonical hash, or PTXprint emits a non-deterministic timestamp. Visually identical output. Worth tracing in a future session.

## Reproducibility

- **Most recent verified job ID** (session-12 morning re-verify):
  `a83efd49f9643ec2c9aa91c4946ac2dfe3933d76547cff40818dd2548a76ccd4`
- **PDF URL (current):** https://ptxprint.klappy.dev/r2/outputs/a83efd49f9643ec2c9aa91c4946ac2dfe3933d76547cff40818dd2548a76ccd4/bsbref_Default_JHN_ptxp.pdf
- **Original v6 job ID** (session-12 evening): `2818709cc12d654cdd9f28af91824b4095086d87eddc1d3e2b358f052b73a82b`
- **Build:** ~13s container, ~16s end-to-end (cold); ~30s (cache miss after deploy).

## When this fixture should evolve

- After H-027 / H-028 / H-029 land (canon authoring on stylesheet properties + section-heading mechanism), this fixture's stylesheet section can be replaced by canon-grounded recipe references rather than inline empirical edits.
- Once a true v1.2-spec config-construction path exists (i.e., agent builds `ptxprint.cfg` from canon, not from a hacked minitests inheritance), this fixture's status should be reviewed — it may become superseded.
- The hash non-determinism (limitation 4) deserves a focused trace.
