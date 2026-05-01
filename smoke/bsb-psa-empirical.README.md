# `bsb-psa-empirical.json` — BSB Book of Psalms, demo fixture

> **Status:** working demo. Renders all 150 Psalms end-to-end through the deployed worker. Direct transformation of `bsb-jhn-empirical.json` — proves the JHN pipeline pattern transfers to a poetry-heavy book without further engineering.

## What this fixture demonstrates

The full BSB Book of Psalms (150 chapters, ~283 KB of USFM) rendered end-to-end through PTXprint MCP via the same Phase-2 fonts-payload pattern as `bsb-jhn-empirical.json`.

- **Source:** `usfm-bible/examples.bsb` at commit `48a9feb71f0a66f9b8f418b11ae25b7ad2e49a0d`, file `19PSABSB.usfm`, materialized as `19PSAtest.usfm` to satisfy minitests' `Settings.xml` filename convention.
- **Config base:** identical to `bsb-jhn-empirical.json` — same fonts, same cfg, same sty.
- **Diff from JHN fixture:** see "What was changed" below. Three lines.

## How to use

```bash
python3 - <<'PY'
import asyncio, json
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def main():
    with open('smoke/bsb-psa-empirical.json') as f:
        payload = json.load(f)
    async with streamablehttp_client('https://ptxprint.klappy.dev/mcp') as (r,w,_):
        async with ClientSession(r,w) as s:
            await s.initialize()
            sub = json.loads((await s.call_tool('submit_typeset', {'payload': payload})).content[0].text)
            print(sub)

asyncio.run(main())
PY
```

(Then poll `get_job_status` with the returned `job_id` until `state == "succeeded"`.)

Expected outcome on a cold cache: `failure_mode: success`, exit_code 0, ~35s wall-clock, ~911 KB PDF, **192 pages**, Gentium Plus throughout, all 150 Psalms with section headings and parallel-passage references intact.

Validated job (session 14): `197a5ceba40a3e86a1939f0098f695cf2a530231029f06ee6d65d37ece2f7a13` →
`https://ptxprint.klappy.dev/r2/outputs/197a5ceba40a3e86a1939f0098f695cf2a530231029f06ee6d65d37ece2f7a13/bsbref_Default_PSA_ptxp.pdf`

## What was changed from `bsb-jhn-empirical.json`

```diff
- "books": ["JHN"]
+ "books": ["PSA"]

- "sources": [
-   {
-     "book": "JHN",
-     "filename": "44JHNtest.usfm",
-     "url": "https://raw.githubusercontent.com/usfm-bible/examples.bsb/48a9feb71f0a66f9b8f418b11ae25b7ad2e49a0d/44JHNBSB.usfm",
-     "sha256": "f6220aa81c8143cb66a86d775fa3cdfe10efcb52dad135dfc498baeac260103d"
-   }
- ]
+ "sources": [
+   {
+     "book": "PSA",
+     "filename": "19PSAtest.usfm",
+     "url": "https://raw.githubusercontent.com/usfm-bible/examples.bsb/48a9feb71f0a66f9b8f418b11ae25b7ad2e49a0d/19PSABSB.usfm",
+     "sha256": "c8b6a88d2661549231f8028fac6dfb6c9356940812f365200c3066b52f319844"
+   }
+ ]

# inside config_files["shared/ptxprint/Default/ptxprint.cfg"], the [vars] section:
- maintitle = John
+ maintitle = Psalms
```

That's it. Container, fonts, cfg structure, sty overrides — all unchanged.

## Known render-quality observations (session 14)

These are **not blockers**; the PDF is valid and readable. They're filed as iteration backlog so the next session can improve render quality.

| Observation | Cause | Mitigation path |
|---|---|---|
| 177 of 192 pages flagged "underfilled" in the log | Psalms is poetry — short `\q1` / `\q2` lines + stanza breaks → vertical whitespace at page bottoms | Autofill (v1.2 deferred) is canonical; interim cfg knobs to try: `hangpoetry`, `preventwidows`, `preventorphans` |
| "IF CHECK mnote Failed. Entered at 2 != exit at 1" repeats throughout the log | Internal footnote-balancing assertion in PTX2PDF macros, triggered by selah notes / footnote refs | File upstream against `sillsdev/ptx2pdf`; output is valid despite the noise |

Full encoding: `canon/encodings/transcript-encoded-session-14.md` (O-043, O-044, H-026, H-027).

## Provenance

- Built session 14 by transforming `bsb-jhn-empirical.json` (3-line diff above).
- Worker version at validation: `0.1.0`, main HEAD `e642e62…` (post-session-13 docs-tool merge).
