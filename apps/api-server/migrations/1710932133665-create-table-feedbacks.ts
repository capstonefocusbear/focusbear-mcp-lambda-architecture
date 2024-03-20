import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableFeedbacks1710932133665 implements MigrationInterface {
  name = 'CreateTableFeedbacks1710932133665';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "feedbacks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "user_id" uuid NOT NULL, "cancel_subscription_reason" character varying, CONSTRAINT "PK_29mDkEDSCFYmm7ZQHRoLpoimosq" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_5KHXo4YDbFf39Ji8vzk5h9sWSkb" ON "feedbacks" ("user_id") ');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_5KHXo4YDbFf39Ji8vzk5h9sWSkb"');
    await queryRunner.query('DROP TABLE "feedbacks"');
  }
}
