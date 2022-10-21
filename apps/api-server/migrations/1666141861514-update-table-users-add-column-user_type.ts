import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableUsersAddColumnUserType1666141861514 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TYPE "user_types" AS ENUM ('STANDARD', 'ADMIN');
        ALTER TABLE "users" ADD COLUMN "user_type" "user_types" DEFAULT 'STANDARD';
  `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TYPE IF EXISTS "user__types";
        ALTER TABLE "users" DROP COLUMN IF EXISTS "user_type"
    `);
  }
}
