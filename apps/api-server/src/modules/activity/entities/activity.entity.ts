import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { ActivityData } from '../domain/activity-data.model';
import { ActivityType } from '../domain/activity-type.enum';
import { LogSummaryType } from '../domain/log-summary-type.enum';
import { ActivitySequence } from './activity-sequence.entity';
import { CompletedActivity } from './completed-activity.entity';

@Entity('activities')
export class Activity extends BaseEntity {
  constructor({ id, ...activity }: Partial<Activity> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...activity });
  }

  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'uuid',
  })
  parent_id?: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  has_choices?: boolean;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  activity_sequence_id?: string;

  @Column({
    type: 'enum',
    name: 'activity_type',
    enum: ActivityType,
    nullable: false,
  })
  type?: ActivityType;

  @Column({
    type: 'enum',
    enum: LogSummaryType,
    default: LogSummaryType.SUM,
  })
  log_summary_type?: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  log_quantity?: boolean;

  @Column({
    type: 'numeric',
    nullable: false,
  })
  duration_seconds?: number;

  @Column({
    type: 'jsonb',
    nullable: false,
    transformer: BaseEntity.encrypteJSONField('activity_data'),
  })
  activity_data?: ActivityData;

  @ManyToOne(() => ActivitySequence, (activity_sequence) => activity_sequence.activities)
  @JoinColumn({ name: 'activity_sequence_id' })
  activity_sequence?: ActivitySequence;

  @OneToMany(() => CompletedActivity, (completed_activity) => completed_activity.activity)
  completed_activities?: CompletedActivity[];

  @ManyToOne(() => Activity, (activity) => activity.choices)
  @JoinColumn({ name: 'parent_id' })
  parent_activity?: ActivitySequence;

  @OneToMany(() => Activity, (activity) => activity.parent_activity)
  choices?: Activity[];

  @ManyToOne(() => User, (user) => user.current_activity)
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
