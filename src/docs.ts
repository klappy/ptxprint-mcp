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
 *
 * Implementation note (session-13 follow-up after operator review): the
 * outbound MCP call uses the official @modelcontextprotocol/sdk Client +
 * StreamableHTTPClientTransport rather than hand-rolled fetch + SSE
 * parsing. The SDK already does the initialize handshake, session ID
 * tracking, SSE framing, and reconnection. Reinventing those was the
 * mistake the first commit on this branch made.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

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
  // One MCP session per call. The SDK Client + transport are cheap to
  // construct; pooling/reuse is a future optimization, not Day-1.
  let client: Client | null = null;
  try {
    client = await openOddkitClient();

    // Step 1 — search.
    const searchResult = await callOddkit<OddkitSearchResult>(
      client,
      "search",
      query,
      SEARCH_TIMEOUT_MS,
    );

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
        deeper: suggestDeeperFromHits(ranked),
        governance_source: "knowledge_base",
      };
    }

    // depth >= 2: fetch the full top doc.
    let topDoc: OddkitGetResult | null = null;
    try {
      topDoc = await callOddkit<OddkitGetResult>(client, "get", top.uri, GET_TIMEOUT_MS);
    } catch {
      // Fall back to the depth=1 shape if the get fails — partial-credit
      // is better than total-failure here, and the search results are valid.
      return {
        answer: top.snippet,
        sources: ranked.slice(0, 5).map(toSource),
        deeper: suggestDeeperFromHits(ranked),
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

    // depth=3: also fetch the next 2 ranked docs in full.
    if (depth === 3) {
      const neighbors = ranked.slice(1, 3);
      for (let i = 0; i < neighbors.length; i++) {
        try {
          const doc = await callOddkit<OddkitGetResult>(
            client,
            "get",
            neighbors[i].uri,
            GET_TIMEOUT_MS,
          );
          if (doc && sources[i + 1]) {
            sources[i + 1].snippet = doc.content;
          }
        } catch {
          // Leave the snippet in place; partial enrichment is fine.
        }
      }
    }

    return {
      answer: topDoc?.content ?? top.snippet,
      sources,
      deeper: suggestDeeperFromHits(ranked),
      governance_source: "knowledge_base",
    };
  } catch (err) {
    return {
      answer: null,
      sources: [],
      deeper: [],
      governance_source: "minimal",
      error: `docs upstream unavailable: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    if (client) {
      try {
        await client.close();
      } catch {
        // Best-effort cleanup; nothing actionable on close errors.
      }
    }
  }
}

// ---------- Internals ----------

async function openOddkitClient(): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(ODDKIT_MCP_URL), {
    requestInit: {
      headers: {
        "user-agent": USER_AGENT,
      },
    },
  });
  const client = new Client({
    name: "ptxprint-mcp-docs",
    version: "0.1.0",
  });
  await client.connect(transport);
  return client;
}

/**
 * Call oddkit via the SDK Client and unwrap its response shape.
 *
 * Oddkit's MCP `oddkit` tool returns a standard MCP CallToolResult whose
 * `content[0].text` is a JSON-stringified envelope of shape
 * `{ result: ..., assistant_text: ..., debug: ..., server_time: ... }`.
 * We pull `.result` off and return it typed.
 */
async function callOddkit<T>(
  client: Client,
  action: "search" | "get",
  input: string,
  timeoutMs: number,
): Promise<T | null> {
  const args: Record<string, unknown> = {
    action,
    input,
    knowledge_base_url: CANON_KB_URL,
  };
  // For search, prefer overlay docs (this repo's canon) over the baseline
  // (klappy.dev) so PTXprint-specific results rank first.
  if (action === "search") {
    args.result_grouping = "overlay_first";
  }

  const result = await client.callTool(
    {
      name: "oddkit",
      arguments: args,
    },
    undefined,
    {
      timeout: timeoutMs,
    },
  );

  const content = (result as { content?: Array<{ type: string; text?: string }> }).content;
  const inner = content?.[0]?.text;
  if (typeof inner !== "string") return null;

  const parsed = JSON.parse(inner) as { result?: T };
  return parsed?.result ?? null;
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

function suggestDeeperFromHits(hits: OddkitSearchHit[]): string[] {
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
