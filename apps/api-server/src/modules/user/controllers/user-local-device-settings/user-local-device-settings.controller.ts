import { Body, Controller, Get, Put, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
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
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  updateLocalDeviceSettings(
    @AuthContext() { user }: Passport,
    @Body() settings: UpdateLocalDeviceSettingsDto,
  ): Promise<UpdateLocalDeviceSettingsDto> {
    return this.userService.updateUserLocalDeviceSettings(user.id, settings);
  }
}
