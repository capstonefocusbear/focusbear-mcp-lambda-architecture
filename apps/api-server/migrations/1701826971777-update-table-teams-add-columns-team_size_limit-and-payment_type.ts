import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableTeamsAddColumnsTeamSizeLimitAndPaymentType1701826971777 implements MigrationInterface {
  name = 'UpdateTableTeamsAddColumnsTeamSizeLimitAndPaymentType1701826971777';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "teams" ADD "team_size_limit" integer DEFAULT \'1\'');
    await queryRunner.query('ALTER TABLE "teams" ADD "payment_type" character varying');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "teams" DROP COLUMN "payment_type"');
    await queryRunner.query('ALTER TABLE "teams" DROP COLUMN "team_size_limit"');
  }
}
