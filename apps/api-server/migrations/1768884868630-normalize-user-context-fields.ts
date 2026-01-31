import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeUserContextFields1768884868630 implements MigrationInterface {
  name = 'NormalizeUserContextFields1768884868630';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guarded to support environments that may be in an unexpected state.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'user_job_details'
        ) THEN
          ALTER TABLE "users" ALTER COLUMN "user_job_details" TYPE text;
          UPDATE "users" SET "user_job_details" = NULL WHERE "user_job_details" = '';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'user_typical_distractions'
        ) THEN
          ALTER TABLE "users" ALTER COLUMN "user_typical_distractions" TYPE text;
          UPDATE "users" SET "user_typical_distractions" = NULL WHERE "user_typical_distractions" = '';
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'user_job_details'
        ) THEN
          ALTER TABLE "users" ALTER COLUMN "user_job_details" TYPE varchar;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'user_typical_distractions'
        ) THEN
          ALTER TABLE "users" ALTER COLUMN "user_typical_distractions" TYPE varchar;
        END IF;
      END
      $$;
    `);
  }
}
