import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { CalendarPlatforms } from '../../platform-integrations/domain/calendar-platforms.enum';
import { CalendarDto } from '../dto/calendar.dto';
import { CalendarExcludedKeyword } from '../entities/calendar-excluded-keywords.entity';
import { Calendar } from '../entities/calendar.entity';
import { CalendarExcluededKeywordRepository } from '../repositories/calendar-excluded-keyword.repository';
import { CalendarRepository } from '../repositories/calendar.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';

@Injectable()
export class CalendarService {
  constructor(
    private readonly calendarExcludedKeywordRepository: CalendarExcluededKeywordRepository,
    private readonly calendarRepository: CalendarRepository,
    private readonly userRepository: UserRepository,
    @Inject(forwardRef(() => PlatformIntegrationsService))
    private readonly platformIntegrationService: PlatformIntegrationsService,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async getCalendars(userId: string, platform: CalendarPlatforms, platform_account: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Calendar Service',
        level: 'debug',
        message: 'Getting Calendar datas by user, platform, account',
        data: {
          userId,
          platform,
          platform_account,
        },
      });
      const calendarDatas = await this.calendarRepository.orm.find({
        where: { user_id: userId, platform, platform_account },
      });
      const filteredCalendarData = calendarDatas.map((cal) => {
        return {
          id: cal.id,
          displayName: cal.summary,
          is_Selected: cal.is_selected,
        };
      });
      return filteredCalendarData;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateCalendar(userId: string, calendar: CalendarDto) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Calendar Service',
        level: 'debug',
        message: 'update or create calendar',
        data: {
          userId,
          calendar,
        },
      });
      const { platform, platform_account, calendar_id, summary } = calendar;
      const existingRecord = await this.calendarRepository.orm.findOne({
        where: { user_id: userId, platform, platform_account, calendar_id },
      });
      if (existingRecord) {
        await this.calendarRepository.update(existingRecord.id, { summary });
        return;
      }
      const newCalendar = new Calendar({
        user_id: userId,
        platform,
        platform_account,
        calendar_id,
        summary,
      });
      await this.calendarRepository.orm.save(newCalendar);
      return;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateCalendarStatus(id: string, is_selected: boolean) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Calendar Service',
        level: 'debug',
        message: 'updating calendar Status',
        data: {
          id,
          is_selected,
        },
      });
      await this.calendarRepository.update(id, { is_selected });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async deleteCalendar(id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Calendar Service',
        level: 'debug',
        message: 'delete calendar',
        data: {
          id,
        },
      });
      await this.calendarRepository.orm.delete(id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getCalendarExcludedKeywords(platform: CalendarPlatforms, userId: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting all calendar keywords',
        data: { userId },
      });
      const excludedKeywords = await this.calendarExcludedKeywordRepository.orm.find({
        where: { user_id: userId, platform },
      });
      return excludedKeywords;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateCalendarExcludedKeyword(userId: string, param: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'update calendar keywords',
        data: JSON.parse(param),
      });
      const { id, keyword, platform, title, description } = JSON.parse(param);
      if (id) {
        const existingRecord = await this.calendarExcludedKeywordRepository.orm.findOneBy({ id });
        if (existingRecord) {
          await this.calendarExcludedKeywordRepository.update(id, {
            keyword,
            intitle: title,
            indescription: description,
          });
        }
        return;
      }
      const newExcludedCalendarKeyword = new CalendarExcludedKeyword({
        user_id: userId,
        keyword,
        platform,
        intitle: title,
        indescription: description,
      });
      await this.calendarExcludedKeywordRepository.create(newExcludedCalendarKeyword);
      return;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async deleteCalendarExcludedKeyword(user_id: string, id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting all calendar keywords',
        data: { id },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) {
        throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      }
      const existingRecord = await this.calendarExcludedKeywordRepository.orm.findOneBy({ id });
      if (!existingRecord) throw new NotFoundException(`CalendarKeyword with ID: ${id} does not exist!`);
      await this.calendarExcludedKeywordRepository.orm.delete({ id });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getCalendarDatas(userId: string, platform: CalendarPlatforms) {
    const keywords = await this.getCalendarExcludedKeywords(platform, userId);
    const integrationPlatform =
      platform === CalendarPlatforms.GOOGLE ? IntegrationPlatforms.GOOGLE : IntegrationPlatforms.MICROSOFT;
    const accounts = await this.platformIntegrationService.getPlatformAccounts(integrationPlatform, userId);
    const calendars = await Promise.all(
      accounts.map(async (account) => {
        const items = await this.getCalendars(userId, platform, account.email);
        return {
          account: account.email,
          expired: account.expired,
          items,
        };
      }),
    );
    return {
      calendars,
      keywords,
    };
  }
}
