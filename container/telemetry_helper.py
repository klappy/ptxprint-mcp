"""
Container telemetry helper — fire-and-forget event emission to the Worker.

Per v1.3 spec §5: the Container POSTs phase-transition and terminal events
to the Worker's /internal/telemetry endpoint. The Container holds NO
Analytics Engine credentials — all telemetry routes through the Worker.

Privacy floor (governance §"Privacy Floor"):
  The 10 prohibited fields are structurally excluded — functions accept ONLY
  the typed slots documented in spec §5. Runtime validation rejects prohibited
  fields even if a caller passes them (defense in depth).

Authority:
  klappy://canon/specs/ptxprint-mcp-v1.3-spec §5 "The Container — additions to v1.2"
  klappy://canon/governance/telemetry-governance §"Job Lifecycle Events"
  klappy://canon/governance/telemetry-governance §"Privacy Floor"
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

log = logging.getLogger("ptxprint-container.telemetry")

# ---- Privacy floor ----

PROHIBITED_FIELDS: frozenset[str] = frozenset({
    "project_id",
    "config_name",
    "book_codes",
    "source_url",
    "font_url",
    "figure_url",
    "payload_full",
    "usfm_bytes",
    "log_content",
    "pdf_bytes",
})

ALLOWED_FIELDS: frozenset[str] = frozenset({
    "event_type",
    "job_id",
    "consumer_label",
    "phase",
    "failure_mode",
    "payload_hash_prefix",
    "duration_ms",
    "passes_completed",
    "overfull_count",
    "pages_count",
    "bytes_out",
})


# ---- Internal helpers ----


def _derive_telemetry_url(worker_callback_url: str) -> str:
    """Derive /internal/telemetry from the Worker callback URL.

    worker_callback_url looks like:
      https://<worker>/internal/job-update
    We need:
      https://<worker>/internal/telemetry
    """
    base = worker_callback_url.rsplit("/", 1)[0]  # strip "job-update"
    return f"{base}/telemetry"


def _validate_envelope(envelope: dict[str, Any]) -> None:
    """Defense-in-depth: reject prohibited or unknown fields at runtime.

    This is the Container-side privacy floor enforcement. The Worker-side
    redactor (src/telemetry.ts redactAndValidate) is the second line of
    defense. Both must pass before the Worker writes to Analytics Engine.
    """
    for key in envelope:
        if key in PROHIBITED_FIELDS:
            raise ValueError(f"prohibited field in telemetry envelope: {key}")
        if key not in ALLOWED_FIELDS:
            raise ValueError(f"unknown field in telemetry envelope: {key}")

    # Truncate payload_hash_prefix to 8 hex chars (spec §5, defense in depth)
    if "payload_hash_prefix" in envelope:
        envelope["payload_hash_prefix"] = str(envelope["payload_hash_prefix"])[:8]


async def _post_telemetry(worker_callback_url: str | None, envelope: dict[str, Any]) -> None:
    """POST a telemetry envelope to the Worker. Never raises — logs on failure."""
    if not worker_callback_url:
        log.debug("no callback_url; skipping telemetry for %s", envelope.get("event_type"))
        return

    try:
        _validate_envelope(envelope)
        url = _derive_telemetry_url(worker_callback_url)
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=envelope)
            if resp.status_code != 200:
                log.warning(
                    "telemetry POST %s returned %d: %s",
                    envelope.get("event_type"),
                    resp.status_code,
                    resp.text[:200],
                )
    except Exception as exc:  # noqa: BLE001
        # Fire-and-forget: never crash the job for a telemetry failure
        log.warning("telemetry POST error (non-fatal): %s", exc)


# ---- Public API ----


async def emit_phase_event(
    worker_callback_url: str | None,
    job_id: str,
    consumer_label: str,
    phase: str,
    payload_hash_prefix: str,
    duration_ms: float,
) -> None:
    """Emit a job_phase event at a phase-transition boundary.

    Per governance §"Job Lifecycle Events": duration_ms records how long
    the just-completed phase took.

    Phase enum: fetching_inputs | typesetting | autofill | uploading | done
    (queued is written by the Worker, not the Container)
    """
    envelope: dict[str, Any] = {
        "event_type": "job_phase",
        "job_id": job_id,
        "consumer_label": consumer_label,
        "phase": phase,
        "payload_hash_prefix": payload_hash_prefix[:8],
        "duration_ms": duration_ms,
    }
    await _post_telemetry(worker_callback_url, envelope)


async def emit_terminal_event(
    worker_callback_url: str | None,
    job_id: str,
    consumer_label: str,
    failure_mode: str,
    payload_hash_prefix: str,
    duration_ms: float,
    *,
    passes_completed: int | None = None,
    overfull_count: int | None = None,
    pages_count: int | None = None,
    bytes_out: int | None = None,
) -> None:
    """Emit a job_terminal event exactly once per dispatched job.

    Per governance §"Job Lifecycle Events":
      failure_mode ∈ {success, soft, hard, cancelled, timeout}
      totals are populated only when applicable (pages_count only on success)
    """
    envelope: dict[str, Any] = {
        "event_type": "job_terminal",
        "job_id": job_id,
        "consumer_label": consumer_label,
        "failure_mode": failure_mode,
        "payload_hash_prefix": payload_hash_prefix[:8],
        "duration_ms": duration_ms,
    }
    if passes_completed is not None:
        envelope["passes_completed"] = passes_completed
    if overfull_count is not None:
        envelope["overfull_count"] = overfull_count
    if pages_count is not None:
        envelope["pages_count"] = pages_count
    if bytes_out is not None:
        envelope["bytes_out"] = bytes_out
    await _post_telemetry(worker_callback_url, envelope)
