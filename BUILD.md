---
title: "PTXprint MCP — Day-1 Build & Deploy Notes"
audience: project
exposure: working
voice: instructional
stability: working
canonical_status: non_canonical
---

# Day-1 Build & Deploy Notes

> Companion to the v1.2 spec. Pragmatic notes for the first PR landing on
> `feat/v1.2-day1-poc`. Not canon — these are setup notes that can move into
> README once the build is verified.

## What this PR contains

- TypeScript Worker exposing the MCP server via streamable HTTP at `/mcp`
- Three Durable Object classes: `PtxprintMcp` (agent), `JobStateDO` (per-job state), `PtxprintContainer` (Container wrapper)
- Two R2 buckets: `ptxprint-outputs` (content-addressed PDFs + logs), `ptxprint-uploads` (presigned upload staging — Day-2 wires this up)
- A `Dockerfile` that inherits the upstream `sillsdev/ptx2pdf` install pattern and adds a thin FastAPI HTTP handler on top
- A FastAPI handler in `container/main.py` that runs PTXprint synchronously, verifies sha256 on inputs, classifies exits (hard / soft / success), and uploads results back through the Worker

## What's IN scope for Day-1

- `submit_typeset` — full flow: validate, hash, R2 cache check, DO init, container dispatch via `ctx.waitUntil`
- `get_job_status` — DO read with R2 proxy URL augmentation
- `cancel_job` — DO flag set; container-side SIGTERM polling is a stub for Day-2
- `get_upload_url` — explicitly returns "not implemented" for Day-1; agents pre-stage files at any HTTPS URL and reference by URL+sha256

## What's OUT for Day-1 (Day-2+)

- Multi-pass autofill mode (`payload.mode = "autofill"`)
- Streaming progress per-pass to the JobStateDO
- Container-side cancellation (SIGTERM PTXprint when `cancel_requested` flag set)
- Presigned R2 PUT URLs (Day-1 routes uploads through the Worker proxy)
- Stripping bundled fonts from the Container (session-3 C-007 — Day-2 hardening)

## Cloudflare dashboard wiring (the operator's task)

### Workers Builds (GitHub integration)

In the CF dashboard:

1. **Workers & Pages** → **Workers Builds** → **Connect** → choose `klappy/ptxprint-mcp`.
2. Build settings:
   - Build branch: `main` (production); preview deployments per branch on `feat/*`
   - Build command: `npm install`
   - Deploy command: `npx wrangler deploy`
   - Root directory: `/`
3. Wrangler picks up `wrangler.jsonc` automatically. Container image build happens during `wrangler deploy`.

### R2 buckets

Create both buckets before first deploy (the `bucket_name` values in `wrangler.jsonc`):

```bash
# CLI alternative; UI works too
npx wrangler r2 bucket create ptxprint-outputs
npx wrangler r2 bucket create ptxprint-uploads

# Lifecycle policies (set in dashboard → R2 → bucket → Settings → Object lifecycle):
#   ptxprint-outputs : 90-day expiration on prefix outputs/
#   ptxprint-uploads : 24-hour expiration on prefix uploads/
```

### Browser integrity / bot policy (lessons from the oddkit 403 incident)

The CF dashboard's default "Browser Integrity Check" treats MCP clients as
bots and 403s them. Before exposing the MCP endpoint:

1. **Security** → **WAF** → **Custom rules** → add a skip rule for the MCP path:
   - Field: `URI Path` contains `/mcp`
   - Action: **Skip** → Browser Integrity Check, Bot Fight Mode

Or disable Browser Integrity Check for the entire `*.workers.dev` hostname
during hackathon week and re-enable selectively later.

## Smoke test (Day-1 first PDF)

`smoke/minimal-payload.json` is the operator's "no config, just USFM" minimal
viable payload. It currently has placeholder URL + sha256 — replace with a
real BSB Gospel-of-John SFM URL before submitting.

```bash
# 1. Get the BSB JHN file SHA-256
curl -sL "https://path/to/43JHNBSB.SFM" -o /tmp/jhn.sfm
sha256sum /tmp/jhn.sfm
# Update smoke/minimal-payload.json with URL + hash

# 2. Submit via MCP (using mcp-cli or any MCP client)
mcp call ptxprint-mcp submit_typeset --payload "$(cat smoke/minimal-payload.json)"
# Returns: { job_id, predicted_pdf_url, cached: false }

# 3. Poll until done
mcp call ptxprint-mcp get_job_status --job_id <job_id>
# Repeat every ~10s until state ∈ {succeeded, failed}

# 4. Fetch result
curl <predicted_pdf_url> -o /tmp/result.pdf
```

## Known unknowns / quick risks

- **Wrangler / agents / @cloudflare/containers package versions** in `package.json` are best-guess for 2026-04. If `npm install` complains, lock versions to whatever resolves and update accordingly.
- **`ctx.waitUntil` longevity** is the v1.2 §6 risk. Day-1 simple typesetting (~1 min) is well within the budget. Autofill (~30 min) is Day-2 territory and may need the container self-poke fallback.
- **Container HTTP path resolution.** The CF Container DO base class proxies HTTP from `stub.fetch(req)` to the running container at `defaultPort`. URL paths are preserved. If the container is reached at the wrong path, check the `defaultPort` matches FastAPI's listen port (8080 in both places).
- **Worker callback URL.** The container needs a public Worker URL to call back to (`/internal/job-update`, `/internal/upload`). Day-1 derives it from the inbound MCP request's host. If the Container is dispatched from a non-MCP code path in future, the callback URL must be supplied explicitly.
- **PTXprint's behavior on a fully-empty `config_files`.** Untested. PTXprint may require at least a `[project]` section pointing at a USFM source. If the Day-1 smoke test fails here, the fix is a single-line cfg in `config_files`.

## Files in this PR

```
package.json
tsconfig.json
wrangler.jsonc
Dockerfile
.dockerignore
src/index.ts                — Worker entry, McpAgent, internal routes
src/payload.ts              — schema (zod), JCS canonicalization, sha256
src/output-naming.ts        — PDF / log key derivation
src/job-state-do.ts         — JobStateDO class + helpers
src/container.ts            — PtxprintContainer DO (CF Container wrapper)
container/main.py           — FastAPI handler (POST /jobs)
container/requirements.txt
smoke/minimal-payload.json
BUILD.md                    — this file
```
