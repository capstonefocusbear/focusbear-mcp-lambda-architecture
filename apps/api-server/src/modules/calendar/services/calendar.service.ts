import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { CalendarPlatforms } from '../../platform-integrations/domain/calendar-platforms.enum';
import { CalendarDto } from '../dto/calendar.dto';
import { CalendarKeyword } from '../entities/calendar-keywords.entity';
import { Calendar } from '../entities/calendar.entity';
import { CalendarKeywordRepository } from '../repositories/calendar-keyword.repository';
import { CalendarRepository } from '../repositories/calendar.repository';
import { UserRepository } from '../../user/repositories/user.repository';

@Injectable()
export class CalendarService {
  constructor(
    private readonly calendarKeywordRepository: CalendarKeywordRepository,
    private readonly calendarRepository: CalendarRepository,
    private readonly userRepository: UserRepository,
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
      const data = await this.calendarRepository.orm.find({
        where: { user_id: userId, platform, platform_account },
      });
      const stringdata = await data.map((e) => JSON.stringify(e));
      return stringdata;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
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
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
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
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
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
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async getCalendarKeywords(platform: CalendarPlatforms, userId: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting all calendar keywords',
        data: { userId },
      });
      const keywords = await this.calendarKeywordRepository.orm.find({
        where: { user_id: userId, platform },
      });
      return keywords;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async updateCalendarKeyword(userId: string, param: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'update calendar keywords',
        data: JSON.parse(param),
      });
      const { id, keyword, platform, title, description } = JSON.parse(param);
      if (id) {
        const existingRecord = await this.calendarKeywordRepository.orm.findOneBy({ id });
        if (existingRecord) {
          await this.calendarKeywordRepository.update(id, {
            keyword,
            intitle: title,
            indescription: description,
          });
        }
        return;
      }
      const calendarKeyword = new CalendarKeyword({
        user_id: userId,
        keyword,
        platform,
        intitle: title,
        indescription: description,
      });
      await this.calendarKeywordRepository.create(calendarKeyword);
      return calendarKeyword;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async deleteCalendarKeyword(user_id: string, id: string) {
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
      const exist = await this.calendarKeywordRepository.orm.findOneBy({ id });
      if (!exist) throw new NotFoundException(`CalendarKeyword with ID: ${id} does not exist`);
      await this.calendarKeywordRepository.orm.delete({ id });
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }
}
