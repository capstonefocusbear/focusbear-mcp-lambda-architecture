import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCompletedActivitySequenceAddIndex1743770464413 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX "IDX_o667gpof3w61vudhm34dhlwm8q" ON "completed_activity_sequences" ("is_completed") ',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_o667gpof3w61vudhm34dhlwm8q"');
  }
}
