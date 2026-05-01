# Deploy

This file is the operational complement to [`README.md`](README.md) and [`BUILD.md`](BUILD.md). It exists to make the secret-setting step impossible to miss. If `telemetry_public` is returning a `not configured` error, this is the file that tells you why and how to fix it in under a minute.

---

## Auto-deploy (the normal case)

Pushing to `main` deploys automatically via **Cloudflare Workers Builds**, configured in the Cloudflare dashboard against this GitHub repo. There is no `wrangler deploy` step in any CI workflow, no GitHub Action — the dashboard integration handles it.

Verify a deploy is live by curling `/health`:

```bash
curl https://ptxprint.klappy.dev/health
# {"ok":true,"service":"ptxprint-mcp","version":"...","spec":"v1.3-draft","tools":[...]}
```

Read live behaviour, never trust local `wrangler deploy`.

---

## One-time secret setup

Two of `telemetry_public`'s three required env vars are committed in [`wrangler.jsonc`](wrangler.jsonc) (`CF_ACCOUNT_ID`, `TELEMETRY_QUERY_RATE_LIMIT_PER_HOUR`). The third — `CF_API_TOKEN` — is the only actual secret and must be set out-of-band. Once.

### Step 1: Create a read-only Analytics Engine token

1. Go to <https://dash.cloudflare.com/profile/api-tokens>.
2. **Create Token** → **Create Custom Token**.
3. Name: `ptxprint-mcp telemetry_public AE read`.
4. **Permissions:** add one row — `Account` · `Account Analytics` · `Read`.
5. **Account Resources:** restrict to the `Christopher@klapp.name's Account` account (`b03e6ea242724c05eb97eb732cceb21d`).
6. (Optional) IP restriction, TTL — leave open unless you have a reason.
7. **Continue to summary** → **Create Token**.
8. Copy the 40-char token string. **You will only see it once.**

### Step 2: Set the secret on the Worker

```bash
# from repo root, with wrangler authed against your account
npx wrangler secret put CF_API_TOKEN --name ptxprint-mcp
# paste the token when prompted; press Enter
```

No redeploy is needed — Workers picks up secret changes immediately on the next request.

### Step 3: Verify

```bash
curl https://ptxprint.klappy.dev/diagnostics/telemetry
```

Expected when configured:

```json
{
  "ok": true,
  "service": "ptxprint-mcp",
  "writes_enabled": true,
  "queries_enabled": true,
  "env": {
    "CF_ACCOUNT_ID_set": true,
    "CF_API_TOKEN_set": true,
    "CF_API_TOKEN_shape_ok": true,
    "PTXPRINT_TELEMETRY_binding_present": true
  },
  "missing": []
}
```

If `missing` is non-empty, each item tells you exactly what to do.

---

## Token reuse with oddkit

The same `CF_API_TOKEN` token works for both `ptxprint-mcp` and `oddkit` Workers — they live in the same Cloudflare account, and the dataset allowlist guard in `src/telemetry.ts` (line 442) enforces that ptxprint-mcp can only query the `ptxprint_telemetry` dataset, regardless of how broadly the token is scoped. If you already created a token for oddkit, set the same value here:

```bash
npx wrangler secret put CF_API_TOKEN --name ptxprint-mcp
# paste the same token oddkit uses
```

---

## Self-diagnostic: `/diagnostics/telemetry`

Public, CORS-open GET endpoint that reports the boolean state of every env var `telemetry_public` needs. Never reveals values — only presence and rough shape.

```bash
curl https://ptxprint.klappy.dev/diagnostics/telemetry | jq
```

Use it to:
- Confirm a fresh deploy picked up the new vars.
- Tell users why `telemetry_public` is returning errors (the homepage links here from the telemetry section).
- Sanity-check token shape after pasting (catches the most common mistake — pasting only the prefix).

The endpoint is intentionally chatty in its error messages — every missing item names what it is, where it goes, and how to set it.

---

## Why `CF_ACCOUNT_ID` lives in `wrangler.jsonc` as a `var`

Earlier versions treated it as a secret. It isn't one. From [Cloudflare's own docs](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/#authentication): *"Your 32 character account ID can be obtained from the Cloudflare dashboard."* It appears in every dashboard URL. Treating it as a secret created an unnecessary configuration step and a class of broken-deploy bugs where the Worker would silently fail telemetry queries because someone forgot one of two `wrangler secret put` invocations. With the account ID in `vars`, there is exactly one secret to set, ever.

---

## Cheat sheet

| Want to | Run |
|---|---|
| Confirm telemetry is wired | `curl https://ptxprint.klappy.dev/diagnostics/telemetry` |
| See what tools are advertised | `curl https://ptxprint.klappy.dev/health` |
| Set the only required secret | `npx wrangler secret put CF_API_TOKEN --name ptxprint-mcp` |
| Trigger an auto-deploy | `git push origin main` |
| Verify a deploy landed | `curl https://ptxprint.klappy.dev/health` (note `version`) |
| Inspect snapshot archive state | `curl https://ptxprint.klappy.dev/diagnostics/snapshot` |
| Read the lifetime hero stat | `curl https://ptxprint.klappy.dev/diagnostics/snapshot/lifetime` |
| Bootstrap snapshot archive after deploy | see "Snapshot archive setup" below |

---

## Snapshot archive setup (Track A)

The Worker runs a Cron Trigger every Monday at 00:00 UTC that snapshots the just-completed week of telemetry into an R2 bucket. This survives the 90-day Analytics Engine retention window so lifetime totals stay accurate.

### One-time bucket creation

```bash
npx wrangler r2 bucket create ptxprint-telemetry-snapshots
```

The binding (`TELEMETRY_SNAPSHOTS`) is already declared in `wrangler.jsonc`. Next deploy picks it up.

### One-time bootstrap-token secret (for manual runs)

The cron does the routine work without a token. The manual bootstrap route — `POST /internal/snapshot/run` — is gated by a header secret. To enable it:

```bash
openssl rand -hex 32 | npx wrangler secret put SNAPSHOT_BOOTSTRAP_TOKEN
```

Save the output (you'll need it to call the route). If the secret is left unset, the route returns 503; the cron is unaffected.

### Backfill weeks within the 90-day retention window

Every week of delay between Track A shipping and the bootstrap is a week of pages that won't survive. Run this once, immediately after first deploy:

```bash
TOKEN=<the SNAPSHOT_BOOTSTRAP_TOKEN you saved>

curl -X POST https://ptxprint.klappy.dev/internal/snapshot/run \
  -H "x-snapshot-bootstrap-token: $TOKEN" \
  -H "content-type: application/json" \
  -d '{"weeks_back": 13}'
```

13 weeks ≈ 90 days. The route caps `weeks_back` at 26.

For the full operations doc (smoke test, recovery, lifetime composite recipe), see [`canon/articles/snapshot-operations.md`](canon/articles/snapshot-operations.md) (uri `klappy://canon/articles/snapshot-operations`).
