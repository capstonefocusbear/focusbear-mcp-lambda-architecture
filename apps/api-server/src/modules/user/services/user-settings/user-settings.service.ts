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
import { LanguageOptions } from '../../domain/language-options.enum';

const JEREMYS_USER_ID = '9884b0af-dc9f-4207-964e-e4db537a2234';

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
      if (timezone || language) {
        await this.updateUserTimezoneAndLanguage(user_id, { timezone, language });
      }
      return await this.serializeSettings(userSettings);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  private async serializeSettings({ activity_sequences, ...user }: User): Promise<UpdateUserSettingsDto> {
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
      const { current_activity_id, current_activity_sequence_id, current_completing_sequence_log_id } =
        await this.updateUserIfCurrentActivityDeleted(updateSettingsData, user);
      const {
        startup_time,
        shutdown_time,
        cutoff_time_for_non_high_priority_activities: cutoffTime,
        break_after_minutes,
      } = updateSettingsData;
      const { utc_shutdown_time, utc_startup_time } = this.calculateUserUTCRoutineTimes(
        startup_time,
        shutdown_time,
        user.timezone,
      );
      const userHasEditedSettings = user.has_edited_settings || !!should_update_has_edited_settings;
      const updatedUser = new User({
        startup_time,
        shutdown_time,
        cutoff_time_for_non_high_priority_activities: this.validateCutoffTime(cutoffTime) ? cutoffTime : null,
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
      const { morning_activities, evening_activities, break_activities } = updateSettingsData;
      const serializedActivities = { morning_activities, evening_activities, break_activities };
      const { deserializedActivities, logQuantityQuestions } = await this.activityParserService.deserialize(
        serializedActivities,
        user_id,
      );
      await this.userRepository.consistentlyUpdateUserSettings(
        updatedUser,
        deserializedActivities,
        logQuantityQuestions,
      );
      if (should_update_has_edited_settings) {
        await this.userDailyStatsService.updateUserOnboardingProgress(user_id, UserProgressUpdateTypes.EDIT_SETTINGS);
      }
      return await this.getSettings({ user_id });
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
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
    await this.updateSettings({ user_id }, newSettings, false);
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
        ...(language && { language }),
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
      if (current_activity_id && !activityIds.includes(current_activity_id)) {
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
          const { sequenceActivityIds, id: activity_sequence_id, activities } = sequence;
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
          if (!nextId) {
            if (user.id === JEREMYS_USER_ID) {
              console.log('Completing sequence - updateUserIfCurrentActivityDeleted');
              console.log({ current_activity_id, activityIds });
            }
            await this.completedActivitySequenceService.completeActivitySequence(
              current_completing_sequence_log_id,
              user.id,
            );
          }
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
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  validateCutoffTime(time: string) {
    if (!time) {
      return false;
    }
    const cutoffTimeForToday = DateTime.fromFormat(time, 'hh:mm');
    return cutoffTimeForToday.isValid;
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
}
