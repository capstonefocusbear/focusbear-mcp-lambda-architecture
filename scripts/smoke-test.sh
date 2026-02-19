#!/usr/bin/env bash
set -euo pipefail

# Smoke tests for the API server. Run after starting the server (e.g. npm run start:dev).
# Safe for non-interactive/CI: no prompts, config via env, exit 0 on success and 1 on failure.
# Usage: npm run smoke-test
# Override: SERVER_URL=http://localhost:5038 MAX_RETRIES=30 RETRY_INTERVAL=2 npm run smoke-test
# Debug: SMOKE_DEBUG=1 npm run smoke-test (shows attempt numbers, response body on failure)
# In CI (e.g. GitHub Actions), SMOKE_DEBUG is auto-enabled for easier debugging.

SERVER_URL="${SERVER_URL:-http://localhost:5038}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_INTERVAL="${RETRY_INTERVAL:-2}"
CURL_TIMEOUT_ARGS="--connect-timeout 5 --max-time 10"
# Auto-enable debug in CI for better diagnostics when smoke tests fail
if [ -n "${GITHUB_ACTIONS:-}" ] || [ "${CI:-}" = "true" ]; then
  SMOKE_DEBUG="${SMOKE_DEBUG:-1}"
else
  SMOKE_DEBUG="${SMOKE_DEBUG:-0}"
fi

PASSED=0
FAILED=0
ERRORS=""
CURL_ERR_FILE=""

cleanup() {
  [ -n "$CURL_ERR_FILE" ] && [ -f "$CURL_ERR_FILE" ] && rm -f "$CURL_ERR_FILE"
}
trap cleanup EXIT
CURL_ERR_FILE=$(mktemp)

check_endpoint() {
  local method="$1"
  local path="$2"
  local expected_status="$3"
  local description="$4"
  local body="${5:-}"

  local url="${SERVER_URL}${path}"
  local actual_status=""
  local response_body=""
  local curl_exit=0

  > "$CURL_ERR_FILE"
  if [ -n "$body" ]; then
    response_body=$(curl -s -S $CURL_TIMEOUT_ARGS -w "\n%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" -d "$body" 2>"$CURL_ERR_FILE") || curl_exit=$?
  else
    response_body=$(curl -s -S $CURL_TIMEOUT_ARGS -w "\n%{http_code}" -X "$method" "$url" 2>"$CURL_ERR_FILE") || curl_exit=$?
  fi

  if [ "$curl_exit" -ne 0 ]; then
    actual_status="CURL_ERROR"
  else
    actual_status=$(echo "$response_body" | tail -n1)
    response_body=$(echo "$response_body" | sed '$d')
  fi

  # Normalize empty status for display
  [ -z "$actual_status" ] && actual_status="(no response)"

  if [ "$actual_status" = "$expected_status" ]; then
    echo "  PASS: $description (${method} ${path}) -> $actual_status"
    PASSED=$((PASSED + 1))
  else
    echo "  FAIL: $description (${method} ${path}) -> expected $expected_status, got $actual_status"
    if [ "$actual_status" = "CURL_ERROR" ] && [ -s "$CURL_ERR_FILE" ]; then
      echo "    [DEBUG] curl stderr: $(cat "$CURL_ERR_FILE")"
    fi
    if [ "$SMOKE_DEBUG" = "1" ] && [ -n "$response_body" ]; then
      echo "    [DEBUG] response body (first 300 chars): $(echo "$response_body" | head -c 300)"
    fi
    FAILED=$((FAILED + 1))
    ERRORS="${ERRORS}\n- ${description}: expected ${expected_status}, got ${actual_status}"
  fi
}

echo "=== API Server Smoke Tests ==="
echo "Server URL: $SERVER_URL"
echo ""

echo "Waiting for server to be ready..."
for i in $(seq 1 "$MAX_RETRIES"); do
  if [ "$SMOKE_DEBUG" = "1" ]; then
    echo "  attempt $i/$MAX_RETRIES..."
  fi
  > "$CURL_ERR_FILE"
  code=$(curl -s -S $CURL_TIMEOUT_ARGS -o /dev/null -w "%{http_code}" "${SERVER_URL}/healthcheck" 2>"$CURL_ERR_FILE") || true
  if [ "$code" = "200" ]; then
    echo "Server is ready after $(((i - 1) * RETRY_INTERVAL)) seconds"
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "FATAL: Server did not become ready after $((MAX_RETRIES * RETRY_INTERVAL)) seconds"
    echo "  Last healthcheck: HTTP code=${code:- none}"
    if [ -s "$CURL_ERR_FILE" ]; then
      echo "  Curl stderr: $(cat "$CURL_ERR_FILE")"
    fi
    if [ "$SMOKE_DEBUG" = "1" ]; then
      echo "[DEBUG] Full healthcheck response:"
      curl -s -S $CURL_TIMEOUT_ARGS -w "\nHTTP code: %{http_code}\n" "${SERVER_URL}/healthcheck" 2>"$CURL_ERR_FILE" || true
    fi
    exit 1
  fi
  sleep "$RETRY_INTERVAL"
done

echo ""
echo "--- Running endpoint checks ---"

check_endpoint "GET" "/healthcheck" "200" "Health check"

check_endpoint "GET" "/user" "401" "User endpoint requires authentication"
check_endpoint "GET" "/user-settings" "401" "User settings require authentication"
check_endpoint "GET" "/user-data" "401" "User data requires authentication"
check_endpoint "GET" "/user-stats/leaderboard" "401" "User stats require authentication"
check_endpoint "GET" "/to-do" "401" "To-do list requires authentication"
check_endpoint "GET" "/focus-mode" "401" "Focus mode requires authentication"
check_endpoint "GET" "/habit-packs" "401" "Habit packs require authentication"
check_endpoint "GET" "/announcements" "401" "Announcements require authentication"

echo ""
echo "--- Results ---"
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ "$FAILED" -gt 0 ]; then
  echo ""
  echo "Failed checks:"
  echo -e "$ERRORS"
  echo ""
  echo "--- Debug tips ---"
  echo "  SERVER_URL=$SERVER_URL (override with SERVER_URL=... npm run smoke-test)"
  echo "  Enable verbose: SMOKE_DEBUG=1 npm run smoke-test"
  echo "  If server failed to start, check server logs (e.g. server.log in CI)."
  exit 1
fi

echo ""
echo "All smoke tests passed!"
