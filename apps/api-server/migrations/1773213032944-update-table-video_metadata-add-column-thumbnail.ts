import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableVideoMetadataAddColumnThumbnail1773213032944 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "video_metadata" ADD COLUMN IF NOT EXISTS "thumbnail_url" VARCHAR(255) DEFAULT NULL;
      ALTER TABLE "video_metadata" ADD COLUMN IF NOT EXISTS "thumbnail_width" INTEGER DEFAULT NULL;
      ALTER TABLE "video_metadata" ADD COLUMN IF NOT EXISTS "thumbnail_height" INTEGER DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "video_metadata" DROP COLUMN IF EXISTS "thumbnail_url";
      ALTER TABLE "video_metadata" DROP COLUMN IF EXISTS "thumbnail_width";
      ALTER TABLE "video_metadata" DROP COLUMN IF EXISTS "thumbnail_height";
    `);
  }
}
