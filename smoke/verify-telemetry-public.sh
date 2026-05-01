#!/usr/bin/env bash
# Verifies that telemetry_public is wired correctly on ptxprint.klappy.dev/mcp.
#
# Setup (only ONE secret to set since cae57a0 — CF_ACCOUNT_ID lives in
# wrangler.jsonc as a public var, see DEPLOY.md):
#
#   npx wrangler secret put CF_API_TOKEN --name ptxprint-mcp
#
# Quick pre-check (boolean state of every required env var, no secrets exposed):
#
#   curl https://ptxprint.klappy.dev/diagnostics/telemetry | jq
set -euo pipefail
URL='https://ptxprint.klappy.dev/mcp'

# 1. handshake
H=$(curl -sS -i -X POST "$URL" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"verify-telemetry","version":"0"}}}')
SID=$(printf '%s' "$H" | awk -F': ' 'tolower($1)=="mcp-session-id"{print $2}' | tr -d '\r')
[ -n "$SID" ] || { echo "no session id" >&2; exit 1; }

# 2. notifications/initialized
curl -sS -X POST "$URL" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Mcp-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}' >/dev/null

# 3. call telemetry_public
echo "--- telemetry_public response ---"
curl -sS -X POST "$URL" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Mcp-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"telemetry_public","arguments":{"sql":"SELECT tool_name, SUM(_sample_interval) AS calls FROM ptxprint_telemetry WHERE tool_name != '"'"''"'"' GROUP BY tool_name ORDER BY calls DESC LIMIT 10"}}}'
echo
echo
echo 'Expected after secrets are set: a JSON envelope with "rows": [...] containing tool_name + calls.'
echo 'If you still see "Telemetry query service not configured", one or both secrets did not land.'
echo 'Re-check with:  npx wrangler secret list --name ptxprint-mcp'
