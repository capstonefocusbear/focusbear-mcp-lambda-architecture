import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTablesActivitiesAndActivityTemplatesAddFieldCompletionRequirements1678674472378
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activities" ADD COLUMN "completion_requirements" VARCHAR DEFAULT NULL;
    `);
    await queryRunner.query(`
        ALTER TABLE "activity_template" ADD COLUMN "completion_requirements" VARCHAR DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activities" DROP COLUMN IF EXISTS "completion_requirements";
    `);
    await queryRunner.query(`
        ALTER TABLE "activity_template" DROP COLUMN IF EXISTS "completion_requirements";
    `);
  }
}
