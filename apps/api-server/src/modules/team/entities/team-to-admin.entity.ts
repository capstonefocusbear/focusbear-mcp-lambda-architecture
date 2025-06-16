import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Team } from './team.entity';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';

@Entity()
export class TeamToAdmin extends BaseEntity {
  constructor({ id, ...teamToAdmin }: Partial<TeamToAdmin> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...teamToAdmin });
  }

  @Column({
    type: 'uuid',
    nullable: false,
    unique: false,
  })
  team_id: string;

  @Column({ type: 'uuid', nullable: false, unique: false })
  admin_id: string;

  // @TODO remove redundant data
  @Column({ type: 'varchar', nullable: true, unique: false, transformer: BaseEntity.encryptField('first_name') })
  first_name?: string;

  // @TODO remove redundant data
  @Column({ type: 'varchar', nullable: true, unique: false, transformer: BaseEntity.encryptField('last_name') })
  last_name?: string;

  @ManyToOne(() => User, (admin) => admin.teamToAdmin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_id' })
  admin: User;

  @ManyToOne(() => Team, (team) => team.teamToAdmin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;
}
