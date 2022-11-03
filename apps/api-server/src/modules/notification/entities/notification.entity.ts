import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';

@Entity('notifications')
export class Notification extends BaseEntity {
  constructor({ id, ...event }: Partial<Notification> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...event });
  }

  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'varchar',
    length: 1000,
  })
  summary?: string;

  @Column({
    type: 'varchar',
    length: 2500,
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  external_id?: string;

  @Column({
    type: 'timestamptz',
  })
  event_begins?: Date;

  @Column({
    type: 'timestamptz',
  })
  event_ends?: Date;

  @Column({
    type: 'boolean',
    default: false,
  })
  is_dismissed?: boolean;

  @Column({
    type: 'varchar',
    length: 255,
  })
  dismiss_reason?: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  received?: boolean;

  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
