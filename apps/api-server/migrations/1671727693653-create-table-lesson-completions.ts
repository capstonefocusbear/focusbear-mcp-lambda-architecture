import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableLessonCompletions1671281308880 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "lesson-completions" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "lesson_id" UUID REFERENCES "lessons",
                "user_id" UUID REFERENCES "users",
                "course_id" UUID REFERENCES "courses",
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );

            CREATE INDEX ON "lesson-completions" ("course_id");
            CREATE INDEX ON "lesson-completions" ("user_id");
            CREATE INDEX ON "lesson-completions" ("lesson_id");
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE IF EXISTS "lesson-completions";
        `);
  }
}
