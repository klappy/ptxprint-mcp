"""
Integration tests: lifecycle events fire from main.py

DoD #2: A submitted job produces phase events at each boundary
        plus exactly one job_terminal event.

Strategy: mock both the Worker callback (patch_state/upload) and the
telemetry helper, then drive the /jobs endpoint via the FastAPI test
client with a stub subprocess. Assert the telemetry helper was called
at each expected phase boundary.

Authority:
  klappy://canon/specs/ptxprint-mcp-v1.3-spec §10 DoD #2
  klappy://canon/governance/telemetry-governance §"Job Lifecycle Events"
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture
def telemetry_calls():
    """Capture all telemetry helper calls."""
    phase_calls: list[dict[str, Any]] = []
    terminal_calls: list[dict[str, Any]] = []

    async def mock_emit_phase(callback_url, job_id, consumer_label, phase, hash_prefix, duration_ms):
        phase_calls.append({
            "callback_url": callback_url,
            "job_id": job_id,
            "consumer_label": consumer_label,
            "phase": phase,
            "payload_hash_prefix": hash_prefix,
            "duration_ms": duration_ms,
        })

    async def mock_emit_terminal(callback_url, job_id, consumer_label, failure_mode, hash_prefix, duration_ms, **kwargs):
        terminal_calls.append({
            "callback_url": callback_url,
            "job_id": job_id,
            "consumer_label": consumer_label,
            "failure_mode": failure_mode,
            "payload_hash_prefix": hash_prefix,
            "duration_ms": duration_ms,
            **kwargs,
        })

    return phase_calls, terminal_calls, mock_emit_phase, mock_emit_terminal


@pytest.fixture
def job_request_body() -> dict[str, Any]:
    """Minimal valid job request body for testing."""
    return {
        "job_id": "test-lifecycle-001",
        "payload": {
            "schema_version": "1.0",
            "project_id": "TST",
            "config_name": "Default",
            "books": ["JHN"],
            "mode": "simple",
        },
        "payload_hash": "deadbeef12345678abcdef0011223344",
        "pdf_r2_key": "outputs/deadbeef/test.pdf",
        "log_r2_key": "outputs/deadbeef/test.log",
        "worker_callback_url": "https://worker.test/internal/job-update",
        "consumer_label": "test-agent",
    }


class TestLifecycleEventsSuccess:
    """DoD #2: phase events fire at each boundary in the success path."""

    @pytest.mark.asyncio
    async def test_success_path_fires_all_phase_events(self, telemetry_calls, job_request_body):
        phase_calls, terminal_calls, mock_phase, mock_terminal = telemetry_calls

        # Stub subprocess to simulate PTXprint success
        fake_proc = MagicMock()
        fake_proc.returncode = 0
        fake_proc.stderr = ""
        fake_proc.stdout = ""

        with (
            patch("main.emit_phase_event", side_effect=mock_phase),
            patch("main.emit_terminal_event", side_effect=mock_terminal),
            patch("main.patch_state", new_callable=AsyncMock),
            patch("main.upload_to_worker", new_callable=AsyncMock),
            patch("main.fetch_inputs", new_callable=AsyncMock),
            patch("main.write_config_files"),
            patch("subprocess.run", return_value=fake_proc),
            patch("main.find_output_pdf", return_value=Path("/tmp/fake.pdf")),
            patch("main.find_output_log", return_value=None),
            patch("pathlib.Path.exists", return_value=True),
            patch("pathlib.Path.stat", return_value=MagicMock(st_size=1024)),
            patch("pathlib.Path.read_bytes", return_value=b"%PDF-fake"),
        ):
            from main import app
            from httpx import AsyncClient, ASGITransport

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                resp = await ac.post("/jobs", json=job_request_body)

            assert resp.status_code == 200

        # Verify phase events fired in order
        assert len(phase_calls) == 3, f"Expected 3 phase events, got {len(phase_calls)}: {phase_calls}"
        phases_in_order = [c["phase"] for c in phase_calls]
        assert phases_in_order == ["fetching_inputs", "typesetting", "uploading"]

        # All phase events have correct metadata
        for call in phase_calls:
            assert call["job_id"] == "test-lifecycle-001"
            assert call["consumer_label"] == "test-agent"
            assert call["payload_hash_prefix"] == "deadbeef"  # first 8 of hash
            assert call["duration_ms"] >= 0

        # Verify exactly one terminal event
        assert len(terminal_calls) == 1, f"Expected 1 terminal event, got {len(terminal_calls)}"
        term = terminal_calls[0]
        assert term["failure_mode"] == "success"
        assert term["job_id"] == "test-lifecycle-001"
        assert term["consumer_label"] == "test-agent"
        assert term["payload_hash_prefix"] == "deadbeef"
        assert term["duration_ms"] > 0


class TestLifecycleEventsFailure:
    """Terminal events fire on the exception/hard-failure path."""

    @pytest.mark.asyncio
    async def test_exception_path_fires_terminal_event(self, telemetry_calls, job_request_body):
        phase_calls, terminal_calls, mock_phase, mock_terminal = telemetry_calls

        with (
            patch("main.emit_phase_event", side_effect=mock_phase),
            patch("main.emit_terminal_event", side_effect=mock_terminal),
            patch("main.patch_state", new_callable=AsyncMock),
            # Make fetch_inputs raise to trigger the exception path
            patch("main.fetch_inputs", new_callable=AsyncMock, side_effect=RuntimeError("fetch failed")),
            patch("main.write_config_files"),
        ):
            from main import app
            from httpx import AsyncClient, ASGITransport

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                resp = await ac.post("/jobs", json=job_request_body)

            assert resp.status_code == 500

        # fetching_inputs phase should NOT have fired (it failed mid-phase)
        # But the terminal event MUST fire
        assert len(terminal_calls) == 1
        assert terminal_calls[0]["failure_mode"] == "hard"


class TestLifecycleEventsTimeout:
    """Timeout case maps to failure_mode='timeout' in telemetry."""

    @pytest.mark.asyncio
    async def test_timeout_maps_to_timeout_failure_mode(self, telemetry_calls, job_request_body):
        phase_calls, terminal_calls, mock_phase, mock_terminal = telemetry_calls

        with (
            patch("main.emit_phase_event", side_effect=mock_phase),
            patch("main.emit_terminal_event", side_effect=mock_terminal),
            patch("main.patch_state", new_callable=AsyncMock),
            patch("main.upload_to_worker", new_callable=AsyncMock),
            patch("main.fetch_inputs", new_callable=AsyncMock),
            patch("main.write_config_files"),
            patch("subprocess.run", side_effect=subprocess.TimeoutExpired(cmd="ptxprint", timeout=10)),
            patch("main.find_output_pdf", return_value=None),
            patch("main.find_output_log", return_value=None),
        ):
            from main import app
            from httpx import AsyncClient, ASGITransport

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                resp = await ac.post("/jobs", json=job_request_body)

            assert resp.status_code == 200

        # Terminal should have failure_mode="timeout"
        assert len(terminal_calls) == 1
        assert terminal_calls[0]["failure_mode"] == "timeout"


class TestConsumerLabelDefault:
    """consumer_label defaults to 'unknown' when not forwarded by Worker."""

    @pytest.mark.asyncio
    async def test_missing_consumer_label_defaults_to_unknown(self, telemetry_calls):
        phase_calls, terminal_calls, mock_phase, mock_terminal = telemetry_calls

        body = {
            "job_id": "test-default-label",
            "payload": {
                "schema_version": "1.0",
                "project_id": "TST",
                "books": ["JHN"],
            },
            "payload_hash": "aabb1122",
            "pdf_r2_key": "outputs/aabb/test.pdf",
            "log_r2_key": "outputs/aabb/test.log",
            "worker_callback_url": "https://w/internal/job-update",
            # No consumer_label field — should default to "unknown"
        }

        with (
            patch("main.emit_phase_event", side_effect=mock_phase),
            patch("main.emit_terminal_event", side_effect=mock_terminal),
            patch("main.patch_state", new_callable=AsyncMock),
            patch("main.fetch_inputs", new_callable=AsyncMock, side_effect=RuntimeError("stop")),
            patch("main.write_config_files"),
        ):
            from main import app
            from httpx import AsyncClient, ASGITransport

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                await ac.post("/jobs", json=body)

        assert len(terminal_calls) == 1
        assert terminal_calls[0]["consumer_label"] == "unknown"
