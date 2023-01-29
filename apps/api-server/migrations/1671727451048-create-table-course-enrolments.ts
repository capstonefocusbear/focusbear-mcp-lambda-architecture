import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableCourseEnrolments1671355854939 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "course_enrolments" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "course_id" UUID REFERENCES "courses",
                "user_id" UUID REFERENCES "users",
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );

            CREATE INDEX ON "course_enrolments" ("course_id");
            CREATE INDEX ON "course_enrolments" ("user_id");
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE IF EXISTS "course_enrolments";
        `);
  }
}
