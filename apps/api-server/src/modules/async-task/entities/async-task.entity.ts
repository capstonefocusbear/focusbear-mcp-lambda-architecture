import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { AsyncTaskStatus } from '../domain/async-task-status.enum';

@Entity('async_tasks')
export class AsyncTask extends BaseEntity {
  constructor({ id, ...asyncTask }: Partial<AsyncTask> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...asyncTask });
  }

  @Column({
    type: 'enum',
    enum: AsyncTaskStatus,
    default: AsyncTaskStatus.PENDING,
    nullable: false,
  })
  status?: AsyncTaskStatus;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata?: Record<string, any>;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  expires_at?: string;
}
