import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as _ from 'lodash';
import { DateTime } from 'luxon';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { ActivityParserService } from '../../../activity/services/activity-parser/activity-parser.service';
import { GetUserSettingsDto } from '../../dto/get-user-settings.dto';
import { UpdateUserSettingsDto } from '../../dto/update-user-settings.dto';
import { UserSettingsResponseDto } from '../../dto/user-settings-response.dto';
import { User } from '../../entities/user.entity';
import { UserRepository } from '../../repositories/user.repository';
import { UserService } from '../user/user.service';

@Injectable()
export class UserSettingsService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly activityParserService: ActivityParserService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @InjectSentry() private readonly sentryService: SentryService,
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
    const localDeviceSettings = await this.userService.getUserLocalDeviceSettings(user.id);
    const { hasEditedSettings } = localDeviceSettings.Web;
    const settings: UserSettingsResponseDto = {
      has_edited_settings: hasEditedSettings,
      ...user,
      ...serializedActivities,
    };
    return settings;
  }

  async updateSettings(
    { user_id }: GetUserSettingsDto,
    updateSettingsData: UpdateUserSettingsDto,
    shouldInitialSettingsUpdateBeChecked: boolean,
  ): Promise<UpdateUserSettingsDto> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating user settings',
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exists!`);
      const { startup_time, shutdown_time, break_after_minutes } = updateSettingsData;
      const updatedUser = new User({ startup_time, shutdown_time, break_after_minutes, id: user_id });
      const { morning_activities, evening_activities, break_activities } = updateSettingsData;
      const serializedActivities = { morning_activities, evening_activities, break_activities };
      const deserializedActivities = await this.activityParserService.deserialize(serializedActivities, user_id);
      await this.userRepository.consistentlyUpdateUserSettings(updatedUser, deserializedActivities);
      if (shouldInitialSettingsUpdateBeChecked) {
        await this.userService.markUserSettingsAsEdited(user_id);
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
    newSettings.morning_activities = [];
    newSettings.break_activities = [];
    newSettings.evening_activities = [];
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
}
