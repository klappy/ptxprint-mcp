import { describe, it, expect } from "vitest";
import { PayloadSchema } from "../src/payload.js";
import { submitResult } from "../src/submit-result.js";

const payload = PayloadSchema.parse({
  schema_version: "1.0", project_id: "bsbref", books: ["JHN"],
  sources: [{ book: "JHN", filename: "44JHNtest.usfm", url: "https://example.org/44JHN.usfm", sha256: "f".repeat(64) }],
});
const r = { jobId: "a".repeat(64), submittedAt: "2026-11-18T18:00:00.000Z", predictedPdfUrl: "https://x/r2/outputs/a/bsbref_Default_JHN_ptxp.pdf", cached: true, payloadHash: "a".repeat(64) };

describe("submit_typeset result (0.4.1)", () => {
  it("keeps job_id first and every pre-0.4.1 field unchanged", () => {
    const out = submitResult(payload, r);
    expect(Object.keys(out)[0]).toBe("job_id");
    expect(out).toMatchObject({ job_id: r.jobId, submitted_at: r.submittedAt, predicted_pdf_url: r.predictedPdfUrl, cached: true, payload_hash: r.payloadHash });
  });
  it("echoes the values the server hashed, with defaults applied", () => {
    const out = submitResult(payload, r);
    expect(out.echo).toEqual({ project_id: "bsbref", config_name: "Default", books: ["JHN"], sources: [{ book: "JHN", filename: "44JHNtest.usfm", sha256: "f".repeat(64) }] });
  });
  it("names the exact job_id to poll next", () => {
    expect(submitResult(payload, r).next_step).toContain(`"${r.jobId}"`);
  });
  it("sends failed jobs to errors/logs, not pdf_url, and allows a retry", () => {
    const s = submitResult(payload, r).next_step;
    expect(s).toMatch(/On succeeded, use its pdf_url/);
    expect(s).toMatch(/On failed, report its errors/);
    expect(s).toMatch(/resubmitting the same payload retries/);
  });
});
