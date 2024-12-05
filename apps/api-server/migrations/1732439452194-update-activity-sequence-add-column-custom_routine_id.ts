import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateActivitySequenceAddColumnCustomRoutineId1732439452194 implements MigrationInterface {
  name = 'UpdateActivitySequenceAddColumnCustomRoutineId1732439452194';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activity_sequences" ADD COLUMN "custom_routine_id" UUID NULL REFERENCES "custom_routines" ON DELETE SET NULL ON UPDATE CASCADE;
       CREATE INDEX "IDX_SQvsdEy02YnAsHD2X64lRzLT7Ro" ON "activity_sequences" ("custom_routine_id");
         `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "activity_sequences" DROP COLUMN IF EXISTS "custom_routine_id";
      DROP INDEX IF EXISTS "public"."IDX_SQvsdEy02YnAsHD2X64lRzLT7Ro";
        `);
  }
}
