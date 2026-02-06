import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { ToDo } from './to-do.entity';

@Entity('task_attachments')
export class TaskAttachment extends BaseEntity {
  constructor({ id, ...data }: Partial<TaskAttachment> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  task_id: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: false,
  })
  file_name: string;

  @Column({
    type: 'varchar',
    length: 1000,
    nullable: false,
  })
  file_key: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  content_type: string;

  @Column({
    type: 'bigint',
    nullable: false,
  })
  file_size: number;

  @ManyToOne(() => ToDo, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task?: ToDo;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
