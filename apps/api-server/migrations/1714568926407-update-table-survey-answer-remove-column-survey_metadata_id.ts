import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableSurveyAnswerRemoveColumnSurveyMetadataId1714568926407 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "survey-answer" DROP COLUMN IF EXISTS "survey_metadata_id";
            DROP INDEX IF EXISTS "public"."IDX_h0Ca9fw0tqEPYg0UDrBYfNNeWy";
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "survey-answer" ADD COLUMN "survey_metadata_id" uuid;
            CREATE INDEX "IDX_h0Ca9fw0tqEPYg0UDrBYfNNeWy" ON "survey-answer" ("survey_metadata_id");
          `);
  }
}
