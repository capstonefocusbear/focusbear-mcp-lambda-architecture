import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCompletedFocusBlockAddColumnMetadata1737980645240 implements MigrationInterface {
  name = 'UpdateCompletedFocusBlockAddColumnMetadata1737980645240';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                ALTER TABLE "completed_focus_blocks" ADD COLUMN "metadata" JSONB;
            `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                ALTER TABLE "completed_focus_blocks" DROP COLUMN IF EXISTS "metadata";
            `);
  }
}
