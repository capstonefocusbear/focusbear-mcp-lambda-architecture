import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { ToDo } from './to-do.entity';

@Entity('task_comments')
export class TaskComment extends BaseEntity {
  constructor({ id, ...data }: Partial<TaskComment> = {}, options = { generateId: false }) {
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
    type: 'text',
    nullable: false,
    transformer: BaseEntity.encryptField('content'),
  })
  content: string;

  @ManyToOne(() => ToDo, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task?: ToDo;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
