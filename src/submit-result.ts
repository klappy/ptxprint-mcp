/**
 * submit_typeset result shape (Worker 0.4.1).
 *
 * `job_id` stays first, and the result now echoes the key values the server
 * actually hashed (project, config, books, each source's book/filename/sha256)
 * plus an explicit `next_step`. Why: in the 2026-11-18 small-model test
 * (klappy/kitchen rail/2-cooking/2026-11-17-funding-opportunity-lens/SMALL-MODEL-TEST.md),
 * 7B models polled get_job_status with invented ids and mistyped project ids
 * (`bsoref` for `bsbref`); an echo lets the agent — and its user — catch both.
 *
 * Additive only: every pre-0.4.1 field keeps its name, type and meaning.
 */
import type { Payload } from "./payload.js";

/** Tool descriptions live here so tests can pin the contract wording (0.4.1). */
export const SUBMIT_TYPESET_DESCRIPTION =
  "Submit a PTXprint typesetting job. Validates the payload, computes its sha256, and either returns the cached output URL (if the same payload has been seen before) or dispatches the job to a Container worker. Returns immediately with a job_id. " +
  "On this build config_files are required (a project ptxprint.cfg plus Settings.xml): a payload without them fails, because the bundled default cfg has not shipped yet (canon/handoffs/bundle-default-cfg-handoff). Templates under canon/templates (find them with docs) show a config_files + fonts set to start from. " +
  "Call this once per payload and wait for its result. If the result has cached: true, the PDF already exists at predicted_pdf_url — that is final (it may be a degraded soft-failure render); use it and do not poll (get_job_status may answer job_id not found for a cached job). " +
  "Otherwise call get_job_status with the exact job_id this call returns until state is succeeded or failed; do not resubmit while the job is queued or running. Never guess a job_id: it is the payload sha256 and cannot be known before this call returns. " +
  "Resubmitting the same payload re-runs it only after a hard failure (no PDF was produced); after a soft failure the degraded PDF is cached, so the same payload returns it again — change the payload instead. " +
  "The result echoes the project, books and source sha256 it hashed — check them against what you meant to send.";

export const GET_JOB_STATUS_DESCRIPTION =
  "Poll a job's state, progress, errors, and (when complete) result URLs. job_id must be the exact value returned by submit_typeset — never a placeholder or a guess. Not needed when submit_typeset returned cached: true. Returns the same shape regardless of state; null fields indicate the job has not reached that point yet.";

export interface SubmitResultInput {
  jobId: string;
  submittedAt: string;
  predictedPdfUrl: string;
  cached: boolean;
  payloadHash: string;
}

export function submitResult(payload: Payload, r: SubmitResultInput) {
  return {
    job_id: r.jobId,
    submitted_at: r.submittedAt,
    predicted_pdf_url: r.predictedPdfUrl,
    cached: r.cached,
    payload_hash: r.payloadHash,
    echo: {
      project_id: payload.project_id,
      config_name: payload.config_name,
      books: payload.books,
      sources: payload.sources.map((s) => ({ book: s.book, filename: s.filename, sha256: s.sha256 })),
    },
    next_step: r.cached
      ? "Cached result: the PDF already exists at predicted_pdf_url — use it (it may be a degraded soft-failure render). No polling is needed (get_job_status may answer job_id not found for a cached job)."
      : `Call get_job_status with job_id "${r.jobId}" (exactly this value) until state is succeeded or failed. On succeeded, use its pdf_url. On failed, read failure_mode, errors and log_tail / log_url: after a hard failure (no PDF) resubmitting the same payload re-runs it; after a soft failure the degraded PDF is cached and the same payload returns it again — change the payload instead.`,
  };
}
