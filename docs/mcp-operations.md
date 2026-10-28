# MCP Auth0 v2 operations

The runnable infrastructure source lives in `infra/mcp/cdk`. It uses a regional API Gateway REST API, Lambda container with AWS Lambda Web Adapter, reserved concurrency 10, 30-day application/access logs, throttling 5 requests/second with burst 10, and five alarms. Production includes regional WAF and an ACM-backed custom domain. No Lambda database/network connection or OAuth signing secret is required. Backend calls carry the original bearer token.

This is a portable package, awaiting review/integration in the inaccessible `Focus-Bear/aws-infra` repository. Neither production deployment nor real Auth0 configuration changes have been performed. The archived SAM files are v1 only.

## Reproducible image and infrastructure

The Dockerfile pins Node and Web Adapter versions. Build once for `linux/amd64`, publish it to each environment's ECR registry, record its SHA256 digest, and pass that digest to CDK. A tag is not the deployment identity. Compose direct mode and LocalStack Lambda use the same Dockerfile/image; production consumes the same built image digest. Registry copies must retain the digest. The CDK stack references an existing ECR image and creates no image build assets or bootstrap bucket dependency. Do not run the old SAM build/deploy commands.

```bash
npm --prefix infra/mcp/cdk ci --ignore-scripts
npm --prefix infra/mcp/cdk test
(cd infra/mcp/cdk && npm exec -- cdk synth -c profile=production)
```

Production CloudFormation parameters: `ImageRepository`, `ImageDigest`, `OAuthIssuer`, `OAuthJwksUrl`, `McpResourceUrl`, `McpAllowedClientIds`, `McpTokenProfile`, `ApiServerUrl`, `DomainName`, `CertificateArn`. Resource must be the canonical HTTPS `/mcp` audience, backend must be HTTPS, issuer must have its trailing slash, and JWKS must belong to that issuer. All components default to Auth0 token profile with `azp` and enforce a 900-second maximum issued lifetime. RFC9068 is a separate explicit profile, with `client_id`/`at+jwt` requirements.

The production domain is constrained to a subdomain of `aws.focusbear.io`. Supply an ACM certificate in the REST API's region, create DNS using the `DomainTarget` output, validate certificate/DNS ownership and ensure `McpResourceUrl` matches the custom hostname exactly. Subscribe and confirm an incident destination on the `AlarmTopicArn` before release. WAF sampling and API body/header tracing are disabled. Lambda errors and gateway 5xx are monitored separately, plus gateway p95, throttles and logged backend 5xx. Rate limits and WAF are initial abuse controls, not a shared user quota; backend authorization owns that quota.

## Local integration

Prerequisites: Node 22, Docker Engine with Compose v2, AWS CLI v2, the infrastructure package dependencies, a configured backend `.env`, and a **development** Auth0 tenant/client. `.env` must contain working normal backend settings (database credentials below override the corresponding local fields). No local Auth0 simulator or credential seeder is provided. Use a real development tenant and a backend user already registered with matching `users.auth0_id`; standard app signup/login is the supported provisioning flow. Do not invent a UUID or use a machine token as a user token.

```bash
cp .env.mcp.example /tmp/focusbear-mcp.env
# Edit the placeholders in /tmp/focusbear-mcp.env and configure backend .env.
export MCP_ENV_FILE=/tmp/focusbear-mcp.env
npm --prefix infra/mcp/cdk ci --ignore-scripts
bash scripts/mcp-local.sh up
# On a fresh disposable database, build/migrate using normal repository commands:
docker compose --env-file "$MCP_ENV_FILE" -f docker-compose.mcp.yml exec api-server npm run migration:up
bash scripts/mcp-local.sh direct
bash scripts/mcp-local.sh smoke
# Deploy that same Dockerfile through ECR/CloudFormation to LocalStack:
bash scripts/mcp-local.sh deploy
```

The `up` command may leave the backend restarting until its database schema/environment is ready. The database and Redis have no host ports; backend, direct adapter and LocalStack ports bind only to loopback. All containers including Lambda join `focusbear-mcp`; adapter backend URL is `http://api-server:4000`. Explicit local HTTP is permitted only outside production. Docker socket access gives LocalStack host Docker control; use this disposable development environment only.

The script always supplies `--endpoint-url http://127.0.0.1:4566`, uses dummy credentials, clears inherited profiles/role credentials, checks emulator account `000000000000`, and refuses non-local ECR output before pushing. No real AWS deploy fallback exists. `deploy` synthesizes the local CDK profile and uses the generated CloudFormation template directly, without CDK bootstrap. The image is uploaded first and referenced by the emulator's image digest. AWS CLI and Docker errors stop the command. If LocalStack requires a registry auth/insecure-registry Docker setting on your platform, configure it only for the displayed local registry, never a wildcard registry.

LocalStack is pinned to `4.9.2`. Availability of Lambda container images, ECR, API Gateway REST and CloudFormation behavior depends on emulator edition/entitlement. Set `LOCALSTACK_AUTH_TOKEN` only if your entitlement requires it. A paid edition may be necessary. No successful emulation is claimed until this exact profile runs. WAF/custom domain/ACM are intentionally production-only and cannot be certified by the local profile; production alarms, X-Ray, IAM, certificate and DNS need Focus Bear-run production canary verification. If the pinned emulator does not support a resource, record the exact error; use `direct` for application tests while arranging the required emulator edition. Do not substitute real AWS.

From `deploy` outputs identify the REST API ID. Invoke the Lambda integration through the local gateway, retaining canonical resource identity:

```bash
export MCP_SMOKE_URL=http://127.0.0.1:4566/restapis/REPLACE_API_ID/local/_user_request_/mcp
bash scripts/mcp-local.sh smoke
```

The smoke sends canonical Host from `MCP_RESOURCE_URL`; discovery resource identity must equal it. Verify gateway Host behavior against the application allowlist before acceptance; never permit arbitrary forwarded Host. Direct and gateway tests are separate gates. Local API Gateway URL formats differ across emulator versions; if `_user_request_` routing is unsupported, use the emulator's documented REST invocation URL and record it. `MCP_SMOKE_URL` is restricted to local HTTP by the smoke runner.

To remove only this disposable Compose project's containers and database volume:

```bash
bash scripts/mcp-local.sh reset
```

## Auth0 operator configuration and live acceptance

1. In a development tenant, create/verify a distinct custom API identifier equal to the canonical `MCP_RESOURCE_URL` (`/mcp` included). Keep the normal API audience separate. Enable RS256, access-token lifetime at most 900 seconds, and only the required MCP scopes. Copy issuer/JWKS exactly. Configure separate production values through the real infrastructure repository later.
2. Register approved public clients with authorization code + PKCE S256, exact redirect URLs and no embedded client secret. Enable rotating refresh tokens/reuse detection when offline access is approved. Enable Auth0 Resource Parameter Compatibility Profile and Include Issuer in the Authorization Response as required by the approved design. Configure API user consent/grants so the access token contains the required scopes and exact MCP audience. Do not add machine-to-machine grants for the user flow. Add each approved client ID to both resource validators' allowlists. Confirm the tenant's token profile matches `MCP_TOKEN_PROFILE`.
3. Sign in through an approved client with the OAuth `resource` parameter equal to the MCP API and requested MCP scopes. Complete PKCE on the client's registered callback. Capture the **access token**, not the ID token, in a temporary shell variable `MCP_ACCESS_TOKEN`; never put it in command-line URLs, logs, git or screenshots. Request at least `mcp.tasks.read`, then run `bash scripts/mcp-local.sh smoke` with direct and gateway targets; authenticated smoke includes a backend assigned-task read. Without a token, the script explicitly reports authenticated checks as NOT RUN.
   For the repository's interactive PKCE fixture, set a canonical HTTPS development resource URI in the local config (the direct smoke still invokes loopback using `MCP_SMOKE_URL=http://127.0.0.1:5039/mcp`). Register callback `http://127.0.0.1:6276/oauth/callback`, export `MCP_TEST_CLIENT_ID` and `MCP_TEST_CALLBACK`, then run `node scripts/test-mcp-auth0-login.cjs` using its documented environment. This workflow exercises resource discovery, PKCE, assigned-task read/summary, rotating refresh, revoke and rejection. Do not request `openid` in this MCP test flow because an added userinfo audience conflicts with exact-audience validation. It requires real tenant/user participation and does not run without configuration. Unit checks are `node --test scripts/mcp-auth0-login.test.cjs`.

4. Exercise an authenticated `tools/call` with matching `mcp-protocol-version`, `mcp-method` and `mcp-name` headers; read/update an assigned task, then verify backend persisted values. Verify the created durable connection in the dashboard. Disable it and confirm subsequent tool access fails. Reconnect through the authorized management route and confirm another user cannot manage it or assign their task to it. Verify legacy tokens/connections still function.
5. Confirm invalid/expired/wrong-audience/wrong-client/ID/machine tokens fail, missing scopes fail, cross-user IDs fail, disabled connections fail and a normal API token never authorizes MCP. Test concurrent first calls and requests across at least two adapter instances to verify durable identity and shared per-user limits. Test refresh-token rotation, reuse rejection, logout/revocation lifecycle and clock behavior using the real client/tenant. These are operator-run gates, not smoke-test coverage.
6. In a Focus Bear-run production canary on the reviewed production stack (do not create an AWS development or staging stack), verify custom domain discovery and TLS, all protocol headers through API Gateway/Web Adapter, WAF blocks, concurrent execution limit, retained logs/redaction, backend outage/timeout, alarms and confirmed notification delivery. Verify rollback before production approval. Only a human may approve or merge a PR.

## Rollback

Record the prior image digest, configuration parameters and backend migration before rollout. Roll the Lambda back by redeploying the reviewed infrastructure with the previous digest and compatible parameters. Preserve retained log groups and additive connection/assignment data; do not auto-revert migrations containing user data. Disable MCP Auth0 routing through the backend feature flag if isolation is required while preserving legacy authentication. Restore/re-enable only after investigating token/backend failures. The local reset command is never a production rollback command.

Implementation references: [AWS Lambda Web Adapter releases](https://github.com/aws/aws-lambda-web-adapter/releases), [LocalStack Lambda documentation](https://docs.localstack.cloud/aws/services/lambda/) and [LocalStack ECR documentation](https://docs.localstack.cloud/aws/services/ecr/). Emulator entitlements and networking must be checked against the pinned release.

## Synthetic data and dashboard acceptance

The existing repository seeder can create synthetic backend users/tasks on a **fresh disposable local database** after migrations. From the Compose backend container, run `npm run seed` with `AUTH0_TEST_USER_ID` set to the exact subject of the approved development Auth0 user. Run it once per fresh disposable volume; it is not an idempotent production provisioning command. It also seeds the repository's other test fixtures. The seeded user is `2636a216-f363-493e-aeb8-d275a0a9016d`. This does not create an Auth0 account or issue credentials. Use the development tenant account to complete OAuth and create its agent connection, then explicitly assign synthetic tasks to that agent through the normal API/dashboard using `assigned_mcp_agent_id`.

The backend adds both assignment fields and returns durable IDs/status in `/mcp/auth/agents`. The frontend dashboard is outside this repository: its OAuth dropdown selection must send `assigned_mcp_agent_id`, while legacy selections continue sending `assigned_mcp_token_id`. Verify display names, selected values, disconnect/reconnect and linking against that frontend before launch. Legacy rows/IDs stay intact; linking is an explicit owner action, never a name match.

## Automated checks and evidence

Run `npm run mcp:check`, `npm run mcp:test -- --forceExit`, `npm run mcp:test:backend -- --forceExit`, `npm run mcp:test:login-client`, and `npm --prefix infra/mcp/cdk test`. Runtime Jest transpilation is separated from the two source typechecks to avoid retaining the complete Nest/SDK/Zod type graph per suite.

The real PostgreSQL acceptance suite is `npm run mcp:test:db -- --forceExit`. It runs only with an explicit disposable loopback `MCP_DATABASE_TEST_URL`; otherwise it is reported as skipped. The MCP v2 GitHub workflow supplies an isolated PostgreSQL service and executes the migration/backfill, concurrency, ownership, linking, naming and revocation tests there. That workflow has been authored locally; a GitHub run is required to establish its result.

Local implementation verification also executed the actual migration/trigger and connection-service SQL in a temporary PostgreSQL WASM engine (PGlite 0.3.14), including assignment transitions and revocation revisions. This supplements SQL/migration checking; it does not prove multi-process PostgreSQL locking or substitute for the real database suite.
