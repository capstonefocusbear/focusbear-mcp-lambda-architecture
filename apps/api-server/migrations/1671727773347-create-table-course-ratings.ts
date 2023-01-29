import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableCourseRatings1671280604879 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "course_ratings" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" UUID REFERENCES "users",
                "course_id" UUID REFERENCES "courses",
                "rating" SMALLINT NOT NULL DEFAULT 0,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );

            CREATE INDEX ON "course_ratings" ("course_id");
            CREATE INDEX ON "course_ratings" ("user_id");
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE IF EXISTS "course_ratings";
        `);
  }
}
