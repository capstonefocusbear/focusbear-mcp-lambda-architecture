import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableActivityTemplateAddFieldSequenceIndex1670230398938 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activity_template" ADD COLUMN "sequence_index" NUMERIC NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activity_template" DROP COLUMN IF EXISTS "sequence_index";
    `);
  }
}
