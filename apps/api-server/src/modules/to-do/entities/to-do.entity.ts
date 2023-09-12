import { Column, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { ToDoStatus } from '../domain/to-do-status.enum';
import { User } from '../../user/entities/user.entity';
import { FocusMode } from '../../focus-mode/entities/focus-mode.entity';
import { FocusModeTag } from '../../focus-mode/entities/focus-mode-tags';
import { CompletedFocusBlock } from '../../focus-mode/entities/completed-focus-block.entity';
import { TaskTimeLog } from './tasks-time-logs.entity';
import { SyncedProject } from './synced-project.entity';

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

  @Index()
  @Column({
    type: 'uuid',
    nullable: true,
  })
  synced_project_id?: string;

  @Column({
    type: 'varchar',
    length: 10000,
    default: null,
    nullable: true,
    transformer: BaseEntity.encryptField('title'),
  })
  title: string;

  @Column({
    type: 'varchar',
    length: 32000,
    default: null,
    nullable: true,
    transformer: BaseEntity.encryptField('details'),
  })
  details: string;

  @Column({ type: 'varchar', default: null, nullable: true })
  external_task_id?: string;

  @Column({ type: 'jsonb', default: null, nullable: true, select: false })
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

  @ManyToOne(() => SyncedProject, (syncedProject) => syncedProject.to_dos, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'synced_project_id' })
  synced_project?: SyncedProject;

  @ManyToOne(() => FocusMode, (focus_mode) => focus_mode.to_dos, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'focus_type' })
  focus_mode?: FocusMode;

  @OneToMany(() => TaskTimeLog, (timeLog) => timeLog.to_do)
  task_time_logs?: TaskTimeLog[];

  @ManyToMany(() => FocusModeTag, { cascade: true, eager: true })
  @JoinTable()
  tags?: FocusModeTag[];

  @ManyToMany(() => CompletedFocusBlock, (completedFocusBlock) => completedFocusBlock.to_dos)
  completedFocusBlocks: CompletedFocusBlock[];
}
