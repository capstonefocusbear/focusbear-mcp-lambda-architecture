import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateActivitiesTableAddParentId1657807955471 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "activities"
        ADD COLUMN "parent_id" UUID REFERENCES "activities" ON DELETE CASCADE ON UPDATE CASCADE,
        ADD COLUMN "has_choices" BOOLEAN DEFAULT 'false'
      ;
    
      CREATE INDEX ON "activities" ("parent_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "activities"
        DROP COLUMN IF EXISTS "parent_id",
        DROP COLUMN IF EXISTS "has_choices"
      ;
    `);
  }
}
