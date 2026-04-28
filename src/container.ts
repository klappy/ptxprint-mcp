/**
 * PtxprintContainer — Durable Object wrapper for the Cloudflare Container that
 * runs PTXprint + XeTeX + the FastAPI HTTP handler.
 *
 * The base Container class (from @cloudflare/containers) handles the lifecycle
 * (cold start, sleep, restart) and HTTP proxying automatically. Any fetch on
 * the DO stub is forwarded to the running container at `defaultPort`.
 *
 * v1.2 spec §5:
 *   instance_type: standard (1 vCPU, 6 GiB, 12 GB)  // declared in wrangler.jsonc
 *   sleepAfter: 45m                                 // covers max autofill + buffer
 *
 * The container's HTTP handler at POST /jobs runs PTXprint synchronously,
 * uploads to R2, calls back to JobStateDO, and returns when done.
 */

import { Container } from "@cloudflare/containers";

interface ContainerEnv {
  JOB_STATE: DurableObjectNamespace;
  OUTPUTS: R2Bucket;
}

export class PtxprintContainer extends Container<ContainerEnv> {
  defaultPort = 8080;
  sleepAfter = "45m";

  // Pass env vars to the container at start.
  envVars = {
    PYTHONUNBUFFERED: "1",
  };
}
