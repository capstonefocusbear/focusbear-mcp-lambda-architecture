import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableActivityAddColumnCustomRoutineId1732193620412 implements MigrationInterface {
  name = 'UpdateTableActivityAddColumnCustomRoutineId1732193620412';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN "custom_routine_id" UUID REFERENCES "custom_routines" ON DELETE SET NULL ON UPDATE CASCADE;
       CREATE INDEX "IDX_Q97YkNRenPiH5h4e6L4MQG4CVc6" ON "custom_routines" ("user_id");
       `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN IF EXISTS "custom_routine_id";
      DROP INDEX IF EXISTS "public"."IDX_Q97YkNRenPiH5h4e6L4MQG4CVc6";`,
    );
  }
}
