import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOpenclawTokensTable20260305000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "openclaw_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar NOT NULL,
        "token_prefix" varchar(8) NOT NULL,
        "scopes" varchar[] NOT NULL DEFAULT '{}',
        "label" varchar,
        "last_used_at" timestamptz,
        "expires_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_openclaw_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_openclaw_tokens_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_openclaw_tokens_user_id" ON "openclaw_tokens" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_openclaw_tokens_prefix" ON "openclaw_tokens" ("token_prefix")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_openclaw_tokens_prefix"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_openclaw_tokens_user_id"');
    await queryRunner.query('DROP TABLE "openclaw_tokens"');
  }
}
