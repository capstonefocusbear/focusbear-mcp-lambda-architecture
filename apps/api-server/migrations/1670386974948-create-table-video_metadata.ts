import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableVideoMetadata1670386974948 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "video_metadata" (
            "id" VARCHAR(255) PRIMARY KEY NOT NULL,
            "video_url" VARCHAR(255) NOT NULL,
            "title" VARCHAR(255),
            "duration" VARCHAR(255),
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE IF EXISTS "video_metadata";
    `);
  }
}
