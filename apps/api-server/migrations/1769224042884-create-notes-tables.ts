import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotesTables1769224042884 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "note_tags" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        "text" varchar(255) NOT NULL,
        "color" varchar(7) DEFAULT '#808080',
        CONSTRAINT "PK_note_tags" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_note_tags_user_id" ON "note_tags" ("user_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_note_tags_user_id_text" ON "note_tags" ("user_id", "text")
    `);

    await queryRunner.query(`
      CREATE TABLE "notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        "title" varchar(500) NOT NULL,
        "body" text,
        "completed_activity_id" uuid,
        CONSTRAINT "PK_notes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_notes_completed_activity" FOREIGN KEY ("completed_activity_id") REFERENCES "completed_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notes_user_id" ON "notes" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notes_completed_activity_id" ON "notes" ("completed_activity_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "notes_tags" (
        "note_id" uuid NOT NULL,
        "tag_id" uuid NOT NULL,
        CONSTRAINT "PK_notes_tags" PRIMARY KEY ("note_id", "tag_id"),
        CONSTRAINT "FK_notes_tags_note" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_notes_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "note_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notes_tags_note_id" ON "notes_tags" ("note_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notes_tags_tag_id" ON "notes_tags" ("tag_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "notes_todos" (
        "note_id" uuid NOT NULL,
        "todo_id" uuid NOT NULL,
        CONSTRAINT "PK_notes_todos" PRIMARY KEY ("note_id", "todo_id"),
        CONSTRAINT "FK_notes_todos_note" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_notes_todos_todo" FOREIGN KEY ("todo_id") REFERENCES "to_do"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notes_todos_note_id" ON "notes_todos" ("note_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notes_todos_todo_id" ON "notes_todos" ("todo_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_notes_todos_todo_id"');
    await queryRunner.query('DROP INDEX "IDX_notes_todos_note_id"');
    await queryRunner.query('DROP TABLE "notes_todos"');

    await queryRunner.query('DROP INDEX "IDX_notes_tags_tag_id"');
    await queryRunner.query('DROP INDEX "IDX_notes_tags_note_id"');
    await queryRunner.query('DROP TABLE "notes_tags"');

    await queryRunner.query('DROP INDEX "IDX_notes_completed_activity_id"');
    await queryRunner.query('DROP INDEX "IDX_notes_user_id"');
    await queryRunner.query('DROP TABLE "notes"');

    await queryRunner.query('DROP INDEX "UQ_note_tags_user_id_text"');
    await queryRunner.query('DROP INDEX "IDX_note_tags_user_id"');
    await queryRunner.query('DROP TABLE "note_tags"');
  }
}
