import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableTeams1659450022257 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "owner_id" UUID NOT NULL UNIQUE REFERENCES "users",
        "team_size" INT NOT NULL DEFAULT 1,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "expires_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "teams";
    `);
  }
}
