import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { SubscriptionProvider } from '../domain/subscription-provider.enum';
import { SubscriptionStatus } from '../domain/subscription-status.enum';
import { SubscriptionType } from '../domain/subscription-type.enum';

@Entity('subscriptions')
export class Subscription extends BaseEntity {
  constructor({ id, ...data }: Partial<Subscription> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'timestamp',
    nullable: false,
  })
  expires_date?: string;

  @Column({
    type: 'enum',
    enum: SubscriptionType,
    nullable: false,
    default: SubscriptionType.trial,
  })
  type?: SubscriptionType;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    nullable: false,
  })
  subscription_status?: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: SubscriptionProvider,
    nullable: true,
  })
  provider?: SubscriptionProvider;

  @Column({
    type: 'jsonb',
    transformer: BaseEntity.encrypteJSONField('subscription_metadata'),
    select: false,
  })
  subscription_metadata?: any;

  @OneToOne(() => User, (user) => user.subscription)
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
