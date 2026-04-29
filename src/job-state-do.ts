/**
 * JobStateDO — per-job-id Durable Object holding the job state machine.
 *
 * Per v1.2 spec §5. One DO instance per `job_id` (idFromName(job_id)). State is
 * persisted to SQLite-backed DO storage so it survives Worker invocations and
 * Container restarts.
 *
 * Endpoints (reached via stub.fetch):
 *   POST /init     — initialize a new job
 *   GET  /         — read current state
 *   POST /update   — partial state update from Worker or Container
 *   POST /cancel   — set cancel_requested flag (Container polls this)
 */

export interface JobState {
  job_id: string;
  payload_hash: string;
  state: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  submitted_at: string;
  started_at: string | null;
  completed_at: string | null;
  progress: {
    passes_completed: number;
    passes_total_estimate: number | null;
    current_phase: string | null;
  };
  cancel_requested: boolean;
  exit_code: number | null;
  failure_mode: "hard" | "soft" | "success" | null;
  pdf_r2_key: string | null;
  log_r2_key: string | null;
  log_tail: string;
  errors: string[];
  overfull_count: number;
  human_summary: string;
}

const INITIAL_STATE: Omit<JobState, "job_id" | "payload_hash" | "submitted_at"> = {
  state: "queued",
  started_at: null,
  completed_at: null,
  progress: {
    passes_completed: 0,
    passes_total_estimate: null,
    current_phase: null,
  },
  cancel_requested: false,
  exit_code: null,
  failure_mode: null,
  pdf_r2_key: null,
  log_r2_key: null,
  log_tail: "",
  errors: [],
  overfull_count: 0,
  human_summary: "Job queued. Container will pick up shortly.",
};

export class JobStateDO implements DurableObject {
  constructor(
    private state: DurableObjectState,
    _env: unknown,
  ) {}

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/init") {
      const body = (await req.json()) as {
        job_id: string;
        payload_hash: string;
        submitted_at: string;
      };
      const fresh: JobState = {
        ...INITIAL_STATE,
        job_id: body.job_id,
        payload_hash: body.payload_hash,
        submitted_at: body.submitted_at,
      };
      await this.state.storage.put("job", fresh);
      return Response.json(fresh);
    }

    if (req.method === "GET" && url.pathname === "/") {
      const job = await this.state.storage.get<JobState>("job");
      if (!job) return new Response("not found", { status: 404 });
      return Response.json(job);
    }

    if (req.method === "POST" && url.pathname === "/update") {
      const job = await this.state.storage.get<JobState>("job");
      if (!job) return new Response("not initialized", { status: 409 });
      const patch = (await req.json()) as Partial<JobState>;
      const merged: JobState = { ...job, ...patch };
      // Defensive merge for nested progress object so callers can patch one field.
      if (patch.progress) {
        merged.progress = { ...job.progress, ...patch.progress };
      }
      await this.state.storage.put("job", merged);
      return Response.json(merged);
    }

    if (req.method === "POST" && url.pathname === "/cancel") {
      const job = await this.state.storage.get<JobState>("job");
      if (!job) return new Response("not found", { status: 404 });
      const merged: JobState = {
        ...job,
        cancel_requested: true,
        human_summary: "Cancellation requested. Container will SIGTERM PTXprint on next poll (≤10s).",
      };
      await this.state.storage.put("job", merged);
      return Response.json({ ok: true, was_running: job.state === "running" });
    }

    return new Response("not found", { status: 404 });
  }
}

// ---------- Convenience helpers for the Worker ----------

export async function readJobState(
  ns: DurableObjectNamespace,
  jobId: string,
): Promise<JobState | null> {
  const stub = ns.get(ns.idFromName(jobId));
  const res = await stub.fetch("https://do/", { method: "GET" });
  if (res.status === 404) return null;
  return (await res.json()) as JobState;
}

export async function initJob(
  ns: DurableObjectNamespace,
  jobId: string,
  payloadHash: string,
  submittedAt: string,
): Promise<void> {
  const stub = ns.get(ns.idFromName(jobId));
  await stub.fetch("https://do/init", {
    method: "POST",
    body: JSON.stringify({ job_id: jobId, payload_hash: payloadHash, submitted_at: submittedAt }),
    headers: { "content-type": "application/json" },
  });
}

export async function cancelJob(
  ns: DurableObjectNamespace,
  jobId: string,
): Promise<{ ok: boolean; was_running: boolean }> {
  const stub = ns.get(ns.idFromName(jobId));
  const res = await stub.fetch("https://do/cancel", { method: "POST" });
  if (res.status === 404) return { ok: false, was_running: false };
  return (await res.json()) as { ok: boolean; was_running: boolean };
}
