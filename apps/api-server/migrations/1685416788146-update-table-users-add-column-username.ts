import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddColumnUsername1685416788146 implements MigrationInterface {
  name = 'UpdateTableUsersAddColumnUsername1685416788146';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "username" character varying(30)');
    await queryRunner.query('ALTER TABLE "users" ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "username"');
  }
}
