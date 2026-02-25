#!/usr/bin/env bash
# Worker startup check for CI. Starts the worker, verifies it stays alive for a
# minimum time, then exits. Safe for non-interactive/CI.
#
# Usage:
#   WORKER_CMD="node dist/worker.js" bash scripts/worker-startup-check.sh
#   WORKER_STABILITY_SECONDS=15 WORKER_TIMEOUT_SECONDS=30 bash scripts/worker-startup-check.sh
#
# Env:
#   WORKER_CMD (required) - Command to start the worker (e.g. "node dist/worker.js")
#   WORKER_STABILITY_SECONDS (default 15) - Seconds worker must stay alive to pass
#   WORKER_TIMEOUT_SECONDS (default 30) - Max wait before failing
#   WORKER_DEBUG (default 0, or 1 in CI) - Verbose output

set -euo pipefail

WORKER_CMD="${WORKER_CMD:?WORKER_CMD is required}"
WORKER_STABILITY_SECONDS="${WORKER_STABILITY_SECONDS:-15}"
WORKER_TIMEOUT_SECONDS="${WORKER_TIMEOUT_SECONDS:-30}"
if [ -n "${GITHUB_ACTIONS:-}" ] || [ "${CI:-}" = "true" ]; then
  WORKER_DEBUG="${WORKER_DEBUG:-1}"
else
  WORKER_DEBUG="${WORKER_DEBUG:-0}"
fi

WORKER_LOG="${WORKER_LOG:-worker.log}"

echo "=== Worker startup check ==="
echo "  WORKER_CMD=$WORKER_CMD"
echo "  WORKER_STABILITY_SECONDS=$WORKER_STABILITY_SECONDS"
echo "  WORKER_TIMEOUT_SECONDS=$WORKER_TIMEOUT_SECONDS"
echo ""

echo "Starting worker process..."
$WORKER_CMD > "$WORKER_LOG" 2>&1 &
WORKER_PID=$!

cleanup() {
  kill $WORKER_PID 2>/dev/null || true
  wait $WORKER_PID 2>/dev/null || true
}
trap cleanup EXIT

STARTED=false
for i in $(seq 1 "$WORKER_TIMEOUT_SECONDS"); do
  if ! kill -0 $WORKER_PID 2>/dev/null; then
    echo "FATAL: Worker process exited prematurely (after ${i}s)"
    wait $WORKER_PID 2>/dev/null || true
    EXIT_CODE=$?
    echo "Worker exit code: $EXIT_CODE"
    echo ""
    echo "--- Worker log (last 80 lines) ---"
    tail -80 "$WORKER_LOG" || true
    exit 1
  fi

  if [ "$i" -ge "$WORKER_STABILITY_SECONDS" ]; then
    STARTED=true
    if [ "$WORKER_DEBUG" = "1" ]; then
      echo "  Worker still alive at ${i}s (required: $WORKER_STABILITY_SECONDS)"
    fi
    break
  fi

  if [ "$WORKER_DEBUG" = "1" ]; then
    echo "  attempt $i/$WORKER_TIMEOUT_SECONDS..."
  fi
  sleep 1
done

if [ "$STARTED" = true ]; then
  echo "Worker process is running successfully after $WORKER_STABILITY_SECONDS seconds"
else
  echo "FATAL: Worker did not stabilize within $WORKER_TIMEOUT_SECONDS seconds"
  echo ""
  echo "--- Worker log (last 80 lines) ---"
  tail -80 "$WORKER_LOG" || true
  exit 1
fi

echo "Worker startup check passed!"
