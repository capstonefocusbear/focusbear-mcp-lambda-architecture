import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { TrackEventDto } from '../dto/track-event.dto';
import { EventsService } from '../services/events.service';

@Controller('events')
@ApiTags('events')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(204)
  logEvent(@Body() trackEventDto: TrackEventDto, @AuthContext() { user }: Passport) {
    return this.eventsService.handleIncomingEvent(trackEventDto, user.id);
  }
}
