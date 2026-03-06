import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsDeletedToActivitiesSoftDelete1741234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add is_deleted boolean column to activities table
    await queryRunner.query(`
      ALTER TABLE "activities"
      ADD COLUMN "is_deleted" boolean NOT NULL DEFAULT false
    `);

    // 2. Add index on is_deleted for efficient filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_activities_is_deleted" ON "activities" ("is_deleted")
    `);

    // 3. Make activity_id nullable so ON DELETE SET NULL can work
    await queryRunner.query(`
      ALTER TABLE "completed_activities"
      ALTER COLUMN "activity_id" DROP NOT NULL
    `);

    // 4. Drop existing CASCADE FK on completed_activities.activity_id (known constraint name)
    await queryRunner.query(`
      ALTER TABLE "completed_activities"
      DROP CONSTRAINT IF EXISTS "FK_0140c854ae5304f6546171332b6"
    `);

    // Also drop the alternative name used in up() in case it was previously applied
    await queryRunner.query(`
      ALTER TABLE "completed_activities"
      DROP CONSTRAINT IF EXISTS "FK_completed_activities_activity_id"
    `);

    // 5. Re-add FK with SET NULL on delete (instead of CASCADE)
    await queryRunner.query(`
      ALTER TABLE "completed_activities"
      ADD CONSTRAINT "FK_completed_activities_activity_id"
      FOREIGN KEY ("activity_id") REFERENCES "activities"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert FK back to CASCADE
    await queryRunner.query(`
      ALTER TABLE "completed_activities"
      DROP CONSTRAINT IF EXISTS "FK_completed_activities_activity_id"
    `);

    // Clean up any NULL activity_id rows that resulted from SET NULL cascade.
    // Without this, restoring NOT NULL below would fail with a constraint violation.
    await queryRunner.query(`
      DELETE FROM "completed_activities" WHERE "activity_id" IS NULL
    `);

    // Restore NOT NULL on activity_id
    await queryRunner.query(`
      ALTER TABLE "completed_activities"
      ALTER COLUMN "activity_id" SET NOT NULL
    `);

    // Restore FK with original constraint name and CASCADE semantics
    await queryRunner.query(`
      ALTER TABLE "completed_activities"
      ADD CONSTRAINT "FK_0140c854ae5304f6546171332b6"
      FOREIGN KEY ("activity_id") REFERENCES "activities"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_activities_is_deleted"
    `);

    // Drop is_deleted column
    await queryRunner.query(`
      ALTER TABLE "activities"
      DROP COLUMN "is_deleted"
    `);
  }
}
