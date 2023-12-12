import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableCalendar1702304047162 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          CREATE TABLE "calendar_excluded_keywords" (
              "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
              "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), 
              "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), 
              "user_id" uuid NOT NULL, 
              "keyword" character varying(255) NOT NULL, 
              "platform" character varying(255) NOT NULL, 
              "intitle" boolean NOT NULL DEFAULT false, 
              "indescription" boolean NOT NULL DEFAULT false, 
              CONSTRAINT "UQ_365d380f7ebbd9005558745f42" UNIQUE ("user_id"), 
              CONSTRAINT "PK_03fb004e09cb3a498cf45edf355" PRIMARY KEY ("id")
          );
        `);
    await queryRunner.query(`
          CREATE TABLE "calendars" (
              "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
              "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), 
              "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), 
              "user_id" uuid NOT NULL, 
              "platform_account" character varying(255) NOT NULL, 
              "platform" character varying(255) NOT NULL, 
              "calendar_id" character varying(255) NOT NULL, 
              "summary" character varying(1000), 
              CONSTRAINT "UQ_baf8690eea3928bf4fe59c2141" UNIQUE ("user_id"), 
              CONSTRAINT "PK_2e5c1e7d0882eafd013035f5430" PRIMARY KEY ("id")
          );
        `);
    await queryRunner.query(
      'ALTER TABLE "calendar_excluded_keywords" ADD CONSTRAINT "FK_365d380f7ebbd9005558745f42" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "calendars" ADD CONSTRAINT "FK_baf8690eea3928bf4fe59c2141" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );

    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"');

    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "platform" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "UQ_65bd4afcb9043001c3f90facd78" UNIQUE ("platform")',
    );
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "platform_account" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "UQ_cd4e54cfac92fec7384fc955179" UNIQUE ("platform_account")',
    );
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "calendar_id" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "UQ_82e9861292085ee6d57ba5ecd83" UNIQUE ("calendar_id")',
    );
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "external_id" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "UQ_def4fd3a4bd79c4331c2b84a2e1" UNIQUE ("external_id")',
    );
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "summary" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "description" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "event_begins" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "event_ends" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "is_dismissed" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "dismiss_reason" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "received" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "calendars" DROP CONSTRAINT "FK_baf8690eea3928bf4fe59c2141"');
    await queryRunner.query('DROP TABLE "calendars"');

    await queryRunner.query('ALTER TABLE "calendar_excluded_keywords" DROP CONSTRAINT "FK_365d380f7ebbd9005558745f42"');
    await queryRunner.query('DROP TABLE "calendar_excluded_keywords"');

    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"');

    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "received" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "dismiss_reason" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "is_dismissed" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "event_ends" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "event_begins" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "description" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "summary" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT "UQ_def4fd3a4bd79c4331c2b84a2e1"');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "external_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT "UQ_82e9861292085ee6d57ba5ecd83"');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "calendar_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT "UQ_cd4e54cfac92fec7384fc955179"');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "platform_account" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT "UQ_65bd4afcb9043001c3f90facd78"');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "platform" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id", "user_id") REFERENCES "users"("id","id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }
}
