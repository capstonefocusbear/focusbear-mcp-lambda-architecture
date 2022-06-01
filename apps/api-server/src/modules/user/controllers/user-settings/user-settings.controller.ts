import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { UpdateUserSettingsDto } from '../../dto/update-user-settings.dto';
import { UserSettingsService } from '../../services/user-settings/user-settings.service';

@Controller('user-settings')
@UseGuards(IsAuth)
@ApiBearerAuth()
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get()
  getSettings(@AuthContext() { user }: Passport) {
    return this.userSettingsService.getSettings({ user_id: user.id });
  }

  @Put()
  updateSettings(@AuthContext() { user }: Passport, @Body() updateSettingsData: UpdateUserSettingsDto) {
    return this.userSettingsService.updateSettings({ user_id: user.id }, updateSettingsData);
  }
}
