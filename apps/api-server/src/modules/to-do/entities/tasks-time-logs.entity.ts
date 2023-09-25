import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { CompletedFocusBlock } from '../../focus-mode/entities/completed-focus-block.entity';
import { ToDo } from './to-do.entity';
import { ColumnNumericTransformer } from '../../../shared/transformers/numeric-column-transformer';

@Entity('tasks_time_logs')
export class TaskTimeLog extends BaseEntity {
  constructor({ id, ...track }: Partial<TaskTimeLog> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...track });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: true,
  })
  completed_focus_block_id?: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: true,
  })
  task_id?: string;

  @Index()
  @Column({
    type: 'numeric',
    nullable: true,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  duration_logged_seconds?: number;

  @Column({
    type: 'varchar',
    nullable: true,
    transformer: BaseEntity.encryptField('note'),
  })
  note?: string;

  @ManyToOne(() => User, (user) => user.to_dos, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => ToDo, (toDo) => toDo.task_time_logs, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  to_do?: ToDo;

  @ManyToOne(() => CompletedFocusBlock, (completedFocusBlock) => completedFocusBlock.to_dos, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'completed_focus_block_id' })
  completed_focus_block?: CompletedFocusBlock;
}
