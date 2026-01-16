import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableProjects1768535078000 implements MigrationInterface {
  name = 'CreateTableProjects1768535078000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create project_member_role enum
    await queryRunner.query(`
      CREATE TYPE "project_member_role_enum" AS ENUM('owner', 'admin', 'member')
    `);

    // Create project_member_invitation_status enum
    await queryRunner.query(`
      CREATE TYPE "project_member_invitation_status_enum" AS ENUM('pending', 'accepted', 'declined')
    `);

    // Create projects table
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "owner_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "custom_statuses" jsonb DEFAULT '[{"id": "default-todo", "label": "To Do", "color": "#6B7280", "order": 0, "should_complete_task": false}, {"id": "default-in-progress", "label": "In Progress", "color": "#3B82F6", "order": 1, "should_complete_task": false}, {"id": "default-done", "label": "Done", "color": "#10B981", "order": 2, "should_complete_task": true}]',
        CONSTRAINT "PK_projects" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for projects
    await queryRunner.query(`
      CREATE INDEX "IDX_projects_owner_id" ON "projects" ("owner_id");
      CREATE INDEX "IDX_projects_deleted_at" ON "projects" ("deleted_at")
    `);

    // Add foreign key for projects.owner_id
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "FK_projects_owner_id" 
      FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // Create project_members table
    await queryRunner.query(`
      CREATE TABLE "project_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "project_id" uuid NOT NULL,
        "user_id" uuid,
        "email" character varying(255),
        "role" "project_member_role_enum" NOT NULL DEFAULT 'member',
        "invitation_status" "project_member_invitation_status_enum" NOT NULL DEFAULT 'pending',
        "invitation_sent_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "invitation_responded_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_project_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_project_members_project_user" UNIQUE ("project_id", "user_id"),
        CONSTRAINT "UQ_project_members_project_email" UNIQUE ("project_id", "email")
      )
    `);

    // Create indexes for project_members
    await queryRunner.query(`
      CREATE INDEX "IDX_project_members_project_id" ON "project_members" ("project_id");
      CREATE INDEX "IDX_project_members_user_id" ON "project_members" ("user_id");
      CREATE INDEX "IDX_project_members_email" ON "project_members" ("email");
      CREATE INDEX "IDX_project_members_invitation_status" ON "project_members" ("invitation_status")
    `);

    // Add foreign keys for project_members
    await queryRunner.query(`
      ALTER TABLE "project_members" 
      ADD CONSTRAINT "FK_project_members_project_id" 
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "project_members" 
      ADD CONSTRAINT "FK_project_members_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // Add project_id column to to_do table
    await queryRunner.query(`
      ALTER TABLE "to_do" ADD COLUMN "project_id" uuid
    `);

    // Create index for to_do.project_id
    await queryRunner.query(`
      CREATE INDEX "IDX_to_do_project_id" ON "to_do" ("project_id")
    `);

    // Add foreign key for to_do.project_id
    await queryRunner.query(`
      ALTER TABLE "to_do" 
      ADD CONSTRAINT "FK_to_do_project_id" 
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `);

    // Add assignee_id column to to_do table (for Feature #2)
    await queryRunner.query(`
      ALTER TABLE "to_do" ADD COLUMN "assignee_id" uuid
    `);

    // Create index for to_do.assignee_id
    await queryRunner.query(`
      CREATE INDEX "IDX_to_do_assignee_id" ON "to_do" ("assignee_id")
    `);

    // Add foreign key for to_do.assignee_id
    await queryRunner.query(`
      ALTER TABLE "to_do" 
      ADD CONSTRAINT "FK_to_do_assignee_id" 
      FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `);

    // Add custom_status_id column to to_do table
    await queryRunner.query(`
      ALTER TABLE "to_do" ADD COLUMN "custom_status_id" character varying(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove custom_status_id column from to_do
    await queryRunner.query(`
      ALTER TABLE "to_do" DROP COLUMN IF EXISTS "custom_status_id"
    `);

    // Remove assignee_id foreign key and column from to_do
    await queryRunner.query(`
      ALTER TABLE "to_do" DROP CONSTRAINT IF EXISTS "FK_to_do_assignee_id";
      DROP INDEX IF EXISTS "IDX_to_do_assignee_id";
      ALTER TABLE "to_do" DROP COLUMN IF EXISTS "assignee_id"
    `);

    // Remove project_id foreign key and column from to_do
    await queryRunner.query(`
      ALTER TABLE "to_do" DROP CONSTRAINT IF EXISTS "FK_to_do_project_id";
      DROP INDEX IF EXISTS "IDX_to_do_project_id";
      ALTER TABLE "to_do" DROP COLUMN IF EXISTS "project_id"
    `);

    // Drop project_members table
    await queryRunner.query(`
      ALTER TABLE "project_members" DROP CONSTRAINT IF EXISTS "FK_project_members_user_id";
      ALTER TABLE "project_members" DROP CONSTRAINT IF EXISTS "FK_project_members_project_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_project_members_invitation_status";
      DROP INDEX IF EXISTS "IDX_project_members_email";
      DROP INDEX IF EXISTS "IDX_project_members_user_id";
      DROP INDEX IF EXISTS "IDX_project_members_project_id"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "project_members"
    `);

    // Drop projects table
    await queryRunner.query(`
      ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_owner_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_projects_deleted_at";
      DROP INDEX IF EXISTS "IDX_projects_owner_id"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "projects"
    `);

    // Drop enums
    await queryRunner.query(`
      DROP TYPE IF EXISTS "project_member_invitation_status_enum";
      DROP TYPE IF EXISTS "project_member_role_enum"
    `);
  }
}
