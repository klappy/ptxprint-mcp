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
    payload = main.PayloadModel(**json.loads((Path('/fixtures') / (sys.argv[1] if len(sys.argv) > 1 else 'bsb-jhn-empirical.json')).read_text()))
    with tempfile.TemporaryDirectory() as tmp:
        scratch = Path(tmp)
        main.write_config_files(scratch, payload.project_id, payload.config_files)
        await main.fetch_inputs(scratch, payload.project_id, payload)
        import subprocess
        try:
            result = subprocess.run(main.build_ptxprint_argv(payload, scratch), cwd=scratch, capture_output=True, text=True, timeout=1200)
        except subprocess.TimeoutExpired as exc:
            for name, value in [('stdout',exc.stdout),('stderr',exc.stderr)]:
                Path('/artifacts/'+name+'.txt').write_bytes(value if isinstance(value,bytes) else (value or '').encode())
            for index, log in enumerate(scratch.rglob('*.log')):
                Path(f'/artifacts/timeout-{index}.log').write_bytes(log.read_bytes())
            Path('/artifacts/timeout.txt').write_text('PTXprint exceeded 1200s')
            raise
        Path('/artifacts/stdout.txt').write_text(result.stdout)
        Path('/artifacts/stderr.txt').write_text(result.stderr)
        pdf = main.find_output_pdf(scratch, payload.project_id, payload.config_name if payload.config_files else None)
        if pdf is not None:
            Path('/artifacts/smoke.pdf').write_bytes(pdf.read_bytes())
        log = main.find_output_log(scratch, payload.project_id, payload.config_name if payload.config_files else None)
        text = log.read_text(errors='replace') if log else ''
        Path('/artifacts/smoke.log').write_text(text)
        assert result.returncode == 0, f'PTXprint exit {result.returncode}: {result.stderr[-2000:]}'
        assert pdf is not None and pdf.read_bytes().startswith(b'%PDF-'), f'Missing real PDF; stdout={result.stdout[-2000:]} stderr={result.stderr[-2000:]}'
        assert log is not None, 'Missing TeX log'
        errors, _ = main.parse_log_for_errors(text)
        assert not errors, f'TeX errors: {errors}'
        provenance = await main.health()
        Path('/artifacts/engine.json').write_text(json.dumps(provenance, indent=2))
        print(json.dumps({'pdf_bytes': pdf.stat().st_size, **provenance}))
    if payload.books == ['JUD']:
        # Exercise the production handler with real PTXprint; only callbacks/uploads
        # are captured locally so this never writes production storage.
        uploads, states = {}, []
        async def capture_upload(callback, key, data, content_type):
            uploads[key] = data
        async def capture_state(callback, job_id, patch):
            states.append(patch)
        main.upload_to_worker = capture_upload
        main.patch_state = capture_state
        request = main.JobRequestModel(job_id='handler-smoke', payload=payload,
            payload_hash='a'*64, engine_fingerprint=main.ENGINE_FINGERPRINT,
            pdf_r2_key='handler.pdf', log_r2_key='handler.log')
        response = await main.run_job(request)
        result = json.loads(response.body)
        for name, data in uploads.items():
            Path('/artifacts', name).write_bytes(data)
        Path('/artifacts/handler-result.json').write_text(json.dumps({'result':result,'states':states},indent=2))
        assert response.status_code == 200 and result.get('failure_mode') == 'success' and result.get('exit_code') == 0, result
        assert uploads.get('handler.pdf',b'').startswith(b'%PDF-'), 'handler did not upload PDF'
        assert main.ENGINE_FINGERPRINT.encode() in uploads.get('handler.log',b''), 'uploaded log lost engine provenance'
        assert states and states[-1].get('state') == 'succeeded', 'missing final success state'
asyncio.run(run())
