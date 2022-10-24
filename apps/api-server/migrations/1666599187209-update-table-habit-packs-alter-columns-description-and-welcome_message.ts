import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableHabitPacksAlterColumnsDescriptionAndWelcomeMessage1666599187209 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" ALTER COLUMN "description" TYPE VARCHAR(2500);
        ALTER TABLE "habit_packs" ALTER COLUMN "welcome_message" TYPE VARCHAR(2500);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" ALTER COLUMN "description" TYPE VARCHAR(255);
        ALTER TABLE "habit_packs" ALTER COLUMN "welcome_message" TYPE VARCHAR(255);
`);
  }
}
