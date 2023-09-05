import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableCompletedFocusBlocksLinkTodos1693285636545 implements MigrationInterface {
  name = 'UpdateTableCompletedFocusBlocksLinkTodos1693285636545';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "completed_focus_blocks_to_dos_to_do" ("completedFocusBlocksId" uuid NOT NULL, "toDoId" uuid NOT NULL, CONSTRAINT "PK_210d3f576bf005afc8051a1f4a0" PRIMARY KEY ("completedFocusBlocksId", "toDoId"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_184fec4d09e5c911b5b79e8e1a" ON "completed_focus_blocks_to_dos_to_do" ("completedFocusBlocksId") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_90beb9d9b9c7a9813d2bf07e38" ON "completed_focus_blocks_to_dos_to_do" ("toDoId") ',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks_to_dos_to_do" ADD CONSTRAINT "FK_184fec4d09e5c911b5b79e8e1a8" FOREIGN KEY ("completedFocusBlocksId") REFERENCES "completed_focus_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks_to_dos_to_do" ADD CONSTRAINT "FK_90beb9d9b9c7a9813d2bf07e383" FOREIGN KEY ("toDoId") REFERENCES "to_do"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks_to_dos_to_do" DROP CONSTRAINT "FK_90beb9d9b9c7a9813d2bf07e383"',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks_to_dos_to_do" DROP CONSTRAINT "FK_184fec4d09e5c911b5b79e8e1a8"',
    );
    await queryRunner.query('DROP INDEX "public"."IDX_90beb9d9b9c7a9813d2bf07e38"');
    await queryRunner.query('DROP INDEX "public"."IDX_184fec4d09e5c911b5b79e8e1a"');
    await queryRunner.query('DROP TABLE "completed_focus_blocks_to_dos_to_do"');
  }
}
