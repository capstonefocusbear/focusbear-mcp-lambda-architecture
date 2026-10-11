# OAuth and task authorization contract v1

Prepared for [issue #4](https://github.com/albertnovellenabe/focusbear-mcp-lambda-architecture/issues/4).
Status: implementation proposal, ready for API and MCP owner review. This records
decisions for #5–#7; it does not assert team agreement, deployed endpoints, client
registration in a running server, or working OAuth. `fixtures.json` is the shared,
language-independent acceptance input. Runtime code must consume these vectors in
the subsequent implementation issues; passing today's prototype tests is not proof
of v1 conformance.

## Authority, environments, and first client

Use a Focus Bear authorization server hosted by `api-server`. Reuse Auth0 for user
login, then resolve the authenticated Auth0 subject through the existing user
mapping to `users.id`. Auth0 ID tokens and Auth0 API tokens are not MCP credentials.
The Focus Bear server owns consent, grant storage, PKCE, signing, and exchange.
This follows the repository's architectural design and avoids assuming Auth0
configuration supports the required delegation and durable assignments.

The exact local profile below is normative for integration tests. These endpoints
are to be implemented in #5/#6; they are not existing routes. Deployed profiles
must use HTTPS and replace all local URLs together. API and MCP owners must record
the actual dev/production profile before enabling traffic. No production hostname
or Auth0 tenant was established by this issue.

| Value                                        | Local profile                                                  |
| -------------------------------------------- | -------------------------------------------------------------- |
| Issuer (`iss`, `OAUTH_ISSUER`)               | `http://127.0.0.1:5038/` (trailing slash required)             |
| Authorization metadata                       | `http://127.0.0.1:5038/.well-known/oauth-authorization-server` |
| JWKS (`OAUTH_JWKS_URL`)                      | `http://127.0.0.1:5038/.well-known/jwks.json`                  |
| Authorization endpoint                       | `http://127.0.0.1:5038/oauth/authorize`                        |
| Token / exchange endpoint                    | `http://127.0.0.1:5038/oauth/token`                            |
| MCP resource / audience (`MCP_RESOURCE_URL`) | `http://127.0.0.1:5039/mcp`                                    |
| Protected-resource metadata                  | `http://127.0.0.1:5039/.well-known/oauth-protected-resource`   |
| Backend origin (`API_SERVER_URL`)            | `http://127.0.0.1:5038/`                                       |
| API resource / audience                      | `http://127.0.0.1:5038/mcp/tasks`                              |

Select **MCP Inspector v2 CLI** as the first integration client, using Streamable
HTTP and its configurable loopback callback. Pre-register the public client
`focusbear-inspector-local` with exactly
`http://127.0.0.1:6276/oauth/callback`, authorization-code grant, response type
`code`, and `token_endpoint_auth_method=none`. No wildcard, alternate host, port,
path, query, or trailing slash is accepted. The registry entry in the fixture is
the registration source for #5; it has not been applied to a server. Pin the
validated Inspector release during #8's demonstration and configure its existing
client ID explicitly. Dynamic registration and client metadata URLs are outside
the initial client profile.

Authorization requests carry `client_id`, exact `redirect_uri`, `response_type=code`,
`resource` equal to the MCP audience, explicit requested scopes, random `state`,
and `code_challenge_method=S256`. Consent binds user, client, scopes, and grant.
Codes expire after 60 seconds, are single use, and bind the redirect URI, resource,
client, grant, and challenge. The code exchange requires the matching verifier.
Never return access tokens through browser redirect/deep-link URLs. No refresh
tokens in v1; reauthorize after expiry, reusing the same active grant where the
user explicitly selects it. Production client registration is a separate gate.

## Token claims and identities

Both credentials are signed RS256 JWTs using configured JWKS, header `kid`, and
`typ=at+jwt`. Reject other algorithms, untrusted signing keys, or attacker-provided
key URLs. Claims are required unless noted:

| Claim        | Meaning                                                                            |
| ------------ | ---------------------------------------------------------------------------------- |
| `iss`        | Exact environment issuer; do not normalize an incoming token                       |
| `aud`        | One string, exactly the receiving resource; reject multi-audience arrays           |
| `sub`        | Existing Focus Bear `users.id` UUID; never email or raw Auth0 subject              |
| `client_id`  | Registered public client ID for the MCP token; adapter client ID for the API token |
| `grant_id`   | UUID of a durable, server-created consent/assignment grant                         |
| `scope`      | Space-delimited subset of `mcp.tasks.read mcp.tasks.write`; no scope implication   |
| `iat`, `exp` | Integer NumericDates; MCP lifetime <=300 seconds; API lifetime <=60 seconds        |
| `jti`        | Unique token identifier; changes on every issuance, never an assignment ID         |
| `nbf`        | Optional integer NumericDate; reject before this time                              |
| `act.sub`    | API token only: authenticated adapter client `focusbear-mcp-adapter`               |

Use zero clock tolerance for the local contract. Reject future `iat`, `exp <= now`,
`exp <= iat`, excessive lifetime, malformed required claims, unknown/deleted users,
unknown/revoked grants, and grants whose `user_id` differs from `sub`. An MCP grant
must also match the token's registered originating client. The API token's actor
must match its adapter `client_id`; exchange verifies the grant's originating
client separately. Never infer a grant from a token's `jti`, a client ID, agent
display name, email, or caller-provided user/agent fields.

`grant_id` is the durable agent assignment identity in v1: one user + client +
named agent consent record. Multiple agents using the same client receive separate
grants. A grant is unchanged by access-token rotation or signing-key rotation.
Revocation is terminal for that grant; new consent after revocation gets a new ID
and requires reassignment. The authorization server checks grant state at issuance
and exchange; the task API checks current grant state on every request, so API
access stops immediately after committed revocation even for unexpired JWTs.
The adapter's offline JWT check alone does not promise immediate revocation of
initialization or tool listing; exchange/API checks prevent further task access.
Grant-store outages fail closed with 503. No credential or authorization cache
may extend these rules. Signing-key overlap must cover issued token lifetimes;
the existing adapter's public-key cache is 600 seconds.

## Delegation

Use [RFC 8693 token exchange](https://www.rfc-editor.org/rfc/rfc8693.html) at the
token endpoint. The adapter authenticates as a confidential service client using
`private_key_jwt` (registered public key, token endpoint audience, <=60 second
assertion, unique replay-checked `jti`). The public Inspector client is not allowed
to perform exchange. Adapter keys never belong in client configuration or fixtures.

The form request is described in `fixtures.json`; `subject_token` is the verified
MCP access token, never an ID token. Its `resource` is exactly the API resource.
Requested scopes must be a subset of both the subject token and the active grant;
reject escalation rather than silently broadening. A write-only token cannot
read. The issued API token preserves `sub` and `grant_id`, identifies the adapter
as actor, and expires no later than the MCP token and 60 seconds after issuance.
The response uses `issued_token_type=urn:ietf:params:oauth:token-type:access_token`,
`token_type=Bearer`, `expires_in`, `scope`, and `access_token`.

Send only the resulting API token to the five task routes, with `x-request-id`.
Never forward the MCP token unchanged, issue a dual-audience token, or send
`x-user-id`, an assignment header, or `X-Internal-Service-Key` on the OAuth path.
The API must verify the signature and all API claims independently and derive its
authorization context from trusted claims and the grant record. Issue #6 must
extend the provider interface beyond a subject string to preserve grant, scopes,
actor and expiry; the exchange server remains authoritative. Redirects on backend
requests are forbidden. Retry transport failures at most once for reads; never
automatically retry notes or status writes.

## Legacy migration

OAuth tokens accept only the new scope names. Translate `tasks:read` to
`mcp.tasks.read` and `tasks:write` to `mcp.tasks.write` only during an explicit,
authenticated migration of an existing legacy token record; do not let JWT guards
accept aliases. Unsupported legacy scopes require new consent.

Add `assigned_mcp_grant_id` and a grant store with user, originating client,
agent label, scopes, creation and revocation timestamps. Use an explicit
owner-confirmed mapping from `(legacy token ID, user ID)` to a grant ID. Never
merge agents by label or bulk-convert bearer token possession to consent. Copy an
assignment only if the task, legacy record, and grant have the same user; leave
unmapped, deleted, expired, or mismatched records unavailable to OAuth. Repeatable
backfill must not overwrite a later explicit reassignment. Audit counts and
conflicts without raw tokens. Migrated records must retain their identity mapping
after deletion of legacy token secrets.

During transition the OAuth query uses only `(user_id, assigned_mcp_grant_id)`;
the legacy path uses only `(user_id, assigned_mcp_token_id)` and its opaque token
plus internal key. Select credential type explicitly and never fall back to legacy
after failed JWT validation. Retain the deprecated PUT alias only on the documented
legacy path. Disable legacy issuance before rollout and retire that path after
owners verify migration. Schema/backfill implementation belongs to #7.

## Five API operations

All paths below are fixed and relative to the configured backend origin. Reject
unknown body/query fields and identity, URL, method, path or header overrides.
UUID path/project arguments are validated before queries. Read and write scopes
are independent. Scope failures are 403; missing/unassigned tasks are identical
404s. List filters by both subject and grant before pagination/counting. Reads
and writes recheck current user/grant/assignment; writes check inside the same
transaction as the mutation to prevent reassignment races.

| MCP tool                                | Method and route                   | Scope             | Inputs / result                                                |
| --------------------------------------- | ---------------------------------- | ----------------- | -------------------------------------------------------------- |
| `focusware_list_assigned_tasks`         | `GET /mcp/tasks`                   | `mcp.tasks.read`  | `page`, `take`, `status` / paginated tasks                     |
| `focusware_get_assigned_task`           | `GET /mcp/tasks/:id`               | `mcp.tasks.read`  | `task_id` UUID / task                                          |
| `focusware_update_assigned_task_status` | `PATCH /mcp/tasks/:id/status`      | `mcp.tasks.write` | `task_id`, `status` and/or `custom_status_id` / persisted task |
| `focusware_add_assigned_task_note`      | `POST /mcp/tasks/:id/notes`        | `mcp.tasks.write` | `task_id`, `content` / persisted note                          |
| `focusware_ensure_project_status`       | `POST /mcp/tasks/project-statuses` | `mcp.tasks.write` | project-status input / status and `already_existed`            |

List defaults: page 1, take 10. Bounds: integer page 1–10000, take 1–50.
Optional status is `NOT_STARTED`, `IN_PROGRESS`, or `COMPLETED`. Keep the existing
SMART descending ranking, with task ID as a deterministic tie-breaker. HTTP query
integers are decimal strings; MCP tool arguments are JSON numbers. List returns
`data` and `meta` with `page`, `take`, `itemCount`, `pageCount`, `hasPreviousPage`,
`hasNextPage`; `itemCount` counts only authorized filtered tasks.

A task response has `id`, `title`, `status`, plus optional nullable `details`,
`objective`, `custom_status_id`, `project_id`, `due_date`, `created_at`, `updated_at`.
Dates are ISO 8601 strings. Do not expose entity relations, token IDs, user metadata,
or encryption internals. The target API response is the same projection the MCP
adapter exposes; current full-entity responses must be replaced in #7.

Status update requires at least one nonempty field. Core status uses the enum above;
custom status is a string of 1–100 characters (existing IDs such as `default-done`
are not UUIDs). It must exist on the assigned task's current project; otherwise 400.
When custom status is supplied, `should_complete_task=true` sets core status to
`COMPLETED`; otherwise an explicit core status is applied, or the existing core
status is preserved. A conflicting explicit non-completed core status with a
completing custom status returns 400. Core-only changes clear `custom_status_id`
to avoid a stale contradictory badge. Notes contain 1–10000 characters and return
`id`, `task_id`, `content`, `created_at`; derive note author from `sub`.

Project-status input is `project_id` UUID, `label` 1–100 characters, `color` matching
`^#[0-9a-fA-F]{6}$`, optional boolean `should_complete_task` default false. Require
both current owner/accepted membership AND at least one current task in that
project assigned to `(sub, grant_id)`. Return 404 if either condition fails,
including missing projects. Deduplicate labels case-insensitively under a project
lock; return existing status unchanged or append a new status. Result fields are
`id`, `label`, `color`, `order`, `should_complete_task`, `already_existed`. This
operation changes a shared project; grant consent must describe that permission.
Success statuses: GET/PATCH 200, note POST 201, project-status POST 200 for both
existing and new status. Fixtures show all five HTTP request/response pairs.

## Safe failures and fixture use

API errors have `{ "code": "...", "request_id": "..." }`, with a server-generated
request ID when the supplied ID is missing or invalid (accept only UUIDs).
Do not include resource IDs, backend messages, database errors, tokens or private
task content. MCP tool errors expose the same two fields inside text content and
set `isError=true`. Protocol/authentication errors occur before tool invocation.

| API HTTP                     | API code             | Adapter tool code      |
| ---------------------------- | -------------------- | ---------------------- |
| 400                          | `bad_request`        | `bad_request`          |
| 401                          | `invalid_token`      | `backend_unauthorized` |
| 403                          | `insufficient_scope` | `backend_forbidden`    |
| 404                          | `not_found`          | `not_found`            |
| 409                          | `conflict`           | `conflict`             |
| 429                          | `rate_limited`       | `rate_limited`         |
| 503 (including upstream 5xx) | `unavailable`        | `backend_unavailable`  |

Adapter transport failures map to `backend_transport_error`; malformed/oversized
successful backend bodies map to `bad_backend_response`; missing delegation maps
to `backend_delegation_unavailable`. MCP 401 challenges identify protected-resource
metadata and use `invalid_token` for invalid credentials; insufficient scope uses
403 and a Bearer challenge with `error=insufficient_scope` and required scope.
Exchange errors use OAuth envelopes: invalid subject/grant is `invalid_grant`,
wrong resource is `invalid_target`, escalation is `invalid_scope`, invalid service
authentication is `invalid_client`. These envelopes must never echo submitted tokens.

Fixture tokens are **decoded claims only**, not credentials. `now` is a fixed test
clock. Each rejection vector replaces the stated base claims/context; it is not a
JWT signature test. #5/#6 sign test tokens with generated keys and add PKCE, code
replay, signature, key rotation and service-assertion replay tests. #7 executes
task vectors against the real guard/service/database boundary, including rotation,
revocation, migration and assignment races. #8 runs the same shapes through HTTP
and the selected client. Do not implement a test-only verifier and call that proof
of runtime enforcement.

## Handoff and review gates

- #5: implement this authorization-server/client profile and MCP claims; remove
  anonymous hard-coded-user token issuance. Validate fixture login rejection cases.
- #6: implement authenticated exchange and a separate backend provider; validate
  scope narrowing, actor, subject/grant binding, expiry and revocation.
- #7: implement API JWT context, grant storage/mapping, five DTO projections and
  transactional authorization; validate all task and migration cases.
- #8: pin and demonstrate Inspector, record deployed HTTPS environment values and
  actual registrations, then verify persistence and AWS packaging.
- API and MCP owners review the authority, grant lifecycle, project permission,
  migration and status semantics here. Record names/date and any changes in this
  contract before treating #4 as agreed. No approval or issue closure is implied.

References: [MCP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization),
[JWT access-token profile](https://www.rfc-editor.org/rfc/rfc9068.html),
[Inspector callback configuration](https://github.com/modelcontextprotocol/inspector/blob/main/docs/environment-variables.md).
