#!/usr/bin/env bash
set -euo pipefail

# Smoke tests for the API server. Run after starting the server (e.g. npm run start:dev).
# Safe for non-interactive/CI: no prompts, config via env, exit 0 on success and 1 on failure.
# Usage: npm run smoke-test
# Override: SERVER_URL=http://localhost:5038 MAX_RETRIES=30 RETRY_INTERVAL=2 npm run smoke-test
# Debug: SMOKE_DEBUG=1 npm run smoke-test (shows attempt numbers, response body on failure)

SERVER_URL="${SERVER_URL:-http://localhost:5038}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_INTERVAL="${RETRY_INTERVAL:-2}"
CURL_TIMEOUT_ARGS="--connect-timeout 5 --max-time 10"
SMOKE_DEBUG="${SMOKE_DEBUG:-0}"

PASSED=0
FAILED=0
ERRORS=""

check_endpoint() {
  local method="$1"
  local path="$2"
  local expected_status="$3"
  local description="$4"
  local body="${5:-}"

  local url="${SERVER_URL}${path}"
  local actual_status
  local response_body

  if [ -n "$body" ]; then
    response_body=$(curl -s $CURL_TIMEOUT_ARGS -w "\n%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" -d "$body" 2>/dev/null || true)
  else
    response_body=$(curl -s $CURL_TIMEOUT_ARGS -w "\n%{http_code}" -X "$method" "$url" 2>/dev/null || true)
  fi
  actual_status=$(echo "$response_body" | tail -n1)
  response_body=$(echo "$response_body" | sed '$d')

  if [ "$actual_status" = "$expected_status" ]; then
    echo "  PASS: $description (${method} ${path}) -> $actual_status"
    PASSED=$((PASSED + 1))
  else
    echo "  FAIL: $description (${method} ${path}) -> expected $expected_status, got $actual_status"
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
  if curl -s $CURL_TIMEOUT_ARGS -o /dev/null -w "%{http_code}" "${SERVER_URL}/healthcheck" | grep -q "200"; then
    echo "Server is ready after $(((i - 1) * RETRY_INTERVAL)) seconds"
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "FATAL: Server did not become ready after $((MAX_RETRIES * RETRY_INTERVAL)) seconds"
    if [ "$SMOKE_DEBUG" = "1" ]; then
      echo "[DEBUG] Last healthcheck attempt:"
      curl -s $CURL_TIMEOUT_ARGS -w "\nHTTP code: %{http_code}\n" "${SERVER_URL}/healthcheck" || true
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
  exit 1
fi

echo ""
echo "All smoke tests passed!"
