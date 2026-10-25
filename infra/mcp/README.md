# MCP Lambda deployment (AWS SAM)

Deploys `apps/mcp-server` (the OAuth MCP adapter) as one AWS Lambda function behind an API Gateway HTTP API. Group 76, Planner Task 24.

## What gets created

| Resource | Setting |
| --- | --- |
| Lambda `focusbear-mcp-<stage>` | Node.js 22, 512 MB, 15 s timeout, reserved concurrency 20, X-Ray on |
| API Gateway HTTP API | `ANY /mcp` and `GET /.well-known/oauth-protected-resource`, throttled to 5 requests/s (burst 10) |
| CloudWatch log groups | Lambda logs and API access logs, kept 14 days |
| CloudWatch alarms | Error rate above 5%, p95 duration above 3 s, any throttle (5-minute windows) |
| AWS Budget | US$10/month with emails at 50%, 80% and 100%, only when `AlertEmail` is set |

No secrets are stored. The adapter reads four URLs and verifies tokens with the issuer's public keys.

The server is a plain Node HTTP server, so it runs behind the [AWS Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter) layer: `run.sh` starts the server on port 5039 and the layer forwards API Gateway requests to it.

## Before you start

You need Node 22, the AWS CLI, the AWS SAM CLI, and AWS credentials for the target account.

Check them, one command at a time:

```bash
node --version
```

```bash
sam --version
```

```bash
aws sts get-caller-identity
```

The last command must print the account you expect. If it fails, your AWS credentials are not set up yet.

## Deploy

Run every command from the repository root unless it says otherwise.

**1. Install dependencies** (skip if `node_modules` already exists):

```bash
npm ci
```

**2. Build the Lambda bundle.** This writes `infra/mcp/build/`:

```bash
bash infra/mcp/build.sh
```

**3. Fill in `infra/mcp/samconfig.toml`.** Replace the values marked `REPLACE` that you have. Leave `McpResourceUrl` alone for now.

**4. Go to the infra folder:**

```bash
cd infra/mcp
```

**5. First deploy:**

```bash
sam deploy
```

Type `y` when it asks to deploy the changeset. When it finishes, copy the `McpUrl` value from the Outputs table.

**6. Put that URL into `samconfig.toml`** as `McpResourceUrl`, replacing `https://example.invalid/mcp`.

**7. Second deploy:**

```bash
sam deploy
```

The second deploy is required. The adapter rejects every request with `403` until `MCP_RESOURCE_URL` matches the real hostname, and that hostname only exists after the first deploy.

## Check it works

Replace `<McpUrl>` and `<MetadataUrl>` with the stack outputs.

Metadata route, expect `200` and a JSON body:

```bash
curl -i <MetadataUrl>
```

MCP route without a token, expect `401` with a `www-authenticate` header:

```bash
curl -i -X POST <McpUrl> -H 'content-type: application/json' -d '{}'
```

Lambda logs:

```bash
sam logs --stack-name focusbear-mcp-dev --tail
```

## What does not work yet

- **Tool calls.** `api-server` has no OAuth authorization, token or JWKS routes yet, so there is no real `OAuthIssuer` or `OAuthJwksUrl`, and no valid token can be issued. Until then the two checks above are the whole smoke test.
- **Backend calls.** The adapter returns `503 backend_delegation_unavailable` until `api-server` offers token exchange (`apps/mcp-server/src/adapter/backend.ts`).
- **Application logs.** The adapter writes one start-up line and nothing else, so only Lambda platform logs and API access logs exist.

## If the deploy fails

- **"decreases account's UnreservedConcurrentExecution below its minimum value".** The account's Lambda concurrency limit is below 120. Add `"ReservedConcurrency=-1"` to `parameter_overrides` in `samconfig.toml` and deploy again.
- **Budget permission error.** Remove the `AlertEmail` line and ask the account owner to create the budget.

## Remove the stack

From `infra/mcp`:

```bash
sam delete
```

## Decisions and open items

| Item | Value | Source |
| --- | --- | --- |
| Deployment tool | AWS SAM | Group 76 OAuth design, section 10 |
| Environments | dev only | Agreed with Nikolas, 4 Oct 2026 |
| Log retention | 14 days | Agreed with Nikolas, 4 Oct 2026 |
| Budget | US$10/month | Agreed with Nikolas, 4 Oct 2026 |
| Code deployed | default branch OAuth adapter | Confirmed by Krish, 4 Oct 2026 |
| Region | ap-southeast-2 | Recommended; waiting on Jeremy |
| AWS account | not decided | Waiting on Jeremy |
| `ApiServerUrl` for dev | not known | Waiting on Jeremy |
| Throttle 5 requests/s, burst 10 | starting value | Focusware proposal, section 10.1 |

This template has passed `cfn-lint` and `sam validate`, and the bundle was run locally. It has not been deployed to AWS yet.
