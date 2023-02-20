import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ColumnNumericTransformer } from '../../../shared/transformers/numeric-column-transformer';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { CompletedActivitySequence } from '../../activity/entities/completed-activity-sequence.entity';
import { User } from './user.entity';

@Entity('daily_stats')
export class DailyStats extends BaseEntity {
  constructor({ id, ...user }: Partial<DailyStats> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...user });
  }

  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'timestamptz',
  })
  date_completed?: Date;

  @Column({
    type: 'numeric',
    precision: 2,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  focus_modes_completed?: number;

  @Column({
    type: 'numeric',
    precision: 2,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  morning_routine_completion_percentage?: number;

  @Column({
    type: 'numeric',
    precision: 2,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  evening_routine_completion_percentage?: number;

  @Column({
    type: 'boolean',
  })
  should_recalculate?: boolean;

  @Column({
    type: 'uuid',
    nullable: true,
  })
  morning_sequence_log_id?: string;

  @Column({
    type: 'uuid',
    nullable: true,
  })
  evening_sequence_log_id?: string;

  @OneToOne(() => CompletedActivitySequence, (completed_sequence) => completed_sequence.completed_morning_sequence)
  @JoinColumn({ name: 'morning_sequence_log_id' })
  morning_sequence_log?: CompletedActivitySequence;

  @OneToOne(() => CompletedActivitySequence, (completed_sequence) => completed_sequence.completed_morning_sequence)
  @JoinColumn({ name: 'evening_sequence_log_id' })
  evening_sequence_log?: CompletedActivitySequence;

  @ManyToOne(() => User, (user) => user.consents)
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
