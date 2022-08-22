import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddLastCompletedSequenceId1661148287340 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "last_completed_sequence_at" TIMESTAMPTZ,
        ADD COLUMN "last_completed_sequence_id" UUID REFERENCES "activity_sequences" ON DELETE SET NULL
      ;

      CREATE INDEX ON "users" ("last_completed_sequence_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "last_completed_sequence_at",
        DROP COLUMN IF EXISTS "last_completed_sequence_id"
      ;
    `);
  }
}
