import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { FocusMode } from './focus-mode.entity';

export enum PauseFriction {
  NONE = 'none',
  TIMER = 'timer',
  RANDOM_CHARS = '100_random_chars',
  PASSWORD = 'password',
}

export enum BlockLevel {
  GENTLE = 'gentle',
  STRICT = 'strict',
}

@Entity('blocking_schedules')
export class BlockingSchedule extends BaseEntity {
  constructor({ id, ...data }: Partial<BlockingSchedule> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name?: string;

  @Column({
    type: 'time',
    nullable: false,
  })
  start_time?: string;

  @Column({
    type: 'time',
    nullable: false,
  })
  end_time?: string;

  @Column({
    type: 'jsonb',
    nullable: false,
  })
  days_of_week?: number[]; // Array of day numbers (0-6, where 0 is Sunday)

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  focus_mode_id?: string;

  @Column({
    type: 'enum',
    enum: PauseFriction,
    default: PauseFriction.NONE,
  })
  pause_friction?: PauseFriction;

  @Column({
    type: 'enum',
    enum: BlockLevel,
    default: BlockLevel.STRICT,
  })
  block_level?: BlockLevel;

  @Column({
    type: 'boolean',
    default: false,
  })
  is_ai_blocking_enabled?: boolean;

  @ManyToOne(() => User, (user) => user.blocking_schedules, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => FocusMode, (focus_mode) => focus_mode.blocking_schedules, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'focus_mode_id' })
  focus_mode?: FocusMode;
}
