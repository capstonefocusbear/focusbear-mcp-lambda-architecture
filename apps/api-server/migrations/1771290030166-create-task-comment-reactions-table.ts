import { MigrationInterface, QueryRunner } from 'typeorm';

export const transaction = 'none';

export class CreateTaskCommentReactionsTable1771290030166 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "task_comment_reactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "comment_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "emoji" character varying(10) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_task_comment_reactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_task_comment_reactions_comment" FOREIGN KEY ("comment_id") REFERENCES "task_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_task_comment_reactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "UQ_task_comment_reactions_comment_user_emoji" UNIQUE ("comment_id", "user_id", "emoji")
      );
    `);

    await queryRunner.query('CREATE INDEX "IDX_task_comment_reactions_comment_id" ON "task_comment_reactions" ("comment_id")');
    await queryRunner.query('CREATE INDEX "IDX_task_comment_reactions_user_id" ON "task_comment_reactions" ("user_id")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_task_comment_reactions_user_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_task_comment_reactions_comment_id"');
    await queryRunner.query('DROP TABLE IF EXISTS "task_comment_reactions"');
  }
}
