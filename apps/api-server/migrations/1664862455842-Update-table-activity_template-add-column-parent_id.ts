import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableActivityTemplateAddColumnParentId1664862455842 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activity_template"
          ADD COLUMN "parent_id" UUID REFERENCES "activity_template" ON DELETE CASCADE ON UPDATE CASCADE;
      
        CREATE INDEX ON "activities" ("parent_id");
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activity_template"
          DROP COLUMN IF EXISTS "parent_id";
      `);
  }
}
