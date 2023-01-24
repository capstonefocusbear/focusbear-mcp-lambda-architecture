import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableUsersAddColumnMetadata1674457386031 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" ADD COLUMN "metadata" JSONB;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN IF EXISTS "metadata";
        `);
  }
}
