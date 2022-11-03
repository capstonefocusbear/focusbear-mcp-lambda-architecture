import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableNotifications1666922029458 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE TABLE "notifications" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" UUID REFERENCES "users",
      "summary" VARCHAR(1000),
      "description" VARCHAR(2500),
      "external_id" VARCHAR(255) UNIQUE,
      "is_dismissed" BOOLEAN DEFAULT 'false',
      "dismiss_reason" VARCHAR(255),
      "event_begins" TIMESTAMP WITH TIME ZONE,
      "event_ends" TIMESTAMP WITH TIME ZONE,
      "received" BOOLEAN DEFAULT 'false',
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX ON "notifications" ("user_id");
  `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE IF EXISTS "notifications";
  `);
  }
}
