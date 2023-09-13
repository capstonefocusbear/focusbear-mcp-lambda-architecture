import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { ToDo } from './to-do.entity';

@Entity('synced_projects')
export class SyncedProject extends BaseEntity {
  constructor({ id, ...track }: Partial<SyncedProject> = {}, options = { generateId: false }) {
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
    type: 'varchar',
    nullable: true,
  })
  platform?: string;

  @Index()
  @Column({
    type: 'varchar',
    nullable: true,
  })
  external_project_id?: string;

  @Index()
  @Column({
    type: 'varchar',
    nullable: true,
  })
  external_portal_id?: string;

  @Column({ type: 'jsonb', default: null, nullable: true })
  available_statuses?: any;

  @ManyToOne(() => User, (user) => user.to_dos, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @OneToMany(() => ToDo, (toDo) => toDo.synced_project)
  to_dos?: ToDo[];
}
