import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableTracksAddColumnsDurationAndThumbnail1673513503341 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "tracks" ADD COLUMN "duration" character varying;
        ALTER TABLE "tracks" ADD COLUMN "thumbnail_file_name" character varying;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "tracks" DROP COLUMN IF EXISTS "duration";
        ALTER TABLE "tracks" DROP COLUMN IF EXISTS "thumbnail_file_name";
    `);
  }
}
