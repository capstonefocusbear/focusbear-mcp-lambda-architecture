#!/usr/bin/env bash
set -euo pipefail

# Smoke tests for the API server. Run after starting the server (e.g. npm run start:dev).
# Usage: npm run smoke-test
# Override: SERVER_URL=http://localhost:5038 MAX_RETRIES=30 npm run smoke-test

SERVER_URL="${SERVER_URL:-http://localhost:5038}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_INTERVAL="${RETRY_INTERVAL:-2}"
CURL_TIMEOUT_ARGS="--connect-timeout 5 --max-time 10"

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

  if [ -n "$body" ]; then
    actual_status=$(curl -s $CURL_TIMEOUT_ARGS -o /dev/null -w "%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" -d "$body")
  else
    actual_status=$(curl -s $CURL_TIMEOUT_ARGS -o /dev/null -w "%{http_code}" -X "$method" "$url")
  fi

  if [ "$actual_status" = "$expected_status" ]; then
    echo "  PASS: $description (${method} ${path}) -> $actual_status"
    PASSED=$((PASSED + 1))
  else
    echo "  FAIL: $description (${method} ${path}) -> expected $expected_status, got $actual_status"
    FAILED=$((FAILED + 1))
    ERRORS="${ERRORS}\n- ${description}: expected ${expected_status}, got ${actual_status}"
  fi
}

echo "=== API Server Smoke Tests ==="
echo "Server URL: $SERVER_URL"
echo ""

echo "Waiting for server to be ready..."
for i in $(seq 1 "$MAX_RETRIES"); do
  if curl -s $CURL_TIMEOUT_ARGS -o /dev/null -w "%{http_code}" "${SERVER_URL}/healthcheck" | grep -q "200"; then
    echo "Server is ready after $(((i - 1) * RETRY_INTERVAL)) seconds"
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "FATAL: Server did not become ready after $((MAX_RETRIES * RETRY_INTERVAL)) seconds"
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
