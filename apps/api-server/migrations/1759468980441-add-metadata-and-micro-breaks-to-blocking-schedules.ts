import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMetadataAndMicroBreaksToBlockingSchedules1759468980441 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add SUPER_STRICT to block_level_enum
    await queryRunner.query(`
            ALTER TYPE "block_level_enum" ADD VALUE 'super-strict'
        `);

    // Add is_micro_breaks_enabled column
    await queryRunner.query(`
            ALTER TABLE "blocking_schedules" 
            ADD COLUMN "is_micro_breaks_enabled" boolean NOT NULL DEFAULT false
        `);

    // Add metadata column
    await queryRunner.query(`
            ALTER TABLE "blocking_schedules" 
            ADD COLUMN "metadata" jsonb
        `);

    // Clean up existing "Night Blocking" schedule data
    // Update existing records to have proper default values
    await queryRunner.query(`
            UPDATE "blocking_schedules" 
            SET 
                "is_micro_breaks_enabled" = false,
                "metadata" = NULL
            WHERE "name" = 'Night Blocking'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove metadata column
    await queryRunner.query(`
            ALTER TABLE "blocking_schedules" 
            DROP COLUMN IF EXISTS "metadata"
        `);

    // Remove is_micro_breaks_enabled column
    await queryRunner.query(`
            ALTER TABLE "blocking_schedules" 
            DROP COLUMN IF EXISTS "is_micro_breaks_enabled"
        `);
  }
}
