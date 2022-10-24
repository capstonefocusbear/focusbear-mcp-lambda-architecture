import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableInstalledPacksAddColumnActivitySequenceId1666339674148 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "installed_packs"
            ADD COLUMN "activity_sequence_id" UUID REFERENCES "activity_sequences" ON DELETE SET NULL ON UPDATE CASCADE;

        CREATE INDEX ON "installed_packs" ("activity_sequence_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "installed_packs"
            DROP COLUMN IF EXISTS "activity_sequence_id";
    `);
  }
}
