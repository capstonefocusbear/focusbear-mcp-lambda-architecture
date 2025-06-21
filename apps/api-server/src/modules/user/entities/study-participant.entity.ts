import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';

export enum AppActivationStatus {
  DATA_COLLECTION_MODE = 'data_collection_mode',
  ALL_INTERVENTIONS_ACTIVE = 'all_interventions_active',
  END_OF_STUDY = 'end_of_study',
}

@Entity('study_participants')
export class StudyParticipant extends BaseEntity {
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

  @Column({ name: 'assigned_group', nullable: true })
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

  @Column({ name: 'is_questionnaire_completed', type: 'boolean', default: false })
  isQuestionnaireCompleted: boolean;

  @Column({ name: 'is_eos_questionnaire_completed', type: 'boolean', default: false })
  isEndOfStudyQuestionnaireCompleted: boolean;

  @Column({ name: 'flanker_effect', type: 'float', nullable: true })
  flankerEffect: number;

  @Column({
    name: 'phone_number',
    type: 'varchar',
    length: 255,
    nullable: true,
    transformer: BaseEntity.encryptField('phone_number'),
  })
  phoneNumber: string;

  @Column({ name: 'opted_out', type: 'boolean', default: false })
  optedOut: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
