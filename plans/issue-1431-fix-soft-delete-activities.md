# Plan: Fix Soft Delete of Activities if User Edits (Issue #1431)

## What the issue asks for

Currently when a user edits their habits (routines), the old activity records are **hard-deleted** from the database. This wipes out the history in `completed_activities` (the log of which habits the user has done), making it impossible to restore deleted habits or view historical data.

The fix is to use **soft delete** instead of hard delete when users modify their habits. Hard delete should only occur when a user deletes their entire account.

---

## Revised Approach: Use `@DeleteDateColumn()` (not a boolean `is_deleted`)

The codebase already uses TypeORM's native `@DeleteDateColumn()` soft-delete pattern in four entities:

- `focus-mode.entity.ts` — `deleted_at?: Date`
- `focus-mode-template.entity.ts` — `deleted_at?: Date`
- `habit-pack.entity.ts` — `deleted_at?: Date`
- `activity-template.entity.ts` — `deleted_at?: Date`

These entities all follow the same convention: `@DeleteDateColumn() deleted_at?: Date`, used with TypeORM's `softDelete()` / `repository.softDelete()` methods and `withDeleted: true` for queries that need to include soft-deleted rows.

**This plan must use the same pattern.** The original plan's approach of adding a boolean `is_deleted` column was inconsistent with the codebase and must be discarded.

---

## Actual Deletion Code Path (Traced)

Raccoon correctly noted there are no explicit `.delete()` calls in `src/activity/services/`. The deletion path was found in **two places**:

### Path 1 — User sync in `UserRepository` (primary path)

**File:** `apps/api-server/src/modules/user/repositories/user.repository.ts` (~line 123)

When a user syncs their updated habits from device to server, the repository runs inside a transaction:

```typescript
// Step 1: Compute the new set of activity IDs being sent by the device
const allActivityIds = activitiesData.flatMap(({ activities }) => activities.map((activity) => activity.id));
const allActivityIdsToKeep = new Set<string>(allActivityIds);

// Step 2: Upsert the ActivitySequences
await queryRunner.manager.upsert(ActivitySequence, sequencesToUpsert, ['id']);

// Step 3: Hard-delete all activities for this user NOT in the new list
await queryRunner.manager.delete(Activity, {
  user_id: id,
  id: Not(In(Array.from(allActivityIdsToKeep))),
});
```

**This is the primary bug location.** Any activity the device no longer references (because the user removed or changed it — devices generate new UUIDs for edited activities) is hard-deleted here, cascading to `completed_activities` via the `onDelete: 'CASCADE'` FK.

### Path 2 — Habit pack uninstall in `HabitPackManagerService`

**File:** `apps/api-server/src/modules/habit-pack/services/habit-pack/habit-pack-manager.service.ts` (~line 457)

```typescript
await this.activitySequenceRepository.orm.delete(activity_sequence_id);
```

This hard-deletes an `ActivitySequence`. Because `Activity` has:
```typescript
@ManyToOne(() => ActivitySequence, (activity_sequence) => activity_sequence.activities, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
})
activity_sequence?: ActivitySequence;
```
…deleting the `ActivitySequence` **cascades to delete all its child `Activity` rows**, which then **cascade again to `completed_activities`** via:
```typescript
@ManyToOne(() => Activity, (activity) => activity.completed_activities, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
activity?: Activity;
```

---

## The `ActivitySequence` CASCADE Chain — Must Be Addressed

**Critical finding:** activities don't stand alone. The cascade chain is:

```
ActivitySequence (deleted) → CASCADE → Activity (deleted) → CASCADE → CompletedActivity (deleted)
```

**Soft-deleting only `Activity` rows is not sufficient** if the `ActivitySequence` itself is also being hard-deleted (Path 2 above). In that case, the cascade fires at the DB level regardless of any application-level soft-delete logic.

**Decision required — choose one of these approaches:**

**Option A (Recommended): Soft-delete both `ActivitySequence` and `Activity`**
- Add `@DeleteDateColumn() deleted_at` to `ActivitySequence` as well
- Replace `activitySequenceRepository.orm.delete(...)` calls with `softDelete()`
- TypeORM's soft-delete does NOT cascade by default — child `Activity` rows will remain physically present
- Application-level code must still soft-delete or tombstone orphaned Activities (see step 3 below)

**Option B: Keep `ActivitySequence` hard-delete, but remove the CASCADE on `Activity → CompletedActivity`**
- More surgical: only change the FK relationship between `Activity` and `CompletedActivity`
- Still requires the `UserRepository` fix (Path 1) to use soft-delete instead of hard-delete
- Riskier: any other future hard-delete path would bypass the protection

**This plan recommends Option A** for consistency and future-proofing.

---

## Implementation Steps

### 1. Add `@DeleteDateColumn()` to `Activity` entity

**File:** `apps/api-server/src/modules/activity/entities/activity.entity.ts`

```typescript
import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, Index } from 'typeorm';

// Inside the class:
@DeleteDateColumn()
deleted_at?: Date;
```

Create a TypeORM migration:
```sql
ALTER TABLE activities ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
CREATE INDEX idx_activities_deleted_at ON activities(deleted_at) WHERE deleted_at IS NULL;
```

### 2. Add `@DeleteDateColumn()` to `ActivitySequence` entity (Option A)

**File:** `apps/api-server/src/modules/activity/entities/activity-sequence.entity.ts`

```typescript
import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, Index } from 'typeorm';

// Inside the class:
@DeleteDateColumn()
deleted_at?: Date;
```

Migration:
```sql
ALTER TABLE activity_sequences ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
```

### 3. Fix `UserRepository` — soft-delete instead of hard-delete

**File:** `apps/api-server/src/modules/user/repositories/user.repository.ts`

Replace:
```typescript
await queryRunner.manager.delete(Activity, {
  user_id: id,
  id: Not(In(Array.from(allActivityIdsToKeep))),
});
```

With:
```typescript
await queryRunner.manager.softDelete(Activity, {
  user_id: id,
  id: Not(In(Array.from(allActivityIdsToKeep))),
});
```

TypeORM's `softDelete()` sets `deleted_at = NOW()` instead of removing the row.

### 4. Fix `HabitPackManagerService` — soft-delete the `ActivitySequence`

**File:** `apps/api-server/src/modules/habit-pack/services/habit-pack/habit-pack-manager.service.ts`

Replace:
```typescript
await this.activitySequenceRepository.orm.delete(activity_sequence_id);
```

With:
```typescript
await this.activitySequenceRepository.orm.softDelete(activity_sequence_id);
// Then soft-delete all activities belonging to this sequence:
await queryRunner.manager.softDelete(Activity, { activity_sequence_id });
```

> Note: TypeORM soft-delete does NOT auto-cascade. You must explicitly soft-delete child rows in application code.

### 5. Revisit `completed_activities` FK (`onDelete: 'CASCADE'`)

**With `@DeleteDateColumn()`, soft-deleted rows stay physically in the database.** A soft delete sets `deleted_at` on the row — it does NOT trigger PostgreSQL's FK cascade. Therefore:

- The existing `onDelete: 'CASCADE'` on `completed_activities.activity_id` will **not** fire during a soft delete
- `completed_activities` rows are **preserved automatically** when using soft delete — this is the desired behaviour
- **The FK change from CASCADE → SET NULL that was proposed in the original plan is no longer needed**

The only remaining risk is if any code path still performs a hard delete on `Activity`. Audit all callsites after this change.

However, as a defensive measure, it is recommended to keep the `completed_activities` FK relationship documented but **not change the cascade behaviour** — it remains as a safety net for hard deletes (e.g., account deletion).

### 6. Filter soft-deleted activities from active queries

TypeORM automatically excludes soft-deleted rows (where `deleted_at IS NOT NULL`) when using repository methods like `find()`, `findOne()`, `createQueryBuilder()` **as long as the entity has `@DeleteDateColumn()`**. No manual filtering is required.

Exception: any raw SQL queries or `getMany()` calls that do not go through TypeORM's soft-delete awareness must be audited:
- `ActivityRepository.getActivitiesForAdmin()` — uses `createQueryBuilder`, which respects soft-delete by default ✅
- `ActivitySequenceService.getUserRoutineDailyDurations()` — uses `orm.find()`, which respects soft-delete by default ✅

For admin views where soft-deleted records should be visible, pass `withDeleted: true` to queries (consistent with `activity-template.repository.ts` pattern).

### 7. Account deletion — preserve hard-delete behaviour

When a user deletes their account, all data should still be physically removed.

The existing cascade on `User → ActivitySequence` and `User → Activity` (both `onDelete: 'CASCADE'`) ensures that deleting the `User` row cascades at the DB level and cleans up everything regardless of soft-delete state. No change needed here.

### 8. Database migration sequence

Migrations must be applied in this order:
1. Add `deleted_at` to `activity_sequences`
2. Add `deleted_at` to `activities`
3. Deploy application code changes

Do NOT change the `completed_activities` FK constraint.

---

## Files to Modify

| File | Change |
|------|--------|
| `entities/activity.entity.ts` | Add `@DeleteDateColumn() deleted_at?: Date` |
| `entities/activity-sequence.entity.ts` | Add `@DeleteDateColumn() deleted_at?: Date` |
| `repositories/user.repository.ts` | Replace `delete(Activity, ...)` with `softDelete(Activity, ...)` |
| `habit-pack/services/habit-pack-manager.service.ts` | Replace `delete(activity_sequence_id)` with `softDelete` + explicit child soft-delete |
| New migration file | Add `deleted_at` columns to both tables |

**No change to:** `completed-activity.entity.ts` FK (CASCADE stays as-is — no longer needed to change it)

---

## Estimated Effort

**Medium** — 1–2 days. Schema changes require careful migration and the cascade analysis adds complexity, but the soft-delete pattern is well-established in this codebase.

---

## Edge Cases / Risks

- **TypeORM cascade soft-delete limitation**: `softDelete()` does NOT auto-cascade to children. Every entity in the deletion chain must be soft-deleted explicitly in application code.
- **Activity sequence activity_ids**: `activity_sequences.activity_ids` may still reference soft-deleted activity IDs. Ensure these are filtered out when building the sequence for device sync (TypeORM's default `find()` handles this automatically since soft-deleted rows are excluded).
- **Standalone sequences**: Standalone habit pack sequences always create new `ActivitySequence` rows. Ensure the upsert path doesn't accidentally reuse or hard-delete old sequences.
- **Habit packs**: When uninstalling a habit pack, the full cascade chain (sequence → activities → completed_activities) must use soft-delete at each level.
- **Performance**: `deleted_at IS NULL` index is essential. Already specified in migration above.
- **Test coverage**: `activity.service.spec.ts` and `completed-activity.service.spec.ts` need updating to assert soft-delete behaviour (verify `deleted_at` is set, verify `completed_activities` rows are preserved).

---
🧘 Plan revised by Monk of Modularity (AI agent) — Raccoon feedback incorporated
- Updated to use `@DeleteDateColumn()` (consistent with 4 existing entities)
- Traced actual deletion path: `UserRepository` hard-delete + `HabitPackManagerService` cascade
- Addressed `ActivitySequence` CASCADE chain (Option A: soft-delete both)
- FK change no longer needed with soft-delete approach
