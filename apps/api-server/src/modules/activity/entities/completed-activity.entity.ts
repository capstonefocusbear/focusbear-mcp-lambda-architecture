import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { Activity } from './activity.entity';
import { ActivitySequence } from './activity-sequence.entity';
import { CompletedActivitySequence } from './completed-activity-sequence.entity';
import { CompletedActivityMetadata } from '../domain/completed-activity.metadata';

@Entity('completed_activities')
@Unique('unique_index_activity_id_completed_sequence_id', ['activity_id', 'completed_sequence_id'])
export class CompletedActivity extends BaseEntity {
  constructor(
    { id, ...sequence }: Partial<CompletedActivity> = {},
    options = { generateId: false, log_quantity: false },
  ) {
    super(id, { ...options });
    const quantity_logged = options.log_quantity ? sequence.quantity_logged : null;
    Object.assign(this, { ...sequence, quantity_logged });
  }

  @Column({
    type: 'uuid',
  })
  user_id?: string;

  @Column({
    type: 'uuid',
  })
  activity_id?: string;

  @Column({
    type: 'uuid',
  })
  activity_sequence_id?: string;

  @Column({
    type: 'timestamp',
  })
  start_time?: Date;

  @Column({
    type: 'timestamp',
  })
  finish_time?: Date;

  @Column({
    type: 'numeric',
  })
  quantity_logged?: number;

  @Column({
    type: 'numeric',
  })
  duration_logged?: number;

  @Column({
    type: 'uuid',
  })
  completed_sequence_id?: string;

  @Column({
    type: 'text',
    transformer: BaseEntity.encryptField('activity_note'),
  })
  activity_note?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata?: CompletedActivityMetadata;

  @ManyToOne(() => User, (user) => user.completed_activities, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Activity, (activity) => activity.completed_activities, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity?: Activity;

  @ManyToOne(() => ActivitySequence, (sequence) => sequence.completed_activities, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_sequence_id' })
  activity_sequence?: ActivitySequence;

  @ManyToOne(() => CompletedActivitySequence, (sequence_log) => sequence_log.completed_activity_logs, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'completed_sequence_id' })
  completed_sequence_log?: CompletedActivitySequence;
}
