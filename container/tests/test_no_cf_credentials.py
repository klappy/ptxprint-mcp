"""
DoD #8: Container has no Analytics Engine credentials.

Assert that the container/ production code contains NO references to
CF_API_TOKEN, CF_ACCOUNT_ID, or direct Analytics Engine access.
The Container's only telemetry path is the Worker forwarding endpoint.

Note: test files are excluded from the scan because they inherently
reference the forbidden strings in their assertions.

Authority:
  klappy://canon/specs/ptxprint-mcp-v1.3-spec §10 DoD #8
  klappy://canon/governance/telemetry-governance §"Routing constraint"
"""

from __future__ import annotations

from pathlib import Path

import pytest


CONTAINER_DIR = Path(__file__).resolve().parent.parent
TESTS_DIR = CONTAINER_DIR / "tests"


class TestNoCfCredentials:
    """DoD #8: Container has no Analytics Engine credentials."""

    @pytest.fixture
    def production_python_files(self) -> list[Path]:
        """Production Python files (excludes tests/ and __pycache__)."""
        exclude_dirs = {"tests", "__pycache__", ".pytest_cache"}
        files = []
        for f in CONTAINER_DIR.rglob("*.py"):
            # Skip if any parent directory is in exclude list
            if any(part in exclude_dirs for part in f.relative_to(CONTAINER_DIR).parts):
                continue
            files.append(f)
        assert len(files) > 0, "Expected at least one production .py file in container/"
        return files

    def test_production_files_found(self, production_python_files: list[Path]):
        """Sanity: we found the expected production files."""
        names = {f.name for f in production_python_files}
        assert "main.py" in names
        assert "telemetry_helper.py" in names

    def test_no_cf_api_token_in_code(self, production_python_files: list[Path]):
        """CF_API_TOKEN must not appear in any Container production code."""
        for filepath in production_python_files:
            content = filepath.read_text(errors="replace")
            assert "CF_API_TOKEN" not in content, (
                f"CF_API_TOKEN found in {filepath.relative_to(CONTAINER_DIR)} — "
                "Container must not hold Analytics Engine credentials (DoD #8)"
            )

    def test_no_cf_account_id_in_code(self, production_python_files: list[Path]):
        """CF_ACCOUNT_ID must not appear in any Container production code."""
        for filepath in production_python_files:
            content = filepath.read_text(errors="replace")
            assert "CF_ACCOUNT_ID" not in content, (
                f"CF_ACCOUNT_ID found in {filepath.relative_to(CONTAINER_DIR)} — "
                "Container must not hold Analytics Engine credentials (DoD #8)"
            )

    def test_no_write_data_point(self, production_python_files: list[Path]):
        """No direct Analytics Engine writeDataPoint calls."""
        for filepath in production_python_files:
            content = filepath.read_text(errors="replace")
            assert "writeDataPoint" not in content, (
                f"writeDataPoint found in {filepath.relative_to(CONTAINER_DIR)} — "
                "Container must route telemetry through the Worker"
            )

    def test_no_analytics_engine_binding(self, production_python_files: list[Path]):
        """No analytics_engine_datasets or PTXPRINT_TELEMETRY binding."""
        for filepath in production_python_files:
            content = filepath.read_text(errors="replace")
            assert "analytics_engine_datasets" not in content, (
                f"analytics_engine_datasets found in {filepath.relative_to(CONTAINER_DIR)}"
            )
            assert "PTXPRINT_TELEMETRY" not in content, (
                f"PTXPRINT_TELEMETRY binding found in {filepath.relative_to(CONTAINER_DIR)} — "
                "Container must not reference the Analytics Engine binding"
            )

    def test_no_telemetry_verified_clients(self, production_python_files: list[Path]):
        """TELEMETRY_VERIFIED_CLIENTS is a Worker-only env var."""
        for filepath in production_python_files:
            content = filepath.read_text(errors="replace")
            assert "TELEMETRY_VERIFIED_CLIENTS" not in content, (
                f"TELEMETRY_VERIFIED_CLIENTS found in {filepath.relative_to(CONTAINER_DIR)}"
            )

    def test_telemetry_only_routes_through_worker(self):
        """Container telemetry uses /internal/telemetry (Worker endpoint only)."""
        telemetry_helper = CONTAINER_DIR / "telemetry_helper.py"
        content = telemetry_helper.read_text()
        # The helper derives the URL from worker_callback_url → /internal/telemetry
        assert "/telemetry" in content, "Helper should reference /internal/telemetry path"
        # Must NOT hit the Analytics Engine SQL API directly
        assert "api.cloudflare.com" not in content, (
            "Container must not call the Analytics Engine API directly"
        )

    def test_requirements_no_analytics_sdk(self):
        """requirements.txt must not include CF Analytics SDK."""
        req_file = CONTAINER_DIR / "requirements.txt"
        if req_file.exists():
            content = req_file.read_text()
            assert "cloudflare" not in content.lower(), (
                "Container must not depend on a Cloudflare SDK for telemetry"
            )
