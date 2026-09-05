/**
 * bundle-canon.ts — build script: bundle the agent-facing canon into the Worker.
 *
 * Reads the markdown under canon/ (articles, governance, specs, templates, handoffs, plus
 * canon/README.md), parses frontmatter, the "What this answers." line, and the `##` section
 * map of each file, and writes src/bundled-canon.ts exporting CANON_DOCS + CANON_BUNDLE.
 *
 * The `docs` tool serves this bundle progressively (index → article → section → search); the
 * "What this answers" line is the index text, so an article without one is flagged here.
 *
 * Run: npm run bundle-canon   (CI fails if src/bundled-canon.ts is stale)
 *
 * Excluded on purpose: canon/encodings (session ledgers), canon/surfaces (non-canonical ESE
 * outputs), canon/derivatives, canon/specs/archive, canon/articles/_archive, PENDING_UPLOADS.md.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const canonDir = join(rootDir, "canon");
const outputPath = join(rootDir, "src", "bundled-canon.ts");

const INCLUDE_DIRS = ["articles", "governance", "specs", "templates", "handoffs"];
const EXCLUDE_SEGMENTS = new Set(["_archive", "archive"]);

interface Section { slug: string; heading: string; start: number; end: number }
interface Doc {
  path: string; uri: string; title: string; audience: string; tags: string[]; stability: string;
  what_it_answers: string; sections: Section[]; body: string;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (!EXCLUDE_SEGMENTS.has(name)) out.push(...walk(p)); }
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}
function frontmatter(md: string): Record<string, string | string[]> {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  const fm: Record<string, string | string[]> = {};
  if (!m) return fm;
  let listKey: string | null = null;
  for (const line of m[1].split("\n")) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) { (fm[listKey] as string[]).push(item[1].trim().replace(/^["']|["']$/g, "")); continue; }
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, k, raw] = kv; const v = raw.trim();
    if (v === "") { fm[k] = []; listKey = k; continue; }
    listKey = null;
    if (v.startsWith("[")) fm[k] = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    else fm[k] = v.replace(/^["']|["']$/g, "");
  }
  return fm;
}
function slugify(h: string): string {
  return h.toLowerCase().replace(/[`*_]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function whatItAnswers(body: string, title: string): string {
  // The house convention: an early blockquote line "**What this answers.** …". Fall back to the first
  // prose paragraph after the H1 (frontmatter and headings skipped), then to the title.
  const m = body.match(/\*\*What this answers\.?\*\*\s*([^\n]+)/);
  if (m) return m[1].replace(/\s+/g, " ").trim();
  const paras = body.replace(/^---\n[\s\S]*?\n---\n?/, "").split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !p.startsWith("#") && !p.startsWith("|") && !p.startsWith("```"));
  const first = paras.find((p) => p.length >= 60) ?? paras[0] ?? title;
  return first.replace(/^>\s?/gm, "").replace(/\s+/g, " ").slice(0, 240);
}
function sectionsOf(body: string): Section[] {
  const lines = body.split("\n");
  const heads: Array<{ i: number; heading: string }> = [];
  let inFence = false;
  lines.forEach((l, i) => {
    if (/^```/.test(l)) inFence = !inFence;
    if (!inFence && /^##\s+/.test(l)) heads.push({ i, heading: l.replace(/^##\s+/, "").trim() });
  });
  const used = new Map<string, number>();
  return heads.map((h, k) => {
    let slug = slugify(h.heading) || `section-${k + 1}`;
    const n = (used.get(slug) ?? 0) + 1; used.set(slug, n); if (n > 1) slug = `${slug}-${n}`;
    return { slug, heading: h.heading, start: h.i, end: k + 1 < heads.length ? heads[k + 1].i : lines.length };
  });
}

const files = [join(canonDir, "README.md"), ...INCLUDE_DIRS.flatMap((d) => walk(join(canonDir, d)))].sort();
const missingWia: string[] = [];
const docs: Doc[] = files.map((f) => {
  const body = readFileSync(f, "utf-8");
  const fm = frontmatter(body);
  const rel = relative(canonDir, f).split(sep).join("/");
  const uri = typeof fm.uri === "string" && fm.uri ? fm.uri : `klappy://canon/${rel.replace(/\.md$/, "")}`;
  const h1 = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = (typeof fm.title === "string" && fm.title) || h1 || rel;
  if (!/\*\*What this answers/.test(body) && rel.startsWith("articles/")) missingWia.push(rel);
  return {
    path: rel, uri, title,
    audience: typeof fm.audience === "string" ? fm.audience : "",
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    stability: typeof fm.stability === "string" ? fm.stability : "",
    what_it_answers: whatItAnswers(body, title),
    sections: sectionsOf(body),
    body,
  };
});

const sha = createHash("sha256").update(JSON.stringify(docs)).digest("hex").slice(0, 12);
const bytes = docs.reduce((n, d) => n + d.body.length, 0);
const output = `// AUTO-GENERATED by scripts/bundle-canon.ts — do not edit. Re-run: npm run bundle-canon
// Source: canon/{${INCLUDE_DIRS.join(",")}} + canon/README.md (${docs.length} docs, ${bytes} bytes)
// Canon content hash: ${sha} (sha256 of the bundled docs, first 12 hex)

export interface CanonSection { slug: string; heading: string; start: number; end: number }
export interface CanonDoc {
  path: string; uri: string; title: string; audience: string; tags: string[]; stability: string;
  what_it_answers: string; sections: CanonSection[]; body: string;
}

export const CANON_BUNDLE = { sha: ${JSON.stringify(sha)}, docs: ${docs.length}, bytes: ${bytes} } as const;

export const CANON_DOCS: CanonDoc[] = ${JSON.stringify(docs, null, 0)};
`;
writeFileSync(outputPath, output);
console.log(`✓ Bundled canon → src/bundled-canon.ts (${docs.length} docs, ${bytes} bytes, canon ${sha})`);
if (missingWia.length) console.log(`  note: ${missingWia.length} article(s) without a "What this answers." line (index text falls back to the first paragraph): ${missingWia.join(", ")}`);
