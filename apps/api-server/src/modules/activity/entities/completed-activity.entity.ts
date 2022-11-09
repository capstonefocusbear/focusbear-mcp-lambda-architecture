import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { Activity } from './activity.entity';
import { ActivitySequence } from './activity-sequence.entity';
import { CompletedActivitySequence } from './completed-activity-sequence.entity';

@Entity('completed_activities')
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

  @ManyToOne(() => User, (user) => user.completed_activities)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Activity, (activity) => activity.completed_activities)
  @JoinColumn({ name: 'activity_id' })
  activity?: Activity;

  @ManyToOne(() => ActivitySequence, (sequence) => sequence.completed_activities)
  @JoinColumn({ name: 'activity_sequence_id' })
  activity_sequence?: ActivitySequence;

  @ManyToOne(() => CompletedActivitySequence, (sequence_log) => sequence_log.completed_activity_logs)
  @JoinColumn({ name: 'completed_sequence_id' })
  completed_sequence_log?: CompletedActivitySequence;
}
