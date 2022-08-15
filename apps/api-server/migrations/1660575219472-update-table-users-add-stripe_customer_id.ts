import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddStripeCustomerId1660575219472 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" ADD COLUMN "stripe_customer_id" VARCHAR(255);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
       ALTER TABLE "users" DROP COLUMN IF EXISTS "stripe_customer_id";
    `);
  }
}
