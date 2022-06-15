import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { ActivitySequence } from './activity-sequence.entity';

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

  @ManyToOne(() => User, (user) => user.completed_activity_sequences)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => ActivitySequence, (sequence) => sequence.completed_activity_sequences)
  @JoinColumn({ name: 'activity_sequence_id' })
  activity_secuence?: ActivitySequence;
}
