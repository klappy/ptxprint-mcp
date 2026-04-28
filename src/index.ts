/**
 * PTXprint MCP Worker — entry point.
 *
 * Exposes 4 MCP tools per v1.2 spec §3:
 *   submit_typeset(payload)   → job_id (or cached URL)
 *   get_job_status(job_id)    → state / progress / urls / errors
 *   cancel_job(job_id)        → set DO flag; container polls every 10s
 *   get_upload_url(...)       → presigned R2 PUT URL
 *
 * Day-1 PoC scope:
 *   - submit_typeset, get_job_status fully wired
 *   - cancel_job: DO flag is set; container-side SIGTERM is Day-2
 *   - get_upload_url: stubbed (presigned URL minting comes Day-2)
 *
 * Plus an internal route the container calls back to for state updates:
 *   POST /internal/job-update  — body { job_id, patch }
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

// Re-export Durable Object classes so the Workers runtime can find them.
export { JobStateDO } from "./job-state-do.js";
export { PtxprintContainer } from "./container.js";

// ---------- Env ----------

interface Env {
  MCP_AGENT: DurableObjectNamespace;
  JOB_STATE: DurableObjectNamespace;
  PTXPRINT_CONTAINER: DurableObjectNamespace;
  OUTPUTS: R2Bucket;
  UPLOADS: R2Bucket;
  PTXPRINT_TIMEOUT_DEFAULT: string;
  RESULT_PRESIGNED_TTL: string;
  WORKER_PUBLIC_URL: string;
}

// ---------- Helpers ----------

function r2PublicUrl(key: string, baseUrl: string): string {
  // Worker-relative URL the agent fetches via the Worker's `/r2/` proxy route.
  // For Day-1 we proxy R2 reads through the Worker (no presigned URLs yet).
  return `${baseUrl.replace(/\/$/, "")}/r2/${key}`;
}

function requireWorkerPublicUrl(env: Env): string {
  // Fail loudly if WORKER_PUBLIC_URL is missing. Falling back to "" silently
  // reproduces the exact Day-1 blocker this var was added to fix:
  // `worker_callback_url` becomes null and the container's patch_state() no-ops,
  // leaving jobs stuck in `queued` forever. See PR #4.
  const url = env.WORKER_PUBLIC_URL;
  if (!url) {
    throw new Error(
      "WORKER_PUBLIC_URL is not set. Configure it in wrangler.jsonc `vars` for the current environment.",
    );
  }
  return url;
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
    version: "0.1.0",
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
        // workerUrl was historically read from `(this.props as { workerUrl?: string }).workerUrl`,
        // but `props` was never actually populated — see PR #4 for the diagnosis.
        // The replacement is a wrangler var so the URL is reliably available
        // inside the McpAgent DO.
        const baseUrl = requireWorkerPublicUrl(env);

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
            worker_callback_url: `${baseUrl.replace(/\/$/, "")}/internal/job-update`,
          }),
        });

        // ctx.waitUntil keeps the dispatch alive after we return to the agent.
        // Risk noted in spec §6: at 30+ minutes the platform may terminate the
        // dispatch fetch. Day-2 mitigation: container self-pokes to reset its
        // own sleepAfter timer.
        this.ctx.waitUntil(containerStub.fetch(containerReq));

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
        const baseUrl = requireWorkerPublicUrl(env);
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

    // ----- get_upload_url -----
    this.server.tool(
      "get_upload_url",
      "Mint a presigned R2 PUT URL for staging a local file (USFM, font, figure) at a temporary URL the agent then references in subsequent payloads. NOT YET IMPLEMENTED in Day-1 PoC — pre-stage files in any HTTPS-accessible location and reference them by URL+sha256 in the payload directly.",
      {
        filename: z.string().min(1),
        content_type: z.string().min(1),
        expires_in: z.number().int().positive().optional(),
      },
      async () => {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "not_implemented",
                  message:
                    "get_upload_url is a Day-2 PoC scope item. For Day-1 smoke tests, host files at any HTTPS URL and reference them by URL+sha256 in the payload's sources/fonts/figures arrays.",
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      },
    );
  }
}

// ---------- Worker entry ----------

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "ptxprint-mcp",
        version: "0.1.0",
        spec: "v1.2-draft",
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
    if (req.method === "GET" && url.pathname.startsWith("/r2/")) {
      const key = url.pathname.slice("/r2/".length);
      const obj = await env.OUTPUTS.get(key);
      if (!obj) return new Response("not found", { status: 404 });
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("etag", obj.httpEtag);
      headers.set(
        "content-type",
        key.endsWith(".pdf")
          ? "application/pdf"
          : key.endsWith(".log")
            ? "text/plain; charset=utf-8"
            : "application/octet-stream",
      );
      return new Response(obj.body, { headers });
    }

    // MCP transport — streamable HTTP at /mcp; legacy SSE at /sse for compatibility.
    //
    // The `binding` option is REQUIRED here. agents@0.2.x defaults `binding` to
    // "MCP_OBJECT" inside `McpAgent.serve`, but our DO binding is named
    // "MCP_AGENT" in wrangler.jsonc — so without this option the SDK throws
    // `Could not find McpAgent binding for MCP_OBJECT` and the Worker returns
    // a Cloudflare 1101 (uncaught JS exception) on every /mcp and /sse hit.
    //
    // (The previous version also passed `{ props: ctorProps }` here. ServeOptions
    // does not include a `props` field — it accepts only `binding`, `corsOptions`,
    // `transport`, `jurisdiction` — so that property was silently dropped and
    // `workerUrl` never reached the agent. Plumbing workerUrl is a separate fix:
    // it has to flow through `ctx.props`, which is OAuth-Provider-managed in this
    // SDK; for now `r2PublicUrl` returns relative `/r2/...` paths from the tools,
    // which is acceptable for the smoke tests.)
    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      return PtxprintMcp.serve("/mcp", { binding: "MCP_AGENT" }).fetch(req, env, ctx);
    }
    if (url.pathname === "/sse" || url.pathname.startsWith("/sse/")) {
      return PtxprintMcp.serveSSE("/sse", { binding: "MCP_AGENT" }).fetch(req, env, ctx);
    }

    return new Response("not found", { status: 404 });
  },
};
