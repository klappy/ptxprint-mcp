/**
 * docs.ts — thin proxy to oddkit MCP for in-repo canon retrieval.
 *
 * Shape A per session-13 plan: the PTXprint MCP server forwards `docs(...)`
 * calls to oddkit's HTTP MCP endpoint with `knowledge_base_url` pinned to
 * this repo. Server holds zero retrieval logic; oddkit does the BM25 work.
 *
 * Vodka boundary check: this file knows two things — the URL of the canon
 * repo (this repo), and the URL of oddkit. It does not know any PTXprint
 * domain semantics. Forwarding only.
 *
 * Reverses session-2 D-004 ("no retrieval in the MCP server"). The reversal
 * is justified in canon/encodings/transcript-encoded-session-13.md (this
 * PR). Original D-004 was correct at the time — canon did not yet exist and
 * BT Servant was not yet a deadline. Both have changed.
 */

const ODDKIT_MCP_URL = "https://oddkit.klappy.dev/mcp";
const CANON_KB_URL = "https://github.com/klappy/ptxprint-mcp";
const USER_AGENT = "ptxprint-mcp-docs/0.1";

const SEARCH_TIMEOUT_MS = 5_000;
const GET_TIMEOUT_MS = 10_000;

// ---------- Public types ----------

export type DocsAudience = "headless" | "gui";
export type DocsDepth = 1 | 2 | 3;

export interface DocsSource {
  uri: string;
  title: string;
  snippet: string;
  score?: number;
}

export interface DocsResult {
  answer: string | null;
  sources: DocsSource[];
  deeper: string[];
  governance_source: "knowledge_base" | "minimal";
  error?: string;
}

// ---------- oddkit response shapes (only fields we use) ----------

interface OddkitSearchHit {
  uri: string;
  path: string;
  title: string;
  tags?: string[];
  score: number;
  snippet: string;
  source: string;
}

interface OddkitSearchResult {
  status: string;
  hits: OddkitSearchHit[];
}

interface OddkitGetResult {
  path: string;
  content: string;
  content_hash?: string;
}

// ---------- The tool entry point ----------

export async function fetchDocs(
  query: string,
  audience: DocsAudience = "headless",
  depth: DocsDepth = 1,
): Promise<DocsResult> {
  try {
    return await fetchDocsInner(query, audience, depth);
  } catch (err) {
    // Contract C-013: never throw. Any unexpected runtime error (e.g. an
    // oddkit response whose shape doesn't match our interfaces) degrades
    // to the structured minimal-governance result.
    return {
      answer: null,
      sources: [],
      deeper: [],
      governance_source: "minimal",
      error: `docs internal error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function fetchDocsInner(
  query: string,
  audience: DocsAudience,
  depth: DocsDepth,
): Promise<DocsResult> {
  // Step 1 — search oddkit.
  let searchResult: OddkitSearchResult | null = null;
  try {
    searchResult = await callOddkit<OddkitSearchResult>(
      "search",
      query,
      SEARCH_TIMEOUT_MS,
    );
  } catch (err) {
    return {
      answer: null,
      sources: [],
      deeper: [],
      governance_source: "minimal",
      error: `docs upstream unavailable: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!searchResult || !searchResult.hits || searchResult.hits.length === 0) {
    return {
      answer: null,
      sources: [],
      deeper: suggestDeeperQueries(query),
      governance_source: "knowledge_base",
    };
  }

  // Step 2 — apply audience bias. Headless = prefer docs whose tags include
  // "headless", "agent-kb", "mcp"; gui = prefer "gui", "training", "manual".
  // Bias is a sort tiebreaker, not a hard filter — if no audience-tagged hits
  // exist, the original ranking stands.
  const ranked = audienceRank(searchResult.hits, audience);
  const top = ranked[0];

  // Step 3 — depth handling.
  if (depth === 1) {
    return {
      answer: top.snippet,
      sources: ranked.slice(0, 5).map(toSource),
      deeper: suggestDeeperFromHits(ranked, query),
      governance_source: "knowledge_base",
    };
  }

  // depth >= 2: fetch the full top doc.
  let topDoc: OddkitGetResult | null = null;
  try {
    topDoc = await callOddkit<OddkitGetResult>(
      "get",
      top.uri,
      GET_TIMEOUT_MS,
    );
  } catch {
    // Fall back to the depth=1 shape if the get fails — partial-credit
    // is better than total-failure here, and the search results are valid.
    return {
      answer: top.snippet,
      sources: ranked.slice(0, 5).map(toSource),
      deeper: suggestDeeperFromHits(ranked, query),
      governance_source: "knowledge_base",
    };
  }

  const sources: DocsSource[] = [
    {
      uri: top.uri,
      title: top.title,
      snippet: topDoc?.content ?? top.snippet,
      score: top.score,
    },
    ...ranked.slice(1, 5).map(toSource),
  ];

  // depth=3: also fetch the next 2 ranked docs in full, in parallel.
  if (depth === 3) {
    const neighbors = ranked.slice(1, 3);
    const results = await Promise.allSettled(
      neighbors.map((n) =>
        callOddkit<OddkitGetResult>("get", n.uri, GET_TIMEOUT_MS),
      ),
    );
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled" && r.value && sources[i + 1]) {
        sources[i + 1].snippet = r.value.content;
      }
      // On rejection, leave the snippet in place; partial enrichment is fine.
    }
  }

  return {
    answer: topDoc?.content ?? top.snippet,
    sources,
    deeper: suggestDeeperFromHits(ranked, query),
    governance_source: "knowledge_base",
  };
}

// ---------- Internals ----------

/**
 * Call oddkit's MCP HTTP endpoint. Oddkit responds via SSE-shaped framing
 * (`event: message\ndata: {...}`); we strip that to extract the JSON-RPC
 * envelope, then unwrap the inner result + content[0].text JSON.
 */
async function callOddkit<T>(
  action: "search" | "get",
  input: string,
  timeoutMs: number,
): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(ODDKIT_MCP_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "user-agent": USER_AGENT,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "oddkit",
          arguments: {
            action,
            input,
            knowledge_base_url: CANON_KB_URL,
            // For search, prefer overlay docs (this repo's canon) over the
            // baseline (klappy.dev) so PTXprint-specific results rank first.
            ...(action === "search" ? { result_grouping: "overlay_first" } : {}),
          },
        },
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      throw new Error(`oddkit responded HTTP ${res.status}`);
    }

    const text = await res.text();
    const envelope = parseSseOrJson(text);
    if (!envelope) {
      throw new Error("oddkit returned an unparseable envelope");
    }

    // JSON-RPC error response: { error: { code, message, ... } }
    if (envelope.error) {
      const msg =
        envelope.error.message ?? `oddkit JSON-RPC error ${envelope.error.code ?? ""}`.trim();
      throw new Error(`oddkit error: ${msg}`);
    }

    // JSON-RPC envelope: { result: { content: [{ type: "text", text: "..." }] }, ... }
    const inner = envelope?.result?.content?.[0]?.text;
    if (typeof inner !== "string") {
      throw new Error("oddkit response missing result.content[0].text");
    }

    return JSON.parse(inner) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Oddkit's HTTP MCP endpoint returns either plain JSON or SSE-framed JSON
 * (event: message\n\ndata: {...}\n\n) depending on the Accept header.
 * Handle both shapes.
 */
function parseSseOrJson(text: string): {
  result?: { content?: Array<{ type: string; text: string }> };
  error?: { code?: number; message?: string };
} | null {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }
  // SSE: a stream may interleave notification events before the final
  // JSON-RPC response. Scan every `data:` line and return the first one
  // that actually carries a response envelope (`result` or `error`).
  // Fall back to the last parseable data line if none match, so a
  // malformed-but-singular event still surfaces a useful parse error
  // upstream rather than a silent null.
  let lastParsed: ReturnType<typeof JSON.parse> | null = null;
  for (const line of trimmed.split("\n")) {
    const m = line.match(/^data:\s*(.+)$/);
    if (!m) continue;
    let parsed: ReturnType<typeof JSON.parse>;
    try {
      parsed = JSON.parse(m[1]);
    } catch {
      continue;
    }
    if (parsed && (parsed.result !== undefined || parsed.error !== undefined)) {
      return parsed;
    }
    lastParsed = parsed;
  }
  return lastParsed;
}

/**
 * Re-rank hits by audience preference. Bias is additive: docs whose tags
 * intersect the audience's preferred-tag set get a bonus that floats them
 * above same-score peers, but does not displace clearly-better matches.
 */
function audienceRank(
  hits: OddkitSearchHit[],
  audience: DocsAudience,
): OddkitSearchHit[] {
  const preferredTags =
    audience === "headless"
      ? new Set(["headless", "agent-kb", "mcp", "v1.2-aligned"])
      : new Set(["gui", "training", "manual", "derivative"]);

  const scored = hits.map((h) => {
    const matches = (h.tags ?? []).filter((t) => preferredTags.has(t)).length;
    // Bonus: small fractional boost per matching tag, scaled so two matches
    // can outrank a one-point score gap but not a five-point one.
    const adjustedScore = h.score + matches * 0.5;
    return { hit: h, adjustedScore };
  });

  scored.sort((a, b) => b.adjustedScore - a.adjustedScore);
  return scored.map((s) => s.hit);
}

function toSource(hit: OddkitSearchHit): DocsSource {
  return {
    uri: hit.uri,
    title: hit.title,
    snippet: hit.snippet,
    score: hit.score,
  };
}

function suggestDeeperFromHits(hits: OddkitSearchHit[], _query: string): string[] {
  // Cheap "want to go deeper?" generator: the next 2-3 distinct doc titles
  // become candidate follow-up questions phrased generically.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of hits.slice(0, 5)) {
    if (seen.has(h.title)) continue;
    seen.add(h.title);
    out.push(`Tell me more about: ${h.title}`);
    if (out.length >= 3) break;
  }
  return out;
}

function suggestDeeperQueries(query: string): string[] {
  // No-hit fallback: nudge the agent toward broader retries.
  return [
    `${query} (broader)`,
    `What canon articles are available about this topic?`,
  ];
}
