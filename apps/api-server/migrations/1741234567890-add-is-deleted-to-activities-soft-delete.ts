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

    // 3. Drop existing CASCADE FK on completed_activities.activity_id
    await queryRunner.query(`
      ALTER TABLE "completed_activities"
      DROP CONSTRAINT IF EXISTS "FK_completed_activities_activity_id"
    `);

    // 4. Find the actual constraint name and drop it
    await queryRunner.query(`
      DO $$
      DECLARE
        constraint_name text;
      BEGIN
        SELECT tc.constraint_name
        INTO constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
          AND tc.table_schema = rc.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'completed_activities'
          AND kcu.column_name = 'activity_id';

        IF constraint_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE completed_activities DROP CONSTRAINT ' || quote_ident(constraint_name);
        END IF;
      END;
      $$
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

    await queryRunner.query(`
      ALTER TABLE "completed_activities"
      ADD CONSTRAINT "FK_completed_activities_activity_id"
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
