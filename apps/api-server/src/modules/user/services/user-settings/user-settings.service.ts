import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ValidationError,
  forwardRef,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { InjectSentry, SentryService } from '@app/observability';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'crypto';
import { PusherService } from '@app/pusher';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { I18nService } from 'nestjs-i18n';
import { Auth0ManagementService } from '@app/auth0';
import { ActivityParserService } from '../../../activity/services/activity-parser/activity-parser.service';
import { GetUserSettingsDto } from '../../dto/get-user-settings.dto';
import { UpdateUserSettingsDto } from '../../dto/update-user-settings.dto';
import { UserSettingsResponseDto } from '../../dto/user-settings-response.dto';
import { User } from '../../entities/user.entity';
import { UserRepository } from '../../repositories/user.repository';
import { CompletedActivitySequenceService } from '../../../activity/services/completed-activity-sequence/completed-activity-sequence.service';
import { ActivitySequenceRepository } from '../../../activity/repositories/activity-sequence.repository';
import { UserDailyStatsService } from '../user-daily-stats/user-daily-stats.service';
import { UserProgressUpdateTypes } from '../../domain/user-progress-update-types.enum';
import { ActivityPriority } from '../../../activity/domain/activity-priority.enum';
import { HelperCommonService } from '../../../helper/services/helper-common/helper-common.service';
import { ActivitySequenceService } from '../../../activity/services/activity-sequence/activity-sequence.service';
import { UserService } from '../user/user.service';
import { UpdateActivityDto } from '../../../activity/dto/update-activity.dto';
import { LanguageOptions } from '../../../../shared/domain/language-options.enum';
import { ActivitySequence } from '../../../activity/entities/activity-sequence.entity';
import { FunctionCallParametersDto } from '../../../ai/dto/function-call-parameters.dto';
import { DaysOfWeek } from '../../../activity/domain/days-of-week.enum';
import { ActivityType } from '../../../activity/domain/activity-type.enum';
import { UpdateSettingsQueryDto } from '../../dto/update-settings-query.dto';
import { CustomRoutine } from '../../entities/custom-routine';
import { CustomRoutineRepository } from '../../repositories/custom-routine.repository';
import { UpdateCustomRoutineDto } from '../../dto/update-custom-routine.dto.dto';
import { timed } from '../../../../shared/utils/helpers';
import { BullQueues, BullWorkers } from '../../../../shared/utils/constants';

const PERFORMANCE_BUDGETS = {
  AUTH0_API_CALL: 500,
  DB_TRANSACTION: 1000,
  TOTAL_UPDATE_SETTINGS: 2000,
} as const;

@Injectable()
export class UserSettingsService {
  private readonly logger = new Logger(UserSettingsService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly activityParserService: ActivityParserService,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly completedActivitySequenceService: CompletedActivitySequenceService,
    private readonly activitySequenceRepository: ActivitySequenceRepository,
    private readonly userDailyStatsService: UserDailyStatsService,
    private readonly helperCommonService: HelperCommonService,
    private readonly activitySequenceService: ActivitySequenceService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly pusher: PusherService,
    private readonly i18nService: I18nService,
    private readonly customRoutineRepository: CustomRoutineRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
    @InjectQueue(BullQueues.SETTINGS_NOTIFICATION)
    private readonly settingsNotificationQueue: Queue,
  ) {}

  async getSettings({ user_id, timezone, language }: GetUserSettingsDto): Promise<UpdateUserSettingsDto> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching user settings',
        data: {
          user_id,
        },
      });
      const [userSettings, userCustomRoutines] = await Promise.all([
        this.userRepository.getUserSettings(user_id),
        this.customRoutineRepository.getUserCustomRoutines(user_id),
      ]);

      if (!userSettings) {
        throw new NotFoundException(`User with id: ${user_id} does not exists!`);
      }
      if (userSettings.cutoff_time_for_non_high_priority_activities === null) {
        delete userSettings.cutoff_time_for_non_high_priority_activities;
      }

      if (timezone || language) {
        await this.updateUserTimezoneAndLanguage(
          user_id,
          { timezone, language },
          {
            startupTime: userSettings.startup_time,
            shutdownTime: userSettings.shutdown_time,
          },
        );
      }
      const settings = this.serializeSettings(userSettings, userCustomRoutines);
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'User settings fetched',
        data: {
          'Morning activities length': settings?.morning_activities?.length || 0,
          'Evening activities length': settings?.evening_activities?.length || 0,
          'Break activities length': settings?.break_activities?.length || 0,
        },
      });
      settings.morning_activities = (settings?.morning_activities ?? []).map(
        ({ cutoff_time_for_doing_activity, ...rest }) => rest,
      );
      settings.break_activities = (settings?.break_activities ?? []).map(
        ({ cutoff_time_for_doing_activity, tutorial, ...rest }) => rest,
      );
      return { ...settings, evening_activities: settings?.evening_activities ?? [] };
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private serializeSettings(
    { activity_sequences, ...user }: User,
    userCustomRoutines?: CustomRoutine[],
  ): UpdateUserSettingsDto {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Serializing user settings',
    });
    const serializedActivities = this.activityParserService.serialize(activity_sequences, userCustomRoutines);
    const settings: UserSettingsResponseDto = {
      ...user,
      ...serializedActivities,
    };
    return { ...settings, custom_routines: this.sortCustomRoutinesByDate(settings.custom_routines ?? []) };
  }

  async updateSettings(
    { user_id }: GetUserSettingsDto,
    updateSettingsData: UpdateUserSettingsDto,
    should_update_has_edited_settings: boolean,
    { is_onboarding, device_id }: UpdateSettingsQueryDto,
  ) {
    const methodStartTime = Date.now();
    try {
      const { isVerboseLoggingAllowed, user } = await this.userService.isVerboseLoggingAllowed(user_id);
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating user settings',
        ...(isVerboseLoggingAllowed && { updateSettingsData }),
      });
      // manually validate settings after determining if verbose logging is allowed
      // to avoid logging user settings unnecessarily for privacy reasons
      const dto = plainToClass(UpdateUserSettingsDto, updateSettingsData);
      let validationErrors: ValidationError[] = [];
      if (isVerboseLoggingAllowed) {
        validationErrors = await validate(dto, {
          validationError: { target: true, value: true },
        });
      } else {
        validationErrors = await validate(dto, {
          validationError: { target: false, value: true },
        });
      }
      if (validationErrors.length > 0) {
        this.sentryService.instance().captureException(JSON.stringify(validationErrors), { level: 'error' });
        throw new BadRequestException({ validationErrors });
      }
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exists!`);

      if (!is_onboarding) {
        this.validateActivityTutorialAndCutoffTimeConstraints(updateSettingsData);
      }

      let currentSettings: UpdateUserSettingsDto | null = null;
      let hasLoadedCurrentSettings = false;
      const loadCurrentSettings = async (): Promise<UpdateUserSettingsDto | null> => {
        if (hasLoadedCurrentSettings) {
          return currentSettings;
        }
        currentSettings = await this.getSettings({ user_id });
        hasLoadedCurrentSettings = true;
        return currentSettings;
      };

      let mergedSettingsData = updateSettingsData;
      let isFirstLogin = false;
      if (user?.auth0_id) {
        const { result: auth0User } = await timed(() => this.auth0ManagementService.getAuth0User(user.auth0_id), {
          operationName: 'auth0_get_user',
          budgetMs: PERFORMANCE_BUDGETS.AUTH0_API_CALL,
          logger: this.logger,
          context: { user_id },
        });
        isFirstLogin = (auth0User?.logins_count ?? 0) <= 4; // We support 4 platforms; simultaneous first sign-ins can increment count rapidly
      }
      if (is_onboarding && !isFirstLogin) {
        try {
          currentSettings = await loadCurrentSettings();
        } catch {
          currentSettings = null;
          hasLoadedCurrentSettings = true;
        }

        const hasExistingRoutines =
          !!currentSettings?.morning_activities?.length || !!currentSettings?.evening_activities?.length;

        if (hasExistingRoutines) {
          mergedSettingsData = {
            ...updateSettingsData,
            morning_activities: this.mergeById(
              currentSettings?.morning_activities,
              updateSettingsData?.morning_activities,
            ),
            evening_activities: this.mergeById(
              currentSettings?.evening_activities,
              updateSettingsData?.evening_activities,
            ),
          };
        }
      }

      const {
        startup_time,
        shutdown_time,
        cutoff_time_for_non_high_priority_activities,
        break_after_minutes,
        morning_activities,
        break_activities,
        custom_routines,
        verbose_logging,
      } = mergedSettingsData;

      const { current_activity_id, current_activity_sequence_id, current_completing_sequence_log_id } =
        await this.updateUserIfCurrentActivityDeleted(mergedSettingsData, user);

      const { utc_startup_time, utc_shutdown_time } = this.calculateUserUTCRoutineTimes(
        startup_time,
        shutdown_time,
        user.timezone,
        user.id,
      );
      const userHasEditedSettings = user.has_edited_settings || (!!should_update_has_edited_settings && !is_onboarding);

      const hasRelaxActivityInCurrent =
        mergedSettingsData.evening_activities?.some((activity) => activity.show_saved_distracting_websites) ?? false;
      const shouldLoadCurrentSettingsForRelaxCheck =
        !is_onboarding &&
        !!mergedSettingsData.cutoff_time_for_non_high_priority_activities &&
        !hasRelaxActivityInCurrent;

      if (shouldLoadCurrentSettingsForRelaxCheck && !hasLoadedCurrentSettings) {
        currentSettings = await loadCurrentSettings();
      }

      const { eveningActivities, is_relax_activity_generated } = this.optimizeEveningActivities(
        mergedSettingsData,
        user,
        is_onboarding,
        currentSettings,
      );

      const updatedUser = new User({
        startup_time,
        shutdown_time,
        cutoff_time_for_non_high_priority_activities: this.validateCutoffTime(
          cutoff_time_for_non_high_priority_activities,
        ),
        break_after_minutes,
        id: user_id,
        has_edited_settings: userHasEditedSettings,
        current_activity_id,
        current_activity_sequence_id,
        current_completing_sequence_log_id,
        last_time_user_settings_modified: new Date(),
        utc_startup_time,
        utc_shutdown_time,
        updated_at: new Date().toISOString(),
        has_received_inactivity_warning: false,
        is_relax_activity_generated,
        ...(typeof verbose_logging === 'boolean' && { verbose_logging }),
      });

      let customRoutines = [];
      let deserializeCustomRoutineActivities = [];
      if (custom_routines?.length) {
        // First, ensure all custom routines have IDs (generate if missing)
        const customRoutinesWithIds = custom_routines.map((routine) => {
          if (!routine.id) {
            return { ...routine, id: randomUUID() };
          }
          return routine;
        });

        // Create CustomRoutine instances for saving (without standalone_activities)
        customRoutines = customRoutinesWithIds.map(({ standalone_activities, activity_sequence_id, ...rest }) => {
          return new CustomRoutine(
            {
              ...rest,
              user_id,
            },
            { generateId: false }, // ID already set above
          );
        });

        // Use the DTOs with IDs for deserializing activities
        deserializeCustomRoutineActivities = await this.activityParserService.deserializeCustomRoutineActivities(
          customRoutinesWithIds,
          user_id,
        );
      }

      const serializedActivities = {
        morning_activities,
        evening_activities: eveningActivities,
        break_activities: break_activities ?? [],
      };
      const { deserializedActivities, logQuantityQuestions, tutorials } = await this.activityParserService.deserialize(
        serializedActivities,
        user_id,
      );

      await timed(
        () =>
          this.userRepository.consistentlyUpdateUserSettings(
            updatedUser,
            deserializedActivities.concat(deserializeCustomRoutineActivities),
            logQuantityQuestions,
            tutorials,
            customRoutines,
          ),
        {
          operationName: 'db_transaction',
          budgetMs: PERFORMANCE_BUDGETS.DB_TRANSACTION,
          logger: this.logger,
          context: { user_id },
        },
      );
      if (typeof verbose_logging === 'boolean') {
        this.userService.clearVerboseLoggingCache(user_id);
      }
      if (should_update_has_edited_settings) {
        await Promise.all([
          this.userDailyStatsService.updateUserOnboardingProgress(user_id, UserProgressUpdateTypes.EDIT_SETTINGS),
          this.queueSettingsNotification(user_id, device_id, user.language),
        ]);
      }

      const totalDurationMs = Date.now() - methodStartTime;
      if (totalDurationMs > PERFORMANCE_BUDGETS.TOTAL_UPDATE_SETTINGS) {
        this.logger.warn(
          {
            operationName: 'updateSettings_total',
            budgetMs: PERFORMANCE_BUDGETS.TOTAL_UPDATE_SETTINGS,
            actualMs: totalDurationMs,
            user_id,
          },
          `Performance budget exceeded for updateSettings total: ${totalDurationMs}ms (budget: ${PERFORMANCE_BUDGETS.TOTAL_UPDATE_SETTINGS}ms)`,
        );
      }
      return await this.getSettings({ user_id });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  mergeById<T extends { id?: string }>(existing: T[] = [], incoming: T[] = []): T[] {
    const safeExisting = existing ?? [];
    const safeIncoming = incoming ?? [];
    if (safeExisting.length === 0) {
      // Ensure items without id get a new UUID to avoid later collisions
      return safeIncoming.map((item) => {
        if (!item?.id) return { ...(item as any), id: randomUUID() } as T;
        return item;
      });
    }
    if (safeIncoming.length === 0) return [...safeExisting];

    const existingIds = new Set<string>(safeExisting.map((item) => item?.id).filter(Boolean) as string[]);
    const idToName = new Map<string, string | undefined>(
      safeExisting.map((item) => [item?.id as string, (item as any)?.name] as const).filter(([id]) => Boolean(id)),
    );

    const merged: T[] = [...safeExisting];
    const seenIds = new Set(existingIds);

    for (const item of safeIncoming) {
      const currentId = (item?.id as string | undefined) || undefined;
      const currentName = (item as any)?.name as string | undefined;

      let itemToAppend: T | null = null;

      if (!currentId) {
        // No id → always append with a fresh UUID
        itemToAppend = { ...(item as any), id: randomUUID() } as T;
      } else if (seenIds.has(currentId)) {
        const existingName = idToName.get(currentId);
        if (existingName && currentName && existingName !== currentName) {
          // Same id but different name → treat as distinct; assign new UUID
          itemToAppend = { ...(item as any), id: randomUUID() } as T;
        }
        // else same id and same (or unknown) name → skip as duplicate
      } else {
        // New id → append and record
        itemToAppend = item as T;
        seenIds.add(currentId);
        idToName.set(currentId, currentName);
      }

      if (itemToAppend) {
        merged.push(itemToAppend);
      }
    }

    return merged;
  }

  private async queueSettingsNotification(userId: string, deviceId?: string, language?: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.settingsNotificationQueue.add(
        BullWorkers.SEND_SETTINGS_NOTIFICATION,
        { userId, deviceId, language },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      const queueTime = Date.now() - startTime;
      if (queueTime > 50) {
        this.logger.warn(
          {
            operationName: 'queue_settings_notification',
            actualMs: queueTime,
            budgetMs: 50,
            userId,
          },
          `Slow queue add: ${queueTime}ms`,
        );
      }
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        level: 'warning',
        tags: { service: 'bull-queue', operation: 'add', queue: 'settings-notification' },
        extra: { userId, deviceId, language },
      });

      this.logger.warn(
        { operationName: 'queue_settings_notification_fallback', userId },
        'Queue add failed, sending settings notification directly',
      );

      try {
        await this.pusher.trigger(`private-${userId}`, 'settings-updated', { device_id: deviceId });
      } catch (fallbackError) {
        this.sentryService.instance().captureException(fallbackError, {
          level: 'warning',
          tags: {
            service: 'pusher-channels',
            operation: 'trigger',
            event: 'settings-updated',
            source: 'queue-fallback',
          },
          extra: { userId, deviceId, language },
        });
      }
    }
  }

  calculateRelaxActivityDuration(cutoffTime: string, shutdownTime: string, eveningActivities: UpdateActivityDto[]) {
    const cutoffDateTime = DateTime.fromFormat(cutoffTime, 'HH:mm');
    const shutdownDateTime = DateTime.fromFormat(shutdownTime, 'HH:mm');
    const differenceSeconds = cutoffDateTime.diff(shutdownDateTime, 'seconds').seconds;
    if (differenceSeconds > 0) {
      // @Description: Check for any high priority activities
      // biome-ignore-start lint/style/noParameterAssign: intentional mutation in reduce
      const eveningRoutineHighPriorityActivitiesDuration = eveningActivities.reduce((totalDuration, activity) => {
        if (activity.priority === ActivityPriority.HIGH) {
          totalDuration += activity.duration_seconds;
        }
        return totalDuration;
      }, 0);
      // biome-ignore-end lint/style/noParameterAssign: intentional mutation in reduce

      const remainingDuration = differenceSeconds - eveningRoutineHighPriorityActivitiesDuration;
      return remainingDuration > 0 ? remainingDuration : 0;
    }
    return 0;
  }

  formatTime(formattedHour) {
    if (formattedHour.startsWith('0')) {
      return parseInt(formattedHour.substring(1), 10);
    }
    return parseInt(formattedHour, 10);
  }

  async updateUserTimezoneAndLanguage(
    user_id: string,
    { timezone, language }: { timezone?: string; language?: LanguageOptions },
    routineTimes?: { startupTime?: string; shutdownTime?: string },
  ) {
    const { isVerboseLoggingAllowed } = await this.userService.isVerboseLoggingAllowed(user_id);
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Updating user timezone',
      data: {
        user_id,
        ...(isVerboseLoggingAllowed && { timezone }),
      },
    });
    const updateData: Partial<User> = {};

    if (timezone) {
      // Normalize timezone input to a stable UTC offset string (for example "UTC-05:00")
      // so routine matching can compare persisted "HH:mm" UTC fields directly in cron.
      // For IANA zones, this captures the current offset only; DST shifts are picked up
      // the next time client settings sync sends timezone again.
      const currentTime = DateTime.local({ zone: timezone });
      if (currentTime.invalidReason) {
        throw new BadRequestException(currentTime.invalidExplanation);
      }

      const offsetMinutes = currentTime.offset;
      const absoluteOffsetMinutes = Math.abs(offsetMinutes);
      const hours = this.formatTimeToDoubleDigits(Math.floor(absoluteOffsetMinutes / 60));
      const minutes = this.formatTimeToDoubleDigits(absoluteOffsetMinutes % 60);
      const offsetPrefix = offsetMinutes >= 0 ? '+' : '-';
      const userZone = `UTC${offsetPrefix}${hours}:${minutes}`;

      updateData.timezone = userZone;

      const { startupTime, shutdownTime } = routineTimes ?? {};
      if (startupTime && shutdownTime) {
        // Keep cached UTC routine times aligned with timezone changes.
        const { utc_startup_time, utc_shutdown_time } = this.calculateUserUTCRoutineTimes(
          startupTime,
          shutdownTime,
          userZone,
          user_id,
        );
        updateData.utc_startup_time = utc_startup_time;
        updateData.utc_shutdown_time = utc_shutdown_time;
      }
    }

    if (language) {
      updateData.language = language;
    }

    if (Object.keys(updateData).length > 0) {
      await this.userRepository.update(user_id, {
        ...updateData,
        updated_at: new Date().toISOString(),
      });
    }
  }

  calculateUserUTCRoutineTimes(startupTime: string, shutdownTime: string, timezone: string, userId?: string) {
    if (startupTime === shutdownTime) {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'warning',
        message: 'Identical startup/shutdown times detected',
        data: {
          userId,
          timezone,
          startup_time: startupTime,
          shutdown_time: shutdownTime,
        },
      });

      if (startupTime === '00:00') {
        this.sentryService.instance().addBreadcrumb({
          category: 'Service',
          level: 'info',
          message: 'Auto-fixing identical midnight times to defaults',
          data: {
            userId,
            original_startup_time: startupTime,
            original_shutdown_time: shutdownTime,
            fixed_startup_time: '06:00',
            fixed_shutdown_time: '22:00',
          },
        });
        // biome-ignore-start lint/style/noParameterAssign: intentional mutation
        startupTime = '06:00';
        shutdownTime = '22:00';
        // biome-ignore-end lint/style/noParameterAssign: intentional mutation
      } else {
        throw new BadRequestException('Startup and shutdown times cannot be identical');
      }
    }

    const [startHours, startMinutes] = startupTime.split(':');
    const [shutdownHours, shutdownMinutes] = shutdownTime.split(':');
    const userStartupTime = DateTime.local({ zone: timezone }).set({
      hour: this.formatTimeToSingleDigit(startHours),
      minute: this.formatTimeToSingleDigit(startMinutes),
    });
    const userShutdownTime = DateTime.local({ zone: timezone }).set({
      hour: this.formatTimeToSingleDigit(shutdownHours),
      minute: this.formatTimeToSingleDigit(shutdownMinutes),
    });
    const userStartupAsUTC = userStartupTime.toUTC();
    const userShutdownAsUTC = userShutdownTime.toUTC();
    const startupUTCHours = this.formatTimeToDoubleDigits(userStartupAsUTC.hour);
    const startupUTCMinutes = this.formatTimeToDoubleDigits(userStartupAsUTC.minute);
    const shutdownUTCHours = this.formatTimeToDoubleDigits(userShutdownAsUTC.hour);
    const shutdownUTCMinutes = this.formatTimeToDoubleDigits(userShutdownAsUTC.minute);
    return {
      utc_startup_time: `${startupUTCHours}:${startupUTCMinutes}`,
      utc_shutdown_time: `${shutdownUTCHours}:${shutdownUTCMinutes}`,
    };
  }

  formatTimeToDoubleDigits(hour: number) {
    if (hour < 10) {
      return `0${hour}`;
    }
    return hour.toString();
  }

  formatTimeToSingleDigit(time: string) {
    if (time.startsWith('0')) {
      return parseInt(time.substring(1), 10);
    }
    return parseInt(time, 10);
  }

  async updateUserIfCurrentActivityDeleted(updateSettingsData: UpdateUserSettingsDto, user: User) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Checking if user current activity was deleted and updating user accordingly',
        data: {
          current_activity_id: user?.current_activity_id,
          current_activity_sequence_id: user?.current_activity_sequence_id,
          current_completing_sequence_log_id: user?.current_completing_sequence_log_id,
        },
      });
      let { current_completing_sequence_log_id, current_activity_sequence_id, current_activity_id } = user;
      const { cutoff_time_for_non_high_priority_activities: cutOffTime, timezone } = user;
      const { morning_activities, break_activities, evening_activities } = updateSettingsData;
      const morningActivityIds = morning_activities.map((activity) => activity.id);
      const breakActivityIds = break_activities.map((activity) => activity.id);
      const eveningActivityIds = evening_activities.map((activity) => activity.id);
      const standaloneActivitiesIds = (updateSettingsData?.custom_routines ?? [])
        .flatMap(({ standalone_activities }) => standalone_activities)
        .map((activity) => activity.id);
      const activityIds = [
        ...morningActivityIds,
        ...breakActivityIds,
        ...eveningActivityIds,
        ...standaloneActivitiesIds,
      ];
      // check if user current activity is not included in incoming activities
      // if so - recalculate current activity
      if (this.isCurrentActivityDeleted(current_activity_id, activityIds)) {
        this.sentryService.instance().addBreadcrumb({
          category: 'Service',
          level: 'debug',
          message: 'Current activity was deleted, updating user',
          data: {
            user_id: user.id,
            current_activity_id,
          },
        });
        const sequence = await this.activitySequenceRepository.orm
          .createQueryBuilder('activity_sequences')
          .leftJoinAndSelect('activity_sequences.activities', 'activities', 'activities.is_deleted = false')
          .where('activity_sequences.id = :id', { id: user?.current_activity_sequence_id })
          .getOne();
        if (sequence) {
          const { id: activity_sequence_id } = sequence;
          const nextId = this.getNextActivityId(sequence, current_activity_id, cutOffTime, timezone, activityIds);
          await this.handleRoutineBeingCompleted(nextId, current_completing_sequence_log_id, user.id);
          current_completing_sequence_log_id = nextId ? current_completing_sequence_log_id : null;
          current_activity_sequence_id = nextId ? activity_sequence_id : null;
          current_activity_id = nextId ?? null;
          await this.userRepository.orm.update(user.id, {
            ...user,
            current_completing_sequence_log_id,
            current_activity_id: nextId ?? null,
            current_activity_sequence_id,
          });
        } else {
          this.sentryService.instance().addBreadcrumb({
            category: 'Service',
            level: 'debug',
            message: 'Current activity was deleted but no active sequence found, clearing user pointers',
            data: {
              user_id: user.id,
              current_activity_sequence_id,
            },
          });
          if (current_completing_sequence_log_id) {
            await this.handleRoutineBeingCompleted(null, current_completing_sequence_log_id, user.id);
          }
          current_completing_sequence_log_id = null;
          current_activity_sequence_id = null;
          current_activity_id = null;
          await this.userRepository.orm.update(user.id, {
            ...user,
            current_completing_sequence_log_id: null,
            current_activity_id: null,
            current_activity_sequence_id: null,
          });
        }
      }
      return {
        current_completing_sequence_log_id,
        current_activity_id,
        current_activity_sequence_id,
      };
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private isCurrentActivityDeleted(current_activity_id: string, activityIds: string[]) {
    return current_activity_id && !activityIds.includes(current_activity_id);
  }

  private getNextActivityId(
    sequence: ActivitySequence,
    current_activity_id: string,
    cutOffTime: string,
    timezone: string,
    activityIds: string[],
  ) {
    const { sequenceActivityIds, activities } = sequence;
    const currentActivityIndex = sequenceActivityIds.indexOf(current_activity_id);
    // find eligible next activities
    const activitiesAfterCurrentActivity = sequenceActivityIds.slice(currentActivityIndex + 1);
    // remove following activities in sequence that were also deleted
    let possibleNextActivities = activities.filter(
      (activity) => activityIds.includes(activity.id) && activitiesAfterCurrentActivity.includes(activity.id),
    );
    // remove standard priority activities if cut off time has been reached
    const hasCutoffTimeBeenReached = this.hasCutoffTimeBeenReached(cutOffTime, timezone);
    if (hasCutoffTimeBeenReached) {
      possibleNextActivities = possibleNextActivities.filter(
        (activity) => activity.activity_data.priority === ActivityPriority.HIGH,
      );
    }
    // get activities for current day of week
    const currentDay = this.helperCommonService.getDayOfWeek(timezone);
    const possibleActivitiesForToday = this.activitySequenceService.filterActivitiesForCurrentDay(
      currentDay,
      possibleNextActivities,
    );
    // sort IDs of leftover activities in execution order
    const sortedIdsForCurrentDayActivities = this.activitySequenceService.sortActivityIdsByExecutionSequence(
      sequenceActivityIds,
      possibleActivitiesForToday,
    );
    const [nextId] = sortedIdsForCurrentDayActivities;
    return nextId;
  }

  private async handleRoutineBeingCompleted(
    nextId: string,
    current_completing_sequence_log_id: string,
    userId: string,
  ) {
    if (!nextId) {
      await this.completedActivitySequenceService.completeActivitySequence(current_completing_sequence_log_id, userId);
    }
  }

  validateCutoffTime(time: string) {
    if (!time) {
      return null;
    }
    return DateTime.fromFormat(time, 'hh:mm').isValid ? time : null;
  }

  hasCutoffTimeBeenReached(cutoffTime: string, timezone: string) {
    const hasUserGotCutOffTime = Boolean(cutoffTime);
    const userCurrentTime = DateTime.local({ zone: timezone });
    const userCutOffTime =
      hasUserGotCutOffTime &&
      DateTime.fromFormat(cutoffTime, 'hh:mm', {
        zone: timezone,
      });
    return userCutOffTime && userCurrentTime >= userCutOffTime;
  }

  async addActivityToRoutine(userId: string, data: FunctionCallParametersDto) {
    const activity: UpdateActivityDto = {
      id: randomUUID(),
      name: data?.name,
      duration_seconds: data?.duration,
      days_of_week: data?.days_of_week ?? [DaysOfWeek.ALL],
      allowed_urls: data?.allowed_urls ?? [],
      allowed_apps: data?.allowed_apps ?? [],
    };
    const routineToAddTo = data.routine ?? ActivityType.morning;
    const userSettings = await this.getSettings({ user_id: userId });
    const updatedSettings = {
      ...userSettings,
      [`${routineToAddTo}_activities`]: [...userSettings[`${routineToAddTo}_activities`], activity],
    };
    await this.updateSettings({ user_id: userId }, updatedSettings, false, { is_onboarding: false });
  }

  isValidTimeForActivity = (activity_cutoff_time: string, global_cutoff_time: string) => {
    if (
      activity_cutoff_time &&
      this.validateCutoffTime(activity_cutoff_time) &&
      this.validateCutoffTime(global_cutoff_time)
    ) {
      const [globalHours, globalMinutes] = global_cutoff_time.split(':');
      const [activityHours, activityMinutes] = activity_cutoff_time.split(':');
      const globalTime = DateTime.now()
        .startOf('minute')
        .plus({ hours: parseInt(globalHours, 10), minutes: parseInt(globalMinutes, 10) });
      const activityTime = DateTime.now()
        .startOf('minute')
        .plus({ hours: parseInt(activityHours, 10), minutes: parseInt(activityMinutes, 10) });
      return activityTime <= globalTime;
    }
    return false;
  };

  private optimizeEveningActivities(
    updateSettingsData: UpdateUserSettingsDto,
    user: User,
    is_onboarding?: boolean,
    currentSettings?: UpdateUserSettingsDto | null,
  ) {
    let eveningActivities = [...updateSettingsData.evening_activities];
    let { is_relax_activity_generated } = user;

    // Check if user opts to re-add relax activity, even if previously generated
    const hasRelaxActivityInCurrent = eveningActivities.some((activity) => activity.show_saved_distracting_websites);

    if (
      is_onboarding ||
      !updateSettingsData?.cutoff_time_for_non_high_priority_activities ||
      hasRelaxActivityInCurrent
    ) {
      return { eveningActivities, is_relax_activity_generated };
    }

    // Backward compatibility: Handle existing relax activities (use pre-fetched data)
    const hasRelaxActivityInPrevious = currentSettings?.evening_activities?.some(
      (activity) => activity.show_saved_distracting_websites,
    );

    const shouldAddRelaxActivity = !hasRelaxActivityInPrevious && !user.is_relax_activity_generated;

    if (shouldAddRelaxActivity) {
      const relaxActivityDuration = this.calculateRelaxActivityDuration(
        updateSettingsData.cutoff_time_for_non_high_priority_activities,
        updateSettingsData.shutdown_time,
        updateSettingsData.evening_activities,
      );

      if (relaxActivityDuration) {
        const relaxActivity = {
          id: randomUUID(),
          name: this.i18nService.t('common.free_time_no_distraction_blocking', { lang: updateSettingsData.language }),
          duration_seconds: relaxActivityDuration,
          show_saved_distracting_websites: true,
        };
        eveningActivities = [relaxActivity, ...eveningActivities];
        is_relax_activity_generated = true;
      }
    }

    return { eveningActivities, is_relax_activity_generated };
  }

  private sortCustomRoutinesByDate(customRoutines: UpdateCustomRoutineDto[]) {
    return (customRoutines as CustomRoutine[]).sort(
      (routineA, routineB) =>
        DateTime.fromISO(routineA.created_at).toMillis() - DateTime.fromISO(routineB.created_at).toMillis(),
    );
  }

  private validateActivityTutorialAndCutoffTimeConstraints(updateSettingsData: UpdateUserSettingsDto) {
    const { cutoff_time_for_non_high_priority_activities, morning_activities, evening_activities } = updateSettingsData;
    const break_activities = updateSettingsData?.break_activities ?? [];

    const foundTutorialInMicroBreaks = break_activities.some((break_activity) => 'tutorial' in break_activity);
    if (foundTutorialInMicroBreaks) throw new BadRequestException("Break activities don't have a tutorial");

    const tutorialIds = []
      .concat(morning_activities, evening_activities)
      .map((activity) => activity?.tutorial)
      .filter(Boolean);
    const foundActivitiesWithTheSameTutorialIds = new Set(tutorialIds).size !== tutorialIds.length;
    if (foundActivitiesWithTheSameTutorialIds) {
      throw new BadRequestException('Activities tutorial value should be unique');
    }

    const foundActivityWithCutOffTime = [...morning_activities, ...break_activities].some(
      (activity) => 'cutoff_time_for_doing_activity' in activity,
    );

    if (foundActivityWithCutOffTime) {
      throw new BadRequestException('Morning and break activities cannot have a cutoff_time_for_doing_activity');
    }

    const foundActivityCutOffTimeLessThanGlobalCutOffTime = evening_activities?.some(
      ({ cutoff_time_for_doing_activity }) =>
        this.isValidTimeForActivity(cutoff_time_for_doing_activity, cutoff_time_for_non_high_priority_activities),
    );
    if (foundActivityCutOffTimeLessThanGlobalCutOffTime) {
      throw new BadRequestException(
        'Evening activities cutoff time should be after cutoff_time_for_non_high_priority_activities',
      );
    }
  }
}
