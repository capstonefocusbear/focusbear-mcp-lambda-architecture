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

set -euo pipefail

WORKER_CMD="${WORKER_CMD:?WORKER_CMD is required}"
WORKER_STABILITY_SECONDS="${WORKER_STABILITY_SECONDS:-15}"
if [ -n "${GITHUB_ACTIONS:-}" ] || [ "${CI:-}" = "true" ]; then
  WORKER_DEBUG="${WORKER_DEBUG:-1}"
else
  WORKER_DEBUG="${WORKER_DEBUG:-0}"
fi

WORKER_LOG="${WORKER_LOG:-worker.log}"

echo "=== Process startup check ==="
echo "  WORKER_CMD=$WORKER_CMD"
echo "  WORKER_STABILITY_SECONDS=$WORKER_STABILITY_SECONDS"
echo ""

echo "Starting process..."
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

echo "Process is running successfully after $WORKER_STABILITY_SECONDS seconds"
echo "Process startup check passed!"
