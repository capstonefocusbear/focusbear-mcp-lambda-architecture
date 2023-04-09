import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { ActivityData } from '../../activity/domain/activity-data.model';
import { LogSummaryType } from '../../activity/domain/log-summary-type.enum';
import { User } from '../../user/entities/user.entity';
import { HabitPack } from '../../habit-pack/entity/habit-pack.entity';
import { Activity } from '../../activity/entities/activity.entity';
import { ActivitySequence } from '../../activity/entities/activity-sequence.entity';
import { LogQuantityQuestion } from '../../activity/entities/log-quantity-questions';

@Entity('activity_template')
export class ActivityTemplate extends BaseEntity {
  constructor({ id, ...activity }: Partial<ActivityTemplate> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...activity });
  }

  @Column({
    type: 'uuid',
    nullable: false,
  })
  pack_id?: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'varchar',
  })
  activity_type?: string;

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
    type: 'jsonb',
    nullable: false,
    transformer: BaseEntity.encryptJSONField('activity_data'),
  })
  activity_data?: ActivityData;

  @Column({
    type: 'boolean',
    default: false,
  })
  has_choices?: boolean;

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
    type: 'uuid',
  })
  parent_id?: string;

  @Column({
    type: 'numeric',
    nullable: false,
    default: 0,
  })
  sequence_index?: number;

  @DeleteDateColumn()
  deleted_at?: Date;

  @ManyToOne(() => ActivityTemplate, (activity_template) => activity_template.choices, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent_activity?: ActivitySequence;

  @OneToMany(() => ActivityTemplate, (activity_template) => activity_template.parent_activity)
  choices?: ActivityTemplate[];

  @OneToMany(() => LogQuantityQuestion, (question) => question.activity_template)
  log_quantity_questions?: LogQuantityQuestion[];

  @ManyToOne(() => HabitPack, (habit_pack) => habit_pack.activity_templates, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn({ name: 'pack_id' })
  habit_pack?: HabitPack;

  @ManyToOne(() => User, (user) => user.activity_templates)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @OneToMany(() => Activity, (activity) => activity.activity_template)
  activities?: Activity[];
}
