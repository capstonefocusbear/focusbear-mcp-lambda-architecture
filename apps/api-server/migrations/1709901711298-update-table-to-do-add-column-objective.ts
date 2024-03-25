import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableToDoAddColumnObjective1709901711298 implements MigrationInterface {
  name = 'UpdateTableToDoAddColumnObjective1709901711298';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "to_do" ADD COLUMN "objective" character varying(32000);
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "to_do" DROP COLUMN IF EXISTS "objective";
          `);
  }
}
