import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddColumnLanguage1687224288861 implements MigrationInterface {
  name = 'UpdateTableUsersAddColumnLanguage1687224288861';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "language" character varying NOT NULL DEFAULT \'en\'');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "language"');
  }
}
