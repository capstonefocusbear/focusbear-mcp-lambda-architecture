import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUsersAddColumnIsRelaxActivityGenerated1732026486650 implements MigrationInterface {
  name = 'UpdateUsersAddColumnIsRelaxActivityGenerated1732026486650';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                ALTER TABLE "users" ADD COLUMN "is_relax_activity_generated" boolean;
              `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                ALTER TABLE "users" DROP COLUMN IF EXISTS "is_relax_activity_generated";
              `);
  }
}
