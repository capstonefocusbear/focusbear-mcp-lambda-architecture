import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';

@Entity('habit_library_requests')
export class HabitLibraryRequest extends BaseEntity {
  constructor(partial: Partial<HabitLibraryRequest> = {}, options = { generateId: true }) {
    super(partial?.id, options);
    Object.assign(this, partial);
  }

  @Index()
  @Column({ type: 'uuid', nullable: true })
  user_id?: string | null;

  @Column({ type: 'text' })
  goal!: string;

  @Column({ type: 'text' })
  habit_name!: string;

  @Column({ type: 'text', nullable: true })
  habit_description?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  routine_type?: string | null;

  @Column({ type: 'integer', nullable: true })
  duration_minutes?: number | null;

  @Column({ type: 'text', nullable: true })
  justification?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  request_metadata?: Record<string, unknown> | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;
}
