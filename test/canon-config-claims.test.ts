import { describe, it, expect } from "vitest";
import { CANON_DOCS } from "../src/bundled-canon.js";

// No bundled default cfg ships on this build (canon/handoffs/bundle-default-cfg-handoff), so a
// payload without config_files fails. Any agent-facing article that still describes the no-config
// path must carry the "Not on this build" note. Handoffs are exempt: they describe the future work.
const CLAIM = /bundled default cfg fills in|Bundle provides cfg|Send `\{books, sources\}`|smallest possible payload \(`\{books, sources\}`\)|Container ships with a publication-quality default cfg|container ships with a publication-quality default cfg|Level 0 in the new ladder/;
const NOTE = "Not on this build";

describe("bundled canon — no unqualified no-config claim", () => {
  it("every non-handoff doc making the claim carries the note", () => {
    const offenders = CANON_DOCS.filter(
      (d) => !d.uri.includes("/handoffs/") && CLAIM.test(d.body) && !d.body.includes(NOTE),
    ).map((d) => d.uri);
    expect(offenders).toEqual([]);
  });

  it("the four articles Terry named are qualified", () => {
    for (const slug of ["payload-construction", "agent-faq-customization", "progressive-customization", "bundled-default-cfg"]) {
      const d = CANON_DOCS.find((x) => x.uri === `klappy://canon/articles/${slug}`);
      expect(d?.body).toContain(NOTE);
    }
  });
});
