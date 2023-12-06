import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableTeamsAddColumnsTeamSizeLimitAndPaymentType1701833891042 implements MigrationInterface {
  name = 'UpdateTableTeamsAddColumnsTeamSizeLimitAndPaymentType1701833891042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "teams" ADD "team_size_limit" integer DEFAULT \'1\'');
    await queryRunner.query('ALTER TABLE "teams" ADD "payment_type" character varying DEFAULT \'stripe\'');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "teams" DROP COLUMN "payment_type"');
    await queryRunner.query('ALTER TABLE "teams" DROP COLUMN "team_size_limit"');
  }
}
