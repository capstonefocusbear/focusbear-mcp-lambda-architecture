import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, Index } from 'typeorm';
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
import { FocusModeTemplate } from '../../focus-mode-template/entities/focus-mode-template.entity';
import { InstalledFocusModeTemplate } from '../../focus-mode-template/entities/installed-focus-mode_templates.entity';
import { UserMetadata } from '../domain/user-metadata.model';
import { UserConsent } from './user-consent.entity';
import { UserOnboardingProgress } from '../domain/user-onboarding-progress.model';
import { CompletedFocusBlock } from '../../focus-mode/entities/completed-focus-block.entity';
import { ColumnNumericTransformer } from '../../../shared/transformers/numeric-column-transformer';
import { LogQuantityAnswer } from '../../activity/entities/log-quantity-answers';
import { LogQuantityQuestion } from '../../activity/entities/log-quantity-questions';
import { SavedWebsite } from '../../saved-website/entities/saved-website.entity';
import { RoutineNotificationTimes } from '../domain/routine-notification-times.model';
import { LanguageOptions } from '../domain/language-options.enum';
import { ToDo } from '../../to-do/entities/to-do.entity';
import { SubscriptionStatus } from '../../subscription/domain/subscription-status.model';
import { ImpactEvent } from '../../events/entities/impact-event.entity';
import { UserFeedback } from './user-feedback.entity';
import { TaskTimeLog } from '../../to-do/entities/tasks-time-logs.entity';
import { PlatformIntegration } from '../../platform-integrations/entities/platform-integration.entity';
import { SyncedProject } from '../../to-do/entities/synced-project.entity';
import { CalendarExcludedKeyword } from '../../calendar/entities/calendar-excluded-keywords.entity';
import { Calendar } from '../../calendar/entities/calendar.entity';
import { TeamToMember } from '../../team/entities/team-to-member.entity';
import { TeamToAdmin } from '../../team/entities/team-to-admin.entity';
import { Tutorial } from '../../activity/entities/tutorial.entity';
import { Feedback } from '../../../../../../libs/stripe/src/entities/feedback.entity';
import { CustomRoutine } from './custom-routine';

@Entity('users')
export class User extends BaseEntity {
  constructor({ id, ...user }: Partial<User> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...user });
  }

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  stripe_customer_id?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  profitwell_id?: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  profitwell_registration_date?: Date;

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
    nullable: true,
  })
  utc_startup_time?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  utc_shutdown_time?: string;

  @Column({
    type: 'jsonb',
    default: { last_time_notified_of_morning_routine: null, last_time_notified_of_evening_routine: null },
  })
  routine_notification_times?: RoutineNotificationTimes;

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

  @Index()
  @Column({
    type: 'uuid',
  })
  current_activity_sequence_id?: string;

  @Index()
  @Column({
    type: 'uuid',
  })
  current_focus_mode_id?: string;

  @Index()
  @Column({
    type: 'uuid',
  })
  current_completing_focus_block_id?: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  current_activity_id?: string;

  @Column({
    type: 'timestamptz',
  })
  current_activity_assigned_at?: Date;

  @Index()
  @Column({
    type: 'uuid',
  })
  last_completed_sequence_id?: string;

  @Index()
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

  @Index()
  @Column({
    type: 'uuid',
  })
  signed_up_via_habit_pack?: string;

  @Index()
  @Column({
    type: 'uuid',
  })
  signed_up_via_focus_mode?: string;

  @Column({
    type: 'jsonb',
  })
  current_sequence_skipped_activities?: string[];

  @Column({
    type: 'varchar',
    default: 'UTC',
  })
  timezone?: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  has_edited_settings?: boolean;

  @Column({
    type: 'varchar',
  })
  cutoff_time_for_non_high_priority_activities?: string;

  @Column({
    type: 'jsonb',
    transformer: BaseEntity.encryptJSONField('metadata'),
  })
  metadata?: UserMetadata;

  @Column({
    type: 'jsonb',
  })
  onboarding_progress?: UserOnboardingProgress;

  @Column({
    type: 'timestamptz',
  })
  last_time_stats_updated?: Date;

  @Column({
    type: 'timestamptz',
  })
  last_completed_focus_mode_at?: Date;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  morning_routines_streak?: number;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  evening_routines_streak?: number;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  focus_modes_streak?: number;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  micro_breaks_streak?: number;

  @Column({
    type: 'decimal',
    default: 0,
  })
  morning_percent_number_day_of_stats_completed?: number;

  @Column({
    type: 'decimal',
    default: 0,
  })
  evening_percent_number_day_of_stats_completed?: number;

  @Column({
    type: 'decimal',
    default: 0,
  })
  micro_percent_number_day_of_stats_completed?: number;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  morning_number_days_completed?: number;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  morning_num_days_of_stats?: number;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  evening_number_days_completed?: number;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  evening_num_days_of_stats?: number;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  num_days_of_stats?: number;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  number_days_completed?: number;

  @Column({
    type: 'boolean',
    default: false,
  })
  has_consented_to_terms_of_service?: boolean;

  @Column({
    type: 'jsonb',
    nullable: true,
    transformer: BaseEntity.encryptJSONField('long_term_goals'),
  })
  long_term_goals?: string[];

  @Column({
    type: 'boolean',
    default: false,
  })
  verbose_logging?: boolean;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  last_time_user_settings_modified?: Date;

  @Column({
    type: 'varchar',
    nullable: true,
    unique: true,
    length: 30,
  })
  username?: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  has_received_inactivity_warning?: boolean;

  @Column({
    type: 'varchar',
    default: LanguageOptions.ENGLISH,
  })
  language?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    transformer: BaseEntity.encryptJSONField('revenue_cat_data'),
  })
  revenue_cat_data?: SubscriptionStatus;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  revenue_cat_status?: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  last_date_revenue_cat_data_synced?: Date;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  last_status_synced_with_profitwell?: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  last_date_gave_feedback?: Date;

  @Column({
    type: 'boolean',
    nullable: true,
  })
  is_relax_activity_generated?: boolean;

  @OneToMany(() => SyncedProject, (syncedProject) => syncedProject.user)
  synced_projects?: SyncedProject[];

  @OneToMany(() => UserConsent, (consent) => consent.user)
  consents?: UserConsent[];

  @OneToMany(() => ActivitySequence, (sequence) => sequence.user)
  activity_sequences?: ActivitySequence[];

  @OneToMany(() => CompletedActivity, (completed_activity) => completed_activity.user)
  completed_activities?: CompletedActivity[];

  @OneToMany(() => CompletedActivitySequence, (completed_sequence) => completed_sequence.user)
  completed_activity_sequences?: CompletedActivitySequence[];

  @OneToMany(() => CompletedFocusBlock, (completed_focus_block) => completed_focus_block.user)
  completed_focus_blocks?: CompletedFocusBlock[];

  @OneToMany(() => Device, (device) => device.user)
  devices?: Device[];

  @OneToMany(() => ToDo, (to_do) => to_do.user)
  to_dos?: ToDo[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications?: Notification[];

  @OneToMany(() => FocusMode, (focus_mode) => focus_mode.user)
  focus_modes?: FocusMode[];

  @OneToMany(() => FocusModeTemplate, (focus_mode_template) => focus_mode_template.author)
  focus_mode_templates?: FocusModeTemplate[];

  @OneToMany(() => HabitPack, (habit_pack) => habit_pack.user)
  created_habit_packs?: HabitPack[];

  @OneToMany(() => InstalledPack, (installed_packs) => installed_packs.user)
  installed_packs?: InstalledPack[];

  @OneToMany(() => InstalledFocusModeTemplate, (installed_packs) => installed_packs.user)
  installed_focus_modes?: InstalledFocusModeTemplate[];

  @OneToMany(() => ActivityTemplate, (activity_template) => activity_template.user)
  activity_templates?: ActivityTemplate[];

  @OneToMany(() => Activity, (activities) => activities.user_activities)
  activities?: Activity[];

  @OneToMany(() => LogQuantityQuestion, (question) => question.user)
  log_quantity_questions?: LogQuantityQuestion[];

  @OneToMany(() => LogQuantityAnswer, (answer) => answer.user)
  log_quantity_answers?: LogQuantityAnswer[];

  @OneToMany(() => SavedWebsite, (website) => website.user)
  saved_websites?: SavedWebsite[];

  @OneToMany(() => ImpactEvent, (impactEvent) => impactEvent.user)
  impact_events?: ImpactEvent[];

  @OneToMany(() => UserFeedback, (userFeedback) => userFeedback.user)
  feedback?: UserFeedback[];

  @OneToMany(() => TaskTimeLog, (timeLog) => timeLog.user)
  task_time_logs?: TaskTimeLog[];

  @OneToMany(() => PlatformIntegration, (platformIntegration) => platformIntegration.user)
  platform_integrations?: PlatformIntegration[];

  @OneToMany(() => Team, (team) => team.owner)
  owned_teams?: Team[];

  @OneToMany(() => CalendarExcludedKeyword, (calendarKeyword) => calendarKeyword.user)
  calendar_keywords?: CalendarExcludedKeyword[];

  @OneToMany(() => Calendar, (calendar) => calendar.user)
  calendars?: Calendar[];

  @OneToMany(() => TeamToMember, (teamToMember) => teamToMember.member)
  teamToMember?: TeamToMember[];

  @OneToMany(() => TeamToAdmin, (teamToAdmin) => teamToAdmin.admin)
  teamToAdmin?: TeamToAdmin[];

  @ManyToOne(() => HabitPack, (habit_pack) => habit_pack.id, { onDelete: 'NO ACTION', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'signed_up_via_habit_pack' })
  sign_up_habit_pack?: User;

  @OneToOne(() => Activity, (activity) => activity.id)
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

  @OneToOne(() => CompletedFocusBlock, (focusBlock) => focusBlock.user)
  @JoinColumn({ name: 'current_completing_focus_block_id' })
  completing_focus_block?: CompletedFocusBlock;

  @OneToOne(() => FocusMode, (mode) => mode.user)
  @JoinColumn({ name: 'current_focus_mode_id' })
  current_focus_mode?: FocusMode;

  @OneToMany(() => Tutorial, (tutorial) => tutorial.user)
  tutorials?: Tutorial[];

  @OneToOne(() => Feedback, (feedback) => feedback.cancel_subscription_reason)
  cancel_subscription_feedback?: Feedback;

  @OneToMany(() => CustomRoutine, (custom_routine) => custom_routine.user)
  custom_routines?: CustomRoutine[];
}
