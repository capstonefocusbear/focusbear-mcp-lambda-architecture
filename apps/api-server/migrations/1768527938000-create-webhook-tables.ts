import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebhookTables1768527938000 implements MigrationInterface {
  name = 'CreateWebhookTables1768527938000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create webhook_event_type enum
    await queryRunner.query(`
      CREATE TYPE "webhook_event_type_enum" AS ENUM (
        'activity.completed',
        'routine.completed',
        'focus_session.started',
        'focus_session.completed',
        'todo.created',
        'todo.completed',
        'todo.updated',
        'streak.milestone'
      )
    `);

    // Create api_keys table
    await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "user_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "key_hash" character varying(64) NOT NULL,
        "key_prefix" character varying(8) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "last_used_at" TIMESTAMP WITH TIME ZONE,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_api_keys_key_hash" UNIQUE ("key_hash"),
        CONSTRAINT "PK_api_keys" PRIMARY KEY ("id")
      )
    `);

    // Create index on user_id for api_keys
    await queryRunner.query(`
      CREATE INDEX "IDX_api_keys_user_id" ON "api_keys" ("user_id")
    `);

    // Create webhook_subscriptions table
    await queryRunner.query(`
      CREATE TABLE "webhook_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "user_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "url" character varying(2048) NOT NULL,
        "event_types" "webhook_event_type_enum"[] NOT NULL,
        "secret" character varying(64),
        "is_active" boolean NOT NULL DEFAULT true,
        "last_triggered_at" TIMESTAMP WITH TIME ZONE,
        "failure_count" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_webhook_subscriptions" PRIMARY KEY ("id")
      )
    `);

    // Create index on user_id for webhook_subscriptions
    await queryRunner.query(`
      CREATE INDEX "IDX_webhook_subscriptions_user_id" ON "webhook_subscriptions" ("user_id")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "api_keys"
      ADD CONSTRAINT "FK_api_keys_user_id"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "webhook_subscriptions"
      ADD CONSTRAINT "FK_webhook_subscriptions_user_id"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "webhook_subscriptions" DROP CONSTRAINT "FK_webhook_subscriptions_user_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "api_keys" DROP CONSTRAINT "FK_api_keys_user_id"
    `);

    // Drop indexes
    await queryRunner.query('DROP INDEX "IDX_webhook_subscriptions_user_id"');
    await queryRunner.query('DROP INDEX "IDX_api_keys_user_id"');

    // Drop tables
    await queryRunner.query('DROP TABLE "webhook_subscriptions"');
    await queryRunner.query('DROP TABLE "api_keys"');

    // Drop enum
    await queryRunner.query('DROP TYPE "webhook_event_type_enum"');
  }
}
