import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { CalendarServiceFactory } from '../services/calendar.service.factory';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

@Controller('calendar')
@UseGuards(IsAuth)
@ApiTags('calendar')
@ApiSecurity('Auth0AccessToken')
export class CalendarController {
  constructor(private calendarServiceFactory: CalendarServiceFactory) {}

  @Get(':platform/events')
  async getEvents(@Param('platform') platform: IntegrationPlatforms, @AuthContext() { user }: Passport) {
    const service = this.calendarServiceFactory.get(platform);
    const events = await service.getEvents(user.id);
    return events;
  }
}
