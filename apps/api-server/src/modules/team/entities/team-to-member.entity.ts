import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Team } from './team.entity';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';

@Entity()
export class TeamToMember extends BaseEntity {
  constructor({ id, ...teamToMember }: Partial<TeamToMember> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...teamToMember });
  }

  @Column({
    type: 'uuid',
    nullable: false,
    unique: false,
  })
  team_id: string;

  @Column({
    type: 'uuid',
    nullable: false,
    unique: false,
  })
  member_id: string;

  @Column({ type: 'varchar', nullable: true, unique: false, transformer: BaseEntity.encryptField('first_name') })
  first_name?: string;

  @Column({ type: 'varchar', nullable: true, unique: false, transformer: BaseEntity.encryptField('last_name') })
  last_name?: string;

  @Column({ type: 'timestamptz', nullable: true, unique: false })
  member_expiry_date?: Date;

  @ManyToOne(() => User, (member) => member.teamToMember, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: User;

  @ManyToOne(() => Team, (team) => team.teamToMember, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;
}
