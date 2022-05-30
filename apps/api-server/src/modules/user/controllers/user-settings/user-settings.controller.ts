import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { IsAuth } from '../../../auth/guards/is-auth.guard';
import { GetUserSettingsDto } from '../../dto/get-user-settings.dto';
import { UpdateUserSettingsDto } from '../../dto/update-user-settings.dto';
import { UserSettingsService } from '../../services/user-settings/user-settings.service';

@Controller('user-settings')
@UseGuards(IsAuth)
@ApiBearerAuth()
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get(':user_id')
  getSettings(@Param() { user_id }: GetUserSettingsDto) {
    return this.userSettingsService.getSettings({ user_id });
  }

  @Put(':user_id')
  updateSettings(@Param() { user_id }: GetUserSettingsDto, @Body() updateSettingsData: UpdateUserSettingsDto) {
    return this.userSettingsService.updateSettings({ user_id }, updateSettingsData);
  }
}
