import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudyParticipantsTable1710000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE app_activation_status_enum AS ENUM ('data_collection_mode', 'all_interventions_active');

      CREATE TABLE study_participants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        participant_code VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        user_id UUID,
        metadata JSONB,
        assigned_group VARCHAR(255),
        app_activation_status app_activation_status_enum NOT NULL DEFAULT 'data_collection_mode',
        usage_data_last_received DATE,
        health_data_last_received DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_study_participants_user_id ON study_participants(user_id);
      CREATE INDEX idx_study_participants_code ON study_participants(participant_code);
      CREATE INDEX idx_study_participants_email ON study_participants(email);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS study_participants;
      DROP TYPE IF EXISTS app_activation_status_enum;
    `);
  }
}
