import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { ActivitySequence } from '../../activity/entities/activity-sequence.entity';
import { CompletedActivitySequence } from '../../activity/entities/completed-activity-sequence.entity';
import { CompletedActivity } from '../../activity/entities/completed-activity.entity';
import { Device } from '../../device/entities/device.entity';

@Entity('users')
export class User extends BaseEntity {
  constructor({ id, ...user }: Partial<User> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...user });
  }

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    transformer: BaseEntity.encrypteField('email'),
  })
  email?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    unique: true,
  })
  auth0_id?: string;

  @Column({
    type: 'varchar',
    length: 255,
    transformer: BaseEntity.encrypteField('first_name'),
  })
  first_name?: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  startup_time?: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  shutdown_time?: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  break_after_minutes?: number;

  @Column({
    type: 'timestamptz',
  })
  current_focus_mode_finish_time?: string;

  @Column({
    type: 'varchar',
    length: 255,
    select: false,
  })
  password_for_settings?: string;

  @Column({
    type: 'boolean',
  })
  is_office_mode_activated?: boolean;

  @Column({
    type: 'uuid',
  })
  current_activity_sequence_id?: string;

  @Column({
    type: 'uuid',
  })
  current_focus_mode_id?: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  current_activity_id?: string;

  @OneToMany(() => ActivitySequence, (sequence) => sequence.user)
  activity_sequences?: ActivitySequence[];

  @OneToMany(() => CompletedActivity, (completed_activity) => completed_activity.user)
  completed_activities?: CompletedActivity[];

  @OneToMany(() => CompletedActivitySequence, (completed_sequence) => completed_sequence.user)
  completed_activity_sequences?: CompletedActivitySequence[];

  @OneToMany(() => Device, (device) => device.user)
  devices?: Device[];
}
