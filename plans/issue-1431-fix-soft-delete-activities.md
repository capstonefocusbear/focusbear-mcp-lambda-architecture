# Plan: Fix Soft Delete of Activities if User Edits (Issue #1431)

## What the issue asks for

Currently when a user edits their habits (routines), the old activity records are **hard-deleted** from the database. This wipes out the history in `completed_activities` (the log of which habits the user has done), making it impossible to restore deleted habits or view historical data.

The fix is to use **soft delete** (`is_deleted` column) instead of hard delete when users modify their habits. Hard delete should only occur when a user deletes their entire account.

## Current State of the Code

### Activity Entity
**`apps/api-server/src/modules/activity/entities/activity.entity.ts`**
- Table: `activities`
- No `is_deleted` column exists
- BaseEntity does NOT provide soft-delete functionality (no TypeORM `@DeleteDateColumn`)

### Completed Activity Entity
**`apps/api-server/src/modules/activity/entities/completed-activity.entity.ts`**
- Has `@ManyToOne(() => Activity, ..., { onDelete: 'CASCADE' })` on the `activity` relationship
- **This means: when an Activity is hard-deleted, all its completed_activities are also CASCADE-deleted**, wiping history

### How Activities Are Deleted
When a user syncs their updated habits from the device to the server, the **ActivityParserService** (`activity-parser.service.ts`) upserts activity sequences. Old activities that are removed from the sequence are either:
1. Orphaned (but still in DB) if removed from `activity_ids`
2. Directly deleted by an orphan cleanup process (to be investigated)

The issue occurs during the **upsert flow** in `ActivityParserService.deserialize()` — when activity sequences are updated, activities with changed properties get new UUIDs (the device generates new IDs), causing the old Activity rows to be either unreferenced or explicitly deleted, cascading to completed_activities.

### Affected Entities
- `activities` table — no soft delete
- `completed_activities` table — CASCADE DELETE from Activity
- `activity_sequences` table — stores `activity_ids` array

## Implementation Steps

### 1. Add `is_deleted` column to `Activity` entity
**File:** `apps/api-server/src/modules/activity/entities/activity.entity.ts`

```typescript
@Column({
  type: 'boolean',
  default: false,
  nullable: false,
})
is_deleted?: boolean;
```

Create a TypeORM migration:
```sql
ALTER TABLE activities ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
```

### 2. Change `completed_activities` foreign key to `SET NULL` on Activity delete
**File:** `apps/api-server/src/modules/activity/entities/completed-activity.entity.ts`

Change:
```typescript
@ManyToOne(() => Activity, (activity) => activity.completed_activities, { onDelete: 'CASCADE' })
```
To:
```typescript
@ManyToOne(() => Activity, (activity) => activity.completed_activities, { onDelete: 'SET NULL', nullable: true })
```

This requires making `activity_id` nullable in `completed_activities` table:
```sql
ALTER TABLE completed_activities ALTER COLUMN activity_id DROP NOT NULL;
```

Also create a migration for the FK constraint change.

### 3. Update `ActivityParserService` to soft-delete instead of hard-delete
**File:** `apps/api-server/src/modules/activity/services/activity-parser/activity-parser.service.ts`

When activities are no longer needed (removed from a user's routine), instead of deleting them:
```typescript
// Instead of: await this.activityRepository.orm.delete({ id: activityId });
// Use:
await this.activityRepository.orm.update(
  { id: activityId },
  { is_deleted: true }
);
```

Identify where orphaned activities are cleaned up (the place where old activity IDs are detected and removed from the database) and replace the delete with a soft delete.

### 4. Filter `is_deleted` activities from all queries
Wherever activities are queried for active use (serialization, sending to device), add:
```typescript
.where('activities.is_deleted = false')
```

Key locations to update:
- **`ActivityParserService.serialize()`** — already filters by `activity_ids` from sequence, so activities removed from the sequence are naturally excluded
- **Admin queries** in `ActivityRepository.getActivitiesForAdmin()` — optionally filter by `is_deleted`
- Any other `activities` queries that shouldn't return deleted habits

### 5. Update account deletion to hard-delete activities
**File:** `apps/api-server/src/modules/user/services/user-data/user-data.service.ts`

When a user deletes their account, all their data should still be hard-deleted (not just soft-deleted). Ensure the cascade delete on `users` → `activities` still applies.

Since the `Activity` entity has `@ManyToOne(() => User, ..., { onDelete: 'CASCADE' })`, deleting the user will cascade and delete all activities (including soft-deleted ones). This behavior is correct.

### 6. (Optional) Add restore endpoint for soft-deleted activities
Add an admin endpoint to restore soft-deleted activities:
```typescript
@Patch(':id/restore')
@UseGuards(IsAdmin)
async restoreActivity(@Param('id') id: string): Promise<Activity> {
  return this.activityRepository.update(id, { is_deleted: false });
}
```

### 7. Add database index for `is_deleted`
```sql
CREATE INDEX idx_activities_is_deleted ON activities(is_deleted);
```
This ensures queries filtering `is_deleted = false` remain performant.

## Files to Modify

| File | Change |
|------|--------|
| `entities/activity.entity.ts` | Add `is_deleted` boolean column |
| `entities/completed-activity.entity.ts` | Change `onDelete: 'CASCADE'` → `onDelete: 'SET NULL'`, make `activity_id` nullable |
| `services/activity-parser/activity-parser.service.ts` | Replace hard delete with `is_deleted = true` |
| `repositories/activity.repository.ts` | Filter `is_deleted = false` in relevant queries |
| New: migration file | Add `is_deleted` column, change FK constraint |

## Estimated Effort
**Medium** — 1–2 days. Schema changes require careful migration, and the FK constraint change needs thorough testing to ensure no data integrity issues. Need to identify ALL places where activities are deleted (may require tracing through consumers/queues).

## Edge Cases / Risks
- **CASCADE constraint change**: Changing `onDelete: 'CASCADE'` to `onDelete: 'SET NULL'` requires a migration to drop and recreate the FK constraint. This must be done carefully on production.
- **Orphaned completed_activities**: After changing to SET NULL, completed_activities with `activity_id = NULL` need to be handled gracefully in the frontend (show "Deleted habit" as the name).
- **Activity sequence activity_ids**: The `activity_sequences.activity_ids` array may still reference soft-deleted activity IDs. Ensure these are filtered out when building the sequence for device sync.
- **Performance**: Adding `is_deleted` filter to all activity queries. Ensure proper indexing.
- **Admin restore**: Without a restore endpoint, soft-deleted habits are invisible to admins — consider adding admin visibility.
- **Habit packs**: Activities installed from habit packs and then deleted — the pack uninstall flow might also need to use soft delete.
- **Test coverage**: The `activity.service.spec.ts` and `completed-activity.service.spec.ts` need updating to assert soft-delete behaviour.

---
🧘 Plan filed by Monk of Modularity (AI agent)
