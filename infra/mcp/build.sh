#!/usr/bin/env bash
# Bundles apps/mcp-server into a single file that AWS Lambda can run.
# Output: infra/mcp/build/ (main.js + run.sh), which template.yaml uses as CodeUri.
# Run from anywhere: bash infra/mcp/build.sh
set -euo pipefail

cd "$(dirname "$0")/../.."

OUT=infra/mcp/build
rm -rf "$OUT"
mkdir -p "$OUT"

npx esbuild apps/mcp-server/src/main.ts \
  --bundle \
  --platform=node \
  --target=node22 \
  --format=cjs \
  --legal-comments=none \
  --outfile="$OUT/main.js"

cp infra/mcp/run.sh "$OUT/run.sh"
chmod +x "$OUT/run.sh"

echo "Built $OUT"
