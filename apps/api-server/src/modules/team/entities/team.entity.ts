import { Column, Entity, JoinColumn, ManyToMany, ManyToOne } from 'typeorm';
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
    unique: false,
  })
  owner_id?: string;

  @Column({
    type: 'integer',
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

  // TODO: encrypt field
  @Column({
    type: 'jsonb',
    nullable: true,
    transformer: BaseEntity.encryptJSONField('stripe_data'),
  })
  stripe_data?: any;

  @ManyToOne(() => User, (user) => user.owned_teams, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner?: User;

  @ManyToMany(() => User, (user) => user.member_of_teams)
  members?: User[];

  @ManyToMany(() => User, (user) => user.admin_of_teams)
  admin_members?: User[];
}
