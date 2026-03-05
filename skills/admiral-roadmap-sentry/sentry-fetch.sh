#!/usr/bin/env bash
# sentry-fetch.sh — Fetch recent unresolved Sentry issues for a given project
#
# Usage:
#   ./sentry-fetch.sh <project_slug> [limit] [stats_period]
#
# Environment:
#   SENTRY_AUTH_TOKEN  — Sentry Internal Integration token (required)
#   SENTRY_ORG_SLUG    — Sentry organisation slug (required, e.g. "focus-bear")
#
# Output:
#   JSON array of Sentry issues to stdout.
#   Fields: id, title, culprit, count, userCount, firstSeen, lastSeen, permalink, level, status
#
# Exit codes:
#   0 — success
#   1 — missing required args or env vars
#   2 — Sentry API error

set -euo pipefail

PROJECT_SLUG="${1:-}"
LIMIT="${2:-25}"
STATS_PERIOD="${3:-24h}"

# Validate inputs
if [[ -z "$PROJECT_SLUG" ]]; then
  echo "ERROR: project_slug is required" >&2
  echo "Usage: $0 <project_slug> [limit] [stats_period]" >&2
  exit 1
fi

if [[ -z "${SENTRY_AUTH_TOKEN:-}" ]]; then
  echo "ERROR: SENTRY_AUTH_TOKEN environment variable is not set" >&2
  echo "See SKILL.md for Sentry access setup instructions." >&2
  exit 1
fi

if [[ -z "${SENTRY_ORG_SLUG:-}" ]]; then
  echo "ERROR: SENTRY_ORG_SLUG environment variable is not set" >&2
  exit 1
fi

SENTRY_API_BASE="https://sentry.io/api/0"
ENDPOINT="${SENTRY_API_BASE}/projects/${SENTRY_ORG_SLUG}/${PROJECT_SLUG}/issues/"

# Build query parameters
QUERY_PARAMS="query=is%3Aunresolved&sort=date&limit=${LIMIT}&statsPeriod=${STATS_PERIOD}"

# Make the API call using a tmpfile to safely capture body and status separately
TMPFILE=$(mktemp)
HTTP_STATUS=$(curl --silent --output "$TMPFILE" --write-out "%{http_code}" \
  --request GET \
  --header "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
  --header "Content-Type: application/json" \
  "${ENDPOINT}?${QUERY_PARAMS}")
HTTP_BODY=$(<"$TMPFILE")
rm -f "$TMPFILE"

if [[ "$HTTP_STATUS" -ne 200 ]]; then
  echo "ERROR: Sentry API returned HTTP ${HTTP_STATUS} for project '${PROJECT_SLUG}'" >&2
  echo "Response: ${HTTP_BODY}" >&2
  exit 2
fi

# Extract and output only the fields we care about
# Requires jq to be installed
if command -v jq &>/dev/null; then
  echo "$HTTP_BODY" | jq '[.[] | {
    id: .id,
    title: .title,
    culprit: .culprit,
    count: (.count | tonumber),
    userCount: (.userCount | tonumber),
    firstSeen: .firstSeen,
    lastSeen: .lastSeen,
    permalink: .permalink,
    level: .level,
    status: .status
  }]'
else
  # Fallback: output raw JSON if jq is not available
  echo "$HTTP_BODY"
fi
