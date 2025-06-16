import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFlankerTestsTable1710000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE flanker_tests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        study_participant_id UUID NOT NULL REFERENCES study_participants(id),
        total_trials INTEGER NOT NULL,
        missed_trials INTEGER NOT NULL,
        overall_accuracy DECIMAL(4,3) NOT NULL,
        congruent_accuracy DECIMAL(4,3) NOT NULL,
        incongruent_accuracy DECIMAL(4,3) NOT NULL,
        mean_rt_congruent INTEGER NOT NULL,
        mean_rt_incongruent INTEGER NOT NULL,
        trial_results JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_flanker_tests_study_participant_id ON flanker_tests(study_participant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS flanker_tests;
    `);
  }
}
