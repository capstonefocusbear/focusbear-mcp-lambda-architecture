import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableToDoAddTags1690180048643 implements MigrationInterface {
  name = 'UpdateTableToDoAddTags1690180048643';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "to_do_tags_focus_mode_tags" ("toDoId" uuid NOT NULL, "focusModeTagsId" uuid NOT NULL, CONSTRAINT "PK_27a80e8b41dad35d90aa3e23ec8" PRIMARY KEY ("toDoId", "focusModeTagsId"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_d167c75d605edceb04ec1e0543" ON "to_do_tags_focus_mode_tags" ("toDoId") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_66979613bfc2e9ee1ad1bb4314" ON "to_do_tags_focus_mode_tags" ("focusModeTagsId") ',
    );
    await queryRunner.query(
      'ALTER TABLE "to_do_tags_focus_mode_tags" ADD CONSTRAINT "FK_d167c75d605edceb04ec1e0543d" FOREIGN KEY ("toDoId") REFERENCES "to_do"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "to_do_tags_focus_mode_tags" ADD CONSTRAINT "FK_66979613bfc2e9ee1ad1bb43145" FOREIGN KEY ("focusModeTagsId") REFERENCES "focus_mode_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "to_do_tags_focus_mode_tags" DROP CONSTRAINT "FK_66979613bfc2e9ee1ad1bb43145"',
    );
    await queryRunner.query(
      'ALTER TABLE "to_do_tags_focus_mode_tags" DROP CONSTRAINT "FK_d167c75d605edceb04ec1e0543d"',
    );
    await queryRunner.query('DROP INDEX "public"."IDX_66979613bfc2e9ee1ad1bb4314"');
    await queryRunner.query('DROP INDEX "public"."IDX_d167c75d605edceb04ec1e0543"');
    await queryRunner.query('DROP TABLE "to_do_tags_focus_mode_tags"');
  }
}
