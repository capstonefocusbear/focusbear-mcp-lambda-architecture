import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { WebhookEventType } from '../domain/webhook-event-type.enum';

@Entity('webhook_subscriptions')
export class WebhookSubscription extends BaseEntity {
  constructor(subscription: Partial<WebhookSubscription> = {}) {
    super(subscription.id);
    Object.assign(this, subscription);
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 2048,
    nullable: false,
  })
  url: string;

  @Column({
    type: 'enum',
    enum: WebhookEventType,
    array: true,
    nullable: false,
  })
  event_types: WebhookEventType[];

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  secret?: string;

  @Column({
    type: 'boolean',
    default: true,
  })
  is_active: boolean;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  last_triggered_at?: Date;

  @Column({
    type: 'integer',
    default: 0,
  })
  failure_count: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
