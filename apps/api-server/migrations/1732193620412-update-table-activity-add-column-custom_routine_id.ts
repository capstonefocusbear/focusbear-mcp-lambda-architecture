import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableActivityAddColumnCustomRoutineId1732193620412 implements MigrationInterface {
  name = 'UpdateTableActivityAddColumnCustomRoutineId1732193620412';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN "custom_routine_id" UUID REFERENCES "custom_routines" ON DELETE SET NULL ON UPDATE CASCADE;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN IF EXISTS "custom_routine_id";`);
  }
}
