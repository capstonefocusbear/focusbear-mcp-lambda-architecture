import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableTodoAddColumns1751881308463 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "to_do" ADD COLUMN "outcome" SMALLINT DEFAULT 1;
            ALTER TABLE "to_do" ADD COLUMN "perspiration_level" SMALLINT DEFAULT 1;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "to_do" DROP COLUMN "outcome";
            ALTER TABLE "to_do" DROP COLUMN "perspiration_level";
        `);
  }
}
