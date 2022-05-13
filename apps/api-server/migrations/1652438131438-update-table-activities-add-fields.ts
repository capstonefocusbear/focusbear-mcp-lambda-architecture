import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableActivitiesAddFields1652438131438 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "activities"
        ADD COLUMN "activity_sequence_id" UUID REFERENCES "activitity_sequences"
      ;

      CREATE INDEX ON "activities" ("activity_sequence_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "activities"
        DROP COLUMN IF EXISTS "activity_sequence_id"
      ;
    `);
  }
}
