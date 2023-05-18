import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableLogQuantityQuestionsAllowNullValues1684388973979 implements MigrationInterface {
  name = 'UpdateTableLogQuantityQuestionsAllowNullValues1684388973979';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "log_quantity_questions" ALTER COLUMN "min_value_description" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "log_quantity_questions" ALTER COLUMN "max_value_description" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "log_quantity_questions" ALTER COLUMN "min_value" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "log_quantity_questions" ALTER COLUMN "max_value" DROP NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "log_quantity_questions" ALTER COLUMN "max_value" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "log_quantity_questions" ALTER COLUMN "min_value" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "log_quantity_questions" ALTER COLUMN "max_value_description" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "log_quantity_questions" ALTER COLUMN "min_value_description" SET NOT NULL');
  }
}
