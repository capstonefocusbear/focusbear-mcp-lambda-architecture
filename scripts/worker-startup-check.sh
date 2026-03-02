#!/usr/bin/env bash
# Process startup check for CI. Starts a process (worker or app entrypoint), verifies
# it stays alive for a minimum time, then exits. Safe for non-interactive/CI.
#
# Usage:
#   WORKER_CMD="node dist/apps/api-server/main.js" bash scripts/worker-startup-check.sh
#   WORKER_STABILITY_SECONDS=15 bash scripts/worker-startup-check.sh
#
# Env:
#   WORKER_CMD (required) - Command to start the process (e.g. "node dist/apps/api-server/main.js")
#   WORKER_STABILITY_SECONDS (default 15) - Seconds process must stay alive to pass
#   WORKER_DEBUG (default 0, or 1 in CI) - Verbose output
#   WORKER_HEALTHCHECK_URL (optional) - HTTP endpoint checked after stability passes
#   WORKER_HEALTHCHECK_RETRIES (default 10) - Number of healthcheck attempts
#   WORKER_HEALTHCHECK_INTERVAL (default 2) - Seconds between healthcheck attempts

set -euo pipefail

WORKER_CMD="${WORKER_CMD:?WORKER_CMD is required}"
WORKER_STABILITY_SECONDS="${WORKER_STABILITY_SECONDS:-15}"
if [ -n "${GITHUB_ACTIONS:-}" ] || [ "${CI:-}" = "true" ]; then
  WORKER_DEBUG="${WORKER_DEBUG:-1}"
else
  WORKER_DEBUG="${WORKER_DEBUG:-0}"
fi

WORKER_LOG="${WORKER_LOG:-worker.log}"
WORKER_HEALTHCHECK_URL="${WORKER_HEALTHCHECK_URL:-}"
WORKER_HEALTHCHECK_RETRIES="${WORKER_HEALTHCHECK_RETRIES:-10}"
WORKER_HEALTHCHECK_INTERVAL="${WORKER_HEALTHCHECK_INTERVAL:-2}"

require_positive_int() {
  local value="$1"
  local name="$2"

  case "$value" in
    ''|*[!0-9]*)
      echo "FATAL: $name must be a positive integer, got '$value'"
      exit 1
      ;;
    0)
      echo "FATAL: $name must be > 0"
      exit 1
      ;;
  esac
}

require_positive_int "$WORKER_STABILITY_SECONDS" "WORKER_STABILITY_SECONDS"
require_positive_int "$WORKER_HEALTHCHECK_RETRIES" "WORKER_HEALTHCHECK_RETRIES"
require_positive_int "$WORKER_HEALTHCHECK_INTERVAL" "WORKER_HEALTHCHECK_INTERVAL"

echo "=== Process startup check ==="
echo "  WORKER_CMD=$WORKER_CMD"
echo "  WORKER_STABILITY_SECONDS=$WORKER_STABILITY_SECONDS"
if [ -n "$WORKER_HEALTHCHECK_URL" ]; then
  echo "  WORKER_HEALTHCHECK_URL=$WORKER_HEALTHCHECK_URL"
fi
echo ""

echo "Starting process..."
# WORKER_CMD is expected to be controlled input (CI config/repo scripts), not user input.
bash -c "$WORKER_CMD" > "$WORKER_LOG" 2>&1 &
WORKER_PID=$!

cleanup() {
  kill $WORKER_PID 2>/dev/null || true
  wait $WORKER_PID 2>/dev/null || true
}
trap cleanup EXIT

for i in $(seq 1 "$WORKER_STABILITY_SECONDS"); do
  if ! kill -0 $WORKER_PID 2>/dev/null; then
    echo "FATAL: Process exited prematurely (after ${i}s)"
    set +e
    wait $WORKER_PID 2>/dev/null
    EXIT_CODE=$?
    set -e
    echo "Process exit code: $EXIT_CODE"
    echo ""
    echo "--- Process log (last 80 lines) ---"
    tail -80 "$WORKER_LOG" || true
    exit 1
  fi

  if [ "$WORKER_DEBUG" = "1" ]; then
    echo "  attempt $i/$WORKER_STABILITY_SECONDS..."
  fi
  sleep 1
done

# Avoid a false pass if the process exits in the final sleep interval.
if ! kill -0 $WORKER_PID 2>/dev/null; then
  echo "FATAL: Process exited before completing stability window (${WORKER_STABILITY_SECONDS}s)"
  set +e
  wait $WORKER_PID 2>/dev/null
  EXIT_CODE=$?
  set -e
  echo "Process exit code: $EXIT_CODE"
  echo ""
  echo "--- Process log (last 80 lines) ---"
  tail -80 "$WORKER_LOG" || true
  exit 1
fi

if [ -n "$WORKER_HEALTHCHECK_URL" ]; then
  if ! command -v curl >/dev/null 2>&1; then
    echo "FATAL: curl is required when WORKER_HEALTHCHECK_URL is set"
    exit 1
  fi

  echo "Running healthcheck..."
  HEALTH_OK=0
  for i in $(seq 1 "$WORKER_HEALTHCHECK_RETRIES"); do
    if curl -fsS --connect-timeout 5 --max-time 10 "$WORKER_HEALTHCHECK_URL" >/dev/null 2>&1; then
      HEALTH_OK=1
      break
    fi

    if [ "$WORKER_DEBUG" = "1" ]; then
      echo "  healthcheck attempt $i/$WORKER_HEALTHCHECK_RETRIES failed"
    fi
    sleep "$WORKER_HEALTHCHECK_INTERVAL"
  done

  if [ "$HEALTH_OK" -ne 1 ]; then
    echo "FATAL: Process is alive but healthcheck failed: $WORKER_HEALTHCHECK_URL"
    echo ""
    echo "--- Process log (last 80 lines) ---"
    tail -80 "$WORKER_LOG" || true
    exit 1
  fi
  echo "Healthcheck passed"
fi

echo "Process is running successfully after $WORKER_STABILITY_SECONDS seconds"
echo "Process startup check passed!"
