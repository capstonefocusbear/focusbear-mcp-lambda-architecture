import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableHabitPacksAddColumnDuration1669021480392 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" ADD COLUMN "duration" NUMERIC NOT NULL DEFAULT 0;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" DROP COLUMN IF EXISTS "duration";
    `);
  }
}
