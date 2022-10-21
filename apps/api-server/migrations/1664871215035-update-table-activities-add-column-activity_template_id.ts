import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableActivitiesAddColumnActivityTemplateId1664871215035 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activities"
          ADD COLUMN "activity_template_id" UUID REFERENCES "activity_template" ON DELETE SET NULL;
  
        CREATE INDEX ON "activities" ("activity_template_id");
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activities"
          DROP COLUMN IF EXISTS "activity_template_id",
        ;
      `);
  }
}
