import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableUsersAddColumnTimezone1669687818672 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" ADD COLUMN "timezone" VARCHAR(255) default 'UTC';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" DROP COLUMN IF EXISTS "timezone";
    `);
  }
}
