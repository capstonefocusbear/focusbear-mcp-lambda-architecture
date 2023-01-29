import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableCourses1671280522361 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "courses" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "author_id" UUID REFERENCES "users",
            "name" VARCHAR(255),
            "description" VARCHAR(255),
            "hidden" BOOLEAN DEFAULT 'false',
            "finished" BOOLEAN DEFAULT 'false',
            "deleted" BOOLEAN DEFAULT 'false',
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );

        CREATE INDEX ON "courses" ("author_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    DROP TABLE IF EXISTS "courses";
    `);
  }
}
