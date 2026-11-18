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
    next_step: `Call get_job_status with job_id "${r.jobId}" (exactly this value) until state is succeeded or failed. On succeeded, use its pdf_url. On failed, report its errors / log_tail / log_url (pdf_url is null); resubmitting the same payload retries.`,
  };
}
