import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum HealthMetricType {
  HOURS_OF_SLEEP = 'hours_of_sleep',
  MINUTES_OF_MOVEMENT = 'minutes_of_movement',
  NUMBER_OF_STEPS_MOVED = 'number_of_steps_moved',
}

@Entity('health_metrics')
export class HealthMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    name: 'metric_type',
    type: 'enum',
    enum: HealthMetricType,
  })
  metricType: HealthMetricType;

  @Column({ name: 'day_of_tracking', type: 'date' })
  dayOfTracking: Date;

  @Column({ name: 'metric_value', type: 'float' })
  metricValue: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
