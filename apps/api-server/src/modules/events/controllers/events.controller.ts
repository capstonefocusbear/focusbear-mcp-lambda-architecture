import { Body, Controller, Get, Headers, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAdmin } from '../../auth/guards/is-admin/is-admin.guard';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { AdminTrackEventResponseDto } from '../dto/admin-track-event-response.dto';
import { GetAdminTrackEventsQueryDto } from '../dto/get-admin-track-events-query.dto';
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
  logEvent(
    @Body() trackEventDto: TrackEventDto,
    @AuthContext() { user }: Passport,
    @Headers() { device_id, 'app-version': app_version }: any,
  ) {
    return this.eventsService.handleIncomingEvent(trackEventDto, user.id, { device_id, app_version });
  }

  /**
   * Fetches track events for a specific user. Used by the admin support dashboard
   * to view user activity history in the "Track Events" tab.
   */
  @Get('/admin')
  @UseGuards(IsAdmin)
  async getTrackEventsForAdminDashboard(
    @Query() { user_id, take }: GetAdminTrackEventsQueryDto,
    @AuthContext() { user: admin }: Passport,
  ): Promise<AdminTrackEventResponseDto[]> {
    return this.eventsService.getTrackEventsForAdminDashboard(admin.id, user_id, take);
  }
}
