import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddUniqueIndexOnStripeCustomerId1660641081133 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" ADD CONSTRAINT unique_stripe_customer_id UNIQUE ("stripe_customer_id");
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
           ALTER TABLE "users" DROP CONSTRAINT unique_stripe_customer_id;
    `);
  }
}
