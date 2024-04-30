import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableAnswerRenameTableName1714487627870 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "answer" RENAME TO "survey-answer"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "survey-answer" RENAME TO "answer"');
  }
}
