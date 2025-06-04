import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UsageType {
  APP = 'app',
  WEBSITE = 'website',
}

@Entity('usage_data')
export class UsageData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'source_name' })
  sourceName: string;

  @Column({
    name: 'usage_type',
    type: 'enum',
    enum: UsageType,
  })
  usageType: UsageType;

  @Column({ name: 'usage_category' })
  usageCategory: string;

  @Column({ name: 'platform' })
  platform: string;

  @Column({ name: 'device_id' })
  deviceId: string;

  @Column({ name: 'usage_start_date', type: 'date' })
  usageStartDate: Date;

  @Column({ name: 'usage_end_date', type: 'date' })
  usageEndDate: Date;

  @Column({ name: 'minutes_used_total', type: 'integer' })
  minutesUsedTotal: number;

  @Column({ name: 'minutes_used_during_sleep_window', type: 'integer' })
  minutesUsedDuringSleepWindow: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
