import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableAddFieldDuration1713264065461 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          ALTER TABLE "to_do" ADD COLUMN "duration" NUMERIC DEFAULT 0;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "to_do" DROP COLUMN IF EXISTS "duration";`);
  }
}
