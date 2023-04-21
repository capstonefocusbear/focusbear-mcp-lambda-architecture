import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { ColumnNumericTransformer } from '../../../shared/transformers/numeric-column-transformer';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { Activity } from './activity.entity';
import { LogQuantityAnswer } from './log-quantity-answers';
import { ActivityTemplate } from '../../activity-template/entity/activity-template.entity';
import { LogSummaryType } from '../domain/log-summary-type.enum';

@Entity('log_quantity_questions')
export class LogQuantityQuestion extends BaseEntity {
  constructor({ id, ...questionData }: Partial<LogQuantityQuestion> = {}, options = { generateId: false }) {
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
    nullable: true,
  })
  activity_id?: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: true,
  })
  activity_template_id?: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: true,
    default: null,
  })
  linked_question_id?: string;

  @Column({ type: 'varchar', nullable: false })
  question?: string;

  @Column({ type: 'varchar', nullable: false })
  min_value_description?: string;

  @Column({ type: 'varchar', nullable: false })
  max_value_description?: string;

  @Column({
    type: 'numeric',
    nullable: false,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  min_value?: number;

  @Column({
    type: 'numeric',
    nullable: false,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  max_value?: number;

  @Column({
    type: 'enum',
    enum: LogSummaryType,
    default: LogSummaryType.SUM,
    nullable: false,
  })
  log_summary_type?: string;

  @ManyToOne(() => User, (user) => user.log_quantity_questions, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Activity, (activity) => activity.log_quantity_questions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_id' })
  activity?: Activity;

  @ManyToOne(() => ActivityTemplate, (activity) => activity.log_quantity_questions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_template_id' })
  activity_template?: ActivityTemplate;

  @OneToMany(() => LogQuantityAnswer, (answer) => answer.question)
  answers?: LogQuantityAnswer[];

  @ManyToOne(() => LogQuantityQuestion, (question) => question.linked_questions, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'linked_question_id' })
  linked_question?: LogQuantityQuestion;

  @OneToMany(() => LogQuantityQuestion, (question) => question.linked_question)
  linked_questions?: Activity[];
}
