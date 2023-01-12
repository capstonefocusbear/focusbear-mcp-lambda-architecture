import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableTracksAddColumnFileName1673407235855 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "tracks" DROP COLUMN IF EXISTS "download_url";
        ALTER TABLE "tracks" ADD COLUMN "file_name" character varying;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    ALTER TABLE "tracks" ADD COLUMN "download_url" character varying;
    ALTER TABLE "tracks" DROP COLUMN IF EXISTS "file_name";
`);
  }
}
