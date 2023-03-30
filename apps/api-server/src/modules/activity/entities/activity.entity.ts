import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { ActivityData } from '../domain/activity-data.model';
import { ActivityType } from '../domain/activity-type.enum';
import { LogSummaryType } from '../domain/log-summary-type.enum';
import { ActivitySequence } from './activity-sequence.entity';
import { CompletedActivity } from './completed-activity.entity';
import { ActivityTemplate } from '../../activity-template/entity/activity-template.entity';
import { DaysOfWeek } from '../domain/days-of-week.enum';

@Entity('activities')
export class Activity extends BaseEntity {
  constructor({ id, log_summary_type, ...activity }: Partial<Activity> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...activity, log_summary_type: log_summary_type || LogSummaryType.SUM });
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
    type: 'uuid',
  })
  activity_template_id?: string;

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
    type: 'varchar',
    default: null,
  })
  completion_requirements?: string;

  @Column({
    type: 'jsonb',
    nullable: false,
    transformer: BaseEntity.encryptJSONField('activity_data'),
  })
  activity_data?: ActivityData;

  @Column({
    type: 'boolean',
    default: false,
  })
  is_default?: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  run_micro_breaks?: boolean;

  @Column({
    type: 'jsonb',
  })
  days_of_week?: DaysOfWeek[];

  @ManyToOne(() => ActivitySequence, (activity_sequence) => activity_sequence.activities, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_sequence_id' })
  activity_sequence?: ActivitySequence;

  @OneToMany(() => CompletedActivity, (completed_activity) => completed_activity.activity, {
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  completed_activities?: CompletedActivity[];

  @ManyToOne(() => Activity, (activity) => activity.choices, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent_activity?: ActivitySequence;

  @OneToMany(() => Activity, (activity) => activity.parent_activity)
  choices?: Activity[];

  @OneToOne(() => User, (user) => user.current_activity)
  user?: User;

  @ManyToOne(() => User, (user) => user.activities, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user_activities?: User;

  @ManyToOne(() => ActivityTemplate, (activity_template) => activity_template.activities, {
    onDelete: 'NO ACTION',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_template_id' })
  activity_template?: ActivityTemplate;
}
