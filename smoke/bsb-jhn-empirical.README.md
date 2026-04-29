# `bsb-jhn-empirical.json` — BSB Gospel of John, empirical cleanup of minitests config

> **Status:** empirical — works on this fixture, properties not fully canon-validated. Do NOT promote to a canon recipe without the H-027 / H-028 work first.

## What this fixture demonstrates

Real Bible content (BSB Gospel of John, 21 chapters) rendered end-to-end through PTXprint MCP, with the testcase decorations stripped from the upstream minitests config.

- **Source:** `usfm-bible/examples.bsb` at commit `48a9feb71f0a66f9b8f418b11ae25b7ad2e49a0d`, file `44JHNBSB.usfm`, materialized as `44JHNtest.usfm` to satisfy minitests' `Settings.xml` filename convention.
- **Config base:** session-11's `fonts-payload.json` (minitests-derived).
- **Cleanup applied:** see "What was changed" below.

## How to use

```bash
curl -sS -A "your-app/0.1" -X POST \
  -H "Content-Type: application/json" \
  https://ptxprint-mcp.klappy.workers.dev/mcp/submit_typeset \
  --data @smoke/bsb-jhn-empirical.json
```

(or via the smoke runner script — same JSON-RPC envelope as `fonts-payload.json`.)

Expected outcome: `failure_mode: success`, exit_code 0, ~12-15s wall-clock, ~340 KB PDF, 61 pages, Gentium Plus throughout.

## What was changed from `fonts-payload.json`

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
```

Removed the column-gutter vertical rule.

### `[document]` section (cfg)

```ini
multibook = False
bookintro = False
ifusepiclist = False
ifinclfigs = False
```

We have one book and no figures.

### `[project]` section (cfg)

```ini
ifcolophon = False
inclcoverperiphs = False
iffrontmatter = False
ifusemodstex = False
ifusepremodstex = False
usechangesfile = False
```

⚠️ **Suspected source of v5's cross-reference regression.** One of these toggles
silently dropped the parallel-passage cross-references (`\r (Genesis 1:1–2; ...)`)
that appeared under section headings in v3. See H-026.

### `[cover]` section (cfg)

```ini
makecoverpage = False
makeseparatepdf = False
```

No cover.

### `[vars]` section (cfg)

```ini
maintitle = John
subtitle = Berean Standard Bible
```

### Stylesheet (`shared/ptxprint/Default/ptxprint.sty`)

- Replaced `\Marker cat:headingsbox|esb` block to neuter its decoration:
  `\BorderWidth 0`, `\Border None`, `\BgColor 1 1 1`, `\Alpha 0`.
- Appended `\Marker s / s1 / s2 / r` blocks with the same neutralizing properties
  plus `\Justification Center` and `\Bold` on heading markers, `\Italic` on `\r`.

## ⚠️ Known limitations

1. **Cross-references regression.** v3 (with this same source URL but unmodified
   minitests config) showed parallel-passage cross-references inside the heading
   boxes. v5 lost them. Likely fixable by toggling `iffrontmatter=True` back on
   or removing `\Alpha 0` from the appended `\Marker r` block. Not yet diagnosed.
   See `canon/encodings/transcript-encoded-session-12.md` H-026.

2. **Stylesheet properties used are not in canon.** The `\Border`, `\BorderWidth`,
   `\BgColor`, and `\Alpha` properties used to neuter the box styling are NOT in
   the documented property table at `klappy://canon/articles/stylesheet-format`.
   They were derived empirically from observing the testcase styles' existing
   declarations. They work on this fixture; they may have side effects not
   visible here. See O-open-12-002.

3. **Mechanism not understood.** The mechanism by which standard `\s1` markers
   in the BSB USFM get `cat:headingsbox|esb` styling applied is invisible in
   current canon. The cleanup neutralizes the style; it does not explain the
   trigger. See O-open-12-001.

4. **Underfilled pages.** Single-pass typesetting leaves whitespace at page
   bottoms where text doesn't fill the column. Resolved only by `autofill` mode,
   which remains deferred per the v1.2 spec.

## Reproducibility

- Job ID: `5d60145c3f2610b398dd1012875519f716ddebdb60864c6336ffa5602b123b37`
- PDF URL: https://ptxprint-mcp.klappy.workers.dev/r2/outputs/5d60145c3f2610b398dd1012875519f716ddebdb60864c6336ffa5602b123b37/bsbnox_Default_JHN_ptxp.pdf
- Build: 12.7s container, ~15s end-to-end (session 12, 2026-04-29)

## When this fixture should evolve

- After H-026 lands, add a `bsb-jhn-with-xrefs.json` variant.
- After H-027 / H-028 / H-029 land (canon authoring), this fixture's cleanup
  steps should be documented as a cookbook recipe and this README's "What was
  changed" section should reference the recipe rather than enumerate inline.
- Once a true v1.2-spec config-construction path exists (i.e., agent builds
  `ptxprint.cfg` from canon, not from a hacked minitests inheritance), this
  fixture's status should be reviewed — it may become superseded.
