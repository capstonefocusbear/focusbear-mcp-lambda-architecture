import { Column, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { ToDoStatus } from '../domain/to-do-status.enum';
import { User } from '../../user/entities/user.entity';
import { FocusMode } from '../../focus-mode/entities/focus-mode.entity';
import { FocusModeTag } from '../../focus-mode/entities/focus-mode-tags';

@Entity('to_do')
export class ToDo extends BaseEntity {
  constructor({ id, ...track }: Partial<ToDo> = {}, options = { generateId: false }) {
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
  focus_type?: string;

  @Column({
    type: 'varchar',
    length: 255,
    default: null,
    nullable: true,
    transformer: BaseEntity.encryptField('title'),
  })
  title: string;

  @Column({
    type: 'varchar',
    length: 2000,
    default: null,
    nullable: true,
    transformer: BaseEntity.encryptField('details'),
  })
  details: string;

  @Column({ type: 'varchar', default: null, nullable: true })
  external_task_id?: string;

  @Column({ type: 'jsonb', default: null, nullable: true })
  external_task_metadata?: any;

  @Column({ type: 'timestamptz', default: null, nullable: true })
  due_date?: Date;

  @Column({ type: 'smallint', default: 1, nullable: true })
  eisenhower_quadrant: number;

  @Column({ type: 'enum', enum: ToDoStatus, default: ToDoStatus.NOT_STARTED })
  status: ToDoStatus;

  @ManyToOne(() => User, (user) => user.to_dos, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => FocusMode, (focus_mode) => focus_mode.to_dos, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'focus_type' })
  focus_mode?: FocusMode;

  @ManyToMany(() => FocusModeTag, { cascade: true, eager: true })
  @JoinTable()
  tags?: FocusModeTag[];
}
