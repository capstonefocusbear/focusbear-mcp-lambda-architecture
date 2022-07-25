import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthResponse } from 'pusher';
import { PusherService } from '../../../../../../libs/pusher/src';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../domain/passport.model';
import { PusherAuthDto } from '../dto/pusher-auth.dto';
import { IsAuth } from '../guards/is-auth/is-auth.guard';

@Controller('pusher')
@ApiTags('pusher')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class PusherAuthController {
  constructor(private readonly pusher: PusherService) {}

  @Post('user-auth')
  pusherAuth(@Body() { socket_id }: PusherAuthDto, @AuthContext() { user }: Passport): AuthResponse {
    return this.pusher.authenticate(socket_id, 'app', { user_id: user.id });
  }
}
