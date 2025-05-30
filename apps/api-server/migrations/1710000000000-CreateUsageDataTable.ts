import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsageDataTable1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE usage_type_enum AS ENUM ('app', 'website');

      CREATE TABLE usage_data (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        source_name VARCHAR(255) NOT NULL,
        usage_type usage_type_enum NOT NULL,
        usage_category VARCHAR(255) NOT NULL,
        usage_start_date DATE NOT NULL,
        usage_end_date DATE NOT NULL,
        minutes_used_total INTEGER NOT NULL,
        minutes_used_during_sleep_window INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_usage_data_user_id ON usage_data(user_id);
      CREATE INDEX idx_usage_data_date_range ON usage_data(usage_start_date, usage_end_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS usage_data;
      DROP TYPE IF EXISTS usage_type_enum;
    `);
  }
}
