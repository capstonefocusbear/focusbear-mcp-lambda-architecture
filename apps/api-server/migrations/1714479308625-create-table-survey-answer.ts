import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableSurveyAnswer1714479308625 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "survey_answer" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "reply" character varying NOT NULL,
        "rating" SMALLINT,
        "completed" BOOLEAN DEFAULT 'false',
        "survey_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
        CREATE INDEX "IDX_uO0G6ewX8s1TJ0U3EZcaKEJjys" ON "survey_answer" ("user_id");
        CREATE INDEX "IDX_O5T2rc2utJxaGiBUfGp6IQr5m5" ON "survey_answer" ("survey_id");
        ALTER TABLE "survey_answer" ADD CONSTRAINT "FK_oQ5zABu5D2GXIcmNV19r1EGFU4" FOREIGN KEY ("user_id") REFERENCES "users"("id");
        ALTER TABLE "survey_answer" ADD CONSTRAINT "FK_pXZz2xypWEl7I9Gx2m23Ui5lSY" FOREIGN KEY ("survey_id") REFERENCES "survey"("id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX IF EXISTS "public"."IDX_uO0G6ewX8s1TJ0U3EZcaKEJjys";
            DROP INDEX IF EXISTS "public"."IDX_O5T2rc2utJxaGiBUfGp6IQr5m5";
            ALTER TABLE "survey_answer" DROP CONSTRAINT IF EXISTS "FK_oQ5zABu5D2GXIcmNV19r1EGFU4";
            ALTER TABLE "survey_answer" DROP CONSTRAINT IF EXISTS "FK_pXZz2xypWEl7I9Gx2m23Ui5lSY";
            DROP TABLE IF EXISTS "survey_answer";
            `);
  }
}
