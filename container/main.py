"""
PTXprint MCP Container — FastAPI HTTP handler.

Endpoints:
  GET  /health        — liveness probe
  POST /jobs          — run a typesetting job end-to-end

Per v1.2 spec §5. Day-1 PoC scope: single-pass simple typesetting.
Multi-pass autofill, mid-run cancellation (SIGTERM polling), and streaming
progress updates are Day-2.

State callback pattern: the Container does NOT have direct access to the
JobStateDO. It calls back through the Worker's internal routes:

  POST {worker_callback_url}            → patch job state
  PUT  {worker_callback_url}/.upload    → upload artifact to R2

The worker_callback_url is provided by the Worker in the job submission body
and takes the shape `https://<worker>/internal/job-update`. The upload
endpoint is derived from it.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import subprocess
import sys
import tempfile
import time
import traceback
from pathlib import Path
from typing import Any, Awaitable, Callable

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, stream=sys.stdout, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("ptxprint-container")

app = FastAPI(title="ptxprint-mcp container", version="0.1.0")


# ---------- Schema ----------


class SourceModel(BaseModel):
    book: str
    filename: str
    url: str
    sha256: str


class FontModel(BaseModel):
    family_id: str
    version: str | None = None
    filename: str
    url: str
    sha256: str


class FigureModel(BaseModel):
    filename: str
    url: str
    sha256: str


class PayloadModel(BaseModel):
    schema_version: str
    project_id: str
    config_name: str = "Default"
    books: list[str]
    mode: str = "simple"
    define: dict[str, str] = Field(default_factory=dict)
    config_files: dict[str, str] = Field(default_factory=dict)
    sources: list[SourceModel] = Field(default_factory=list)
    fonts: list[FontModel] = Field(default_factory=list)
    figures: list[FigureModel] = Field(default_factory=list)


class JobRequestModel(BaseModel):
    job_id: str
    payload: PayloadModel
    payload_hash: str
    pdf_r2_key: str
    log_r2_key: str
    worker_callback_url: str | None = None


# ---------- Worker callback helpers ----------


async def patch_state(callback_url: str | None, job_id: str, patch: dict[str, Any]) -> None:
    """POST a JSON patch to the Worker; updates the JobStateDO."""
    if not callback_url:
        log.info("no callback_url; would patch %s with %s", job_id, patch)
        return
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            await client.post(callback_url, json={"job_id": job_id, "patch": patch})
    except Exception as exc:  # noqa: BLE001
        log.warning("patch_state failed: %s", exc)


async def upload_to_worker(callback_url: str | None, key: str, data: bytes, content_type: str) -> None:
    """Upload an artifact through the Worker's R2 write proxy."""
    if not callback_url:
        log.info("no callback_url; would upload %d bytes to %s", len(data), key)
        return
    upload_url = callback_url.rsplit("/", 1)[0] + "/upload"
    try:
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.put(
                upload_url,
                content=data,
                params={"key": key},
                headers={"content-type": content_type},
            )
            resp.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        log.warning("upload_to_worker failed for %s: %s", key, exc)
        raise


# ---------- Input materialization ----------


def write_config_files(scratch: Path, project_id: str, config_files: dict[str, str]) -> None:
    """Write inline config_files to the scratch tree at their relative paths."""
    project_root = scratch / project_id
    project_root.mkdir(parents=True, exist_ok=True)
    for relpath, content in config_files.items():
        # Sandbox: relpath must not escape project_root
        target = (project_root / relpath).resolve()
        if not str(target).startswith(str(project_root.resolve())):
            raise ValueError(f"config_files path escapes project root: {relpath}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        log.info("wrote config %s (%d bytes)", relpath, len(content))


async def fetch_with_verify(url: str, expected_sha256: str, dest: Path) -> int:
    """Stream a URL to disk while computing sha256; abort on mismatch."""
    h = hashlib.sha256()
    total = 0
    dest.parent.mkdir(parents=True, exist_ok=True)
    async with httpx.AsyncClient(timeout=300, follow_redirects=True) as client:
        async with client.stream("GET", url) as response:
            response.raise_for_status()
            with dest.open("wb") as f:
                async for chunk in response.aiter_bytes():
                    f.write(chunk)
                    h.update(chunk)
                    total += len(chunk)
    actual = h.hexdigest()
    if actual.lower() != expected_sha256.lower():
        dest.unlink(missing_ok=True)
        raise ValueError(f"sha256 mismatch for {url}: expected {expected_sha256}, got {actual}")
    return total


async def fetch_inputs(scratch: Path, project_id: str, payload: PayloadModel) -> None:
    """Parallel-fetch sources, fonts, figures into the scratch tree."""
    project_root = scratch / project_id
    sources_dir = project_root  # USFM sources sit at project root in Paratext layout
    fonts_dir = project_root / "shared" / "fonts"
    figures_dir = project_root / "figures"

    tasks: list[Awaitable[int]] = []

    for src in payload.sources:
        tasks.append(fetch_with_verify(src.url, src.sha256, sources_dir / src.filename))
    for font in payload.fonts:
        tasks.append(fetch_with_verify(font.url, font.sha256, fonts_dir / font.filename))
    for fig in payload.figures:
        tasks.append(fetch_with_verify(fig.url, fig.sha256, figures_dir / fig.filename))

    if tasks:
        await asyncio.gather(*tasks)


# ---------- PTXprint subprocess ----------


def build_ptxprint_argv(payload: PayloadModel, scratch: Path) -> list[str]:
    """Construct the ptxprint CLI invocation.

    Phase 1 contract (`canon/articles/phase-1-poc-scope.md`, session 7 D-025):
    when `config_files` is empty the agent has not supplied any named config,
    so we omit the `-c` flag and let PTXprint run with built-in defaults.
    With `-c <name>` set and no matching `shared/ptxprint/<name>/` folder on
    disk, PTXprint exits 0, writes no log, and produces no PDF — the silent
    bail that blocked session-3 end-to-end smoke. Aligning to canon's
    Phase 1 argv exemplar:

        ptxprint -P DEFAULT -b "JHN" -p <scratch> -q

    Phase 2+ payloads populate `config_files`; the `-c` path is retained
    for that case (v1.2 spec §5).
    """
    argv = [
        os.environ.get("PTXPRINT_BIN", "ptxprint"),
        "-P",  # headless print mode
        payload.project_id,
    ]
    if payload.config_files:
        argv.extend(["-c", payload.config_name])
    argv.extend([
        "-b", " ".join(payload.books),
        "-p", str(scratch),
        "-q",  # quiet (suppress splash)
    ])
    for k, v in (payload.define or {}).items():
        argv.append("-D")
        argv.append(f"{k}={v}")
    return argv


def find_output_pdf(scratch: Path, project_id: str, config_name: str) -> Path | None:
    """Locate the output PDF after a run. PTXprint writes to local/ptxprint/."""
    candidates = list((scratch / project_id / "local" / "ptxprint").glob(f"{project_id}_{config_name}_*_ptxp.pdf"))
    return candidates[0] if candidates else None


def find_output_log(scratch: Path, project_id: str, config_name: str) -> Path | None:
    candidates = list((scratch / project_id / "local" / "ptxprint" / config_name).glob(f"{project_id}_{config_name}_*_ptxp.log"))
    return candidates[0] if candidates else None


def parse_log_for_errors(log_text: str) -> tuple[list[str], int]:
    """Extract TeX `^!` error lines and count overfull boxes."""
    errors: list[str] = []
    overfull = 0
    for line in log_text.splitlines():
        if line.startswith("!"):
            errors.append(line.strip())
        if "Overfull" in line and ("hbox" in line or "vbox" in line):
            overfull += 1
    return errors, overfull


def classify_exit(exit_code: int, pdf_exists: bool) -> str:
    """Per v1.2 spec §3 / governance Part 9 failure-mode taxonomy."""
    if exit_code == 0 and pdf_exists:
        return "success"
    if exit_code == 0 and not pdf_exists:
        return "hard"  # XeTeX completed but no PDF — usually input issue
    if exit_code != 0 and pdf_exists:
        # Soft failure: PDF produced but with errors. Day-1: treat as soft.
        return "soft"
    return "hard"


# ---------- Main job handler ----------


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"ok": True, "service": "ptxprint-mcp container", "version": "0.1.0"}


@app.post("/jobs")
async def run_job(req: JobRequestModel) -> JSONResponse:
    job_id = req.job_id
    callback = req.worker_callback_url
    payload = req.payload

    started_at = time.time()
    log.info("job %s starting; mode=%s books=%s", job_id, payload.mode, payload.books)

    await patch_state(callback, job_id, {
        "state": "running",
        "started_at": _iso_now(),
        "progress": {"current_phase": "fetching_inputs"},
        "human_summary": "Materializing inputs and fetching sources, fonts, figures.",
    })

    with tempfile.TemporaryDirectory(prefix="ptx-") as tmpdir:
        scratch = Path(tmpdir)
        try:
            write_config_files(scratch, payload.project_id, payload.config_files)
            await fetch_inputs(scratch, payload.project_id, payload)

            await patch_state(callback, job_id, {
                "progress": {"current_phase": "typesetting"},
                "human_summary": "Running PTXprint.",
            })

            argv = build_ptxprint_argv(payload, scratch)
            log.info("running: %s", " ".join(argv))

            timeout_s = int(os.environ.get("PTXPRINT_TIMEOUT", "1200"))
            try:
                proc = subprocess.run(
                    argv,
                    capture_output=True,
                    text=True,
                    timeout=timeout_s,
                    cwd=str(scratch),
                    env={**os.environ},
                )
                exit_code = proc.returncode
                stderr_tail = (proc.stderr or "")[-2000:]
            except subprocess.TimeoutExpired as exc:
                exit_code = -1
                stderr_tail = f"TIMEOUT after {timeout_s}s\n{(exc.stderr or '')[-1000:]}"
                log.error("job %s timed out", job_id)

            pdf_path = find_output_pdf(scratch, payload.project_id, payload.config_name)
            log_path = find_output_log(scratch, payload.project_id, payload.config_name)
            log_text = log_path.read_text(errors="replace") if log_path else stderr_tail
            errors, overfull = parse_log_for_errors(log_text)
            log_tail = "\n".join(log_text.splitlines()[-100:])
            failure_mode = classify_exit(exit_code, pdf_path is not None)

            # Silent-bail diagnostic: when both PDF and log are absent the
            # agent receives an opaque failure (empty log_tail, empty errors,
            # exit_code 0). Synthesize a marker so the cause is at least
            # visible. Refs: canon/encodings/transcript-encoded-session-3.md
            # (C-009).
            if pdf_path is None and log_path is None:
                argv_str = " ".join(argv)
                stderr_str = (stderr_tail or "").strip() or "(empty)"
                log_tail = (
                    f"[container diagnostic] PTXprint exited {exit_code} "
                    f"with no PDF and no log file.\n"
                    f"[container diagnostic] argv: {argv_str}\n"
                    f"[container diagnostic] stderr_tail: {stderr_str[:1500]}"
                )
                if not errors:
                    errors = [
                        "PTXprint produced no output (silent exit). "
                        "Likely cause: missing config_files or invalid project layout."
                    ]

            await patch_state(callback, job_id, {
                "progress": {"current_phase": "uploading"},
                "human_summary": f"Typesetting {failure_mode}; uploading artifacts.",
            })

            # Upload artifacts
            if log_path and log_path.exists():
                await upload_to_worker(callback, req.log_r2_key, log_path.read_bytes(), "text/plain; charset=utf-8")
            if pdf_path and pdf_path.exists():
                await upload_to_worker(callback, req.pdf_r2_key, pdf_path.read_bytes(), "application/pdf")

            elapsed = time.time() - started_at
            final_state = "succeeded" if failure_mode == "success" else "failed"
            await patch_state(callback, job_id, {
                "state": final_state,
                "completed_at": _iso_now(),
                "exit_code": exit_code,
                "failure_mode": failure_mode,
                "pdf_r2_key": req.pdf_r2_key if pdf_path else None,
                "log_r2_key": req.log_r2_key if log_path else None,
                "log_tail": log_tail,
                "errors": errors[:50],
                "overfull_count": overfull,
                "progress": {"passes_completed": 1, "current_phase": None},
                "human_summary": (
                    f"PTXprint completed in {elapsed:.1f}s. "
                    f"failure_mode={failure_mode}; "
                    f"errors={len(errors)}; overfull_boxes={overfull}."
                ),
            })

            return JSONResponse({
                "job_id": job_id,
                "exit_code": exit_code,
                "failure_mode": failure_mode,
                "pdf_uploaded": pdf_path is not None,
                "elapsed_s": elapsed,
            })

        except Exception as exc:  # noqa: BLE001
            tb = traceback.format_exc(limit=5)
            log.error("job %s failed in container: %s\n%s", job_id, exc, tb)
            await patch_state(callback, job_id, {
                "state": "failed",
                "completed_at": _iso_now(),
                "failure_mode": "hard",
                "errors": [str(exc)],
                "log_tail": tb,
                "human_summary": f"Container handler error: {exc}",
            })
            return JSONResponse({"error": str(exc)}, status_code=500)


def _iso_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
