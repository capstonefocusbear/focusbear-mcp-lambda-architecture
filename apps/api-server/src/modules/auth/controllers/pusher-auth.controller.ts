import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { PusherService } from '@app/pusher';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../domain/passport.model';
import { PusherAuthDto } from '../dto/pusher-auth.dto';
import { IsAuth } from '../guards/is-auth/is-auth.guard';
import { PusherBeamsAuthResponse } from '../dto/pusher-beams-auth-response.dto';
import { PusherBeamsAuthService } from '../services/pusher-beams-auth.service';

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
    return this.pusherBeamsAuthService.getPusherBeamsToken(user.id);
  }

  @Get('beams-unsubscribe')
  unsubscribeFromBeams(@AuthContext() { user }: Passport): Promise<void> {
    return this.pusherBeamsAuthService.unsubscribeFromBeams(user.id);
  }
}
