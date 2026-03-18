import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSyncedAtToSyncedProjects1773830667724 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "synced_projects" ADD "synced_at" TIMESTAMPTZ');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "synced_projects" DROP COLUMN "synced_at"');
  }
}
