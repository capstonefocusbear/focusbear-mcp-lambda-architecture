# Plan: Create an MCP Server to Allow OpenClaw to Access Tasks for a User

**Issue:** [#1719](https://github.com/Focus-Bear/backend/issues/1719)  
**Planned by:** Monk of Modularity 🧘  
**Status:** Ready for Captain Codebeard

---

## 1. Problem Summary

Users want to connect their Focus Bear account to OpenClaw and grant **scoped access** to their data — initially tasks (to-dos), with potential for future extension to focus sessions. Once connected:

- The user adds tasks to an OpenClaw project from within Focus Bear
- OpenClaw can read those tasks
- OpenClaw can update task status and add notes

This requires:
1. **Backend changes** — OAuth-style authorization flow, a new `openclaw_tokens` table, and MCP-compatible API endpoints
2. **Frontend changes** — permission setup UI (out of scope for this repo but noted)
3. **OpenClaw MCP server** — a server that speaks MCP protocol and calls the Focus Bear API

---

## 2. Proposed Approach

### Architecture Overview

```
Focus Bear Frontend (new UI)
  └── User clicks "Connect OpenClaw" → OAuth-style consent flow
        └── POST /openclaw-mcp/auth/authorize
              → generates scoped access token (scope: tasks | focus-sessions)
              → stores in openclaw_tokens table
              → returns token to user (they add it to OpenClaw settings)

OpenClaw (MCP server, runs on user's machine or VPS)
  └── MCP Tool: focusbear_list_tasks
  └── MCP Tool: focusbear_update_task
  └── MCP Tool: focusbear_add_note
        └── HTTP calls to Focus Bear backend
              Authorization: Bearer <openclaw_access_token>
              → validated against openclaw_tokens table
```

### Why a dedicated token table (not re-use `platform_integrations`)?

`platform_integrations` is for _Focus Bear_ connecting to _external_ platforms (Asana, Jira, etc.). This is the **inverse** — an external system (OpenClaw) connecting to Focus Bear. A separate `openclaw_tokens` entity with explicit scopes keeps concerns clean.

### Token model

```
openclaw_tokens:
  id (uuid, PK)
  user_id (uuid, FK → users)
  token_hash (varchar) — bcrypt hash of the raw token, never stored in plaintext
  scopes (varchar[]) — ['tasks', 'focus-sessions'] etc.
  label (varchar) — user-given name, e.g. "My OpenClaw"
  last_used_at (timestamptz, nullable)
  expires_at (timestamptz, nullable) — null = no expiry
  created_at / updated_at
```

### Scopes (v1)

| Scope | Allows |
|---|---|
| `tasks:read` | Read user's to-do list |
| `tasks:write` | Update task status, add notes |
| `focus:start` | Start a focus session (future) |

---

## 3. Files to Create / Modify

### New Module: `apps/api-server/src/modules/openclaw-mcp/`

Following the existing NestJS module pattern (controller → service → repository → entity → DTO):

```
apps/api-server/src/modules/openclaw-mcp/
├── openclaw-mcp.module.ts
├── controllers/
│   ├── openclaw-mcp-auth.controller.ts    ← token issuance / revocation
│   └── openclaw-mcp-tasks.controller.ts   ← MCP-facing task endpoints
├── services/
│   ├── openclaw-mcp-auth.service.ts
│   └── openclaw-mcp-tasks.service.ts
├── repositories/
│   └── openclaw-token.repository.ts
├── entities/
│   └── openclaw-token.entity.ts
├── dto/
│   ├── create-openclaw-token.dto.ts
│   ├── openclaw-token-response.dto.ts
│   ├── update-task-status.dto.ts
│   └── add-task-note.dto.ts
├── guards/
│   └── openclaw-token.guard.ts            ← validates Bearer token against DB
└── domain/
    └── openclaw-scopes.enum.ts
```

### Modified Files

| File | Change |
|---|---|
| `apps/api-server/src/app.module.ts` | Import and register `OpenclawMcpModule` |
| Database migrations | New migration for `openclaw_tokens` table |

---

## 4. Pseudocode / Interface Sketches

### Entity: `openclaw-token.entity.ts`

```typescript
@Entity('openclaw_tokens')
class OpenclawToken extends BaseEntity {
  @Column({ type: 'uuid' }) user_id: string
  @Column({ type: 'varchar' }) token_hash: string        // bcrypt hash
  @Column({ type: 'varchar', array: true }) scopes: string[]
  @Column({ type: 'varchar', nullable: true }) label: string
  @Column({ type: 'timestamptz', nullable: true }) last_used_at: Date
  @Column({ type: 'timestamptz', nullable: true }) expires_at: Date
  @ManyToOne(() => User, ...) user: User
}
```

### Controller: `openclaw-mcp-auth.controller.ts`

```typescript
@Controller('openclaw-mcp/auth')
@ApiTags('openclaw-mcp-auth')
class OpenclawMcpAuthController {

  // Requires user to be logged in with Focus Bear account (IsAuth guard)
  // Requested by the frontend during the connection setup flow
  @Post('tokens')
  @UseGuards(IsAuth)
  async issueToken(
    @AuthContext() { user }: Passport,
    @Body() dto: CreateOpenclawTokenDto  // { scopes: string[], label: string }
  ): Promise<OpenclawTokenResponseDto>
  // → generates cryptographically random token
  // → stores bcrypt hash in DB
  // → returns { token: '<raw token - shown ONCE>', label, scopes, id }

  // List user's active OpenClaw connections (for settings UI)
  @Get('tokens')
  @UseGuards(IsAuth)
  async listTokens(@AuthContext() { user }: Passport): Promise<OpenclawTokenResponseDto[]>
  // → returns list WITHOUT raw tokens (label, scopes, id, last_used_at only)

  // Revoke a token (user disconnects OpenClaw)
  @Delete('tokens/:id')
  @UseGuards(IsAuth)
  async revokeToken(
    @Param('id') id: string,
    @AuthContext() { user }: Passport
  ): Promise<void>
}
```

### Controller: `openclaw-mcp-tasks.controller.ts`

```typescript
// Uses OpenclawTokenGuard instead of IsAuth — authenticated via Bearer token from openclaw_tokens
@Controller('openclaw-mcp/tasks')
@ApiTags('openclaw-mcp-tasks')
@UseGuards(OpenclawTokenGuard)
class OpenclawMcpTasksController {

  @Get()
  // Required scope: tasks:read
  async listTasks(
    @OpenclawUser() userId: string,
    @Query() query: GetToDosQueryDto
  ): Promise<ToDoResponse[]>

  @Put(':id/status')
  // Required scope: tasks:write
  async updateTaskStatus(
    @OpenclawUser() userId: string,
    @Param('id') taskId: string,
    @Body() dto: UpdateTaskStatusDto   // { status: ToDoStatus }
  ): Promise<ToDoResponse>

  @Post(':id/notes')
  // Required scope: tasks:write
  async addNote(
    @OpenclawUser() userId: string,
    @Param('id') taskId: string,
    @Body() dto: AddTaskNoteDto         // { content: string }
  ): Promise<TaskComment>
}
```

### Guard: `openclaw-token.guard.ts`

```pseudocode
class OpenclawTokenGuard implements CanActivate:

  canActivate(context):
    request = context.switchToHttp().getRequest()
    authHeader = request.headers.authorization
    if not authHeader or not startsWith('Bearer '):
      throw UnauthorizedException

    rawToken = authHeader.split(' ')[1]

    // Look up by token_hash using bcrypt.compare against candidate tokens
    // IMPORTANT: store a prefix/hash-prefix for efficient lookup (see open questions)
    token = await openclawTokenRepository.findByToken(rawToken)

    if not token:
      throw UnauthorizedException('Invalid or expired token')

    if token.expires_at and token.expires_at < now():
      throw UnauthorizedException('Token expired')

    // Attach user_id and scopes to request for use in controllers
    request.openclawUserId = token.user_id
    request.openclawScopes = token.scopes

    // Update last_used_at asynchronously (don't block response)
    openclawTokenRepository.updateLastUsed(token.id)

    return true
```

### Service: `openclaw-mcp-auth.service.ts`

```pseudocode
issueToken(userId, { scopes, label }):
  rawToken = crypto.randomBytes(32).toString('hex')  // 64-char hex token
  hash = bcrypt.hash(rawToken, 10)
  // Store prefix (first 8 chars) for efficient DB lookup later
  prefix = rawToken.substring(0, 8)
  entity = new OpenclawToken({ user_id: userId, token_hash: hash, token_prefix: prefix, scopes, label })
  saved = await repository.save(entity)
  return { id: saved.id, token: rawToken, label, scopes }  // raw token shown once

findByToken(rawToken):
  prefix = rawToken.substring(0, 8)
  candidates = await repository.findByPrefix(prefix)
  for candidate in candidates:
    if bcrypt.compare(rawToken, candidate.token_hash):
      return candidate
  return null
```

### OpenClaw MCP Server (standalone, NOT in this repo)

> This lives in the OpenClaw skill/plugin system, not the NestJS backend. Documented here for Codebeard's awareness.

```pseudocode
// MCP server definition (to be built as OpenClaw skill or standalone Node.js MCP server)

Tools:
  focusbear_list_tasks:
    description: "List tasks from the user's Focus Bear account"
    input_schema:
      status: enum[pending, in_progress, done, all]  optional
      limit: integer  optional, default 20
    handler:
      GET https://api.focusbear.io/openclaw-mcp/tasks?status={status}&limit={limit}
      Authorization: Bearer {FOCUSBEAR_OPENCLAW_TOKEN}

  focusbear_update_task_status:
    description: "Update the status of a Focus Bear task"
    input_schema:
      task_id: string  required
      status: enum[pending, in_progress, done]  required
    handler:
      PUT https://api.focusbear.io/openclaw-mcp/tasks/{task_id}/status
      Authorization: Bearer {FOCUSBEAR_OPENCLAW_TOKEN}
      Body: { status }

  focusbear_add_note:
    description: "Add a note/comment to a Focus Bear task"
    input_schema:
      task_id: string  required
      content: string  required
    handler:
      POST https://api.focusbear.io/openclaw-mcp/tasks/{task_id}/notes
      Authorization: Bearer {FOCUSBEAR_OPENCLAW_TOKEN}
      Body: { content }

Config (from OpenClaw settings / env):
  FOCUSBEAR_OPENCLAW_TOKEN: <token issued by Focus Bear backend>
  FOCUSBEAR_API_URL: https://api.focusbear.io  (or staging URL)
```

---

## 5. Database Migration

New table `openclaw_tokens`:

```sql
CREATE TABLE openclaw_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR NOT NULL,
  token_prefix VARCHAR(8) NOT NULL,   -- first 8 chars for efficient lookup
  scopes VARCHAR[] NOT NULL DEFAULT '{}',
  label VARCHAR,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_openclaw_tokens_user_id ON openclaw_tokens(user_id);
CREATE INDEX idx_openclaw_tokens_prefix ON openclaw_tokens(token_prefix);
```

---

## 6. Frontend Changes (Out of Scope for This Repo)

Captain Codebeard should note these frontend changes are needed (separate tickets):

- **Settings page** — "Connected Apps" section listing active OpenClaw tokens (label, scopes, last used, revoke button)
- **Connect OpenClaw flow** — scope consent screen, token display (show-once) with copy button, instructions to paste into OpenClaw settings
- **Permission display** — clear explanation of what each scope allows

---

## 7. Open Questions / Risks

| # | Question / Risk | Owner |
|---|---|---|
| 1 | bcrypt lookup performance: with O(n) compare per request, needs token_prefix index for efficiency (see pseudocode). Consider a MAC-based approach (HMAC-SHA256) for O(1) lookup instead of bcrypt — discuss with jeznag | Codebeard / jeznag |
| 2 | Should tokens have a default expiry (e.g. 1 year)? | jeznag |
| 3 | Rate limiting: the MCP endpoints should be rate-limited per token, not per user session. Use existing `Throttle` decorator with token-based key | Codebeard |
| 4 | Should we support OAuth 2.0 PKCE flow (proper OAuth) rather than manual token issuance? More complex to build but more standard | jeznag |
| 5 | Scope enforcement in controller: needs a `@RequireScope('tasks:write')` decorator or inline check — where to put this logic? | Codebeard |
| 6 | MCP server: builds as an OpenClaw skill (JS/TS file following skill conventions) vs. standalone MCP server binary? | jeznag |
| 7 | API base URL: does the MCP server hit `api.focusbear.io` or the gateway? Confirm prod URL | jeznag |
| 8 | Notes implementation: task comments use `task-comment.entity.ts` — confirm `TaskComment` is the right entity for "notes", or if a separate notes model is needed | Codebeard |

---

## 8. Acceptance Criteria

- [ ] `POST /openclaw-mcp/auth/tokens` — authenticated user can issue a scoped token; raw token returned once only
- [ ] `GET /openclaw-mcp/auth/tokens` — user can list their active connections (no raw tokens exposed)
- [ ] `DELETE /openclaw-mcp/auth/tokens/:id` — user can revoke a connection
- [ ] `GET /openclaw-mcp/tasks` — OpenClaw can list tasks using Bearer token; enforces `tasks:read` scope
- [ ] `PUT /openclaw-mcp/tasks/:id/status` — OpenClaw can update task status; enforces `tasks:write` scope
- [ ] `POST /openclaw-mcp/tasks/:id/notes` — OpenClaw can add a note; enforces `tasks:write` scope
- [ ] Token stored as hash (never plaintext); raw token retrievable only at issuance
- [ ] Revoked tokens rejected with 401
- [ ] Expired tokens (if `expires_at` set) rejected with 401
- [ ] `last_used_at` updated on each successful request
- [ ] Swagger docs generated for all new endpoints
- [ ] Unit tests for auth service (token issuance, hashing, lookup, revocation)
- [ ] Unit tests for guard (valid token, invalid token, expired token, wrong scope)
- [ ] Database migration runs cleanly
- [ ] Frontend team has API contract (DTOs / Swagger) available to build the consent UI
