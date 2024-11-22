import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { GetUserSettingsQueryDto } from '../../dto/get-user-settings-query.dto';
import { UpdateUserSettingsDto } from '../../dto/update-user-settings.dto';
import { UserSettingsService } from '../../services/user-settings/user-settings.service';
import { UpdateSettingsQueryDto } from '../../dto/update-settings-query.dto';

@Controller('user-settings')
@UseGuards(IsAuth)
@ApiTags('user-settings')
@ApiSecurity('Auth0AccessToken')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get()
  getSettings(
    @Query() { timezone, language }: GetUserSettingsQueryDto,
    @AuthContext() { user }: Passport,
  ): Promise<UpdateUserSettingsDto> {
    return this.userSettingsService.getSettings({ user_id: user.id, timezone, language });
  }

  @Put()
  updateSettings(
    @AuthContext() { user }: Passport,
    @Query() { is_onboarding, device_id }: UpdateSettingsQueryDto,
    @Body() updateSettingsData: any,
  ) {
    return this.userSettingsService.updateSettings({ user_id: user.id }, updateSettingsData, true, {
      is_onboarding,
      device_id,
    });
  }
}
