import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { ActivitySequence } from '../../activity/entities/activity-sequence.entity';
import { Activity } from '../../activity/entities/activity.entity';
import { CompletedActivitySequence } from '../../activity/entities/completed-activity-sequence.entity';
import { CompletedActivity } from '../../activity/entities/completed-activity.entity';
import { Device } from '../../device/entities/device.entity';
import { FocusMode } from '../../focus-mode/entities/focus-mode.entity';
import { ActivityTemplate } from '../../activity-template/entity/activity-template.entity';
import { HabitPack } from '../../habit-pack/entity/habit-pack.entity';
import { InstalledPack } from '../../habit-pack/entity/installed-pack.entity';
import { Team } from '../../team/entities/team.entity';
import { UpdateLocalDeviceSettingsDto } from '../dto/update-local-device-settings.dto';
import { UserTypes } from '../domain/user-types.enum';
import { Notification } from '../../notification/entities/notification.entity';

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
    transformer: BaseEntity.encryptField('email'),
  })
  email?: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  stripe_customer_id?: string;

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
    transformer: BaseEntity.encryptField('name'),
  })
  name?: string;

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
  current_focus_mode_finish_time?: Date;

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
  })
  current_completing_focus_block_id?: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  current_activity_id?: string;

  @Column({
    type: 'timestamptz',
  })
  current_activity_assigned_at?: Date;

  @Column({
    type: 'uuid',
  })
  last_completed_sequence_id?: string;

  @Column({
    type: 'uuid',
  })
  current_completing_sequence_log_id?: string;

  @Column({
    type: 'timestamptz',
  })
  last_completed_sequence_at?: Date;

  @Column({
    type: 'timestamptz',
  })
  last_completed_sequence_started_at?: Date;

  @Column({
    type: 'timestamptz',
  })
  current_sequence_started_at?: Date;

  @Column({
    type: 'uuid',
  })
  member_of_team_id?: string;

  @Column({
    type: 'uuid',
  })
  owner_of_team_id?: string;

  @Column({
    type: 'jsonb',
    transformer: BaseEntity.encryptJSONField('local_device_settings'),
  })
  local_device_settings?: UpdateLocalDeviceSettingsDto;

  @Column({
    type: 'enum',
    name: 'user_type',
    enum: UserTypes,
    default: UserTypes.STANDARD,
  })
  user_type?: UserTypes;

  @Column({
    type: 'uuid',
  })
  signed_up_via_habit_pack?: string;

  @Column({
    type: 'jsonb',
  })
  current_sequence_skipped_activities?: string[];

  @Column({
    type: 'varchar',
    default: 'UTC',
  })
  timezone?: string;

  @OneToMany(() => ActivitySequence, (sequence) => sequence.user)
  activity_sequences?: ActivitySequence[];

  @OneToMany(() => CompletedActivity, (completed_activity) => completed_activity.user)
  completed_activities?: CompletedActivity[];

  @OneToMany(() => CompletedActivitySequence, (completed_sequence) => completed_sequence.user)
  completed_activity_sequences?: CompletedActivitySequence[];

  @OneToMany(() => Device, (device) => device.user)
  devices?: Device[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications?: Notification[];

  @OneToMany(() => FocusMode, (focus_mode) => focus_mode.user)
  focus_modes?: FocusMode[];

  @OneToMany(() => HabitPack, (habit_pack) => habit_pack.user)
  created_habit_packs?: HabitPack[];

  @OneToMany(() => InstalledPack, (installed_packs) => installed_packs.user)
  installed_packs?: InstalledPack[];

  @OneToMany(() => ActivityTemplate, (activity_template) => activity_template.user)
  activity_templates?: ActivityTemplate[];

  @OneToOne(() => Team, (team) => team.owner)
  @JoinColumn({ name: 'owner_of_team_id' })
  owner_of_team?: Team;

  @ManyToOne(() => Team, (team) => team.members)
  @JoinColumn({ name: 'member_of_team_id' })
  member_of_team?: Team;

  @ManyToOne(() => HabitPack, (habit_pack) => habit_pack.id)
  @JoinColumn({ name: 'signed_up_via_habit_pack' })
  sign_up_habit_pack?: User;

  @OneToOne(() => Activity, (activity) => activity.user)
  @JoinColumn({ name: 'current_activity_id' })
  current_activity?: Activity;

  @OneToOne(() => ActivitySequence, (sequence) => sequence.user)
  @JoinColumn({ name: 'current_activity_sequence_id' })
  current_activity_sequence?: ActivitySequence;

  @OneToOne(() => ActivitySequence, (sequence) => sequence.user)
  @JoinColumn({ name: 'last_completed_sequence_id' })
  last_completed_sequence?: ActivitySequence;

  @OneToOne(() => CompletedActivitySequence, (sequence_log) => sequence_log.user)
  @JoinColumn({ name: 'current_completing_sequence_log_id' })
  completing_sequence_log?: CompletedActivitySequence;

  @OneToOne(() => FocusMode, (mode) => mode.user)
  @JoinColumn({ name: 'current_focus_mode_id' })
  current_focus_mode?: FocusMode;

  nullifyTeamMembership?() {
    this.member_of_team_id = null;
  }
}
