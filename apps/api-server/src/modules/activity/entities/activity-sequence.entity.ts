import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { ActivityType } from '../domain/activity-type.enum';
import { User } from '../../user/entities/user.entity';
import { Activity } from './activity.entity';
import { CompletedActivity } from './completed-activity.entity';
import { CompletedActivitySequence } from './completed-activity-sequence.entity';
import { HabitPack } from '../../habit-pack/entity/habit-pack.entity';

@Entity('activity_sequences')
export class ActivitySequence extends BaseEntity {
  constructor({ id, ...sequence }: Partial<ActivitySequence> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...sequence });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
    nullable: false,
  })
  type?: ActivityType;

  @Column({
    type: 'jsonb',
    nullable: false,
    transformer: BaseEntity.encryptJSONField('activity_ids'),
  })
  activity_ids?: string[];

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  generated_sequence_activity_ids?: string[];

  @Column({
    type: 'numeric',
    nullable: false,
  })
  total_duration_seconds?: number;

  @Column({
    type: 'numeric',
    nullable: true,
  })
  generated_total_duration_seconds?: number;

  @Index()
  @Column({
    type: 'uuid',
    nullable: true,
  })
  pack_id?: string;

  @ManyToOne(() => User, (user) => user.activity_sequences, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => HabitPack, (habit_pack) => habit_pack.activity_sequences, { eager: true })
  @JoinColumn({ name: 'pack_id' })
  habit_pack?: HabitPack;

  @OneToMany(() => Activity, (activity) => activity.activity_sequence)
  activities?: Activity[];

  @OneToMany(() => CompletedActivity, (completed) => completed.activity_sequence)
  completed_activities?: CompletedActivity[];

  @OneToMany(() => CompletedActivitySequence, (completed_sequence) => completed_sequence.activity_sequence)
  completed_activity_sequences?: CompletedActivitySequence[];

  get sequenceActivityIds() {
    return this.generated_sequence_activity_ids || this.activity_ids;
  }

  get sequenceDurationSeconds() {
    return this.generated_total_duration_seconds || this.total_duration_seconds;
  }

  get sequenceDurationMinutes() {
    return this.sequenceDurationSeconds / 60;
  }

  resetFlexSequence() {
    this.generated_sequence_activity_ids = null;
    this.generated_total_duration_seconds = null;
  }
}
