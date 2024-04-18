import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableAddFieldIcon1713355660563 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
              ALTER TABLE "to_do" ADD COLUMN "icon" character varying(10);
            `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN IF EXISTS "icon";');
  }
}
