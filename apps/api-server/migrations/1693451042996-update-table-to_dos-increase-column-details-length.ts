import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableToDosIncreaseColumnDetailsLength1693451042996 implements MigrationInterface {
  name = 'UpdateTableToDosIncreaseColumnDetailsLength1693451042996';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "details"');
    await queryRunner.query('ALTER TABLE "to_do" ADD "details" character varying(32000)');
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "title"');
    await queryRunner.query('ALTER TABLE "to_do" ADD "title" character varying(10000)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "details"');
    await queryRunner.query('ALTER TABLE "to_do" ADD "details" character varying(2000)');
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "title"');
    await queryRunner.query('ALTER TABLE "to_do" ADD "title" character varying(255)');
  }
}
