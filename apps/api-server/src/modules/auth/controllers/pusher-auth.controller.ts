import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { PusherService } from '@app/pusher';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../domain/passport.model';
import { PusherAuthDto } from '../dto/pusher-auth.dto';
import { IsAuth } from '../guards/is-auth/is-auth.guard';
import { PusherBeamsAuthResponse } from '../dto/pusher-beams-auth-response.dto';
import { PusherBeamsAuthService } from '../services/pusher-beams-auth.service';

const JEREMYS_USER_ID = '9884b0af-dc9f-4207-964e-e4db537a2234';

@Controller('pusher')
@ApiTags('pusher')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class PusherAuthController {
  constructor(
    private readonly pusher: PusherService,
    private readonly pusherBeamsAuthService: PusherBeamsAuthService,
  ) {}

  @Post('user-auth')
  pusherAuth(@Body() { socket_id }: PusherAuthDto, @AuthContext() { user }: Passport) {
    return this.pusher.generateAuthKey(user.id, socket_id);
  }

  @Get('beams-auth')
  getPusherBeamsToken(@AuthContext() { user }: Passport): Promise<PusherBeamsAuthResponse> {
    if (user?.id === JEREMYS_USER_ID) {
      // eslint-disable-next-line no-console
      console.log({ userId: user.id }, 'Jeremy requested Beams token');
    }
    return this.pusherBeamsAuthService.getPusherBeamsToken(user.id);
  }

  @Get('beams-unsubscribe')
  unsubscribeFromBeams(@AuthContext() { user }: Passport): Promise<void> {
    if (user?.id === JEREMYS_USER_ID) {
      // eslint-disable-next-line no-console
      console.log({ userId: user.id }, 'Jeremy requested Beams unsubscribe');
    }
    return this.pusherBeamsAuthService.unsubscribeFromBeams(user.id);
  }
}
