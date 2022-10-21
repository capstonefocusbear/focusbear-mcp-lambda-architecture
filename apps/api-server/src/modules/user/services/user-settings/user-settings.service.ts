import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityParserService } from '../../../activity/services/activity-parser/activity-parser.service';
import { GetUserSettingsDto } from '../../dto/get-user-settings.dto';
import { UpdateUserSettingsDto } from '../../dto/update-user-settings.dto';
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
  ) {}

  async getSettings({ user_id }: GetUserSettingsDto): Promise<UpdateUserSettingsDto> {
    const userSettings = await this.userRepository.getUserSettings(user_id);
    if (!userSettings) throw new NotFoundException(`User with id: ${user_id} does not exists!`);
    return this.serializeSettings(userSettings);
  }

  private async serializeSettings({ activity_sequences, ...user }: User): Promise<UpdateUserSettingsDto> {
    const serializedActivities = this.activityParserService.serialize(activity_sequences);
    const localDeviceSettings = await this.userService.getUserLocalDeviceSettings(user.id);
    const { hasEditedSettings } = localDeviceSettings.Web;
    const settings: UpdateUserSettingsDto = {
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
    const user = await this.userRepository.orm.findOne(user_id);
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
    return this.getSettings({ user_id });
  }
}
