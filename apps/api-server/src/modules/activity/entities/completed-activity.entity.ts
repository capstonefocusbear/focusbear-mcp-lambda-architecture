import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { Activity } from './activity.entity';
import { ActivitySequence } from './activity-sequence.entity';

@Entity('completed_activities')
export class CompletedActivity extends BaseEntity {
  constructor({ id, ...sequence }: Partial<CompletedActivity> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...sequence });
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
  timestamp?: Date;

  @Column({
    type: 'numeric',
  })
  quantity_logged?: number;

  @Column({
    type: 'text',
    transformer: BaseEntity.encrypteField('activity_note'),
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
  activity_secuence?: ActivitySequence;
}
