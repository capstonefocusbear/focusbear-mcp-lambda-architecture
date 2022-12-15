import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableCompletedActivityCreateUniqueConstraint1670576100590 implements MigrationInterface {
  name = 'updateTableCompletedActivityCreateUniqueConstraint1670576100590';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "unique_index_activity_id_completed_sequence_id" UNIQUE ("activity_id", "completed_sequence_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "completed_activities" DROP CONSTRAINT "unique_index_activity_id_completed_sequence_id"',
    );
  }
}
