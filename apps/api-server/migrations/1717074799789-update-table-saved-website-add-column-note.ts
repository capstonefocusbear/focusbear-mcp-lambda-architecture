import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableSavedWebsiteAddColumnNote1717074799789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "saved_websites_for_relax_block" ADD COLUMN "note" character varying(255);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "saved_websites_for_relax_block" DROP COLUMN IF EXISTS "note";
        `);
  }
}
