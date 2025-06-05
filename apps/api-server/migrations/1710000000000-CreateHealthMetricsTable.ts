import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHealthMetricsTable1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE metric_type_enum AS ENUM (
        'hours_of_sleep',
        'hours_of_standing',
        'number_of_steps_moved'
      );

      CREATE TABLE health_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        metric_type metric_type_enum NOT NULL,
        day_of_tracking date NOT NULL,
        metric_value NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_health_metrics_user_id ON health_metrics (user_id);
      CREATE INDEX idx_health_metrics_metric_type ON health_metrics (metric_type);
      CREATE INDEX idx_health_metrics_day_of_tracking ON health_metrics (day_of_tracking);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE health_metrics;
      DROP TYPE metric_type_enum;
    `);
  }
}
