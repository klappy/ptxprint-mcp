"""Real image smoke, executed inside Docker. No production callback/storage.
Uses the existing public-domain immutable fixture and verifies bytes before render.
Artifacts retained for independent PDF inspection; this is NOT full release QA.
"""
import asyncio
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, '/app')
import main

async def run():
    provenance = await main.health()
    Path('/artifacts/engine.json').write_text(json.dumps(provenance, indent=2))
    mismatch = main.JobRequestModel(job_id='test',payload={'schema_version':'1.0','project_id':'TEST','books':['JHN']},payload_hash='a'*64,engine_fingerprint='wrong',pdf_r2_key='unused',log_r2_key='unused')
    assert (await main.run_job(mismatch)).status_code == 409, 'Fingerprint mismatch must refuse before render'
    payload = main.PayloadModel(**json.loads(Path('/fixtures/minimal-payload.json').read_text()))
    with tempfile.TemporaryDirectory() as tmp:
        scratch = Path(tmp)
        await main.fetch_inputs(scratch, payload.project_id, payload)
        import subprocess
        result = subprocess.run(main.build_ptxprint_argv(payload, scratch), cwd=scratch, capture_output=True, text=True, timeout=1200)
        Path('/artifacts/stdout.txt').write_text(result.stdout)
        Path('/artifacts/stderr.txt').write_text(result.stderr)
        pdf = main.find_output_pdf(scratch, payload.project_id, None)
        if pdf is not None:
            Path('/artifacts/smoke.pdf').write_bytes(pdf.read_bytes())
        log = main.find_output_log(scratch, payload.project_id, None)
        text = log.read_text(errors='replace') if log else ''
        Path('/artifacts/smoke.log').write_text(text)
        assert result.returncode == 0, f'PTXprint exit {result.returncode}: {result.stderr[-2000:]}'
        assert pdf is not None and pdf.read_bytes().startswith(b'%PDF-'), 'Missing real PDF'
        assert log is not None, 'Missing TeX log'
        errors, _ = main.parse_log_for_errors(text)
        assert not errors, f'TeX errors: {errors}'
        provenance = await main.health()
        Path('/artifacts/engine.json').write_text(json.dumps(provenance, indent=2))
        print(json.dumps({'pdf_bytes': pdf.stat().st_size, **provenance}))
asyncio.run(run())
