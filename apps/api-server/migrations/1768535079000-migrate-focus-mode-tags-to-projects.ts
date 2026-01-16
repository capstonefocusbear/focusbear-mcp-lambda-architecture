import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateFocusModeTagsToProjects1768535079000 implements MigrationInterface {
  name = 'MigrateFocusModeTagsToProjects1768535079000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // This migration converts existing focus_mode_tags to projects
    // Each unique tag per user becomes a project owned by that user
    // Tasks (to_do) that were associated with tags via the junction table
    // will be updated to reference the new project

    // Step 1: Create projects from existing focus_mode_tags
    // We create one project per unique tag per user
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
    // Each project owner should be a member with OWNER role
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
    // We use the junction table to_do_tags_focus_mode_tags to find the associations
    // First, check if the junction table exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'to_do_tags_focus_mode_tags'
        ) THEN
          -- Update to_do entries with project_id from the first associated tag
          -- (if a task has multiple tags, we use the first one)
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
          );
        END IF;
      END $$;
    `);

    // Step 4: Store external project metadata in a new column on projects table
    // First, add the column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD COLUMN IF NOT EXISTS "external_project_id" character varying(255),
      ADD COLUMN IF NOT EXISTS "external_project_metadata" jsonb
    `);

    // Then copy the external project data from focus_mode_tags
    await queryRunner.query(`
      UPDATE "projects" p
      SET 
        "external_project_id" = fmt.external_project_id,
        "external_project_metadata" = fmt.external_project_metadata
      FROM "focus_mode_tags" fmt
      WHERE p.id = fmt.id
      AND fmt.external_project_id IS NOT NULL
    `);

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
