import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaskReactionsTable1739756367000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "task_reactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "task_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "emoji" varchar(10) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_task_reactions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_task_user_emoji" UNIQUE ("task_id", "user_id", "emoji"),
        CONSTRAINT "FK_task_reactions_task" FOREIGN KEY ("task_id") REFERENCES "to_do"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_task_reactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_task_reactions_task_id" ON "task_reactions" ("task_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_task_reactions_user_id" ON "task_reactions" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_reactions_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_reactions_task_id"`);
    await queryRunner.query(`DROP TABLE "task_reactions"`);
  }
}
