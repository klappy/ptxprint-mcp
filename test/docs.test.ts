import { describe, it, expect } from "vitest";
import { docs, canonBundleInfo } from "../src/docs.js";

// The six questions the Titus study-bible cook actually asked (2026-09-05), with the article that
// should answer each — or `null` where the honest answer is "the canon does not cover this".
const COOK_QUESTIONS: Array<[string, string | null]> = [
  ["how do I build a submit_typeset payload", "klappy://canon/articles/payload-construction"],
  ["changes.txt not applied how to enable usechangesfile", "klappy://canon/articles/study-notes-and-footnotes"],
  ["study notes as footnotes extended footnote ef marker", "klappy://canon/articles/study-notes-and-footnotes"],
  ["Dimension too large footnote error", "klappy://canon/articles/study-notes-and-footnotes"],
  ["how many jobs can run at the same time container limit", "klappy://canon/specs/ptxprint-mcp-v1.3-spec"],
  ["minimal payload with no config files fails silently exit 0 no PDF", "klappy://canon/articles/failure-mode-taxonomy"],
];

describe("docs — progressive disclosure over the bundled canon", () => {
  it("bundles a real canon", () => {
    const info = canonBundleInfo();
    expect(info.docs).toBeGreaterThan(20);
    expect(info.bytes).toBeGreaterThan(100_000);
  });

  it("docs {} is the index: every bundled article once, each with what it answers", async () => {
    const r = await docs({});
    expect(r.kind).toBe("index");
    if (r.kind !== "index") return;
    expect(r.count).toBe(canonBundleInfo().docs);
    expect(new Set(r.articles.map((a) => a.uri)).size).toBe(r.count);
    for (const a of r.articles) {
      expect(a.uri).toMatch(/^klappy:\/\/canon\//);
      expect(a.title.length).toBeGreaterThan(3);
      expect(a.what_it_answers.length).toBeGreaterThan(20);
    }
    expect(r.served_from).toMatch(/^bundled-canon@/);
  });

  it("docs {uri} returns one article with a section map", async () => {
    const r = await docs({ uri: "klappy://canon/articles/payload-construction" });
    expect(r.kind).toBe("article");
    if (r.kind !== "article") return;
    expect(r.body).toContain("---");
    expect(r.sections.length).toBeGreaterThan(3);
    expect(r.sections.map((s) => s.slug)).toContain("skeleton");
  });

  it("docs {uri, section} returns that section and only it", async () => {
    const r = await docs({ uri: "klappy://canon/articles/payload-construction", section: "skeleton" });
    expect(r.kind).toBe("section");
    if (r.kind !== "section") return;
    expect(r.body.startsWith("## Skeleton")).toBe(true);
    expect(r.body).not.toContain("## What goes where");
    expect(r.siblings).toContain("skeleton");
  });

  it("an unknown uri is an error with a pointer back to the index, not a guess", async () => {
    const r = await docs({ uri: "klappy://canon/articles/does-not-exist" });
    expect(r.kind).toBe("error");
    expect(r.next).toMatch(/docs \{\}/);
  });

  it.each(COOK_QUESTIONS)("search: %j → %s", async (q, want) => {
    const r = await docs({ query: q });
    expect(r.kind).toBe("search");
    if (r.kind !== "search") return;
    if (want === null) { expect(r.covered).toBe(false); return; }
    expect(r.covered).toBe(true);
    expect(r.pointers.slice(0, 3).map((p) => p.uri)).toContain(want);
    for (const p of r.pointers) expect((p as unknown as { body?: string }).body).toBeUndefined(); // pointers, never bodies
  });

  it("search says covered:false for a question the canon does not have", async () => {
    const r = await docs({ query: "zzqx quantum espresso llama farming" });
    expect(r.kind).toBe("search");
    if (r.kind !== "search") return;
    expect(r.covered).toBe(false);
    expect(r.next).toMatch(/nothing in the canon covers/);
  });

  it("deprecated depth alias still returns an answer for old callers", async () => {
    const r = await docs({ query: "payload construction", depth: 2 });
    if (r.kind !== "search") throw new Error("expected search");
    expect(r.answer).toContain("---");
    expect(r.sources?.[0]?.uri).toBe("klappy://canon/articles/payload-construction");
  });

  it("never reaches the network", async () => {
    const realFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = (async () => { called = true; throw new Error("network"); }) as typeof fetch;
    try { await docs({}); await docs({ query: "font resolution" }); await docs({ uri: "klappy://canon/articles/font-resolution" }); }
    finally { globalThis.fetch = realFetch; }
    expect(called).toBe(false);
  });
});
