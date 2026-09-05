import { describe, it, expect } from "vitest";
import { PayloadSchema, payloadHash } from "../src/payload.js";

const base = { schema_version: "1.0" as const, project_id: "prim", books: ["TIT"], config_files: { "Settings.xml": "<ScriptureText/>" } };
const src = { book: "TIT", filename: "57TITust.usfm", url: "https://example.org/57TITust.usfm", sha256: "a".repeat(64) };

describe("payload.projects — secondary projects for diglot (0.4.0)", () => {
  it("is optional and absent by default, so old payloads hash as before", async () => {
    const p = PayloadSchema.parse(base);
    expect(p.projects).toBeUndefined();
    expect(await payloadHash(p)).toBe(await payloadHash(PayloadSchema.parse({ ...base })));
  });
  it("accepts a secondary project with its own config_files and sources", () => {
    const p = PayloadSchema.parse({ ...base, projects: { ust: { config_files: { "Settings.xml": "<ScriptureText/>" }, sources: [src] } } });
    expect(p.projects!.ust.sources[0].filename).toBe("57TITust.usfm");
  });
  it("rejects a project id longer than 8 characters", () => {
    expect(() => PayloadSchema.parse({ ...base, projects: { "way-too-long-id": { sources: [src] } } })).toThrow();
  });
  it("hashes differently when a secondary project is present", async () => {
    const a = await payloadHash(PayloadSchema.parse(base));
    const b = await payloadHash(PayloadSchema.parse({ ...base, projects: { ust: { sources: [src] } } }));
    expect(a).not.toBe(b);
  });
});
