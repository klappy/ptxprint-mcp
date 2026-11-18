import { describe, it, expect } from "vitest";
import { PayloadSchema } from "../src/payload.js";
import { submitResult, SUBMIT_TYPESET_DESCRIPTION, GET_JOB_STATUS_DESCRIPTION } from "../src/submit-result.js";

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
  it("on a cache miss, names the exact job_id to poll next", () => {
    expect(submitResult(payload, { ...r, cached: false }).next_step).toContain(`"${r.jobId}"`);
  });
  it("on a cache hit, says the PDF is final and no polling is needed", () => {
    const s = submitResult(payload, r).next_step;
    expect(s).toMatch(/already exists at predicted_pdf_url/);
    expect(s).toMatch(/No polling is needed/);
    expect(s).not.toContain(r.jobId);
  });
  it("on failure, retries only after a hard failure; soft failures stay cached", () => {
    const s = submitResult(payload, { ...r, cached: false }).next_step;
    expect(s).toMatch(/On succeeded, use its pdf_url/);
    expect(s).toMatch(/after a hard failure \(no PDF\) resubmitting the same payload re-runs it/);
    expect(s).toMatch(/after a soft failure the degraded PDF is cached/);
  });
  it("tool descriptions pin the small-model contract wording", () => {
    for (const phrase of ["config_files are required", "bundle-default-cfg-handoff", "Call this once per payload", "cached: true", "do not poll",
      "exact job_id", "Never guess a job_id", "only after a hard failure", "after a soft failure the degraded PDF is cached"]) {
      expect(SUBMIT_TYPESET_DESCRIPTION).toContain(phrase);
    }
    expect(SUBMIT_TYPESET_DESCRIPTION).not.toMatch(/bundled default cfg renders|Smallest valid payload|Level 0/);
    expect(GET_JOB_STATUS_DESCRIPTION).toContain("exact value returned by submit_typeset");
    expect(GET_JOB_STATUS_DESCRIPTION).toContain("Not needed when submit_typeset returned cached: true");
  });
});
