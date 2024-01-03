import { Controller, Get, Param, UseGuards, Delete, Query, Put, Body } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { CalendarServiceFactory } from '../services/calendar.service.factory';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { DeleteKeyWordQuery } from '../dto/delete-keyword-query.dto';
import { CalendarService } from '../services/calendar.service';
import { CalendarPlatforms } from '../../platform-integrations/domain/calendar-platforms.enum';

@Controller('calendar')
@UseGuards(IsAuth)
@ApiTags('calendar')
@ApiSecurity('Auth0AccessToken')
export class CalendarController {
  constructor(private calendarServiceFactory: CalendarServiceFactory, private calendarService: CalendarService) {}

  @Get(':platform/events')
  async getEvents(
    @Param('platform') platform: IntegrationPlatforms,
    @Query('account') account: string,
    @AuthContext() { user }: Passport,
  ) {
    const service = this.calendarServiceFactory.get(platform);
    const events = await service.updateEvents(user.id, account);
    return events;
  }

  @Get(':platform/calendar-datas')
  async getCalendarDatas(@Param('platform') platform: CalendarPlatforms, @AuthContext() { user }: Passport) {
    return this.calendarService.getCalendarDatas(user.id, platform);
  }

  @Put('/calendar-update')
  async updateCalendarStatus(@Body() { body }: any) {
    const { id, is_selected } = body;
    return this.calendarService.updateCalendarStatus(id, is_selected);
  }

  @Get(':platform/keywords')
  async getExcludedCalendarKeywords(@Param('platform') platform: CalendarPlatforms, @AuthContext() { user }: Passport) {
    const keywords = await this.calendarService.getCalendarExcludedKeywords(platform, user.id);
    return keywords;
  }

  @Put('/keyword-create')
  async createKeyword(@Body() { body }: any, @AuthContext() { user }: Passport) {
    return this.calendarService.updateCalendarExcludedKeyword(user.id, JSON.stringify(body));
  }

  @Put('/keyword-update')
  async updateExcludedKeyword(@Body() { body }: any, @AuthContext() { user }: Passport) {
    return this.calendarService.updateCalendarExcludedKeyword(user.id, JSON.stringify(body));
  }

  @Delete('/keyword-delete')
  async deleteExcludedKeyword(@Query() { id }: DeleteKeyWordQuery, @AuthContext() { user }: Passport) {
    return this.calendarService.deleteCalendarExcludedKeyword(user.id, id);
  }
}
