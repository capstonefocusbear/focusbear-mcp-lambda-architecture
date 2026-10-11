# Focus Bear MCP integration issue drafts

Prepared from `output/docx/Focus_Bear_MCP_API_Integration_Tasks.docx` and the local code review on 4 October 2026. Published repository: `albertnovellenabe/focusbear-mcp-lambda-architecture`.

Published with the user's authorization on the configured upstream because Issues are disabled on the `capstonefocusbear` repository. The published issues include GitHub dependency references.

| Work package | Published issue |
| --- | --- |
| 1 OAuth and task contract | [#4](https://github.com/albertnovellenabe/focusbear-mcp-lambda-architecture/issues/4) |
| 2 OAuth login | [#5](https://github.com/albertnovellenabe/focusbear-mcp-lambda-architecture/issues/5) |
| 3 Backend delegation | [#6](https://github.com/albertnovellenabe/focusbear-mcp-lambda-architecture/issues/6) |
| 4 API authorization and assignments | [#7](https://github.com/albertnovellenabe/focusbear-mcp-lambda-architecture/issues/7) |
| 5 Verification and AWS deployment | [#8](https://github.com/albertnovellenabe/focusbear-mcp-lambda-architecture/issues/8) |

The milestone is an authenticated MCP client signing in, listing an assigned task, reading it, changing its status, and verifying that the change persists in Focus Bear. Then complete notes, project statuses, and AWS deployment.

Validation completed: all 16 adapter tests and all 41 external-MCP API unit tests passed; MCP TypeScript checks passed. These checks use mocks and local test servers, and do not prove a live connection or deployed AWS state.

## Issue 1

**Title:** MCP: Agree the OAuth and task authorization contract

### Goal and current status

Agree the shared contract needed to connect the MCP adapter to the Focus Bear API. The adapter has five tools and verifies signed JWTs. The API has the task operations but expects opaque tokens, different scope names, an internal service key, and token-based assignments.

### Work

- Agree the issuer, JWKS URL, MCP resource audience, separate API audience, and user identity mapping.
- Decide whether to extend existing Auth0 authentication or provide a separate authorization server.
- Agree `mcp.tasks.read` / `mcp.tasks.write` and migration from `tasks:read` / `tasks:write`.
- Define a durable agent/grant identifier and migration or mapping from `assigned_mcp_token_id`.
- Select the first supported MCP client and register its exact redirect URI.
- Document token claims, delegation, five API routes, request/response shapes, and safe errors in shared fixtures.

### Acceptance criteria

- [ ] API and MCP developers use one agreed contract.
- [ ] Fixtures describe accepted values and rejection of wrong issuer, audience, scope, user, and agent/grant.
- [ ] Login, delegation, and task authorization work can proceed without guessing.

Suggested coordination: API lead and MCP developer. Complete first.

References: `apps/mcp-server/README.md`, `apps/mcp-server/src/adapter/{auth,backend,tools}.ts`, `apps/api-server/src/modules/external-mcp_fffff/`.

## Issue 2

**Title:** MCP: Implement OAuth login and secure prototype token issuance

### Goal and current status

Allow an approved MCP client to sign in and obtain a short-lived MCP access token. No MCP authorization-server metadata, PKCE login flow, consent, or token endpoint implementation was found in this checkout. The prototype token controller has `IsAuth` commented out and issues tokens for a hard-coded user.

### Work

- Implement or configure the authorization flow selected in Issue 1, including authorization-server metadata, authorization/token endpoints, PKCE S256, and consent.
- Validate registered public clients and exact redirect URIs.
- Provide RS256 tokens and JWKS matching the agreed MCP issuer, audience, subject, expiry, scopes, and grant identity.
- Secure or replace prototype token issuance, remove the hard-coded user, and remove or restrict test redirects and raw-token deep links.

### Acceptance criteria

- [ ] The approved client can sign in as the actual Focus Bear user and obtain an MCP access token.
- [ ] Invalid redirect URIs, wrong PKCE verifiers, reused authorization codes, and expired tokens are rejected.
- [ ] Token issuance cannot operate anonymously or issue credentials for the hard-coded test user.
- [ ] Tokens are not exposed in logs or redirect URLs.

Depends on Issue 1. Suggested owner: API authentication developer.

References: `apps/api-server/src/modules/external-mcp_fffff/controllers/external-mcp-auth.controller.ts`, `apps/api-server/src/modules/external-mcp_fffff/services/external-mcp-auth.service.ts`, `libs/auth0/`, `apps/mcp-server/src/adapter/auth.ts`.

## Issue 3

**Title:** MCP: Implement separate backend token delegation

### Goal and current status

Give the adapter a separate API credential for the authenticated user and agent/grant. The running adapter wires in `unavailableBackendCredentials`, which throws `backend_delegation_unavailable` before making a task API request. Setting `API_SERVER_URL` alone cannot enable task calls.

### Work

- Implement token exchange or the equivalent delegation agreed in Issue 1.
- Issue a separate API-audience credential bound to the authenticated user, grant, allowed scopes, and expiry.
- Implement `BackendCredentialProvider` and wire it into the adapter entry point.
- Reject invalid or revoked grants and prevent scope escalation.
- Keep the client MCP token separate from the credential sent to task API routes; do not forward it unchanged.

### Acceptance criteria

- [ ] A valid MCP token can obtain a distinct backend credential accepted by the API.
- [ ] Wrong audience, wrong user/grant, expired credentials, and scope escalation are rejected.
- [ ] Revoked grants cannot obtain further backend access; existing credential revocation/expiry behavior is documented and tested.
- [ ] Contract tests verify that task requests use the delegated credential and preserve request IDs without logging tokens.

Depends on Issues 1 and 2; coordinate with Issue 4. Suggested coordination: API authentication and MCP developers.

References: `apps/mcp-server/src/adapter/backend.ts`, `apps/mcp-server/src/adapter/backend.spec.ts`, `apps/mcp-server/src/main.ts`.

## Issue 4

**Title:** MCP: Authorize delegated API access and migrate agent assignments

### Goal and current status

Make the five task routes accept delegated OAuth credentials and authorize the user and durable agent/grant. The current API guards require opaque tokens plus an internal service key. Task access checks use `user_id` and `assigned_mcp_token_id`; project-status creation checks user membership but receives no agent identifier.

### Work

- Replace or explicitly map `assigned_mcp_token_id` to the durable identity agreed in Issue 1.
- Add delegated API credential validation and align scopes with the shared contract.
- Remove the internal-key dependency from the new OAuth path; define any retained legacy path explicitly.
- Enforce user, agent assignment, and read/write scope for list, get, status update, and notes.
- Define and enforce the authorized agent's project access for project-status creation.
- Validate custom status IDs against the task's project and preserve 404 behavior for missing or unassigned tasks.

### Routes

| Operation | Route | Scope |
| --- | --- | --- |
| List assigned tasks | `GET /mcp/tasks` | `mcp.tasks.read` |
| Get assigned task | `GET /mcp/tasks/:id` | `mcp.tasks.read` |
| Update status | `PATCH /mcp/tasks/:id/status` | `mcp.tasks.write` |
| Add note | `POST /mcp/tasks/:id/notes` | `mcp.tasks.write` |
| Ensure project status | `POST /mcp/tasks/project-statuses` | `mcp.tasks.write` |

### Acceptance criteria

- [ ] All five routes work with delegated credentials and agreed request/response shapes.
- [ ] Cross-user and cross-agent access fails; missing and unassigned tasks return 404.
- [ ] Read-only credentials cannot write, and unauthorized projects/custom statuses are rejected.
- [ ] Updates and notes persist; assignment migration and credential rotation behavior are tested.

Depends on Issue 1 and the credential contract in Issue 3. Suggested owner: task API developer.

References: `apps/api-server/src/modules/external-mcp_fffff/{controllers,guards,services}/`, `apps/api-server/src/modules/to-do/entities/to-do.entity.ts`, `apps/api-server/src/modules/to-do/repositories/to-do.repository.ts`, `apps/api-server/migrations/1773025000002-add-assigned-mcp-token-id-to-todo.ts`.

## Issue 5

**Title:** MCP: Verify the API connection and deploy the adapter to AWS

### Goal and current status

Prove the complete integration locally, then through a deployed dev endpoint. The current entry point exports a local HTTP handler, not a Lambda handler. `test-lambda.js` expects an older interface; Docker Compose has MCP commented out, and Docker packaging needs its build output/startup path checked. Deployed AWS resources were not inspected.

### Work

- Add contract/integration tests through the real HTTP boundary using the delegated credential provider and agreed API behavior.
- First demonstrate sign-in, list, get, and persisted status update against a dev account.
- Complete notes and project-status operations using the same authorization model.
- Mount the current HTTP handler in Lambda using the chosen web adapter or event bridge; update the old Lambda test.
- Expose `/mcp` and protected-resource metadata through API Gateway; verify host/origin handling, protocol headers, CORS where needed, and response behavior.
- Configure issuer, JWKS, MCP resource, and API origin per environment; verify packaging/startup paths.
- Correlate adapter/API failures with request IDs and redact tokens and private task data from operational logs.

### Acceptance criteria

- [ ] The approved MCP client completes OAuth and invokes all five tools against a dev Focus Bear account.
- [ ] Task status and notes are confirmed through the API or UI.
- [ ] Cross-user/cross-agent access, expired credentials, and insufficient scopes fail before unauthorized changes.
- [ ] Lambda/API Gateway smoke checks pass against the current source and packaging.
- [ ] Setup and demonstration steps are documented, and logs do not expose credentials or private task content.

Depends on Issues 2–4. Local contract work can begin after Issue 1; complete the local flow before AWS rollout. Suggested coordination: MCP and AWS developers.

References: `apps/mcp-server/src/main.ts`, `apps/mcp-server/src/adapter/http.ts`, `apps/mcp-server/Dockerfile.mcp`, `test-lambda.js`, `docker-compose.yml`, `apps/mcp-server/README.md`.
