import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddFields1652437746126 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "current_activity_sequence_id" UUID REFERENCES "activity_sequences" ON DELETE SET NULL ON UPDATE CASCADE,
        ADD COLUMN "current_focus_mode_id" UUID REFERENCES "focus_modes" ON DELETE SET NULL ON UPDATE CASCADE,
        ADD COLUMN "current_activity_id" UUID REFERENCES "activities" ON DELETE SET NULL ON UPDATE CASCADE
      ;

      CREATE INDEX ON "users" ("current_activity_sequence_id");
      CREATE INDEX ON "users" ("current_focus_mode_id");
      CREATE INDEX ON "users" ("current_activity_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "current_activity_sequence_id",
        DROP COLUMN IF EXISTS "current_focus_mode_id",
        DROP COLUMN IF EXISTS "current_activity_id"
      ;
    `);
  }
}
