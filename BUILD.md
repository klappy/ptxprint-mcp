---
title: "PTXprint MCP — Deployment & Operations"
audience: project
exposure: working
voice: instructional
stability: working
canonical_status: non_canonical
---

# Deployment & Operations

> Practical notes for re-deploying, redeploying after changes, and keeping the system healthy. Companion to [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`canon/specs/ptxprint-mcp-v1.2-spec.md`](canon/specs/ptxprint-mcp-v1.2-spec.md).

## Current state

- **Live deployment:** `https://ptxprint.klappy.dev`
- **Worker version (per `/health`):** `0.1.0`
- **Spec target:** `v1.2-draft`
- **Container image:** built from `./Dockerfile`; pinned to PTXprint `3.0.20` (`ARG PTX2PDF_REF=3.0.20`)
- **R2 buckets:** `ptxprint-outputs` (binding `OUTPUTS`)
- **Durable Objects:** `PtxprintMcp`, `JobStateDO`, `PtxprintContainer` (single migration `v1`)
- **Container instance:** `standard-2` (1 vCPU, 6 GiB memory, 12 GB disk), `max_instances: 5`

## How deploys work

**Pushes to `main` auto-deploy via Cloudflare Workers Builds.** The CF dashboard is configured with the GitHub integration: each merged commit on `main` runs `npm install` followed by `npx wrangler deploy`, which (re)builds and pushes both the Worker and the Container image.

This is *not* a `.github/workflows/` GitHub Actions setup — it's the native Cloudflare Workers Builds integration, configured in the dashboard. The absence of a workflow file in the repo does not mean "no CI." Verify a deploy is live by hitting `/health` and observing the change you expect.

**Do not run `wrangler deploy` manually.** It would conflict with the Workers Builds pipeline and isn't necessary.

## Deploying changes

### Worker code (`src/`), Container (`Dockerfile`, `container/main.py`), or wrangler config

```
git push origin <branch> → open PR → merge to main → Workers Builds runs npx wrangler deploy
```

Verify the deploy landed:

```bash
curl -A "ptxprint-ops/0.1" https://ptxprint.klappy.dev/health
# Then exercise the specific behavior the change introduced (e.g. for a route change,
# curl the route; for a Container change, submit a smoke payload that perturbs the hash
# so you get a fresh container instance pulling the new image).
```

If `/health` doesn't reflect the change after a few minutes, check the **Workers & Pages → ptxprint-mcp → Deployments** tab in the CF dashboard for the build status and logs.

The Container DO picks up a new image on its next cold start (it sleeps after 45m idle by default). To force a fresh container instance after a Dockerfile change, submit a smoke job with a unique payload (perturb a `_comment` field to change the hash) — this dispatches to a new container instance which pulls the new image.

### Canon-only changes (`canon/`, `*.md`)

No deploy effect. Canon is served by `oddkit` MCP at agent runtime, not by this Worker. Push to main and the next session's `oddkit_search` against `knowledge_base_url=https://github.com/klappy/ptxprint-mcp/tree/main` will see the change (subject to oddkit's own caching — see H-017 in recent handoffs for the indexing-URL friction).

## First-time setup (re-creating the deployment from scratch)

For a fresh Cloudflare account or a forked deployment, the steps are roughly:

### 1. R2 buckets

```bash
npx wrangler r2 bucket create ptxprint-outputs
```

Set lifecycle policies in the CF dashboard → R2 → bucket → Settings → Object lifecycle:
- `ptxprint-outputs`: 90-day expiration on prefix `outputs/<hash>/` (skip the `outputs/fixtures/` prefix if you want to retain staged test fonts; see H-022).

### 2. Wrangler config

Edit `wrangler.jsonc`:
- `vars.WORKER_URL` must match the workers.dev hostname (or your custom domain).
- `containers[0].max_instances` and `instance_type` per your CF Containers tier.

### 3. Initial deploy

```bash
npm install
npx wrangler deploy
```

The first deploy creates the Durable Object SQLite tables (per the `migrations` block) and pushes the container image. **This is the only time you should run `wrangler deploy` manually.** All subsequent deploys go through Workers Builds (see "How deploys work" above) — set up the GitHub integration step (§5 below) once and never touch wrangler from the command line again.

### 4. WAF / Browser Integrity rules

The CF dashboard's default Browser Integrity Check treats MCP clients (and `urllib`'s default UA) as bots and 403s them. Before exposing `/mcp` publicly:

- **Security** → **WAF** → **Custom rules** → add a skip rule:
  - Field: `URI Path` contains `/mcp`
  - Action: **Skip** → Browser Integrity Check, Bot Fight Mode

Or set an explicit `User-Agent` on every client request that goes through the Worker (smoke harnesses use `ptxprint-smoke/0.1` or similar; default `python-urllib/3.x` will be 1010-banned). See session-9's encoding for the original incident.

### 5. Workers Builds GitHub integration (the deploy automation)

In the CF dashboard, after the initial `wrangler deploy` lands:

1. **Workers & Pages** → **ptxprint-mcp** → **Settings** → **Builds** → **Connect repository** → choose `klappy/ptxprint-mcp`.
2. Build settings:
   - Build branch: `main` (production)
   - Build command: `npm install`
   - Deploy command: `npx wrangler deploy`
   - Root directory: `/`
3. Wrangler picks up `wrangler.jsonc` automatically. Container image build happens during the Workers Builds run.

Once configured, every merged commit on `main` triggers a build-and-deploy. **No further manual `wrangler deploy` invocations.** Verify by pushing a small change and watching the Deployments tab.

## Health checks

```bash
# Liveness — fast
curl -A "ptxprint-ops/0.1" -w "\nHTTP %{http_code}\n" \
  https://ptxprint.klappy.dev/health

# Smoke (Phase 1, ~5-10 sec)
# Submit smoke/minimal-payload.json or smoke/fonts-payload.json via JSON-RPC POST to /mcp.
# See README.md "Reproducing the smoke locally" for the full sequence.

# Re-verify session-11 reference PDF (90-day retention)
curl -A "ptxprint-ops/0.1" -I \
  https://ptxprint.klappy.dev/r2/outputs/802e42e7d549cf9f827cbbcff69a6354e1b968a23084e5f2485f93cde52fc4bd/minitest_Default_JHN_ptxp.pdf
```

## What's IN the deployment today

- `submit_typeset` — full flow: validate, hash, R2 cache check, DO init, container dispatch.
- `get_job_status` — DO read with R2 proxy URL augmentation. Honest `failure_mode ∈ {hard, soft, success}`.
- `cancel_job` — DO flag set; container-side SIGTERM polling is a stub for Day-2.
- `/internal/upload` — unauthenticated R2 PUT under the `outputs/` prefix only. Used by the container to upload its rendered artifacts (PDF + log) back to the Worker for storage. Also used (manually) to stage stable test fixtures like `outputs/fixtures/fonts/...`.
- `/r2/<key>` — GET and HEAD proxy through the Worker (HEAD added in session 11; deploy gated). Day-2 will switch to presigned GETs.

## What's NOT in the deployment today (Day-2+)

- Multi-pass autofill mode (`payload.mode = "autofill"`)
- Streaming progress per-pass to the JobStateDO
- Container-side cancellation (SIGTERM PTXprint when `cancel_requested` flag set)
- Stripping bundled fonts from the Container (session-3 C-007 — Day-2 hardening)
- Reliable widget-ID overrides via `define` / `-D` (blocked on session-1 O-003 / H-019)

## Known good behaviour — empirical reference points

| Demonstration | Session | Job ID prefix | PDF size | Wall-clock | Notes |
|---|---|---|---|---|---|
| First end-to-end PDF (Phase 1, cfg-edit Charis) | 10 | `6f37b42b…` | 66966 B | 4.1s | minitests JHN, Charis substituted for Gentium Plus |
| First payload-supplied fonts (Phase 2 demo) | 11 | `802e42e7…` | 68111 B | 4.7s | minitests JHN, Gentium Plus 6.200 via payload |

Both jobs are reproducible from `smoke/*.json` fixtures + the JSON-RPC harness pattern.

## Observed quirks (don't relearn)

- **Default `urllib` UA gets Cloudflare-1010-banned.** Always set explicit `User-Agent` on programmatic requests.
- **`HEAD /r2/<key>` returned 404 until session-11.** Fixed in PR #13 (route handler now accepts both GET and HEAD; HEAD uses `env.OUTPUTS.head()` for efficiency). Live as of PR #13's merge — Workers Builds auto-deployed it.
- **Job IDs are `sha256(canonicalize(payload))`.** Same payload → same id → same R2 path → free cache hit. Perturb a comment or any field to force fresh DO state.
- **`define` overrides do NOT take effect** for cfg keys with the same name. PTXprint widget IDs ≠ cfg keys (session-1 O-003 still open). Edit `config_files` directly OR supply the actual font via `fonts` payload.
- **`project_id` capped at 8 chars** by the v1.2 schema. Paratext convention is project-id = folder-name; "minitests" (9 chars) must be renamed to "minitest" when used as a payload.
- **Payload-supplied fonts work without `fc-cache` or `OSFONTDIR` wiring.** PTXprint's startup adds `<project>/shared/fonts/` to XeTeX's resolution paths automatically. Session-11 empirically confirmed this; the prediction otherwise was wrong.
- **`fonts-sil-gentium` ≠ `fonts-sil-gentiumplus`** in Debian. The Dockerfile installs the former (original Gentium 1.03 from 2008, Regular only). "Gentium Plus" lives in the latter, which is *not* installed. If a fixture references "Gentium Plus", the agent must either substitute Charis SIL via cfg-edit or supply Gentium Plus via the `fonts` payload.

## Where to read for more depth

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — system overview in one diagram
- [`canon/specs/ptxprint-mcp-v1.2-spec.md`](canon/specs/ptxprint-mcp-v1.2-spec.md) — the formal spec
- [`canon/articles/`](canon/articles/) — agent-facing operational knowledge (font resolution, payload construction, failure-mode taxonomy, etc.)
- [`canon/handoffs/`](canon/handoffs/) — durable cross-session records; the latest is the live source of truth on system state
- [`canon/encodings/`](canon/encodings/) — DOLCHEO+H session ledgers (sessions 1-11 to date)
