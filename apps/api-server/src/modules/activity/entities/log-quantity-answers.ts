import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { ColumnNumericTransformer } from '../../../shared/transformers/numeric-column-transformer';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { Activity } from './activity.entity';
import { LogQuantityQuestion } from './log-quantity-questions';
import { CompletedActivity } from './completed-activity.entity';

@Entity('log_quantity_answers')
export class LogQuantityAnswer extends BaseEntity {
  constructor({ id, ...questionData }: Partial<LogQuantityAnswer> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...questionData });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  activity_id?: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  question_id?: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  completed_activity_log_id?: string;

  @Column({
    type: 'numeric',
    nullable: false,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  logged_value?: number;

  @Column({
    type: 'timestamptz',
    nullable: false,
    default: new Date(),
  })
  date_logged?: Date;

  @ManyToOne(() => User, (user) => user.log_quantity_answers, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Activity, (activity) => activity.completed_activities, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity?: Activity;

  @ManyToOne(() => LogQuantityQuestion, (question) => question.answers, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question?: LogQuantityQuestion;

  @ManyToOne(() => CompletedActivity, (completedActivity) => completedActivity.answers, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'completed_activity_log_id' })
  completed_activity?: CompletedActivity;
}
