import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserJobDetailsAndTypicalDistractions20260115001309 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "user_job_details" VARCHAR;
    `);

        await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "user_typical_distractions" VARCHAR;
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "user_job_details";
    `);

        await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "user_typical_distractions";
    `);
    }
}
