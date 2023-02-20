import { Entity, Column, ManyToOne, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { DailyStats } from '../../user/entities/user-daily-stats.entity';
import { User } from '../../user/entities/user.entity';
import { ActivitySequence } from './activity-sequence.entity';
import { CompletedActivity } from './completed-activity.entity';

@Entity('completed_activity_sequences')
export class CompletedActivitySequence extends BaseEntity {
  constructor({ id, ...sequence }: Partial<CompletedActivitySequence> = {}, options = { generateId: false }) {
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
  duration_minutes?: number;

  @Column({
    type: 'numeric',
  })
  plan_duration_minutes?: number;

  @Column({
    type: 'boolean',
    nullable: false,
  })
  is_completed?: boolean;

  @Column({
    type: 'integer',
  })
  duration_percent_deviation?: number;

  @ManyToOne(() => User, (user) => user.completed_activity_sequences)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => ActivitySequence, (sequence) => sequence.completed_activity_sequences, { eager: true })
  @JoinColumn({ name: 'activity_sequence_id' })
  activity_sequence?: ActivitySequence;

  @OneToMany(() => CompletedActivity, (activity_log) => activity_log.completed_sequence_log)
  completed_activity_logs?: CompletedActivity[];

  @OneToOne(() => DailyStats, (daily_stat) => daily_stat.morning_sequence_log)
  completed_morning_sequence?: DailyStats;

  @OneToOne(() => DailyStats, (daily_stat) => daily_stat.evening_sequence_log)
  completed_evening_sequence?: DailyStats;

  finalizeUncompletedLog() {
    this.setMetrics();
    this.is_completed = true;
    this.finish_time = this.defineSequenceFinishTime();
  }

  private defineSequenceFinishTime() {
    if (!this?.completed_activity_logs) return null;
    const getEndDate = (e) => e?.finish_time;
    const removeNulls = (e) => !!e;
    const sortDesc = (a: Date, b: Date) => b.getTime() - a.getTime();
    const [latest] = this.completed_activity_logs.map(getEndDate).filter(removeNulls).sort(sortDesc);
    return latest;
  }

  private setMetrics() {
    this.plan_duration_minutes = this?.activity_sequence?.sequenceDurationMinutes ?? 0;
    this.duration_minutes = this.countFactSequenceDurationMinutes();
    this.duration_percent_deviation = this.countDurationPercentDeviation();
  }

  private countFactSequenceDurationMinutes(): number {
    const extractDuration = (e) => e?.duration_logged ?? 0;
    const loggedDurationsInSeconds = this.completed_activity_logs?.map(extractDuration);
    if (!loggedDurationsInSeconds) return 0;
    const addUp = (previousValue, currentValue) => Number(previousValue) + Number(currentValue);
    const totalInSeconds = loggedDurationsInSeconds.reduce(addUp, 0);
    const totalInMinutes = totalInSeconds / 60;
    return totalInMinutes;
  }

  private countDurationPercentDeviation(): number {
    if (!this.plan_duration_minutes) return 0;
    return Math.round((this.duration_minutes / this.plan_duration_minutes) * 100 - 100);
  }
}
