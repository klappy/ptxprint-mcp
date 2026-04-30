"""
Unit tests for container/telemetry_helper.py

Covers:
  - DoD #2 partial: phase + terminal events emit correctly-typed envelopes
  - DoD #4 Container-side: privacy-floor — prohibited fields are rejected
  - Envelope shape: only allowed fields, payload_hash_prefix truncation
  - Fire-and-forget: HTTP failures don't raise

Authority:
  klappy://canon/specs/ptxprint-mcp-v1.3-spec §5, §10 DoD #2, #4
  klappy://canon/governance/telemetry-governance §"Privacy Floor"
"""

from __future__ import annotations

import asyncio
import json
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest

# Ensure container/ is importable
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from telemetry_helper import (
    ALLOWED_FIELDS,
    PROHIBITED_FIELDS,
    _derive_telemetry_url,
    _validate_envelope,
    emit_phase_event,
    emit_terminal_event,
)


# ---- URL derivation ----


class TestDeriveUrl:
    def test_standard_callback_url(self):
        url = _derive_telemetry_url("https://worker.example.com/internal/job-update")
        assert url == "https://worker.example.com/internal/telemetry"

    def test_workers_dev_url(self):
        url = _derive_telemetry_url("https://ptxprint-mcp.klappy.workers.dev/internal/job-update")
        assert url == "https://ptxprint-mcp.klappy.workers.dev/internal/telemetry"


# ---- Envelope validation (privacy floor) ----


class TestPrivacyFloor:
    """DoD #4 Container-side: privacy-floor enforcement."""

    def test_prohibited_fields_list_complete(self):
        """The 10 prohibited fields from governance §'Privacy Floor'."""
        expected = {
            "project_id", "config_name", "book_codes", "source_url",
            "font_url", "figure_url", "payload_full", "usfm_bytes",
            "log_content", "pdf_bytes",
        }
        assert PROHIBITED_FIELDS == expected
        assert len(PROHIBITED_FIELDS) == 10

    @pytest.mark.parametrize("field", sorted(PROHIBITED_FIELDS))
    def test_each_prohibited_field_rejected(self, field: str):
        """Each of the 10 prohibited fields is individually rejected."""
        envelope: dict[str, Any] = {
            "event_type": "job_phase",
            "job_id": "test-123",
            field: "should-be-rejected",
        }
        with pytest.raises(ValueError, match=f"prohibited field.*{field}"):
            _validate_envelope(envelope)

    def test_unknown_field_rejected(self):
        """Fields not in the allowed set are rejected (defense in depth)."""
        envelope: dict[str, Any] = {
            "event_type": "job_phase",
            "some_random_field": "whatever",
        }
        with pytest.raises(ValueError, match="unknown field"):
            _validate_envelope(envelope)

    def test_valid_envelope_passes(self):
        envelope: dict[str, Any] = {
            "event_type": "job_phase",
            "job_id": "test-123",
            "phase": "typesetting",
            "duration_ms": 1500.0,
            "payload_hash_prefix": "abcd1234",
        }
        _validate_envelope(envelope)  # should not raise

    def test_payload_hash_prefix_truncated(self):
        """Truncation to 8 chars — defense in depth per spec §6.2."""
        envelope: dict[str, Any] = {
            "event_type": "job_terminal",
            "payload_hash_prefix": "abcdef1234567890",
        }
        _validate_envelope(envelope)
        assert envelope["payload_hash_prefix"] == "abcdef12"

    def test_payload_hash_prefix_short_unchanged(self):
        envelope: dict[str, Any] = {
            "event_type": "job_phase",
            "payload_hash_prefix": "ab12",
        }
        _validate_envelope(envelope)
        assert envelope["payload_hash_prefix"] == "ab12"


# ---- Phase event emission ----


class TestEmitPhaseEvent:
    """Verify phase events POST correct envelopes to the Worker."""

    @pytest.fixture
    def mock_client(self):
        """Patch httpx.AsyncClient to capture POSTed data."""
        mock_response = AsyncMock()
        mock_response.status_code = 200

        mock_post = AsyncMock(return_value=mock_response)
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        mock_ctx.post = mock_post

        with patch("telemetry_helper.httpx.AsyncClient", return_value=mock_ctx):
            yield mock_post

    @pytest.mark.asyncio
    async def test_phase_event_envelope_shape(self, mock_client: AsyncMock):
        await emit_phase_event(
            "https://worker/internal/job-update",
            "job-abc",
            "claude-desktop",
            "fetching_inputs",
            "deadbeef12345678",
            1500.5,
        )
        mock_client.assert_called_once()
        url, kwargs = mock_client.call_args[0][0], mock_client.call_args[1]
        assert url == "https://worker/internal/telemetry"
        body = kwargs["json"]
        assert body["event_type"] == "job_phase"
        assert body["job_id"] == "job-abc"
        assert body["consumer_label"] == "claude-desktop"
        assert body["phase"] == "fetching_inputs"
        assert body["payload_hash_prefix"] == "deadbeef"  # truncated to 8
        assert body["duration_ms"] == 1500.5
        # Must not contain any prohibited or extra fields
        for key in body:
            assert key in ALLOWED_FIELDS, f"unexpected field: {key}"

    @pytest.mark.asyncio
    async def test_null_callback_is_noop(self):
        """No crash and no HTTP call when callback_url is None."""
        # If this raises, the test fails
        await emit_phase_event(None, "job-x", "unknown", "typesetting", "abcd1234", 100.0)

    @pytest.mark.asyncio
    async def test_all_phase_values(self, mock_client: AsyncMock):
        """All valid Container phase values fire correctly."""
        phases = ["fetching_inputs", "typesetting", "autofill", "uploading", "done"]
        for phase in phases:
            mock_client.reset_mock()
            await emit_phase_event("https://w/internal/job-update", "j", "c", phase, "aabb1234", 100)
            body = mock_client.call_args[1]["json"]
            assert body["phase"] == phase


# ---- Terminal event emission ----


class TestEmitTerminalEvent:

    @pytest.fixture
    def mock_client(self):
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_post = AsyncMock(return_value=mock_response)
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        mock_ctx.post = mock_post
        with patch("telemetry_helper.httpx.AsyncClient", return_value=mock_ctx):
            yield mock_post

    @pytest.mark.asyncio
    async def test_terminal_event_success(self, mock_client: AsyncMock):
        await emit_terminal_event(
            "https://worker/internal/job-update",
            "job-123", "bt-servant", "success", "aabb1234", 30000.0,
            passes_completed=1, overfull_count=5, pages_count=312, bytes_out=4194304,
        )
        body = mock_client.call_args[1]["json"]
        assert body["event_type"] == "job_terminal"
        assert body["failure_mode"] == "success"
        assert body["passes_completed"] == 1
        assert body["overfull_count"] == 5
        assert body["pages_count"] == 312
        assert body["bytes_out"] == 4194304
        for key in body:
            assert key in ALLOWED_FIELDS

    @pytest.mark.asyncio
    async def test_terminal_event_hard_failure(self, mock_client: AsyncMock):
        await emit_terminal_event(
            "https://worker/internal/job-update",
            "job-456", "unknown", "hard", "ccdd5678", 5000.0,
        )
        body = mock_client.call_args[1]["json"]
        assert body["failure_mode"] == "hard"
        # Totals should be absent when not provided
        assert "passes_completed" not in body
        assert "pages_count" not in body
        assert "bytes_out" not in body

    @pytest.mark.asyncio
    async def test_terminal_event_timeout(self, mock_client: AsyncMock):
        await emit_terminal_event(
            "https://worker/internal/job-update",
            "job-789", "unknown", "timeout", "eeff0011", 120000.0,
        )
        body = mock_client.call_args[1]["json"]
        assert body["failure_mode"] == "timeout"

    @pytest.mark.asyncio
    async def test_terminal_event_cancelled(self, mock_client: AsyncMock):
        await emit_terminal_event(
            "https://worker/internal/job-update",
            "job-cancel", "unknown", "cancelled", "11223344", 8000.0,
        )
        body = mock_client.call_args[1]["json"]
        assert body["failure_mode"] == "cancelled"

    @pytest.mark.asyncio
    async def test_null_callback_is_noop(self):
        await emit_terminal_event(None, "j", "c", "success", "aaaa1111", 100.0)


# ---- Fire-and-forget resilience ----


class TestFireAndForget:
    """Telemetry failures must never crash the job."""

    @pytest.mark.asyncio
    async def test_http_500_does_not_raise(self):
        mock_response = AsyncMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"

        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        mock_ctx.post = AsyncMock(return_value=mock_response)

        with patch("telemetry_helper.httpx.AsyncClient", return_value=mock_ctx):
            # Must not raise
            await emit_phase_event("https://w/internal/job-update", "j", "c", "typesetting", "aa112233", 100)

    @pytest.mark.asyncio
    async def test_network_error_does_not_raise(self):
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        mock_ctx.post = AsyncMock(side_effect=Exception("connection refused"))

        with patch("telemetry_helper.httpx.AsyncClient", return_value=mock_ctx):
            await emit_phase_event("https://w/internal/job-update", "j", "c", "uploading", "bb223344", 100)

    @pytest.mark.asyncio
    async def test_timeout_does_not_raise(self):
        import httpx as real_httpx
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        mock_ctx.post = AsyncMock(side_effect=real_httpx.TimeoutException("timed out"))

        with patch("telemetry_helper.httpx.AsyncClient", return_value=mock_ctx):
            await emit_terminal_event("https://w/internal/job-update", "j", "c", "hard", "cc334455", 100.0)
