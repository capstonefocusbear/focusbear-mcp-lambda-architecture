import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { DaysOfWeek } from '../../activity/domain/days-of-week.enum';
import { Activity } from '../../activity/entities/activity.entity';
import { CustomRoutineTrigger } from '../domain/custom-routine-trigger.enum';
import { User } from './user.entity';

@Entity('custom_routines')
export class CustomRoutine extends BaseEntity {
  constructor({ id, ...rest }: Partial<CustomRoutine> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...rest });
  }

  @Column({
    type: 'varchar',
    nullable: false,
    transformer: BaseEntity.encryptField('name'),
  })
  name: string;

  @Index()
  @Column({
    type: 'enum',
    enum: CustomRoutineTrigger,
    default: CustomRoutineTrigger.ON_DEMAND,
    nullable: false,
  })
  trigger: CustomRoutineTrigger;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: [DaysOfWeek.ALL],
    transformer: BaseEntity.encryptJSONField('days_of_week'),
  })
  days_of_week: DaysOfWeek[];

  @Index()
  @Column({
    type: 'varchar',
    length: 255,
  })
  start_time?: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 255,
  })
  end_time?: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id: string;

  // @TODO: move this implementation to activity_sequence
  @OneToMany(() => Activity, (activity) => activity.custom_routine)
  standalone_activities?: Activity[];

  @ManyToOne(() => User, (user) => user.custom_routines, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
