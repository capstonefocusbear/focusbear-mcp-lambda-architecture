import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableActivitySequencesAddColumnPackId1675387074095 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activity_sequences" ADD COLUMN "pack_id" UUID REFERENCES "habit_packs";

        CREATE INDEX ON "activity_sequences" ("pack_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activity_sequences" DROP COLUMN IF EXISTS "pack_id";
    `);
  }
}
