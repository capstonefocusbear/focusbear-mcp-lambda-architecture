import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { TeamToMember } from './team-to-member.entity';
import { TeamToAdmin } from './team-to-admin.entity';
import { PaymentType } from '../domain/payment-type.enum';

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
    type: 'integer',
    nullable: true,
    default: 1,
  })
  team_size_limit?: number;

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

  @Column({
    type: 'jsonb',
    nullable: true,
    transformer: BaseEntity.encryptJSONField('stripe_data'),
  })
  stripe_data?: any;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  stripe_subscription_id?: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  name?: string;

  @Column({
    type: 'varchar',
    nullable: true,
    default: PaymentType.STRIPE,
  })
  payment_type?: string;

  @ManyToOne(() => User, (user) => user.owned_teams, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner?: User;

  @OneToMany(() => TeamToMember, (teamToMember) => teamToMember.team)
  teamToMember?: TeamToMember[];

  @OneToMany(() => TeamToAdmin, (teamToAdmin) => teamToAdmin.team)
  teamToAdmin?: TeamToAdmin[];
}
