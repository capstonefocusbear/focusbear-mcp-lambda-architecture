import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNoteTagsUserFk1770390440221 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "note_tags" ADD CONSTRAINT "FK_note_tags_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "note_tags" DROP CONSTRAINT "FK_note_tags_user"');
  }
}
