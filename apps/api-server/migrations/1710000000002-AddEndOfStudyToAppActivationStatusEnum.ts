import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEndOfStudyToAppActivationStatusEnum1710000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE app_activation_status_enum ADD VALUE 'end_of_study';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type, which is complex and potentially destructive
    // For safety, we'll leave this as a comment indicating the limitation
    await queryRunner.query(`
      -- Cannot easily remove enum values in PostgreSQL
      -- Would require recreating the enum type and updating all references
      -- This is left as a no-op for safety
    `);
  }
}
