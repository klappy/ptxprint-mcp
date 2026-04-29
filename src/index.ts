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
  WORKER_URL: string;
  PTXPRINT_TIMEOUT_DEFAULT: string;
  RESULT_PRESIGNED_TTL: string;
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
