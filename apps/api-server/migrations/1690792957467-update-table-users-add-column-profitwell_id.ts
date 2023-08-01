import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddColumnProfitwellId1690792957467 implements MigrationInterface {
  name = 'UpdateTableUsersAddColumnProfitwellId1690792957467';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "profitwell_id" character varying(255)');
    await queryRunner.query('ALTER TABLE "users" ADD "profitwell_registration_date" TIMESTAMP WITH TIME ZONE');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "profitwell_registration_date"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "profitwell_id"');
  }
}
