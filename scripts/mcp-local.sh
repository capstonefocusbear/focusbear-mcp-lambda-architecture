#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# No caller credentials or endpoint can reach these local AWS commands.
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1 AWS_REGION=us-east-1
export AWS_MAX_ATTEMPTS=2 AWS_RETRY_MODE=standard
export AWS_EC2_METADATA_DISABLED=true AWS_CONFIG_FILE=/dev/null AWS_SHARED_CREDENTIALS_FILE=/dev/null AWS_PAGER=''
unset AWS_SESSION_TOKEN AWS_SECURITY_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE AWS_ROLE_ARN AWS_WEB_IDENTITY_TOKEN_FILE AWS_CONTAINER_CREDENTIALS_FULL_URI AWS_CONTAINER_CREDENTIALS_RELATIVE_URI AWS_ENDPOINT_URL AWS_ENDPOINT_URL_STS
endpoint=http://127.0.0.1:4566
local_aws() { aws --endpoint-url "$endpoint" --region us-east-1 --cli-connect-timeout 5 --cli-read-timeout 20 "$@"; }
compose() { docker compose --env-file "${MCP_ENV_FILE:?Set MCP_ENV_FILE to your local config}" -f docker-compose.mcp.yml "$@"; }
load_config() {
  # Read only supported dotenv keys; do not execute arbitrary shell code.
  local config_exports
  config_exports=$(node scripts/mcp-local-config.cjs "${MCP_ENV_FILE:?Set MCP_ENV_FILE}") || return
  eval "$config_exports"
}
case "${1:-}" in
  up) compose up -d --build api-server db redis localstack ;;
  direct) compose --profile direct up -d --build ;;
  deploy)
    load_config
    docker info >/dev/null
    local_aws sts get-caller-identity --query Account --output text | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{if(s.trim()!=="000000000000")process.exit(1)})'
    docker build --platform linux/amd64 -f apps/mcp-server/Dockerfile.mcp -t focusbear-mcp:local .
    local_aws ecr describe-repositories --repository-names focusbear-mcp >/dev/null 2>&1 || local_aws ecr create-repository --repository-name focusbear-mcp >/dev/null
    repository=$(local_aws ecr describe-repositories --repository-names focusbear-mcp --query 'repositories[0].repositoryUri' --output text)
    # Never push to a real ECR registry, even if emulator output is unexpected.
    if [[ ! "$repository" =~ ^(localhost|127\.0\.0\.1|localhost\.localstack\.cloud|000000000000\.dkr\.ecr\.us-east-1\.localhost\.localstack\.cloud):4566/focusbear-mcp$ ]]; then
      echo 'Refusing non-local ECR registry' >&2; exit 1
    fi
    local_aws ecr get-login-password | docker login --username AWS --password-stdin "${repository%%/*}"
    docker tag focusbear-mcp:local "$repository:local"
    docker push "$repository:local"
    digest=$(local_aws ecr describe-images --repository-name focusbear-mcp --image-ids imageTag=local --query 'imageDetails[0].imageDigest' --output text)
    npm --prefix infra/mcp/cdk run build
    (cd infra/mcp/cdk && npm exec -- cdk synth -c profile=local --quiet)
    local_aws cloudformation deploy --stack-name FocusBearMcpLocal --template-file infra/mcp/cdk/cdk.out/FocusBearMcpLocal.template.json --capabilities CAPABILITY_IAM --parameter-overrides \
      "ImageDigest=$digest" "OAuthIssuer=$OAUTH_ISSUER" "OAuthJwksUrl=$OAUTH_JWKS_URL" "McpResourceUrl=$MCP_RESOURCE_URL" "McpAllowedClientIds=$MCP_ALLOWED_CLIENT_IDS" "McpTokenProfile=${MCP_TOKEN_PROFILE:-auth0}"
    local_aws cloudformation describe-stacks --stack-name FocusBearMcpLocal --query 'Stacks[0].Outputs'
    ;;
  reset)
    # Deletes only this disposable local project and its database volume.
    compose --profile direct down --volumes --remove-orphans
    ;;
  smoke) load_config; node scripts/mcp-local-smoke.cjs ;;
  *) echo 'Usage: MCP_ENV_FILE=/tmp/focusbear-mcp.env bash scripts/mcp-local.sh up|direct|deploy|smoke|reset' >&2; exit 2 ;;
esac
