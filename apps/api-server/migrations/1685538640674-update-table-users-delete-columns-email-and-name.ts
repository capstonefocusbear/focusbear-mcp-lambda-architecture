import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersDeleteColumnsEmailAndName1685538640674 implements MigrationInterface {
  name = 'UpdateTableUsersDeleteColumnsEmailAndName1685538640674';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "users_email_key"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "email"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "name"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "name" character varying(255)');
    await queryRunner.query('ALTER TABLE "users" ADD "email" character varying(255) NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email")');
  }
}
