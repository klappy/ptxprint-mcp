/**
 * docs.ts — the canon, served by the worker itself, progressively.
 *
 * Four calls on one tool (kitchen ticket 2026-09-05-ptxprint-docs-v2-progressive-disclosure;
 * shape borrowed from the house's Cartographer/Door43 docs tools and the retrieval-disclosure
 * contract `klappy://canon/constraints/retrieval-disclosure-contract`):
 *
 *   docs {}                      → the INDEX: every bundled article as uri · title · what it answers · tags.
 *                                  ~50 lines. Cheap. Read this first.
 *   docs {uri}                   → one article, whole (frontmatter + body), with its section list.
 *   docs {uri, section}          → one `##` section of one article — the unit an LLM's context actually wants.
 *   docs {query}                 → ranked POINTERS (uri · title · what it answers · score), never bodies,
 *                                  with `covered: false` below a score floor instead of a confident wrong guess.
 *
 * `depth` from the 0.1/0.2 tool survives one release as a deprecated alias: depth ≥ 2 on a query returns
 * the top hit's article as `answer`, so an agent written against the old shape keeps working.
 *
 * History: 0.1 proxied oddkit and went silently empty when oddkit's response contract changed;
 * 0.2 bundled the canon and searched it, but still answered every question with its nearest neighbour
 * and dumped whole articles. The Titus study-bible cook (2026-09-05) found `usechangesfile` only as a
 * bare line in a cfg dump, `\ef` nowhere, and "how many jobs at once" answered with telemetry governance.
 */

import { CANON_DOCS, CANON_BUNDLE, type CanonDoc, type CanonSection } from "./bundled-canon.js";

// ---------- Public types ----------

export type DocsAudience = "headless" | "gui";

export interface DocsArgs {
  query?: string;
  uri?: string;
  section?: string;          // section slug or exact heading text; case-insensitive
  audience?: DocsAudience;
  limit?: number;            // pointers to return on a query (default 8, max 25)
  /** @deprecated 0.1/0.2 alias: with `query`, depth ≥ 2 also returns the top hit's article as `answer`. */
  depth?: 1 | 2 | 3;
}

export interface DocsPointer {
  uri: string;
  title: string;
  what_it_answers: string;
  tags: string[];
  score?: number;
}

export interface DocsIndex {
  kind: "index";
  count: number;
  articles: DocsPointer[];
  next: string;
  served_from: string;
}

export interface DocsArticle {
  kind: "article";
  uri: string;
  title: string;
  what_it_answers: string;
  tags: string[];
  sections: Array<{ slug: string; heading: string; lines: number }>;
  body: string;
  next: string;
  served_from: string;
}

export interface DocsSectionResult {
  kind: "section";
  uri: string;
  title: string;
  section: { slug: string; heading: string };
  body: string;
  siblings: string[];
  next: string;
  served_from: string;
}

export interface DocsSearch {
  kind: "search";
  query: string;
  covered: boolean;
  pointers: DocsPointer[];
  /** @deprecated present only when the caller passed depth ≥ 2 (0.1/0.2 alias): the top hit's article body. */
  answer?: string | null;
  /** @deprecated 0.1/0.2 alias of `pointers`, with `snippet` = what_it_answers. */
  sources?: Array<{ uri: string; title: string; snippet: string; score?: number }>;
  next: string;
  served_from: string;
}

export interface DocsError {
  kind: "error";
  error: string;
  next: string;
  served_from: string;
}

export type DocsResult = DocsIndex | DocsArticle | DocsSectionResult | DocsSearch | DocsError;

// ---------- Index (built once per isolate) ----------

const SERVED_FROM = `bundled-canon@${CANON_BUNDLE.sha} (${CANON_BUNDLE.docs} docs)`;

const STOP = new Set(
  "a an and are as at be by can do does for from how i in is it my of on or that the this to use what when where with your you".split(" "),
);
function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[`*_#>\[\]()|"']/g, " ")
    .split(/[^a-z0-9.+\\-]+/)
    .map((t) => t.replace(/^[.+\\-]+|[.+\\-]+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
}
function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

interface Indexed {
  doc: CanonDoc;
  tf: Map<string, number>;
  len: number;
  headTokens: Set<string>; // title + what_it_answers + tags — the index text, weighted up
}
const INDEX: Indexed[] = CANON_DOCS.map((doc) => {
  const toks = tokens(`${doc.title} ${doc.tags.join(" ")} ${doc.what_it_answers} ${stripFrontmatter(doc.body)}`);
  const tf = new Map<string, number>();
  for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
  return { doc, tf, len: toks.length, headTokens: new Set(tokens(`${doc.title} ${doc.what_it_answers} ${doc.tags.join(" ")}`)) };
});
const DF = new Map<string, number>();
for (const ix of INDEX) for (const t of ix.tf.keys()) DF.set(t, (DF.get(t) ?? 0) + 1);
const N = INDEX.length;
const AVG_LEN = INDEX.reduce((n, ix) => n + ix.len, 0) / Math.max(1, N);
const BY_URI = new Map(CANON_DOCS.map((d) => [d.uri.toLowerCase(), d]));

// BM25 over the body + a head bonus (title / what-it-answers / tags). k1, b textbook.
function score(ix: Indexed, q: string[]): { s: number; matched: number } {
  const k1 = 1.2, b = 0.75;
  let s = 0, matched = 0;
  for (const t of q) {
    const f = ix.tf.get(t) ?? 0;
    if (!f) continue;
    matched++;
    const df = DF.get(t) ?? 0;
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * ix.len) / AVG_LEN)));
    if (ix.headTokens.has(t)) s += idf * 1.0;
  }
  return { s, matched };
}

// The honesty floor: a pointer is offered only if it matches at least half the query's distinct terms
// (or ≥ 2 terms for long queries) AND scores above a small absolute floor. Below that: covered:false.
function covers(q: string[], r: { s: number; matched: number }): boolean {
  const need = q.length <= 2 ? q.length : Math.max(2, Math.ceil(q.length / 2));
  return r.matched >= need && r.s >= 1.5;
}

const PREFERRED_TAGS: Record<DocsAudience, Set<string>> = {
  headless: new Set(["headless", "agent-kb", "mcp", "v1.2-aligned", "v1.3-aligned"]),
  gui: new Set(["gui", "training", "manual", "derivative"]),
};

function pointer(d: CanonDoc, s?: number): DocsPointer {
  return { uri: d.uri, title: d.title, what_it_answers: d.what_it_answers, tags: d.tags, ...(s === undefined ? {} : { score: Math.round(s * 1000) / 1000 }) };
}
function slugify(h: string): string {
  return h.toLowerCase().replace(/[`*_]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function sectionsOf(d: CanonDoc): CanonSection[] {
  return d.sections;
}
function sectionBody(d: CanonDoc, sec: CanonSection): string {
  return d.body.split("\n").slice(sec.start, sec.end).join("\n").trim();
}

// ---------- The tool entry point ----------

export async function docs(args: DocsArgs = {}): Promise<DocsResult> {
  const { query, uri, section, audience = "headless", depth } = args;
  const limit = Math.min(25, Math.max(1, args.limit ?? 8));

  // docs {uri} / docs {uri, section}
  if (uri) {
    const d = BY_URI.get(uri.trim().toLowerCase()) ?? BY_URI.get(`klappy://canon/${uri.trim().toLowerCase().replace(/^klappy:\/\/canon\//, "")}`);
    if (!d) {
      const near = INDEX.map((ix) => ({ d: ix.doc, ...score(ix, tokens(uri)) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
      return { kind: "error", error: `no article at ${uri}`, next: near.length ? `did you mean: ${near.map((r) => r.d.uri).join(" · ")} — or docs {} for the index` : "docs {} for the index", served_from: SERVED_FROM };
    }
    const secs = sectionsOf(d);
    if (section) {
      const want = section.trim().toLowerCase();
      const sec = secs.find((s) => s.slug === want || s.slug === slugify(want) || s.heading.toLowerCase() === want || s.heading.toLowerCase().includes(want));
      if (!sec) return { kind: "error", error: `no section '${section}' in ${d.uri}`, next: `sections: ${secs.map((s) => s.slug).join(" · ")}`, served_from: SERVED_FROM };
      return { kind: "section", uri: d.uri, title: d.title, section: { slug: sec.slug, heading: sec.heading }, body: sectionBody(d, sec), siblings: secs.map((s) => s.slug), next: `docs {uri:"${d.uri}", section:"<slug>"} for a sibling · docs {uri:"${d.uri}"} for the whole article`, served_from: SERVED_FROM };
    }
    return { kind: "article", uri: d.uri, title: d.title, what_it_answers: d.what_it_answers, tags: d.tags, sections: secs.map((s) => ({ slug: s.slug, heading: s.heading, lines: s.end - s.start })), body: d.body, next: secs.length ? `docs {uri:"${d.uri}", section:"${secs[0].slug}"} for one section` : "docs {} for the index", served_from: SERVED_FROM };
  }

  // docs {query}
  if (query && query.trim()) {
    const q = Array.from(new Set(tokens(query)));
    const pref = PREFERRED_TAGS[audience] ?? PREFERRED_TAGS.headless;
    const ranked = INDEX.map((ix) => { const r = score(ix, q); const bias = ix.doc.tags.filter((t) => pref.has(t)).length * 0.5; return { ix, s: r.s > 0 ? r.s + bias : 0, matched: r.matched, ok: covers(q, r) }; })
      .filter((r) => r.s > 0).sort((a, b) => b.s - a.s);
    const good = ranked.filter((r) => r.ok).slice(0, limit);
    const covered = good.length > 0;
    const pointers = (covered ? good : ranked.slice(0, 3)).map((r) => pointer(r.ix.doc, r.s));
    const out: DocsSearch = {
      kind: "search", query, covered, pointers,
      next: covered
        ? `docs {uri:"${pointers[0].uri}"} for the article, or {uri, section} for one section`
        : `nothing in the canon covers this well${pointers.length ? ` — nearest neighbours listed for honesty, not as answers` : ""}; docs {} lists every article with what it answers`,
      served_from: SERVED_FROM,
    };
    // deprecated 0.1/0.2 shape, one release
    out.sources = pointers.map((p) => ({ uri: p.uri, title: p.title, snippet: p.what_it_answers, score: p.score }));
    if (depth && depth >= 2 && covered) out.answer = BY_URI.get(pointers[0].uri.toLowerCase())?.body ?? null;
    else if (depth) out.answer = covered ? pointers[0].what_it_answers : null;
    return out;
  }

  // docs {} — the index
  const articles = [...CANON_DOCS].sort((a, b) => a.path.localeCompare(b.path)).map((d) => pointer(d));
  return { kind: "index", count: articles.length, articles, next: `docs {uri} for one article · docs {uri, section} for one section · docs {query} to find one`, served_from: SERVED_FROM };
}

/** Exposed for tests and introspection. */
export function canonBundleInfo(): { sha: string; docs: number; bytes: number } {
  return { ...CANON_BUNDLE };
}
