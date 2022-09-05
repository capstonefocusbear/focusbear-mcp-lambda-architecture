import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEnumActivityType1662358726493 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "activity_types" RENAME VALUE 'break' TO 'breaking';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "activity_types" RENAME VALUE 'breaking' TO 'break';
    `);
  }
}
