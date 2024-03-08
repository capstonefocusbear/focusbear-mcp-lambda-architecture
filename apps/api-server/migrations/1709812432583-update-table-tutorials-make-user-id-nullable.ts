import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableTutorialsMakeUserIdNullable1709812432583 implements MigrationInterface {
  name = 'UpdateTableTutorialsMakeUserIdNullable1709812432583';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "tutorials" ALTER COLUMN "user_id" DROP NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "tutorials" ALTER COLUMN "user_id" SET NOT NULL');
  }
}
