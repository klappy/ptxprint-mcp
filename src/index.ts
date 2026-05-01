/**
 * PTXprint MCP Worker — entry point.
 *
 * Exposes 6 MCP tools (4 per v1.2 spec §3 plus 2 new telemetry tools per v1.3):
 *   submit_typeset(payload)   → job_id (or cached URL)
 *   get_job_status(job_id)    → state / progress / urls / errors
 *   cancel_job(job_id)        → set DO flag; container polls every 10s
 *   docs(query, audience?, depth?) → in-repo canon retrieval via oddkit proxy
 *   telemetry_policy()        → governance policy from canon (three-tier fallback)
 *   telemetry_public(sql)     → public Analytics Engine query forwarder
 *
 * Agents bring their own URLs for sources/fonts/figures — the server does
 * not host or stage input files. Hosting is the agent's concern, upstream
 * of MCP.
 *
 * Internal routes:
 *   POST /internal/job-update   — container state patches (v1.2)
 *   POST /internal/telemetry    — container telemetry forwarding (v1.3)
 *
 * Telemetry hooks (v1.3):
 *   - mcp_request event emitted at every MCP request
 *   - tool_call event emitted when method == "tools/call"
 *
 * Streamable HTTP MCP transport is mounted at /mcp.
 */

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  PayloadSchema,
  payloadHash as computePayloadHash,
  type Payload,
} from "./payload.js";
import { outputPdfKey, outputLogKey } from "./output-naming.js";
import {
  initJob,
  readJobState,
  cancelJob as cancelJobDo,
} from "./job-state-do.js";
import { fetchDocs } from "./docs.js";
import { BUNDLED_POLICY } from "./bundled-policy.js";
import { HOMEPAGE_HTML } from "./homepage.js";
import {
  writeTelemetry,
  resolveConsumer,
  redactAndValidate,
  resolveTelemetryPolicy,
  forwardTelemetryQuery,
  tryParseJsonRpc,
  SELF_REPORT_HEADERS,
  WORKER_VERSION,
  type TelemetryEnv,
  type ConsumerInfo,
  type ParsedRpc,
} from "./telemetry.js";
import { exportSchema } from "./telemetry-schema.js";

// Re-export Durable Object classes so the Workers runtime can find them.
export { JobStateDO } from "./job-state-do.js";
export { PtxprintContainer } from "./container.js";

// ---------- Env ----------

interface Env {
  MCP_AGENT: DurableObjectNamespace;
  JOB_STATE: DurableObjectNamespace;
  PTXPRINT_CONTAINER: DurableObjectNamespace;
  OUTPUTS: R2Bucket;
  WORKER_URL: string;
  PTXPRINT_TIMEOUT_DEFAULT: string;
  RESULT_PRESIGNED_TTL: string;
  // v1.3 telemetry bindings
  PTXPRINT_TELEMETRY: AnalyticsEngineDataset;
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR: string;
}

// ---------- Helpers ----------

function r2PublicUrl(key: string, baseUrl: string): string {
  // Worker-relative URL the agent fetches via the Worker's `/r2/` proxy route.
  // For Day-1 we proxy R2 reads through the Worker (no presigned URLs yet).
  return `${baseUrl.replace(/\/$/, "")}/r2/${key}`;
}

function jobIdFromHash(payloadHash: string): string {
  // Use the payload hash itself as the job_id. This is stable across resubmits
  // of the same payload and gives free idempotency at the DO layer.
  return payloadHash;
}

// ---------- The MCP agent ----------

export class PtxprintMcp extends McpAgent<Env> {
  server = new McpServer({
    name: "ptxprint-mcp",
    version: WORKER_VERSION,
  });

  async init() {
    // ----- submit_typeset -----
    this.server.tool(
      "submit_typeset",
      "Submit a PTXprint typesetting job. Validates the payload, computes its sha256, and either returns the cached output URL (if the same payload has been seen before) or dispatches the job to a Container worker. Returns immediately with a job_id; poll get_job_status for state and result URLs.",
      { payload: PayloadSchema },
      async ({ payload }: { payload: Payload }) => {
        const submittedAt = new Date().toISOString();
        const hash = await computePayloadHash(payload);
        const pdfKey = outputPdfKey(payload, hash);
        const logKey = outputLogKey(payload, hash);

        const env = this.env;
        // baseUrl is the Worker's public URL. We use it to build the
        // worker_callback_url passed to the Container (so the container can
        // POST state patches back to /internal/job-update and PUT artifacts
        // to /internal/upload), and to build the predicted_pdf_url returned
        // to the agent.
        //
        // Priority order:
        //   1. env.WORKER_URL — wrangler var; the canonical source. Required
        //      for the container callback path to work end-to-end.
        //   2. this.props.workerUrl — historically used, but the props
        //      plumbing in agents@0.2.x's McpAgent.serve doesn't actually
        //      flow this through (ServeOptions has no `props` field — the
        //      previous `{ props: ctorProps }` was always silently dropped).
        //      Kept as a fallback for when the SDK gains a working props
        //      pipeline; safe to leave in place.
        //   3. Empty string — last-resort fallback. Causes
        //      worker_callback_url to be null, which causes the container to
        //      silently no-op all state updates and uploads. This is the
        //      bug we just stopped having.
        const baseUrl =
          this.env.WORKER_URL ||
          (this.props as { workerUrl?: string } | undefined)?.workerUrl ||
          "";

        // Cache check — HEAD the expected R2 path.
        const head = await env.OUTPUTS.head(pdfKey);
        if (head) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    job_id: jobIdFromHash(hash),
                    submitted_at: submittedAt,
                    predicted_pdf_url: r2PublicUrl(pdfKey, baseUrl),
                    cached: true,
                    payload_hash: hash,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // Cache miss. Initialize DO + dispatch to container.
        const jobId = jobIdFromHash(hash);
        await initJob(env.JOB_STATE, jobId, hash, submittedAt);

        // ----- Diagnostic instrumentation (Day-1 PoC) -----
        //
        // We have observed jobs sitting at state="queued" indefinitely with no
        // sign the container ever started executing POST /jobs. Without runtime
        // log access this is invisible. The block below makes every step of the
        // dispatch visible in JobStateDO so `get_job_status` reflects what
        // happened, regardless of whether the waitUntil promise survives DO
        // hibernation.
        //
        // Three breadcrumbs end up in JobStateDO depending on outcome:
        //   1. "Worker: about to dispatch container.fetch"  (always, before fetch)
        //   2. "Worker: container responded HTTP <code>"    (on non-2xx response)
        //   3. "Worker: container.fetch threw: <error>"     (on thrown error)
        // Plus on success the container itself patches state=running per main.py.
        //
        // If state stays at the INITIAL_STATE summary "Container will pick up
        // shortly" forever, we know waitUntil was killed before even the first
        // pre-dispatch state write — which means hypothesis (1) (DO hibernation)
        // is the root cause.

        const patchJobState = async (patch: Record<string, unknown>) => {
          try {
            const stub = env.JOB_STATE.get(env.JOB_STATE.idFromName(jobId));
            await stub.fetch("https://do/update", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(patch),
            });
          } catch {
            // Swallow — we're already inside best-effort instrumentation.
          }
        };

        const containerId = env.PTXPRINT_CONTAINER.idFromName(jobId);
        const containerStub = env.PTXPRINT_CONTAINER.get(containerId);
        const containerReq = new Request("http://container/jobs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            job_id: jobId,
            payload,
            payload_hash: hash,
            pdf_r2_key: pdfKey,
            log_r2_key: logKey,
            worker_callback_url: baseUrl
              ? `${baseUrl.replace(/\/$/, "")}/internal/job-update`
              : null,
          }),
        });

        const dispatchPromise = (async () => {
          await patchJobState({
            human_summary: "Worker: about to dispatch container.fetch (pre-call breadcrumb).",
          });
          try {
            const res = await containerStub.fetch(containerReq);
            if (!res.ok) {
              const body = await res.text().catch(() => "<no body>");
              await patchJobState({
                state: "failed",
                failure_mode: "hard",
                completed_at: new Date().toISOString(),
                errors: [`container responded HTTP ${res.status}: ${body.slice(0, 1000)}`],
                human_summary: `Worker: container HTTP ${res.status}; body=${body.slice(0, 200)}`,
              });
            } else {
              // 2xx — the container has executed POST /jobs and awaited its own
              // final patch_state before returning, so the JobStateDO already
              // holds the container's detailed human_summary. Skip writing a
              // generic breadcrumb here so we don't overwrite that summary.
            }
          } catch (err: unknown) {
            const e = err as { name?: string; message?: string; stack?: string };
            const msg = `${e?.name ?? "Error"}: ${e?.message ?? String(err)}`;
            await patchJobState({
              state: "failed",
              failure_mode: "hard",
              completed_at: new Date().toISOString(),
              errors: [`container dispatch threw: ${msg}`],
              human_summary: `Worker: container.fetch threw: ${msg}`,
              log_tail: (e?.stack ?? "").slice(0, 2000),
            });
          }
        })();

        // ctx.waitUntil keeps the dispatch alive after we return to the agent.
        // Risk noted in spec §6: at 30+ minutes the platform may terminate the
        // dispatch fetch. The diagnostic above will tell us if the issue is
        // already biting at minute 0 in this McpAgent-DO context.
        this.ctx.waitUntil(dispatchPromise);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  job_id: jobId,
                  submitted_at: submittedAt,
                  predicted_pdf_url: r2PublicUrl(pdfKey, baseUrl),
                  cached: false,
                  payload_hash: hash,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // ----- get_job_status -----
    this.server.tool(
      "get_job_status",
      "Poll a job's state, progress, errors, and (when complete) result URLs. Returns the same shape regardless of state; null fields indicate the job has not reached that point yet.",
      { job_id: z.string().min(1) },
      async ({ job_id }: { job_id: string }) => {
        const env = this.env;
        const state = await readJobState(env.JOB_STATE, job_id);
        if (!state) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "job_id not found", job_id }),
              },
            ],
            isError: true,
          };
        }
        const baseUrl =
          this.env.WORKER_URL ||
          (this.props as { workerUrl?: string } | undefined)?.workerUrl ||
          "";
        const augmented = {
          ...state,
          pdf_url: state.pdf_r2_key ? r2PublicUrl(state.pdf_r2_key, baseUrl) : null,
          log_url: state.log_r2_key ? r2PublicUrl(state.log_r2_key, baseUrl) : null,
        };
        return {
          content: [{ type: "text", text: JSON.stringify(augmented, null, 2) }],
        };
      },
    );

    // ----- cancel_job -----
    this.server.tool(
      "cancel_job",
      "Request cancellation of a running job. Sets a flag in the JobStateDO that the running Container polls every 10 seconds. Container-side SIGTERM dispatch is a Day-2 enhancement; for Day-1 the flag is recorded but PTXprint completes its current pass before stopping.",
      { job_id: z.string().min(1) },
      async ({ job_id }: { job_id: string }) => {
        const env = this.env;
        const result = await cancelJobDo(env.JOB_STATE, job_id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ...result,
                  cancelled_at: new Date().toISOString(),
                  note: "Day-1 PoC: flag set; container-side SIGTERM is Day-2.",
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // ----- docs -----
    //
    // Thin proxy to oddkit MCP for in-repo canon retrieval. Reverses session-2
    // D-004 ("no retrieval in MCP server") for one specific reason: downstream
    // agents (BT Servant, others) want one MCP wired up, not two. The retrieval
    // brain still lives in oddkit; this tool is a forwarding layer pinned to
    // this repo's canon. See src/docs.ts for the vodka-boundary check.
    this.server.tool(
      "docs",
      "Search the PTXprint MCP canon (in-repo documentation) and return relevant guidance. Backed by oddkit; no separate oddkit setup required by the caller. Use depth=1 for snippet-level answers, depth=2 for the full top doc, depth=3 for top doc plus the next two ranked docs in full. Audience='headless' biases toward agent-facing docs (default); 'gui' biases toward training-manual docs.",
      {
        query: z.string().min(1).describe("Natural-language question or topic."),
        audience: z
          .enum(["headless", "gui"])
          .optional()
          .default("headless")
          .describe("Bias the ranking toward agent-facing (headless) or human-training (gui) docs."),
        depth: z
          .union([z.literal(1), z.literal(2), z.literal(3)])
          .optional()
          .default(1)
          .describe("Progressive disclosure: 1 = snippet, 2 = full top doc, 3 = top doc + next two."),
      },
      async ({
        query,
        audience,
        depth,
      }: {
        query: string;
        audience?: "headless" | "gui";
        depth?: 1 | 2 | 3;
      }) => {
        const result = await fetchDocs(query, audience ?? "headless", depth ?? 1);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      },
    );

    // ----- telemetry_policy ----- (v1.3)
    //
    // Returns the runtime-fetched governance policy plus the self-report header
    // dictionary. Three-tier fallback: knowledge_base → bundled → minimal.
    // Authority: klappy://canon/specs/ptxprint-mcp-v1.3-spec §3 telemetry_policy
    this.server.tool(
      "telemetry_policy",
      "Returns the PTXprint MCP telemetry governance policy, the self-report header dictionary, and the three-tier fallback chain status. No parameters required.",
      {},
      async () => {
        const { policy, source } = await resolveTelemetryPolicy(BUNDLED_POLICY);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  policy,
                  policy_uri: "klappy://canon/governance/telemetry-governance",
                  governance_source: source,
                  self_report_headers: SELF_REPORT_HEADERS,
                  fallback_chain: [
                    {
                      tier: "knowledge_base",
                      source:
                        "https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/canon/governance/telemetry-governance.md",
                    },
                    {
                      tier: "bundled",
                      source: "compiled into Worker at deploy time",
                    },
                    {
                      tier: "minimal",
                      source:
                        "static string in Worker; lists dataset name + privacy non-negotiables + policy URI",
                    },
                  ],
                  generated_at: new Date().toISOString(),
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // ----- telemetry_public ----- (v1.3)
    //
    // Public SQL query forwarder over the ptxprint_telemetry Analytics Engine
    // dataset. Three guards: dataset allowlist, rate limit, error sanitization.
    // Authority: klappy://canon/specs/ptxprint-mcp-v1.3-spec §3 telemetry_public
    this.server.tool(
      "telemetry_public",
      "Query the ptxprint_telemetry Analytics Engine dataset with SQL. The data is public — this is the same dashboard the maintainer sees. Use SUM(_sample_interval) instead of COUNT(*) for sample-correct totals. Rate-limited to 60 queries/consumer/hour. You may use semantic field names (event_type, tool_name, consumer_label, etc.) in your SQL — the worker rewrites them to positional blob/double refs before forwarding. Call telemetry_schema() for the full field name list. See telemetry_policy() for canned query examples.",
      {
        sql: z
          .string()
          .min(1)
          .describe("A read-only SQL query against ptxprint_telemetry. Semantic field names are auto-rewritten to positional refs."),
      },
      async ({ sql }: { sql: string }) => {
        // Use the DO session ID as the rate-limit key. Inside the McpAgent DO,
        // we don't have access to HTTP request headers; per-DO-session limiting
        // is the closest approximation to per-consumer limiting here.
        const rateLimitKey = this.ctx.id.toString();
        const result = await forwardTelemetryQuery(
          this.env as TelemetryEnv,
          sql,
          rateLimitKey,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
          ...(result.error ? { isError: true } : {}),
        };
      },
    );

    // ----- telemetry_schema ----- (v1.3)
    //
    // Returns the canonical mapping between semantic field names and
    // Cloudflare Analytics Engine positional column refs (blob1..12,
    // double1..10). Use this to know what you can query with telemetry_public,
    // or if you need to construct positional SQL by hand.
    //
    // The schema is the SINGLE source of truth (src/telemetry-schema.ts).
    // Same data is exposed via the public GET /diagnostics/schema endpoint.
    this.server.tool(
      "telemetry_schema",
      "Return the field-name → positional-column mapping for the ptxprint_telemetry dataset. Use these names in telemetry_public SQL — the worker auto-rewrites them. Lists every blob and double slot with its semantic name and a one-line description.",
      {},
      async () => {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(exportSchema(), null, 2),
            },
          ],
        };
      },
    );

  }
}

// ---------- Worker entry ----------

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    // ---------- Homepage ----------
    //
    // GET / serves the marketing/landing page. The page itself does live
    // browser-side calls to /health (CORS-enabled below) and to oddkit's
    // public MCP for telemetry, so it doubles as a status board.
    //
    // Embedded as a TS template literal in src/homepage.ts to avoid pulling
    // in the assets binding for a single static file.
    if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/") {
      const isHead = req.method === "HEAD";
      return new Response(isHead ? null : HOMEPAGE_HTML, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          // Short browser cache; the page is live-data-driven so we don't
          // want stale embedded snapshot data lingering for hours.
          "cache-control": "public, max-age=300, s-maxage=300",
        },
      });
    }

    // ---------- /health ----------
    //
    // Public JSON status endpoint. CORS-open so the homepage's live status
    // probe (and any external uptime monitor) can read it from the browser.
    // The MCP transport (/mcp, /sse) already sets its own CORS headers via
    // the agents/mcp SDK — this only patches /health.
    if (url.pathname === "/health") {
      if (req.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, OPTIONS",
            "access-control-allow-headers": "Content-Type",
            "access-control-max-age": "86400",
          },
        });
      }
      return Response.json(
        {
          ok: true,
          service: "ptxprint-mcp",
          version: WORKER_VERSION,
          spec: "v1.3-draft",
          tools: [
            "submit_typeset",
            "get_job_status",
            "cancel_job",
            "docs",
            "telemetry_public",
            "telemetry_policy",
            "telemetry_schema",
          ],
        },
        {
          headers: {
            "access-control-allow-origin": "*",
            "cache-control": "no-store",
          },
        },
      );
    }

    // ---------- /diagnostics/telemetry ----------
    //
    // Public diagnostic for telemetry_public tool wiring. Reports BOOLEAN
    // presence of every env var the tool needs — never the values themselves.
    // Designed so a single curl tells you exactly what's missing without
    // having to read code or wade through MCP error messages.
    //
    //   curl https://ptxprint.klappy.dev/diagnostics/telemetry
    //
    // The token-shape check is a length sanity probe (Cloudflare API tokens
    // are 40 chars). It catches the most common mistake — pasting a partial
    // token — without ever returning the value.
    if (url.pathname === "/diagnostics/telemetry") {
      if (req.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, OPTIONS",
            "access-control-allow-headers": "Content-Type",
            "access-control-max-age": "86400",
          },
        });
      }
      const accountIdSet = !!env.CF_ACCOUNT_ID;
      const apiTokenSet = !!env.CF_API_TOKEN;
      const apiTokenShapeOk = apiTokenSet && env.CF_API_TOKEN.length >= 40;
      const datasetBindingPresent = !!env.PTXPRINT_TELEMETRY;
      const writesEnabled = datasetBindingPresent;
      const queriesEnabled = accountIdSet && apiTokenSet;

      const missing: string[] = [];
      if (!accountIdSet)
        missing.push(
          "CF_ACCOUNT_ID (add to wrangler.jsonc 'vars' — public 32-char id, not a secret)",
        );
      if (!apiTokenSet)
        missing.push(
          "CF_API_TOKEN (run: wrangler secret put CF_API_TOKEN — see DEPLOY.md)",
        );
      if (apiTokenSet && !apiTokenShapeOk)
        missing.push(
          "CF_API_TOKEN looks too short (Cloudflare tokens are 40 chars; re-run wrangler secret put with the full value)",
        );
      if (!datasetBindingPresent)
        missing.push(
          "PTXPRINT_TELEMETRY (add to wrangler.jsonc 'analytics_engine_datasets')",
        );

      return Response.json(
        {
          ok: queriesEnabled && writesEnabled && apiTokenShapeOk,
          service: "ptxprint-mcp",
          version: WORKER_VERSION,
          dataset: "ptxprint_telemetry",
          writes_enabled: writesEnabled,
          queries_enabled: queriesEnabled && apiTokenShapeOk,
          env: {
            CF_ACCOUNT_ID_set: accountIdSet,
            CF_API_TOKEN_set: apiTokenSet,
            CF_API_TOKEN_shape_ok: apiTokenShapeOk,
            PTXPRINT_TELEMETRY_binding_present: datasetBindingPresent,
            TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR:
              env.TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR ?? "60 (default)",
          },
          missing,
          fix_url: "https://github.com/klappy/ptxprint-mcp/blob/main/DEPLOY.md",
          notes: [
            "This endpoint never reveals secret values — only their presence.",
            "CF_ACCOUNT_ID is a public 32-character identifier and belongs in wrangler.jsonc as a var, not a secret.",
            "CF_API_TOKEN is the only actual secret. Token scope: Account → Account Analytics → Read.",
          ],
        },
        {
          headers: {
            "access-control-allow-origin": "*",
            "cache-control": "no-store",
          },
        },
      );
    }

    // ---------- /diagnostics/schema ----------
    //
    // Public endpoint that returns the canonical telemetry field schema —
    // the mapping between semantic field names (event_type, tool_name, etc.)
    // and Cloudflare Analytics Engine positional column refs (blob1..12,
    // double1..10). Same data the telemetry_schema MCP tool returns.
    //
    // Use this when constructing custom telemetry_public queries from
    // outside the MCP context (curl, Grafana, ad-hoc dashboards). It's the
    // single source of truth — src/telemetry-schema.ts — surfaced as JSON.
    //
    //   curl https://ptxprint.klappy.dev/diagnostics/schema | jq
    if (url.pathname === "/diagnostics/schema") {
      if (req.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, OPTIONS",
            "access-control-allow-headers": "Content-Type",
            "access-control-max-age": "86400",
          },
        });
      }
      return Response.json(exportSchema(), {
        headers: {
          "access-control-allow-origin": "*",
          "cache-control": "public, max-age=300",
        },
      });
    }

    // Internal: container calls back to update job state.
    // Exposed at the Worker URL because the container can reach the public
    // Worker but cannot directly stub.fetch a Durable Object (different
    // execution context).
    if (req.method === "POST" && url.pathname === "/internal/job-update") {
      const body = (await req.json()) as { job_id: string; patch: Record<string, unknown> };
      if (!body?.job_id) return new Response("missing job_id", { status: 400 });
      const stub = env.JOB_STATE.get(env.JOB_STATE.idFromName(body.job_id));
      const res = await stub.fetch("https://do/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body.patch ?? {}),
      });
      return new Response(await res.text(), {
        status: res.status,
        headers: { "content-type": "application/json" },
      });
    }

    // ---------- v1.3: Internal telemetry forwarding endpoint ----------
    //
    // Container POSTs telemetry envelopes here. The Worker validates via the
    // redactor (strict schema + prohibited-field check) and writes to AE.
    //
    // Service-binding enforcement: v1.2's /internal/job-update route also lacks
    // service-binding–only enforcement (Container calls via the public Worker URL).
    // Consistent with that pattern, this route validates the envelope strictly
    // but does not enforce origin. A v1.4 enhancement could add a shared-secret
    // header check once the Container-to-Worker path moves to a true service binding.
    if (req.method === "POST" && url.pathname === "/internal/telemetry") {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return Response.json({ error: "invalid JSON" }, { status: 400 });
      }

      const result = redactAndValidate(body);
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 400 });
      }

      const envelope = result.envelope;
      writeTelemetry(env as unknown as TelemetryEnv, envelope.event_type, {
        phase: envelope.phase,
        failure_mode: envelope.failure_mode,
        payload_hash_prefix: envelope.payload_hash_prefix,
        consumer_label: envelope.consumer_label ?? "container",
        consumer_source: "unknown",
        duration_ms: envelope.duration_ms,
        passes_completed: envelope.passes_completed,
        overfull_count: envelope.overfull_count,
        pages_count: envelope.pages_count,
        bytes_out: envelope.bytes_out,
      });

      return Response.json({ ok: true });
    }

    // Internal: container polls for cancellation status.
    if (req.method === "GET" && url.pathname === "/internal/job-cancel-flag") {
      const jobId = url.searchParams.get("job_id");
      if (!jobId) return new Response("missing job_id", { status: 400 });
      const state = await readJobState(env.JOB_STATE, jobId);
      return Response.json({ cancel_requested: state?.cancel_requested ?? false });
    }

    // Internal: container PUTs artifacts (PDF, log) into R2.OUTPUTS.
    // Day-1 path; Day-2 we issue presigned URLs and the container PUTs directly to R2.
    if (req.method === "PUT" && url.pathname === "/internal/upload") {
      const key = url.searchParams.get("key");
      if (!key) return new Response("missing key", { status: 400 });
      if (!key.startsWith("outputs/")) {
        return new Response("key must be under outputs/", { status: 400 });
      }
      const ct = req.headers.get("content-type") ?? "application/octet-stream";
      await env.OUTPUTS.put(key, req.body, {
        httpMetadata: { contentType: ct },
      });
      return Response.json({ ok: true, key });
    }

    // R2 read proxy — Day-1: proxy reads through the Worker. Day-2: switch
    // to presigned GETs and remove this route.
    //
    // HEAD shares this branch so smoke harnesses and downstream agents can
    // poll for object existence without paying for the body bytes. Per
    // session-11 H-020 (was: HEAD returned 404 even when GET succeeded —
    // misleading for any caller checking artifact presence).
    if (
      (req.method === "GET" || req.method === "HEAD") &&
      url.pathname.startsWith("/r2/")
    ) {
      const key = url.pathname.slice("/r2/".length);
      const isHead = req.method === "HEAD";
      // For HEAD, R2's head() returns just metadata — cheaper than get().
      const obj = isHead ? await env.OUTPUTS.head(key) : await env.OUTPUTS.get(key);
      if (!obj) return new Response(isHead ? null : "not found", { status: 404 });
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("etag", obj.httpEtag);
      headers.set(
        "content-type",
        key.endsWith(".pdf")
          ? "application/pdf"
          : key.endsWith(".log")
            ? "text/plain; charset=utf-8"
            : key.endsWith(".ttf")
              ? "font/ttf"
              : key.endsWith(".otf")
                ? "font/otf"
                : "application/octet-stream",
      );
      // R2 head() doesn't expose body; R2 get()'s .body is a ReadableStream.
      const body = isHead ? null : (obj as R2ObjectBody).body;
      return new Response(body, { headers });
    }

    // ---------- MCP transport with v1.3 telemetry hooks ----------
    //
    // For /mcp and /sse routes, we intercept the request to:
    //   1. Parse the JSON-RPC body (non-destructive clone)
    //   2. Pass through to the MCP handler
    //   3. Extract enrichment from the response (best-effort)
    //   4. Emit mcp_request and (if tools/call) tool_call events
    //
    // The telemetry writes are non-blocking (writeDataPoint returns void).
    // The docs tool query string is NEVER logged per the privacy floor.

    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      return handleMcpWithTelemetry(req, env, ctx, false);
    }
    if (url.pathname === "/sse" || url.pathname.startsWith("/sse/")) {
      return handleMcpWithTelemetry(req, env, ctx, true);
    }

    return new Response("not found", { status: 404 });
  },
};

// ---------- Telemetry-instrumented MCP handler ----------

// Handlers are created once at module scope and reused across requests.
// basePath and binding are constant, so the returned handler objects are
// identical on every call — no need to allocate per-request.
const mcpHandler = PtxprintMcp.serve("/mcp", { binding: "MCP_AGENT" });
const mcpSseHandler = PtxprintMcp.serveSSE("/sse", { binding: "MCP_AGENT" });

async function handleMcpWithTelemetry(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  isSSE: boolean,
): Promise<Response> {
  const startMs = Date.now();
  const urlObj = new URL(req.url);

  // Parse request body for telemetry (non-destructive via clone)
  let rpc: ParsedRpc | null = null;
  let bytesIn = 0;
  let clientInfoName: string | undefined;
  if (req.method === "POST") {
    try {
      const bodyText = await req.clone().text();
      bytesIn = new TextEncoder().encode(bodyText).length;
      rpc = tryParseJsonRpc(bodyText);
      // Extract MCP initialize → clientInfo.name for consumer resolution
      // priority tier 3 (per spec §6.1).
      if (rpc?.method === "initialize") {
        const ci = (rpc.params as { clientInfo?: { name?: string } }).clientInfo;
        if (ci?.name) clientInfoName = ci.name;
      }
    } catch {
      // Not parseable — still pass through
    }
  }

  const consumer = resolveConsumer(urlObj, req.headers, clientInfoName);

  // Pass through to the MCP handler
  const handler = isSSE ? mcpSseHandler : mcpHandler;
  const response = await handler.fetch(req, env, ctx);

  // Emit telemetry after getting the response (non-blocking enrichment)
  if (rpc?.method) {
    ctx.waitUntil(
      emitTelemetryForMcp(env, rpc, consumer, response.clone(), startMs, bytesIn),
    );
  }

  return response;
}

/**
 * Emit mcp_request and tool_call telemetry events.
 * Runs inside ctx.waitUntil so it doesn't add latency to the response.
 */
async function emitTelemetryForMcp(
  env: Env,
  rpc: ParsedRpc,
  consumer: ConsumerInfo,
  resClone: Response,
  startMs: number,
  bytesIn: number,
): Promise<void> {
  const durationMs = Date.now() - startMs;
  const telEnv = env as unknown as TelemetryEnv;

  // Best-effort response parsing for enrichment
  let cacheOutcome = "";
  let docsAudience = "";
  let docsTopUri = "";
  let payloadHashPrefix = "";
  let bytesOut = 0;
  let sourcesCount = 0;
  let fontsCount = 0;
  let figuresCount = 0;

  if (rpc.method === "tools/call") {
    try {
      const contentType = resClone.headers.get("content-type") ?? "";
      // Only parse JSON responses (skip SSE streams)
      if (contentType.includes("json") || contentType === "") {
        const resText = await resClone.text();
        bytesOut = new TextEncoder().encode(resText).length;
        const resJson = JSON.parse(resText) as {
          result?: { content?: Array<{ type: string; text?: string }> };
        };
        const resultText = resJson?.result?.content?.[0]?.text;
        if (resultText) {
          const toolResult = JSON.parse(resultText) as Record<string, unknown>;
          if (rpc.toolName === "submit_typeset") {
            cacheOutcome = toolResult.cached === true ? "hit" : "miss";
            payloadHashPrefix = String(toolResult.payload_hash ?? "").slice(0, 8);
            // Count inputs from the request params (safe metadata, not content)
            const payload = rpc.params.payload as Record<string, unknown> | undefined;
            if (payload) {
              sourcesCount = Array.isArray(payload.sources) ? payload.sources.length : 0;
              fontsCount = Array.isArray(payload.fonts) ? payload.fonts.length : 0;
              figuresCount = Array.isArray(payload.figures) ? payload.figures.length : 0;
            }
          }
          if (rpc.toolName === "docs") {
            // docs_audience from request params (safe metadata)
            docsAudience = String(rpc.params.audience ?? "headless");
            // docs_top_uri from response (canon URIs are public)
            const sources = toolResult.sources as Array<{ uri?: string }> | undefined;
            docsTopUri = String(sources?.[0]?.uri ?? "");
            // NOTE: rpc.params.query is NEVER logged — treated as content per
            // canon/governance/telemetry-governance §"Privacy Floor"
          }
        }
      }
    } catch {
      // Best-effort enrichment — failures are silently swallowed
    }
  }

  // Emit mcp_request event
  writeTelemetry(telEnv, "mcp_request", {
    method: rpc.method,
    tool_name: rpc.toolName,
    consumer_label: consumer.label,
    consumer_source: consumer.source,
    cache_outcome:
      rpc.toolName === "submit_typeset" ? cacheOutcome || "n/a" : "",
    payload_hash_prefix: payloadHashPrefix,
    docs_audience: docsAudience,
    docs_top_uri: docsTopUri,
    bytes_in: bytesIn,
    bytes_out: bytesOut,
    duration_ms: durationMs,
    sources_count: sourcesCount,
    fonts_count: fontsCount,
    figures_count: figuresCount,
  });

  // Emit tool_call event if applicable
  if (rpc.method === "tools/call") {
    writeTelemetry(telEnv, "tool_call", {
      method: "tools/call",
      tool_name: rpc.toolName,
      consumer_label: consumer.label,
      consumer_source: consumer.source,
      docs_audience: docsAudience,
      docs_top_uri: docsTopUri,
      duration_ms: durationMs,
    });
  }
}
