# Plan: MCP Agent Task Integration — Backend

**Status:** Ready for implementation
**Depends on:** Nothing (backend is the foundation)
**Blocks:**
- `Focus-Bear/web_dashboard` — frontend plan (needs these endpoints before implementing assignee UI)
- `Focus-Bear/openclaw-skills-and-config` — skill plan (needs all endpoints working)

---

## Context

PR #3158 (web_dashboard, MERGED) added a basic MCP token management UI. The `external-mcp` module in the backend already has the infrastructure (token entity, guard, auth controller, tasks controller). This plan extends it so AI agents can:

1. Be named when an MCP token is created (stored as `agent_name`)
2. Be assigned to tasks (new FK on `to_do`)
3. Retrieve only their assigned tasks via MCP-authenticated endpoints
4. Add comments and transition task status (including custom project statuses like "Ready for human review")
5. Create a "Ready for human review" custom status on a project if it doesn't exist

---

## Existing MCP Infrastructure (do NOT recreate)

The following already exist in `apps/api-server/src/modules/external-mcp/`:

| File | What it does |
|---|---|
| `entities/external-api-token.entity.ts` | Token entity: `user_id`, `token_hash`, `token_prefix`, `scopes`, `label`, `last_used_at`, `expires_at` |
| `guards/external-api-token.guard.ts` | Bearer token guard; sets `request.mcpUserId` and `request.mcpScopes` |
| `controllers/external-mcp-auth.controller.ts` | `POST/GET/DELETE mcp/auth/tokens` (Auth0-protected) |
| `controllers/external-mcp-tasks.controller.ts` | `GET /mcp/tasks`, `PUT /mcp/tasks/:id/status`, `POST /mcp/tasks/:id/notes` |
| `services/external-mcp-auth.service.ts` | Token issuance, listing, revocation |
| `services/external-mcp-tasks.service.ts` | Task operations (currently scoped to user, not agent) |
| `repositories/external-api-token.repository.ts` | `findByRawToken`, `updateLastUsed`, etc. |

**Existing endpoints (already live):**
- `POST mcp/auth/tokens` — issue token
- `GET mcp/auth/tokens` — list tokens
- `DELETE mcp/auth/tokens/:id` — revoke token
- `GET /mcp/tasks` — list tasks (⚠️ currently returns ALL user tasks, not agent-specific)
- `PUT /mcp/tasks/:id/status` — update core status (⚠️ only supports `ToDoStatus` enum, not `custom_status_id`)
- `POST /mcp/tasks/:id/notes` — add note

---

## Changes Required

### 1. Add `agent_name` to `external_api_tokens`

**Migration:** `1773025000001-add-agent-name-to-external-api-tokens.ts`

```typescript
// apps/api-server/migrations/1773025000001-add-agent-name-to-external-api-tokens.ts
await queryRunner.query(`
  ALTER TABLE "external_api_tokens"
  ADD COLUMN IF NOT EXISTS "agent_name" varchar;
`);
// down: DROP COLUMN agent_name
```

**Entity:** `entities/external-api-token.entity.ts`

Add column:
```typescript
@Column({ type: 'varchar', nullable: true })
agent_name?: string;
```

**DTOs:** `dto/create-external-api-token.dto.ts`
```typescript
@IsOptional()
@IsString()
@MaxLength(100)
agent_name?: string;
```

`dto/external-api-token-response.dto.ts` — add `agent_name?: string` to `ExternalApiTokenResponseDto`

**Service:** `services/external-mcp-auth.service.ts` — pass `dto.agent_name` when constructing `ExternalApiToken`; include `agent_name` in list/issue response

---

### 2. Add `assigned_mcp_token_id` to `to_do`

This is the key design decision. The existing `assignee_id` FK points to `User`. AI agents are not users — they are MCP tokens. Adding a separate `assigned_mcp_token_id` column keeps the data model clean.

**Migration:** `1773025000002-add-assigned-mcp-token-id-to-todo.ts`

```typescript
// apps/api-server/migrations/1773025000002-add-assigned-mcp-token-id-to-todo.ts
await queryRunner.query(`
  ALTER TABLE "to_do"
  ADD COLUMN IF NOT EXISTS "assigned_mcp_token_id" uuid REFERENCES "external_api_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

  CREATE INDEX IF NOT EXISTS "IDX_to_do_assigned_mcp_token_id" ON "to_do" ("assigned_mcp_token_id");
`);
// down: DROP INDEX, DROP COLUMN
```

**Entity:** `entities/to-do.entity.ts`

```typescript
@Index()
@Column({ type: 'uuid', nullable: true })
assigned_mcp_token_id?: string;

@ManyToOne(() => ExternalApiToken, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
@JoinColumn({ name: 'assigned_mcp_token_id' })
assigned_mcp_agent?: ExternalApiToken;
```

Import `ExternalApiToken` (note: potential circular module dependency — check at implementation time; may need to use `forwardRef` or just store the FK without the relation decorator).

**DTOs:** `to-do/dto/create-to-do.dto.ts` and the corresponding update DTO — add:
```typescript
@IsOptional()
@IsUUID()
assigned_mcp_token_id?: string;
```

**Service:** `to-do/services/to-do.service.ts` — persist `assigned_mcp_token_id` when creating/updating tasks (follow same pattern as `assignee_id`).

**ToDoResponse DTO:** add `assigned_mcp_token_id?: string` and `assigned_mcp_agent?: { id: string; agent_name?: string; label?: string }` to the response so the frontend can show the agent assignee.

---

### 3. Expose `mcpTokenId` from the Guard

The guard currently sets `request.mcpUserId` and `request.mcpScopes`. Add `request.mcpTokenId` so task endpoints can filter on the authenticated token's ID.

**File:** `guards/external-api-token.guard.ts`

```typescript
request.mcpTokenId = token.id;  // add alongside mcpUserId
```

Add a `McpTokenId` param decorator (following the same pattern as `McpUser`):
```typescript
export const McpTokenId = createParamDecorator((_data, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest().mcpTokenId;
});
```

---

### 4. Fix `GET /mcp/tasks` — filter by assigned agent token

**Current behaviour:** returns ALL tasks owned by the user (`user_id = mcpUserId`).
**Required behaviour:** returns only tasks where `assigned_mcp_token_id = mcpTokenId`.

**Controller:** `controllers/external-mcp-tasks.controller.ts` — pass `mcpTokenId` to service:
```typescript
@Get()
async listTasks(
  @McpUser() userId: string,
  @McpTokenId() tokenId: string,
  @McpScopes() scopes: string[],
  @Query() query: GetToDosQueryDto,
): Promise<PaginationDto<ToDoResponse>> {
  return this.externalMcpTasksService.listTasks(userId, tokenId, scopes, query);
}
```

**Service:** `services/external-mcp-tasks.service.ts` — update `listTasks` to query `assigned_mcp_token_id`:
```typescript
async listTasks(userId: string, tokenId: string, scopes: string[], query: GetToDosQueryDto) {
  this.requireScope(scopes, McpScope.TASKS_READ);
  // Query where assigned_mcp_token_id = tokenId (NOT user_id, since agent tasks are filtered this way)
  // Optionally also verify user_id for safety
  const [items, total] = await this.toDoRepository.getAgentAssignedToDos(tokenId, query);
  // ...
}
```

Add `getAgentAssignedToDos(tokenId: string, query: GetToDosQueryDto)` to `to-do.repository.ts`.
This should select the same fields as `getUserToDos` but filter on `assigned_mcp_token_id = :tokenId`.

---

### 5. Add `GET /mcp/tasks/:id` — single task detail

This endpoint is missing and agents need it to read full task context.

**Controller:** `controllers/external-mcp-tasks.controller.ts`
```typescript
@Get(':id')
@ApiOperation({ summary: 'Get a single task assigned to the agent' })
async getTask(
  @McpUser() userId: string,
  @McpTokenId() tokenId: string,
  @McpScopes() scopes: string[],
  @Param('id', ParseUUIDPipe) taskId: string,
): Promise<ToDoResponse> {
  return this.externalMcpTasksService.getTask(userId, tokenId, scopes, taskId);
}
```

**Service:** fetch by `id + assigned_mcp_token_id + user_id`; throw `NotFoundException` if not found. Optionally include comments (`include_comments=true` query param for richer context).

---

### 6. Extend task status update — support `custom_status_id`

**Current behaviour:** `PUT /mcp/tasks/:id/status` only accepts `status: ToDoStatus` (NOT_STARTED, IN_PROGRESS, COMPLETED).

**Problem:** "Ready for human review" is a project-level custom status stored in `custom_status_id` on the task — not a core `ToDoStatus`. The existing endpoint can't set it.

**Change:** Rename to `PATCH /mcp/tasks/:id/status` (backward-compatible since existing `PUT` can be kept as deprecated alias or just change to `PATCH`). Update the DTO:

`dto/update-task-status.dto.ts`:
```typescript
export class UpdateTaskStatusDto {
  @IsOptional()
  @IsEnum(ToDoStatus)
  status?: ToDoStatus;

  @IsOptional()
  @IsString()
  custom_status_id?: string;
  // At least one of status or custom_status_id must be provided
  // Add a class-level validator or handle in service
}
```

**Service:** update `updateTaskStatus` to handle both fields:
```typescript
const updates: Partial<ToDo> = {};
if (dto.status) updates.status = dto.status;
if (dto.custom_status_id) updates.custom_status_id = dto.custom_status_id;
if (!dto.status && !dto.custom_status_id) throw new BadRequestException('Provide status or custom_status_id');
```

Also verify task is assigned to this agent token (not just user ownership):
```typescript
const task = await this.toDoRepository.orm.findOne({
  where: { id: taskId, user_id: userId, assigned_mcp_token_id: tokenId },
});
if (!task) throw new NotFoundException(`Task ${taskId} not found or not assigned to this agent`);
```

**Controller:** change `@Put` to `@Patch` (and `ParseUUIDPipe` params). Accept `tokenId` from guard.

---

### 7. Add `POST /mcp/project-statuses` — create custom status (idempotent)

Agents need to ensure a "Ready for human review" status exists before assigning it to a task.

**Controller:** new endpoint in `controllers/external-mcp-tasks.controller.ts`:
```typescript
@Post('project-statuses')
@ApiOperation({
  summary: 'Ensure a custom status exists on a project',
  description: 'Idempotent: if a status with the same label already exists, returns it. Requires scope: tasks:write.',
})
async ensureProjectStatus(
  @McpUser() userId: string,
  @McpScopes() scopes: string[],
  @Body() dto: EnsureProjectStatusDto,
): Promise<EnsureProjectStatusResponseDto>
```

**New DTO:** `dto/ensure-project-status.dto.ts`
```typescript
export class EnsureProjectStatusDto {
  @IsUUID()
  project_id: string;

  @IsString()
  @MaxLength(100)
  label: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)  // hex color
  color: string;

  @IsBoolean()
  @IsOptional()
  should_complete_task?: boolean;  // default false
}
```

**Service logic:**
1. Fetch the project by `project_id` (verify user has access — they must be owner or accepted member)
2. Check if a status with matching `label` (case-insensitive) already exists in `project.custom_statuses`
3. If yes: return the existing status (idempotent)
4. If no: append new status with `id = uuid-v4()`, `order = max(existing orders) + 1`; update project via `projectRepository.update()`
5. Return the status (either existing or newly created)

**Module:** `external-mcp.module.ts` — import `ProjectModule` (or `ProjectRepository` directly) to access the project data.

> ⚠️ **Open Design Question:** Should agents be able to add statuses to ANY project the user is a member of, or only projects they own? Current plan: verify user is at least a member (accepted) of the project. Codebeard should flag if Jeremy wants stricter rules.

---

### 8. Add `GET /mcp/auth/agents` — list agents as assignee options (Auth0-protected)

The frontend assignee dropdown needs to show MCP agents alongside human team members. This endpoint is called by the frontend (Auth0 session), not by agents themselves.

**Controller:** `controllers/external-mcp-auth.controller.ts`
```typescript
@Get('agents')
@ApiOperation({ summary: 'List MCP agents for the current user (for assignee dropdown)' })
async listAgents(@AuthContext() { user }: Passport): Promise<McpAgentResponseDto[]> {
  return this.externalMcpAuthService.listAgents(user.id);
}
```

**New DTO:** `dto/mcp-agent-response.dto.ts`
```typescript
export class McpAgentResponseDto {
  id: string;         // token id (used as assigned_mcp_token_id)
  agent_name?: string;
  label?: string;
  scopes: string[];
  created_at: string;
}
```

**Service:** filter by user_id, return tokens that have an `agent_name` set (or all tokens — let frontend decide).

---

### 9. Update `addNote` authorization

`POST /mcp/tasks/:id/notes` currently checks `user_id = userId` only. Update to also verify `assigned_mcp_token_id = tokenId`:

```typescript
const task = await this.toDoRepository.orm.findOne({
  where: { id: taskId, user_id: userId, assigned_mcp_token_id: tokenId },
});
```

Pass `tokenId` from controller via `@McpTokenId()`.

---

## Files to Create/Modify

| Action | File |
|---|---|
| CREATE | `apps/api-server/migrations/1773025000001-add-agent-name-to-external-api-tokens.ts` |
| CREATE | `apps/api-server/migrations/1773025000002-add-assigned-mcp-token-id-to-todo.ts` |
| MODIFY | `apps/api-server/src/modules/external-mcp/entities/external-api-token.entity.ts` |
| MODIFY | `apps/api-server/src/modules/external-mcp/dto/create-external-api-token.dto.ts` |
| MODIFY | `apps/api-server/src/modules/external-mcp/dto/external-api-token-response.dto.ts` |
| MODIFY | `apps/api-server/src/modules/external-mcp/dto/update-task-status.dto.ts` |
| CREATE | `apps/api-server/src/modules/external-mcp/dto/ensure-project-status.dto.ts` |
| CREATE | `apps/api-server/src/modules/external-mcp/dto/mcp-agent-response.dto.ts` |
| MODIFY | `apps/api-server/src/modules/external-mcp/guards/external-api-token.guard.ts` |
| MODIFY | `apps/api-server/src/modules/external-mcp/services/external-mcp-auth.service.ts` |
| MODIFY | `apps/api-server/src/modules/external-mcp/services/external-mcp-tasks.service.ts` |
| MODIFY | `apps/api-server/src/modules/external-mcp/controllers/external-mcp-auth.controller.ts` |
| MODIFY | `apps/api-server/src/modules/external-mcp/controllers/external-mcp-tasks.controller.ts` |
| MODIFY | `apps/api-server/src/modules/external-mcp/external-mcp.module.ts` |
| MODIFY | `apps/api-server/src/modules/to-do/entities/to-do.entity.ts` |
| MODIFY | `apps/api-server/src/modules/to-do/dto/create-to-do.dto.ts` |
| MODIFY | `apps/api-server/src/modules/to-do/dto/to-do-response.dto.ts` |
| MODIFY | `apps/api-server/src/modules/to-do/repositories/to-do.repository.ts` |
| MODIFY | `apps/api-server/src/modules/to-do/services/to-do.service.ts` |

---

## New API Surface (summary)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/mcp/auth/agents` | Auth0 | List user's MCP agents (for assignee dropdown) |
| `GET` | `/mcp/tasks` | MCP Bearer | List tasks assigned to authenticated agent |
| `GET` | `/mcp/tasks/:id` | MCP Bearer | Get single task detail |
| `PATCH` | `/mcp/tasks/:id/status` | MCP Bearer | Update core status OR custom_status_id |
| `POST` | `/mcp/tasks/:id/notes` | MCP Bearer | Add note/comment (existing, auth fix) |
| `POST` | `/mcp/project-statuses` | MCP Bearer | Ensure custom status exists on project |

---

## Open Design Questions

1. **Circular dependency risk**: `to-do.entity.ts` importing `ExternalApiToken` from `external-mcp` module. Prefer storing only `assigned_mcp_token_id: uuid` without the TypeORM relation decorator if circular dependency is an issue. Codebeard can verify at implementation time.

2. **`GET /mcp/tasks` ownership model**: Currently the agent can only see tasks belonging to `mcpUserId` (the human account the token belongs to). If a task is assigned to this agent but owned by a different user (multi-user team scenario), the current `user_id` check would block it. For now, filter on `assigned_mcp_token_id` only (dropping the `user_id` check), as the token itself proves authorization. Flag for Jeremy if there are multi-tenant concerns.

3. **`PUT` vs `PATCH` for status update**: Existing endpoint is `PUT`. Changing to `PATCH` is more semantically correct for partial updates. Plan is to add `PATCH` as the canonical version; `PUT` can remain as a deprecated alias until frontend updates. Confirm with Jeremy.

4. **Project status creation permissions**: Agents can currently add statuses to any project they have access to via the user account. Should there be an explicit "allow agent to modify project" permission? Not scoped to the current plan — flag if needed.

5. **Scope for project status endpoint**: `POST /mcp/project-statuses` requires `tasks:write` scope. Could also warrant a new scope like `projects:write`. Current plan: reuse `tasks:write` to keep it simple. Flag if Jeremy wants finer-grained scopes.

---

## Acceptance Criteria

- [ ] `agent_name` can be set when creating an MCP token via `POST /mcp/auth/tokens`
- [ ] `agent_name` is returned in `GET /mcp/auth/tokens` and `GET /mcp/auth/agents`
- [ ] Tasks can be created/updated with `assigned_mcp_token_id`
- [ ] `GET /mcp/tasks` returns only tasks where `assigned_mcp_token_id` matches the authenticated token
- [ ] `GET /mcp/tasks/:id` returns a single task (404 if not assigned to this agent)
- [ ] `PATCH /mcp/tasks/:id/status` accepts both `status` (ToDoStatus) and `custom_status_id`
- [ ] `POST /mcp/tasks/:id/notes` still works; rejects if task not assigned to this agent
- [ ] `POST /mcp/project-statuses` creates a new status if label doesn't exist; returns existing if it does
- [ ] All new MCP endpoints reject requests without a valid bearer token
- [ ] All new MCP endpoints reject if token is expired or missing required scope
- [ ] Migrations are reversible (have a `down()` implementation)
- [ ] Unit tests updated for `ExternalMcpTasksService` and `ExternalMcpAuthService`
