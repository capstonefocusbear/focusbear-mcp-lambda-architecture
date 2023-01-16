import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as _ from 'lodash';
import { DateTime } from 'luxon';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { ActivityParserService } from '../../../activity/services/activity-parser/activity-parser.service';
import { GetUserSettingsDto } from '../../dto/get-user-settings.dto';
import { UpdateUserSettingsDto } from '../../dto/update-user-settings.dto';
import { UserSettingsResponseDto } from '../../dto/user-settings-response.dto';
import { User } from '../../entities/user.entity';
import { UserRepository } from '../../repositories/user.repository';
import { CompletedActivitySequenceService } from '../../../activity/services/completed-activity-sequence/completed-activity-sequence.service';
import { ActivitySequenceRepository } from '../../../activity/repositories/activity-sequence.repository';

@Injectable()
export class UserSettingsService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly activityParserService: ActivityParserService,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly completedActivitySequenceService: CompletedActivitySequenceService,
    private readonly activitySequenceRepository: ActivitySequenceRepository,
  ) {}

  async getSettings({ user_id, timezone }: GetUserSettingsDto): Promise<UpdateUserSettingsDto> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching user settings',
        data: {
          user_id,
          timezone,
        },
      });
      const userSettings = await this.userRepository.getUserSettings(user_id);
      if (!userSettings) {
        throw new NotFoundException(`User with id: ${user_id} does not exists!`);
      }
      if (userSettings.cutoff_time_for_standard_priority_activities === null) {
        delete userSettings.cutoff_time_for_standard_priority_activities;
      }
      if (timezone) {
        await this.updateUserTimezone(user_id, timezone);
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
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating user settings',
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exists!`);
      // eslint-disable-next-line operator-linebreak
      const { current_activity_id, current_activity_sequence_id, current_completing_sequence_log_id } =
        await this.updateUserIfCurrentActivityDeleted(updateSettingsData, user);
      // eslint-disable-next-line operator-linebreak
      const { startup_time, shutdown_time, cutoff_time_for_standard_priority_activities, break_after_minutes } =
        updateSettingsData;
      const userHasEditedSettings = user.has_edited_settings || !!should_update_has_edited_settings;
      const updatedUser = new User({
        startup_time,
        shutdown_time,
        cutoff_time_for_standard_priority_activities,
        break_after_minutes,
        id: user_id,
        has_edited_settings: userHasEditedSettings,
        current_activity_id,
        current_activity_sequence_id,
        current_completing_sequence_log_id,
      });
      const { morning_activities, evening_activities, break_activities } = updateSettingsData;
      const serializedActivities = { morning_activities, evening_activities, break_activities };
      const deserializedActivities = await this.activityParserService.deserialize(serializedActivities, user_id);
      await this.userRepository.consistentlyUpdateUserSettings(updatedUser, deserializedActivities);
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

  async updateUserTimezone(user_id: string, timezone: string) {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Updating user timezone',
      data: {
        user_id,
        timezone,
      },
    });
    const currentTime = DateTime.local({ zone: timezone });
    if (currentTime.invalidReason) {
      throw new BadRequestException(currentTime.invalidExplanation);
    }
    const currentTimeISO = currentTime.toISO();
    const positiveTime = currentTimeISO.split('+')[1];
    const negavtiveTime = currentTimeISO.split('-')[3];
    if (positiveTime) {
      const userZone = `UTC+${positiveTime}`;
      await this.userRepository.update(user_id, { timezone: userZone });
      return;
    }
    if (negavtiveTime) {
      const userZone = `UTC-${negavtiveTime}`;
      await this.userRepository.update(user_id, { timezone: userZone });
    }
  }

  async updateUserIfCurrentActivityDeleted(updateSettingsData: UpdateUserSettingsDto, user: User) {
    let { current_completing_sequence_log_id, current_activity_sequence_id, current_activity_id } = user;
    let nextActivityId: string;
    const { morning_activities, break_activities, evening_activities } = updateSettingsData;
    const morningActivityIds = morning_activities.map((activity) => activity.id);
    const breakActivityIds = break_activities.map((activity) => activity.id);
    const eveningActivityIds = evening_activities.map((activity) => activity.id);
    const activityIds = [...morningActivityIds, ...breakActivityIds, ...eveningActivityIds];
    const { completing_sequence_log } = user;
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
      const sequence = await this.activitySequenceRepository.orm.findOneBy({ id: user.current_activity_sequence_id });
      if (!sequence) return;
      const { sequenceActivityIds, id: activity_sequence_id } = sequence;
      const currentActivityIndexInTheSequence = sequenceActivityIds.findIndex((e) => e === current_activity_id);
      nextActivityId = sequenceActivityIds[currentActivityIndexInTheSequence + 1];
      current_completing_sequence_log_id = nextActivityId ? completing_sequence_log?.id : null;
      current_activity_sequence_id = nextActivityId ? activity_sequence_id : null;
      current_activity_id = nextActivityId ?? null;
      await this.userRepository.orm.update(user.id, {
        ...user,
        current_completing_sequence_log_id,
        current_activity_id: nextActivityId ?? null,
        current_activity_sequence_id,
      });
      if (!nextActivityId) {
        await this.completedActivitySequenceService.completeActivitySequence(completing_sequence_log.id, user.id);
      }
    }
    return {
      current_completing_sequence_log_id,
      current_activity_id,
      current_activity_sequence_id,
    };
  }
}
