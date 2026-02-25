#!/usr/bin/env bash
# Verify that the website (API) still runs when the worker is not running or has failed.
# Run locally to confirm resilience: API smoke test passes regardless of worker state.
#
# Prereqs: Postgres and Redis running (e.g. docker-compose up -d), env set (see below).
#
# Usage (bash):
#   export PUSHER_BEAMS_INSTANCE_ID=ci-dummy-instance
#   export PUSHER_BEAMS_PRIMARY_KEY=ci-dummy-key
#   export SENDGRID_KEY=SG.ci-dummy-key-for-smoke-test
#   bash scripts/verify-website-without-worker.sh
#
# Optional — simulate worker failure and confirm API still works:
#   WORKER_CMD="exit 1" bash scripts/worker-startup-check.sh  # expect failure
#   npm run smoke-test   # expect pass (API still up)
#
# In CI: the app-startup job has continue-on-error: true, so when it fails,
# the pipeline still passes (failure dependency: website/deploy does not depend on it).

set -euo pipefail

echo "=== Verify website (API) without worker ==="
echo "This script starts the API server and runs the smoke test."
echo "It does NOT start any worker — confirming the website runs independently."
echo ""

# CI-like env so server can start (optional; may already be in .env)
export PUSHER_BEAMS_INSTANCE_ID="${PUSHER_BEAMS_INSTANCE_ID:-ci-dummy-instance}"
export PUSHER_BEAMS_PRIMARY_KEY="${PUSHER_BEAMS_PRIMARY_KEY:-ci-dummy-key}"
export SENDGRID_KEY="${SENDGRID_KEY:-SG.ci-dummy-key-for-smoke-test}"
export SERVER_URL="${SERVER_URL:-http://127.0.0.1:5038}"
export SMOKE_DEBUG="${SMOKE_DEBUG:-1}"

echo "Starting API server in background (no worker)..."
npm run start:no-migration > server.log 2>&1 &
API_PID=$!
cleanup() {
  kill $API_PID 2>/dev/null || true
  wait $API_PID 2>/dev/null || true
}
trap cleanup EXIT

echo "Waiting for server to be ready, then running smoke test..."
set +e
npm run smoke-test
EXIT=$?
set -e

if [ "$EXIT" -eq 0 ]; then
  echo ""
  echo "SUCCESS: Website (API) smoke test passed without any worker running."
  echo "This confirms the site still runs when the worker is down or has failed."
else
  echo ""
  echo "Smoke test failed (exit $EXIT). Check server.log and env (Postgres, Redis, etc.)."
  exit $EXIT
fi
