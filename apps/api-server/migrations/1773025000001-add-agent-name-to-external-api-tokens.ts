import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentNameToExternalApiTokens1773025000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "external_api_tokens"
      ADD COLUMN IF NOT EXISTS "agent_name" varchar;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "external_api_tokens"
      DROP COLUMN IF EXISTS "agent_name";
    `);
  }
}
