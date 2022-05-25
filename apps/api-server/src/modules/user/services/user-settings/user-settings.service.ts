import { Injectable } from '@nestjs/common';
import { GetUserSettingsDto } from '../../dto/get-user-settings.dto';
import { UpdateUserSettingsDto } from '../../dto/update-user-settings.dto';
import { UserRepository } from '../../repositories/user.repository';

@Injectable()
export class UserSettingsService {
  constructor(private readonly userRepository: UserRepository) {}

  async getSettings({ user_id }: GetUserSettingsDto): Promise<any> {
    return { user_id };
  }

  async updateSettings({ user_id }: GetUserSettingsDto, updateSettingsData: UpdateUserSettingsDto): Promise<any> {
    return { user_id, updateSettingsData };
  }
}
