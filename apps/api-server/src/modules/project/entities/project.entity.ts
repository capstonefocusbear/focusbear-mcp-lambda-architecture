import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { ProjectMember } from './project-member.entity';
import { ToDo } from '../../to-do/entities/to-do.entity';
import { ProjectStatus } from '../domain/project-status.model';

@Entity('projects')
export class Project extends BaseEntity {
  constructor({ id, ...data }: Partial<Project> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  owner_id: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    type: 'jsonb',
    default: [
      { id: 'default-todo', label: 'To Do', color: '#6B7280', order: 0, should_complete_task: false },
      { id: 'default-in-progress', label: 'In Progress', color: '#3B82F6', order: 1, should_complete_task: false },
      { id: 'default-done', label: 'Done', color: '#10B981', order: 2, should_complete_task: true },
    ],
  })
  custom_statuses?: ProjectStatus[];

  @Index()
  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  deleted_at?: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner?: User;

  @OneToMany(() => ProjectMember, (member) => member.project)
  members?: ProjectMember[];

  @OneToMany(() => ToDo, (todo) => todo.project)
  tasks?: ToDo[];
}
