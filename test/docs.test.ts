import { describe, it, expect } from "vitest";
import { fetchDocs, canonBundleInfo } from "../src/docs.js";

// The three queries the README hands a new agent. Before the fix every one of
// them returned answer:null / sources:[] (validation 2026-09-05, row D1).
const README_QUERIES = ["phase 1 minimum payload", "payload construction", "english single book template"];

describe("docs — self-served canon", () => {
  it("bundles a real canon, not an empty one", () => {
    const info = canonBundleInfo();
    expect(info.docs).toBeGreaterThan(20);
    expect(info.bytes).toBeGreaterThan(100_000);
  });

  it.each(README_QUERIES)("answers the README query %j at depth 1", async (q) => {
    const r = await fetchDocs(q, "headless", 1);
    expect(r.governance_source).toBe("knowledge_base");
    expect(r.answer).toBeTruthy();
    expect(r.sources.length).toBeGreaterThan(0);
    expect(r.sources[0].uri).toMatch(/^klappy:\/\/canon\//);
    expect(r.served_from).toMatch(/^bundled-canon@/);
  });

  it("ranks the payload-construction article first for its own title", async () => {
    const r = await fetchDocs("payload construction", "headless", 1);
    expect(r.sources[0].uri).toBe("klappy://canon/articles/payload-construction");
  });

  it("returns the full top document at depth 2 and three full docs at depth 3", async () => {
    const d2 = await fetchDocs("english single book template", "headless", 2);
    expect(d2.answer).toContain("---"); // frontmatter present → full body, not a snippet
    expect(d2.sources[0].snippet.length).toBeGreaterThan(500);
    const d3 = await fetchDocs("english single book template", "headless", 3);
    const full = d3.sources.slice(0, 3).filter((s) => s.snippet.length > 500);
    expect(full.length).toBe(3);
  });

  it("snippets keep their markdown (renderers render it) and skip one-line callouts", async () => {
    const r = await fetchDocs("payload construction", "headless", 1);
    expect(r.answer).toContain("**"); // the Quickstart callout is bold in the source; it must survive
    const p = await fetchDocs("phase 1 minimum payload", "headless", 1);
    expect((p.answer ?? "").length).toBeGreaterThanOrEqual(80);
  });

  it("says nothing rather than something for a query the canon does not cover", async () => {
    const r = await fetchDocs("zzqx quantum espresso llama", "headless", 1);
    expect(r.answer).toBeNull();
    expect(r.sources).toEqual([]);
    expect(r.deeper.length).toBe(2);
  });

  it("never reaches the network", async () => {
    const realFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = (async () => { called = true; throw new Error("network"); }) as typeof fetch;
    try {
      await fetchDocs("font resolution", "headless", 2);
    } finally {
      globalThis.fetch = realFetch;
    }
    expect(called).toBe(false);
  });
});
