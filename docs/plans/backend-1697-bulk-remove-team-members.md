# Implementation Plan: Bulk Remove Team Member Endpoint

**Issue:** [#1697 — Bulk remove team member endpoint needed](https://github.com/Focus-Bear/backend/issues/1697)  
**Branch:** `plan/backend-1697-bulk-remove-team-members`  
**Planned by:** Monk of Modularity 🧘 (AI planning agent)  
**Date:** 2026-03-05  
**Status:** Ready for Codebeard — see also: `claude/issue-1697-20260303-0420` (prior attempt, CI pending)

---

## 1. Issue Summary

The frontend was removing multiple team members by calling `POST /team-management/remove-member` in a loop. This pattern triggers **HTTP 429 Too Many Requests** rate-limiting errors.

The existing `DELETE /team-management/bulk-delete-members` endpoint already supports bulk removal, but it requires the `team_owner` entitlement. **Team admins** (`team_admin` entitlement) also need to bulk-remove members — they have individual removal rights, but no bulk endpoint scoped to their permission level.

**Goal:** Add `POST /team-management/bulk-remove-members` — a bulk removal endpoint accessible to `team_admin` (not just `team_owner`).

---

## 2. Proposed API Design

### Endpoint

```
POST /team-management/bulk-remove-members
```

### Auth & Guards

- `IsAuth` (existing global guard on the controller)
- `HasSubscription`
- `RequireEntitlements([Entitlement.team_admin])`

### Request Body (reuses existing `BulkDeleteDto`)

```json
{
  "team_id": "uuid-of-the-team",
  "member_ids": ["uuid-1", "uuid-2"],
  "emails": ["member@example.com"]
}
```

> At least one of `member_ids` or `emails` should be provided. Both are optional individually but empty inputs result in a no-op (not an error).

### Response

- **HTTP 204 No Content** on success (consistent with `bulk-delete-members`)
- **HTTP 401 Unauthorized** — caller is not an admin of the specified team
- **HTTP 404 Not Found** — team does not exist
- **HTTP 400 Bad Request** — validation failure (malformed UUIDs, non-email strings)

### Behaviour

1. Resolve the team from `team_id` — throw `NotFoundException` if not found.
2. Fetch all current members and admins via `getTeamIncludingUnregistered`.
3. Validate the caller (`adminId`) is listed in `admins` — throw `UnauthorizedException` if not.
4. Filter `members` to those matching `member_ids` OR `emails`, **excluding the caller** (admins cannot remove themselves).
5. For each matched member, call `disassociateMemberFromTheTeam`.
6. Sync Stripe/RevenueCat team size based on **actual** removed count (`members.length - membersToRemove.length`), not the input count (prevents over-billing if some IDs don't match).
7. Use `Promise.allSettled` for graceful partial-failure handling.

---

## 3. Difference vs Existing Endpoints

| Endpoint | Method | Entitlement | Notes |
|---|---|---|---|
| `/bulk-delete-members` | DELETE | `team_owner` | Existing; owner-level bulk removal |
| `/remove-member` | POST | `team_admin` | Existing; single member only |
| `/bulk-remove-members` | POST | `team_admin` | **New**; admin-level bulk removal |

The new endpoint is functionally similar to `bulkDeleteTeamMembers` but:
- Requires `team_admin` instead of `team_owner`
- Validates that the caller is actually an admin of the team (not just entitlement-check)
- Uses actual removed count for team size sync (bug fix over existing approach)

---

## 4. Files to Modify / Create

### Modified

1. **`apps/api-server/src/modules/team/controllers/team-management.controller.ts`**
   - Add `POST /bulk-remove-members` endpoint method `bulkRemoveMembers`
   - Guards: `HasSubscription`, `RequireEntitlements([Entitlement.team_admin])`
   - Delegates to `teamManagementService.bulkRemoveMembers(bulkDeleteDto, adminId)`
   - Response: `@HttpCode(204)`

2. **`apps/api-server/src/modules/team/services/team-management/team-management.service.ts`**
   - Add `async bulkRemoveMembers(bulkDeleteDto: BulkDeleteDto, adminId: string): Promise<any>`
   - Reuses `validateTeam`, `getTeamIncludingUnregistered`, `validateMemberAction`, `disassociateMemberFromTheTeam`, `syncTeamSizeWithSubscription`
   - No new imports needed (all helpers already exist)

3. **`apps/api-server/src/modules/team/services/team-management/team-management.service.spec.ts`**
   - Add `describe('bulkRemoveMembers', ...)` block with 4 tests (see §6)

### Not Modified

- `BulkDeleteDto` — already has the right shape (`member_ids`, `emails`, `team_id`)
- No new DTOs, repositories, or modules needed
- No database migrations required

---

## 5. Step-by-Step Implementation (for Codebeard 🏴‍☠️)

### Step 1 — Add the service method

In `team-management.service.ts`, add after the existing `removeMember` method (~line 211):

```typescript
async bulkRemoveMembers(bulkDeleteDto: BulkDeleteDto, adminId: string): Promise<any> {
  try {
    const { member_ids = [], emails = [], team_id } = bulkDeleteDto;
    const team = await this.validateTeam(team_id);
    const { members, admins } = await this.teamRepository.getTeamIncludingUnregistered(team);

    this.validateMemberAction(admins, adminId);

    const membersToRemove = members.filter(
      ({ member_id, email }) =>
        (member_ids.includes(member_id) && member_id !== adminId) || emails?.includes(email),
    );

    await Promise.allSettled([
      ...membersToRemove.map((member) => this.disassociateMemberFromTheTeam(member, team_id)),
      this.syncTeamSizeWithSubscription(team, members.length - membersToRemove.length),
    ]);
  } catch (error) {
    this.sentryService.instance().captureException(error, { level: 'error' });
    throw error;
  }
}
```

### Step 2 — Add the controller endpoint

In `team-management.controller.ts`, add after the existing `bulkDeleteTeamMembers` method (~line 48):

```typescript
@Post('/bulk-remove-members')
@HttpCode(204)
@UseGuards(HasSubscription)
@RequireEntitlements([Entitlement.team_admin])
@ApiOperation({ summary: 'Remove multiple team members by IDs or emails (team admin)' })
@ApiResponse({ status: 204, description: 'Members removed successfully' })
@ApiResponse({ status: 401, description: 'Caller is not a team admin' })
@ApiResponse({ status: 404, description: 'Team not found' })
bulkRemoveMembers(
  @Body() bulkDeleteDto: BulkDeleteDto,
  @AuthContext() { user: { id: adminId } }: Passport,
): Promise<any> {
  return this.teamManagementService.bulkRemoveMembers(bulkDeleteDto, adminId);
}
```

### Step 3 — Add unit tests (see §6 for full specs)

### Step 4 — Verify CI passes

Run locally if possible:
```bash
pnpm nx test api-server --testPathPattern=team-management
pnpm nx lint api-server
```

---

## 6. Edge Cases and Validation Requirements

| Scenario | Expected Behaviour |
|---|---|
| `team_id` not found | `NotFoundException`: "Team with id: {id} doesn't exist!" |
| Caller not in `admins` list | `UnauthorizedException`: "User with id: {id} is not an admin member of this team!" |
| `member_ids` includes the admin's own ID | That ID is silently skipped — self-removal is prevented |
| `emails` includes a non-team-member email | Silently ignored (filter won't match) |
| Empty `member_ids` and `emails` | No-op; 204 returned; team size unchanged |
| Some member IDs valid, some invalid | Removes valid ones; `Promise.allSettled` absorbs individual failures |
| `BulkDeleteDto` validation failures | NestJS returns 400 (class-validator handles this) |
| Team uses RevenueCat payment | Revokes `team_member` entitlement per removed member |
| Team uses Stripe payment | Updates subscription seat count via `syncTeamSizeWithSubscription` |
| All members removed | Team size syncs to 0 members remaining (only admin/owner stays) |

---

## 7. Test Requirements

Add the following test suite in `team-management.service.spec.ts`:

### Test 1 — Team not found (negative)
- Mock `TeamRepositoryMock.orm.findOne` → `null`
- Call `bulkRemoveMembers({ member_ids: [uuid], team_id }, adminId)`
- Expect `NotFoundException` with message `"Team with id: {teamId} doesn't exist!"`

### Test 2 — Caller not admin (negative)
- Mock team to exist; mock `getTeamIncludingUnregistered` with `admins` that excludes the caller
- Call `bulkRemoveMembers` with a random non-admin ID
- Expect `UnauthorizedException` with message `"User with id: {nonAdminId} is not an admin member of this team!"`

### Test 3 — Successful bulk removal (positive)
- Mock team with 2 members; caller is admin
- Call `bulkRemoveMembers` with one member's ID
- Assert:
  - `TeamToMemberRepositoryMock.orm.delete` called with correct `{ team_id, member_id }`
  - `RevenueCatServiceMock.revokeTeamMembership` called with member's `id` and `Entitlement.team_member`
  - `StripeServiceMock.updateSubscription` called with correct subscription details and `quantity: 1`
  - `TeamRepositoryMock.update` called with `{ team_size: 1 }`

### Test 4 — Admin self-removal prevention (positive)
- Mock team with admin as a listed member and another member
- Call `bulkRemoveMembers` with both the admin's own ID and the other member's ID
- Assert only the other member was removed (not the admin)
- Assert team size synced correctly to reflect one removal

### Optional Test 5 — Empty input no-op
- Call with empty `member_ids: []` and `emails: []`
- Assert no delete/revoke calls were made
- Assert team size unchanged

---

## 8. Notes for Codebeard

- **Do not modify `BulkDeleteDto`** — it already works for this use case.
- The existing `bulkDeleteTeamMembers` (owner endpoint) uses `member_ids.length` for team size sync — this **over-bills** if some IDs don't match actual members. The new endpoint correctly uses `membersToRemove.length` to sync based on actual removals. Consider backporting this fix to the owner endpoint separately.
- The Claude agent already attempted an implementation on branch `claude/issue-1697-20260303-0420` — review that diff for reference, but verify CI and lint before using it as-is. Tests could not run in that agent's sandboxed environment.
- Frontend should be updated to call this new bulk endpoint instead of looping on `/remove-member`. That's a separate ticket.

---

*Plan authored by Monk of Modularity 🧘 — AI planning agent for Focus Bear engineering.*  
*Captain Codebeard 🏴‍☠️ is responsible for code implementation and CI verification.*
