import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableLessons1671280545136 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "lessons" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "course_id" UUID REFERENCES "courses",
                "title" VARCHAR(255),
                "content" VARCHAR(2000),
                "url" VARCHAR(255),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );

            CREATE INDEX ON "lessons" ("course_id");
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE IF EXISTS "lessons";
        `);
  }
}
