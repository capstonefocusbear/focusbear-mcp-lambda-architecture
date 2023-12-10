import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { CalendarPlatforms } from '../../platform-integrations/domain/calendar-platforms.enum';
import { User } from '../../user/entities/user.entity';

@Entity('calendar_excluded_keywords')
export class CalendarExcludedKeyword extends BaseEntity {
  constructor({ id, ...event }: Partial<CalendarExcludedKeyword> = {}, options = { generateId: false }) {
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
  keyword?: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  platform?: CalendarPlatforms;

  @Column({
    type: 'boolean',
    default: false,
  })
  intitle?: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  indescription?: boolean;

  @ManyToOne(() => User, (user) => user.calendar_keywords, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
