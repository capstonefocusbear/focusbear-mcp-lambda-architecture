import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableHabitPacksAddColumnCreatorName1666005187753 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs"
          ADD COLUMN "creator_name" VARCHAR(255);
  
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs"
            DROP COLUMN IF EXISTS "creator_name",
    ;
  `);
  }
}
