import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { UpdateUserSettingsQueryDto } from '../../dto/update-user-settings-query.dto';
import { UpdateUserSettingsDto } from '../../dto/update-user-settings.dto';
import { UserSettingsService } from '../../services/user-settings/user-settings.service';

@Controller('user-settings')
@UseGuards(IsAuth)
@ApiTags('user-settings')
@ApiSecurity('Auth0AccessToken')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get()
  getSettings(@AuthContext() { user }: Passport): Promise<UpdateUserSettingsDto> {
    return this.userSettingsService.getSettings({ user_id: user.id });
  }

  @Put()
  updateSettings(
    @AuthContext() { user }: Passport,
    @Body() updateSettingsData: UpdateUserSettingsDto,
    @Query() { timezone }: UpdateUserSettingsQueryDto,
  ): Promise<UpdateUserSettingsDto> {
    return this.userSettingsService.updateSettings({ user_id: user.id }, updateSettingsData, true, timezone);
  }
}
