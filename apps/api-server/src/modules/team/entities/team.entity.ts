import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';

@Entity('teams')
export class Team extends BaseEntity {
  constructor({ id, ...team }: Partial<Team> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...team });
  }

  @Column({
    type: 'uuid',
    nullable: false,
    unique: true,
  })
  owner_id?: string;

  @Column({
    type: 'inet',
    nullable: false,
    default: 1,
  })
  team_size?: number;

  @Column({
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active?: boolean;

  @Column({
    type: 'timestamptz',
    nullable: false,
  })
  expires_date?: string | Date;

  @OneToOne(() => User, (user) => user.owner_of_team)
  @JoinColumn({ name: 'owner_id' })
  owner?: User;

  @OneToMany(() => User, (user) => user.member_of_team)
  members?: User[];
}
