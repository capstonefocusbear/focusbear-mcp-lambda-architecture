import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableInstalledFocusModeTemplates1671588181138 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "installed_focus_mode_templates" (
              "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              "user_id" UUID REFERENCES "users",
              "focus_mode_template_id" UUID REFERENCES "focus_mode_templates",
              "installation_status" BOOLEAN DEFAULT 'false',
              "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
              "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
      
            CREATE INDEX ON "installed_focus_mode_templates" ("user_id");
            CREATE INDEX ON "installed_focus_mode_templates" ("focus_mode_template_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE IF EXISTS "installed_focus_mode_templates";
    `);
  }
}
