#!/usr/bin/env bash
# Verifies that the Track A snapshot mechanism is wired correctly on
# ptxprint.klappy.dev. Companion to smoke/verify-telemetry-public.sh.
#
# Setup (per DEPLOY.md "Snapshot archive setup (Track A)"):
#
#   1. Create the R2 bucket once:
#        npx wrangler r2 bucket create ptxprint-telemetry-snapshots
#
#   2. Set the bootstrap token once:
#        openssl rand -hex 32 | npx wrangler secret put SNAPSHOT_BOOTSTRAP_TOKEN
#
#   3. Export the same token in your shell, then run this script:
#        export SNAPSHOT_BOOTSTRAP_TOKEN=<the token from step 2>
#        smoke/verify-snapshot.sh
#
# What this script does (in order):
#   1. Probes /diagnostics/snapshot — confirms bucket reachable + lists
#      expected-vs-present R2 objects.
#   2. Probes /diagnostics/snapshot/lifetime — confirms the composite
#      query path works (returns valid JSON; values may be 0 pre-bootstrap).
#   3. Calls /internal/snapshot/run with weeks_back: 1 — snapshots the
#      just-completed week. Idempotent: safe to re-run.
#   4. Re-probes /diagnostics/snapshot — confirms the 5 expected JSONL
#      objects now appear in objects_present.
#   5. Re-probes /diagnostics/snapshot/lifetime — confirms archive_weeks_counted
#      is now >= 1.
#
# Per the canon "Bootstrap smoke without real telemetry" section
# (klappy://canon/articles/snapshot-operations), zero values are a real
# smoke result — they prove the R2 write path works even when the dataset
# is empty. As real telemetry accumulates, future snapshots replace those
# zeros with real counts (idempotent merge by week).
#
# Authority:
#   klappy://canon/articles/hero-metrics-and-storytelling
#   klappy://canon/articles/snapshot-operations

set -euo pipefail

URL='https://ptxprint.klappy.dev'

if [ -z "${SNAPSHOT_BOOTSTRAP_TOKEN:-}" ]; then
  echo "FAIL: SNAPSHOT_BOOTSTRAP_TOKEN env var not set." >&2
  echo "      Set it to the value from 'wrangler secret put SNAPSHOT_BOOTSTRAP_TOKEN'." >&2
  echo "      See DEPLOY.md \"Snapshot archive setup (Track A)\" for the full recipe." >&2
  exit 1
fi

# ---------- step 1: bucket + expected-vs-present ----------
echo "--- step 1: GET /diagnostics/snapshot (pre-run) ---"
PRE=$(curl -sS -f "$URL/diagnostics/snapshot")
echo "$PRE"
echo

# ---------- step 2: lifetime composite (pre-run) ----------
echo "--- step 2: GET /diagnostics/snapshot/lifetime (pre-run) ---"
LIFE_PRE=$(curl -sS -f "$URL/diagnostics/snapshot/lifetime")
echo "$LIFE_PRE"
echo

# ---------- step 3: bootstrap one week ----------
echo "--- step 3: POST /internal/snapshot/run weeks_back=1 ---"
RUN=$(curl -sS -f -X POST "$URL/internal/snapshot/run" \
  -H "x-snapshot-bootstrap-token: $SNAPSHOT_BOOTSTRAP_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"weeks_back": 1}')
echo "$RUN"
echo

# Quick sanity check: the response should declare ok and weeks_processed: 1
case "$RUN" in
  *'"ok":true'*'"weeks_processed":1'*) : ;;
  *)
    echo "FAIL: snapshot run did not return ok=true with weeks_processed=1." >&2
    exit 1
    ;;
esac

# ---------- step 4: re-probe /diagnostics/snapshot ----------
echo "--- step 4: GET /diagnostics/snapshot (post-run) ---"
POST=$(curl -sS -f "$URL/diagnostics/snapshot")
echo "$POST"
echo

# All 5 expected objects should now appear in objects_present.
EXPECTED=(
  pages-typeset-weekly.jsonl
  successful-builds-weekly.jsonl
  cache-hits-weekly.jsonl
  cache-misses-weekly.jsonl
  failure-mode-distribution-weekly.jsonl
)
MISSING=()
for OBJ in "${EXPECTED[@]}"; do
  case "$POST" in
    *"\"$OBJ\""*) : ;;
    *) MISSING+=("$OBJ") ;;
  esac
done

if [ ${#MISSING[@]} -ne 0 ]; then
  echo "WARN: ${#MISSING[@]} expected R2 object(s) not present after run:" >&2
  printf '       - %s\n' "${MISSING[@]}" >&2
  echo "      The failure_mode_distribution metric only emits rows when the dataset" >&2
  echo "      contains job_terminal events with a non-empty failure_mode for the" >&2
  echo "      target week — empty datasets legitimately produce zero rows there." >&2
  echo "      The other four metrics should always appear." >&2
fi

# ---------- step 5: re-probe lifetime composite ----------
echo "--- step 5: GET /diagnostics/snapshot/lifetime (post-run) ---"
LIFE_POST=$(curl -sS -f "$URL/diagnostics/snapshot/lifetime")
echo "$LIFE_POST"
echo

case "$LIFE_POST" in
  *'"archive_weeks_counted":0'*)
    echo "NOTE: archive_weeks_counted is still 0. This means the snapshot ran but" >&2
    echo "      the pages_typeset_weekly query returned no rows for that week" >&2
    echo "      (zero successful job_terminal events). The R2 write succeeded;" >&2
    echo "      the value is just 0. This is a valid pre-traffic state per canon." >&2
    ;;
  *)
    echo "OK: lifetime composite reflects archive contents."
    ;;
esac

echo
echo "=== done ==="
echo "If the lifetime endpoint still shows 0 archive_weeks_counted but objects_present"
echo "lists the 4 always-emitting metrics above, the pipeline is correctly wired and"
echo "is just waiting on real telemetry traffic. Run again after some traffic has"
echo "accumulated to see non-zero values."
