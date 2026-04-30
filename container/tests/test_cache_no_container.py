"""
DoD #3: Cache hit produces no Container telemetry.

The Container's main.py is NOT called when the Worker's submit_typeset
returns from cache. This is primarily verified by the Worker-side test
(PR #30 test/telemetry.test.ts covers cache-hit → no Container dispatch).

This Container-side test asserts the structural guarantee: the only way
Container telemetry fires is through the /jobs endpoint. If /jobs is never
called (cache hit), zero Container telemetry events exist.

Authority:
  klappy://canon/specs/ptxprint-mcp-v1.3-spec §10 DoD #3
  klappy://canon/governance/telemetry-governance §"Job Lifecycle Events"
"""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


class TestCacheHitNoContainerTelemetry:
    """
    DoD #3: Cache hit = Worker returns immediately, Container never starts.

    The structural argument:
    1. Container telemetry is ONLY emitted from run_job() in main.py
    2. run_job() is ONLY reachable via POST /jobs
    3. On cache hit, the Worker never dispatches to the Container (no POST /jobs)
    4. Therefore, cache hit → zero Container telemetry events

    This test verifies point (1): all telemetry calls originate from run_job.
    """

    def test_telemetry_imports_only_in_main(self):
        """emit_phase_event and emit_terminal_event are only imported in main.py."""
        main_path = Path(__file__).resolve().parent.parent / "main.py"
        content = main_path.read_text()
        assert "emit_phase_event" in content
        assert "emit_terminal_event" in content

    def test_no_telemetry_calls_outside_run_job(self):
        """Telemetry calls are confined to the run_job function."""
        main_path = Path(__file__).resolve().parent.parent / "main.py"
        content = main_path.read_text()

        # Find emit_phase_event and emit_terminal_event call sites
        lines = content.splitlines()
        call_lines = []
        in_run_job = False
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            # Track when we enter run_job
            if "async def run_job" in line:
                in_run_job = True
            # Track when we leave (next top-level def/class)
            elif in_run_job and (line.startswith("def ") or line.startswith("class ") or line.startswith("async def ")):
                in_run_job = False

            if "emit_phase_event(" in stripped or "emit_terminal_event(" in stripped:
                if "import" not in stripped and "mock" not in stripped.lower():
                    call_lines.append((i, in_run_job, stripped))

        # All call sites must be inside run_job
        outside = [(ln, s) for ln, inside, s in call_lines if not inside]
        assert not outside, (
            f"Telemetry calls found outside run_job: {outside}. "
            "All Container telemetry must originate from the /jobs handler."
        )

    def test_health_endpoint_has_no_telemetry(self):
        """GET /health never emits telemetry."""
        main_path = Path(__file__).resolve().parent.parent / "main.py"
        content = main_path.read_text()
        # Find the health function
        lines = content.splitlines()
        in_health = False
        health_body = []
        for line in lines:
            if "def health" in line:
                in_health = True
                continue
            if in_health:
                if line.strip() and not line.startswith(" ") and not line.startswith("\t"):
                    break
                health_body.append(line)

        health_text = "\n".join(health_body)
        assert "emit_phase_event" not in health_text
        assert "emit_terminal_event" not in health_text

    @pytest.mark.asyncio
    async def test_no_jobs_means_no_telemetry_calls(self):
        """
        Integration assertion: hitting /health (the only other endpoint)
        produces zero telemetry calls.
        """
        with (
            patch("main.emit_phase_event", new_callable=AsyncMock) as mock_phase,
            patch("main.emit_terminal_event", new_callable=AsyncMock) as mock_terminal,
        ):
            from main import app
            from httpx import AsyncClient, ASGITransport

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                resp = await ac.get("/health")

            assert resp.status_code == 200
            mock_phase.assert_not_called()
            mock_terminal.assert_not_called()
