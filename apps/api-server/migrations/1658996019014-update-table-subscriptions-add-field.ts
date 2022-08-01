import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableSubscriptionsAddField1658996019014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscriptions" ADD COLUMN "expires_date" TIMESTAMP WITH TIME ZONE NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "expires_date";
    `);
  }
}
