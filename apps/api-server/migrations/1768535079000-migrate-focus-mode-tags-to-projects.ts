import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateFocusModeTagsToProjects1768535079000 implements MigrationInterface {
  name = 'MigrateFocusModeTagsToProjects1768535079000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verify prerequisite tables exist before proceeding
    const focusModeTagsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'focus_mode_tags'
      ) AS "exists"
    `);

    if (!focusModeTagsExists[0]?.exists) {
      return;
    }

    const projectsTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'projects'
      ) AS "exists"
    `);

    if (!projectsTableExists[0]?.exists) {
      throw new Error('Migration failed: projects table does not exist. Ensure migration 1768535078000 has run first.');
    }

    // Step 1: Create projects from existing focus_mode_tags
    await queryRunner.query(`
      INSERT INTO "projects" ("id", "owner_id", "name", "description", "created_at", "updated_at")
      SELECT
        fmt.id,
        fmt.user_id,
        fmt.text,
        CASE
          WHEN fmt.external_project_metadata IS NOT NULL
          THEN 'Migrated from external project: ' || COALESCE(fmt.external_project_id, 'unknown')
          ELSE 'Migrated from focus mode tag'
        END,
        fmt.created_at,
        fmt.updated_at
      FROM "focus_mode_tags" fmt
      WHERE fmt.deleted_at IS NULL
      ON CONFLICT ("id") DO NOTHING
    `);

    // Step 2: Create project_members entries for the owners
    await queryRunner.query(`
      INSERT INTO "project_members" ("project_id", "user_id", "role", "invitation_status", "invitation_responded_at", "created_at", "updated_at")
      SELECT
        p.id,
        p.owner_id,
        'owner',
        'accepted',
        NOW(),
        p.created_at,
        p.updated_at
      FROM "projects" p
      WHERE NOT EXISTS (
        SELECT 1 FROM "project_members" pm
        WHERE pm.project_id = p.id AND pm.user_id = p.owner_id
      )
    `);

    // Step 3: Update to_do entries to reference the new project_id
    const junctionTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'to_do_tags_focus_mode_tags'
      ) AS "exists"
    `);

    if (junctionTableExists[0]?.exists) {
      await queryRunner.query(`
        UPDATE "to_do" t
        SET "project_id" = (
          SELECT fmt.id
          FROM "to_do_tags_focus_mode_tags" ttf
          JOIN "focus_mode_tags" fmt ON ttf."focusModeTagsId" = fmt.id
          WHERE ttf."toDoId" = t.id
          AND fmt.deleted_at IS NULL
          ORDER BY fmt.created_at ASC
          LIMIT 1
        )
        WHERE t.project_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM "to_do_tags_focus_mode_tags" ttf
          WHERE ttf."toDoId" = t.id
        )
      `);
    }

    // Step 4: Store external project metadata in new columns on projects table
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN IF NOT EXISTS "external_project_id" character varying(255),
      ADD COLUMN IF NOT EXISTS "external_project_metadata" jsonb
    `);

    // Copy external project data from focus_mode_tags
    // Only update if external_project_id column exists on focus_mode_tags
    const hasExternalColumns = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'focus_mode_tags' AND column_name = 'external_project_id'
      ) AS "exists"
    `);

    if (hasExternalColumns[0]?.exists) {
      await queryRunner.query(`
        UPDATE "projects" p
        SET
          "external_project_id" = fmt.external_project_id,
          "external_project_metadata" = fmt.external_project_metadata
        FROM "focus_mode_tags" fmt
        WHERE p.id = fmt.id
        AND fmt.external_project_id IS NOT NULL
      `);
    }

    // Create index for external_project_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_external_project_id" ON "projects" ("external_project_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the external project columns from projects
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_projects_external_project_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      DROP COLUMN IF EXISTS "external_project_id",
      DROP COLUMN IF EXISTS "external_project_metadata"
    `);

    // Clear project_id from to_do entries that were migrated
    const focusModeTagsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'focus_mode_tags'
      ) AS "exists"
    `);

    if (focusModeTagsExists[0]?.exists) {
      await queryRunner.query(`
        UPDATE "to_do" t
        SET "project_id" = NULL
        WHERE t.project_id IN (
          SELECT id FROM "focus_mode_tags"
        )
      `);

      // Remove project_members that were created during migration
      await queryRunner.query(`
        DELETE FROM "project_members" pm
        WHERE pm.project_id IN (
          SELECT id FROM "focus_mode_tags"
        )
      `);

      // Remove projects that were created from focus_mode_tags
      await queryRunner.query(`
        DELETE FROM "projects" p
        WHERE p.id IN (
          SELECT id FROM "focus_mode_tags"
        )
      `);
    }
  }
}
