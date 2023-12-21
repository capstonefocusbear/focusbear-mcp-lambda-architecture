import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { CalendarPlatforms } from '../../platform-integrations/domain/calendar-platforms.enum';

@Entity('calendars')
export class Calendar extends BaseEntity {
  constructor({ id, ...event }: Partial<Calendar> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...event });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  platform?: CalendarPlatforms;

  @Column({
    type: 'varchar',
    length: 255,
    transformer: BaseEntity.encryptField('platform_account'),
  })
  platform_account?: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  calendar_id?: string;

  @Column({
    type: 'varchar',
    length: 1000,
  })
  summary?: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  is_selected?: boolean;

  @ManyToOne(() => User, (user) => user.calendars, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
