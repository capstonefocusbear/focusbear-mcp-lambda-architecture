/* eslint-disable no-console */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ValidationError,
  forwardRef,
} from '@nestjs/common';
import * as _ from 'lodash';
import { DateTime } from 'luxon';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'crypto';
import { PusherBeamsService } from '@app/pusher-beams';
import { PusherService } from '@app/pusher';
import { I18nService } from 'nestjs-i18n';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { NotificationEvents } from '@app/pusher-beams/domains/notification-events.enum';
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
import { LanguageOptions } from '../../domain/language-options.enum';
import { ActivitySequence } from '../../../activity/entities/activity-sequence.entity';
import { FunctionCallParametersDto } from '../../../ai/dto/function-call-parameters.dto';
import { DaysOfWeek } from '../../../activity/domain/days-of-week.enum';
import { ActivityType } from '../../../activity/domain/activity-type.enum';
import { UpdateSettingsQueryDto } from '../../dto/update-settings-query.dto';

@Injectable()
export class UserSettingsService {
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
    private readonly pusherBeams: PusherBeamsService,
    private readonly i18nService: I18nService,
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
      const userSettings = await this.userRepository.getUserSettings(user_id);
      if (!userSettings) {
        throw new NotFoundException(`User with id: ${user_id} does not exists!`);
      }
      if (userSettings.cutoff_time_for_non_high_priority_activities === null) {
        delete userSettings.cutoff_time_for_non_high_priority_activities;
      }

      userSettings?.activity_sequences?.forEach((sequence) => {
        sequence.type !== ActivityType.evening &&
          sequence.activities.forEach((activity) => {
            if (activity.type !== ActivityType.evening && activity.cutoff_time_for_doing_activity === null) {
              delete activity.cutoff_time_for_doing_activity;
            }
          });
      });
      if (timezone || language) {
        await this.updateUserTimezoneAndLanguage(user_id, { timezone, language });
      }
      return this.serializeSettings(userSettings);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private serializeSettings({ activity_sequences, ...user }: User): UpdateUserSettingsDto {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Serializing user settings',
    });
    const serializedActivities = this.activityParserService.serialize(activity_sequences);
    const settings: UserSettingsResponseDto = {
      ...user,
      ...serializedActivities,
    };
    return settings;
  }

  async updateSettings(
    { user_id }: GetUserSettingsDto,
    updateSettingsData: UpdateUserSettingsDto,
    should_update_has_edited_settings: boolean,
    { is_onboarding, device_id }: UpdateSettingsQueryDto,
  ): Promise<UpdateUserSettingsDto> {
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
        throw new BadRequestException({ validationErrors });
      }
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exists!`);

      const foundTutorialInMicroBreaks = updateSettingsData.break_activities.some(
        (break_activity) => 'tutorial' in break_activity,
      );
      if (foundTutorialInMicroBreaks) throw new BadRequestException("Break activities don't have a tutorial");

      const {
        startup_time,
        shutdown_time,
        cutoff_time_for_non_high_priority_activities,
        break_after_minutes,
        morning_activities,
        evening_activities,
        break_activities,
      } = updateSettingsData;

      const tutorialIds = []
        .concat(morning_activities, evening_activities, break_activities)
        .map((activity) => activity.tutorial)
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

      const { current_activity_id, current_activity_sequence_id, current_completing_sequence_log_id } =
        await this.updateUserIfCurrentActivityDeleted(updateSettingsData, user);

      const { utc_shutdown_time, utc_startup_time } = this.calculateUserUTCRoutineTimes(
        startup_time,
        shutdown_time,
        user.timezone,
      );
      const userHasEditedSettings = user.has_edited_settings || (!!should_update_has_edited_settings && !is_onboarding);
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
      });
      let eveningActivities = evening_activities;
      if (updateSettingsData?.sleep_time) {
        const relaxActivityDuration = this.calculateRelaxActivityDuration(
          updateSettingsData.sleep_time,
          updateSettingsData.shutdown_time,
          updateSettingsData.evening_activities,
        );
        const relaxActivity: UpdateActivityDto = {
          id: randomUUID(),
          name: 'Relax',
          duration_seconds: relaxActivityDuration,
          show_saved_distracting_websites: true,
        };
        if (relaxActivityDuration > 0) {
          eveningActivities = [relaxActivity, ...evening_activities];
        }
      }
      const serializedActivities = { morning_activities, evening_activities: eveningActivities, break_activities };
      const { deserializedActivities, logQuantityQuestions, tutorials } = await this.activityParserService.deserialize(
        serializedActivities,
        user_id,
      );
      await this.userRepository.consistentlyUpdateUserSettings(
        updatedUser,
        deserializedActivities,
        logQuantityQuestions,
        tutorials,
      );
      if (should_update_has_edited_settings) {
        await Promise.all([
          this.userDailyStatsService.updateUserOnboardingProgress(user_id, UserProgressUpdateTypes.EDIT_SETTINGS),
          this.sendSettingsUpdatedBroadcast(user_id, user.language, device_id),
        ]);
      }
      return await this.getSettings({ user_id });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendSettingsUpdatedBroadcast(userId: string, language: string, deviceId: string) {
    await this.pusher.trigger(`private-${userId}`, 'settings-updated', { device_id: deviceId });
    // NOTE: comment out until implemented in mobile app
    // const title = this.i18nService.t('common.settings_updated', { lang: language });
    // const body = this.i18nService.t('common.settings_updated_message', {
    //   lang: language,
    // });
    // const pushData = { event: NotificationEvents.UPDATED_SETTINGS };
    // const publishRequest = this.pusherBeams.createBeamsPublishRequest({
    //   title,
    //   body,
    //   should_send_only_data_for_android: true,
    //   pushData,
    // });
    // await this.pusherBeams.publishToUsers([userId], publishRequest);
  }

  calculateRelaxActivityDuration(sleepTime: string, shutdownTime: string, eveningActivities: UpdateActivityDto[]) {
    const [sleepHours, sleepMinutes] = sleepTime.split(':');
    const [shutdownHours, shutdownMinutes] = shutdownTime.split(':');
    const sleepDateTime = DateTime.local().set({
      hour: this.formatTime(sleepHours),
      minute: this.formatTime(sleepMinutes),
    });
    const shutdownDateTime = DateTime.local().set({
      hour: this.formatTime(shutdownHours),
      minute: this.formatTime(shutdownMinutes),
    });
    const differenceSeconds = sleepDateTime.diff(shutdownDateTime, 'seconds').toObject().seconds;
    const eveningRoutineDuration = eveningActivities.reduce(
      (totalDuration, activity) => totalDuration + activity.duration_seconds,
      0,
    );
    let remainingTime = Math.round(differenceSeconds - eveningRoutineDuration);
    if (Object.is(remainingTime, -0)) {
      remainingTime = 0;
    }
    return remainingTime;
  }

  formatTime(formattedHour) {
    if (formattedHour.startsWith('0')) {
      return parseInt(formattedHour.substring(1), 10);
    }
    return parseInt(formattedHour, 10);
  }

  async clearUserActivities(user_id: string) {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Removing user activities',
      data: {
        user_id,
      },
    });
    const userSettings = await this.getSettings({ user_id });
    const newSettings: UpdateUserSettingsDto = _.cloneDeep(userSettings);
    newSettings.break_after_minutes = 20;
    newSettings.morning_activities = userSettings.morning_activities.filter((activity) => !activity.is_default);
    newSettings.break_activities = userSettings.break_activities.filter((activity) => !activity.is_default);
    newSettings.evening_activities = userSettings.evening_activities.filter((activity) => !activity.is_default);
    await this.updateSettings({ user_id }, newSettings, false, { is_onboarding: false });
  }

  async updateUserTimezoneAndLanguage(
    user_id: string,
    { timezone, language }: { timezone?: string; language?: LanguageOptions },
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
    const currentTime = DateTime.local({ zone: timezone });
    if (currentTime.invalidReason) {
      throw new BadRequestException(currentTime.invalidExplanation);
    }
    const currentTimeISO = currentTime.toISO();
    const positiveTime = currentTimeISO.split('+')[1];
    const negativeTime = currentTimeISO.split('-')[3];
    if (timezone) {
      if (positiveTime) {
        const userZone = `UTC+${positiveTime}`;
        await this.userRepository.update(user_id, {
          timezone: userZone,
          ...(language && { language }),
        });
        return;
      }
      if (negativeTime) {
        const userZone = `UTC-${negativeTime}`;
        await this.userRepository.update(user_id, {
          timezone: userZone,
          ...(language && { language }),
        });
        return;
      }
    }
    if (language) {
      await this.userRepository.update(user_id, {
        language,
      });
    }
  }

  calculateUserUTCRoutineTimes(startupTime: string, shutdownTime: string, timezone: string) {
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
      const activityIds = [...morningActivityIds, ...breakActivityIds, ...eveningActivityIds];
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
        const sequence = await this.activitySequenceRepository.orm.findOne({
          where: { id: user?.current_activity_sequence_id },
          relations: ['activities'],
        });
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
        .plus({ hours: parseInt(globalHours), minutes: parseInt(globalMinutes) });
      const activityTime = DateTime.now()
        .startOf('minute')
        .plus({ hours: parseInt(activityHours), minutes: parseInt(activityMinutes) });
      return activityTime <= globalTime;
    }
    return false;
  };
}
