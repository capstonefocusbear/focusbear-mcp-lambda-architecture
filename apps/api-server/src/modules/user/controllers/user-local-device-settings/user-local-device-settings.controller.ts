import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { UpdateLocalDeviceSettingsDto } from '../../dto/update-local-device-settings.dto';
import { UserService } from '../../services/user/user.service';

@Controller('user-local-device-settings')
@UseGuards(IsAuth)
@ApiTags('user-local-device-settings')
@ApiSecurity('Auth0AccessToken')
export class UserLocalDeviceSettingsController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getLocalDeviceSettings(@AuthContext() { user }: Passport): Promise<UpdateLocalDeviceSettingsDto> {
    return this.userService.getUserLocalDeviceSettings(user.id);
  }

  @Put()
  updateLocalDeviceSettings(
    @AuthContext() { user }: Passport,
    @Body() { MacOS, iOS, Windows, Android }: UpdateLocalDeviceSettingsDto,
  ): Promise<UpdateLocalDeviceSettingsDto> {
    return this.userService.updateUserLocalDeviceSettings(user.id, { MacOS, iOS, Windows, Android });
  }
}
