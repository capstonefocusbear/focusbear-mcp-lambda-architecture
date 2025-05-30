import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum AppActivationStatus {
  DATA_COLLECTION_MODE = 'data_collection_mode',
  ALL_INTERVENTIONS_ACTIVE = 'all_interventions_active',
}

@Entity('study_participants')
export class StudyParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'participant_code', unique: true })
  participantCode: string;

  @Column({ name: 'email', unique: true })
  email: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'assigned_group' })
  assignedGroup: string;

  @Column({
    name: 'app_activation_status',
    type: 'enum',
    enum: AppActivationStatus,
    default: AppActivationStatus.DATA_COLLECTION_MODE,
  })
  appActivationStatus: AppActivationStatus;

  @Column({ name: 'usage_data_last_received', type: 'date', nullable: true })
  usageDataLastReceived: Date;

  @Column({ name: 'health_data_last_received', type: 'date', nullable: true })
  healthDataLastReceived: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
