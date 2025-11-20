import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { NotFoundException } from '@nestjs/common';
import {
  userDummy,
  DummyCalendarOne,
  DummyCalendarTwo,
  DummyCalendarDto,
  DummyCalendarKeywordOne,
  DummyCalendarKeywordTwo,
  DummyCalendarUpdateDto,
  DummyCalendarCreateDto,
} from '../../../../test/dummies';
import { PlatformIntegrationsServiceMock, SentryServiceMock } from '../../../../test/mocks';
import { CalendarRepository } from '../repositories/calendar.repository';
import { CalendarExcluededKeywordRepository } from '../repositories/calendar-excluded-keyword.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import {
  CalendarRepositoryMock,
  CalendarExcluededKeywordRepositoryMock,
  UserRepositoryMock,
} from '../../../../test/mocks/repositories.mock';
import { CalendarService } from './calendar.service';
import { CalendarPlatforms } from '../../platform-integrations/domain/calendar-platforms.enum';
import { CalendarExcludedKeyword } from '../entities/calendar-excluded-keywords.entity';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';

describe('CalendarService', () => {
  let calendarService: CalendarService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CalendarService,
        CalendarRepository,
        CalendarExcluededKeywordRepository,
        UserRepository,
        PlatformIntegrationsService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(CalendarRepository)
      .useValue(CalendarRepositoryMock)
      .overrideProvider(CalendarExcluededKeywordRepository)
      .useValue(CalendarExcluededKeywordRepositoryMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .compile();
    calendarService = moduleRef.get<CalendarService>(CalendarService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('positive: should be defined', () => {
    expect(calendarService).toBeDefined();
  });

  describe('getCalendars', () => {
    it('positive: should fetch all calendars user registered', async () => {
      CalendarRepositoryMock.orm.find.mockResolvedValueOnce([DummyCalendarOne, DummyCalendarTwo]);
      const response = await calendarService.getCalendars(userDummy.id, CalendarPlatforms.GOOGLE, 'account');
      expect(response).toEqual([
        {
          id: DummyCalendarOne.id,
          displayName: DummyCalendarOne.summary,
          is_Selected: DummyCalendarOne.is_selected,
        },
        {
          id: DummyCalendarTwo.id,
          displayName: DummyCalendarTwo.summary,
          is_Selected: DummyCalendarTwo.is_selected,
        },
      ]);
    });
  });

  describe('updateCalendar', () => {
    it('positive: should update calendar summary', async () => {
      const existingRecord = {
        id: '7678970d-463d-4c1a-b8cc-9526edd2f803',
      };
      CalendarRepositoryMock.orm.findOne.mockResolvedValueOnce(existingRecord);
      await calendarService.updateCalendar(userDummy.id, DummyCalendarDto);
      expect(CalendarRepositoryMock.update).toHaveBeenCalledWith(existingRecord.id, {
        summary: DummyCalendarDto.summary,
      });
    });

    it('positive: should create calendar', async () => {
      CalendarRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      await calendarService.updateCalendar(userDummy.id, DummyCalendarDto);
      expect(CalendarRepositoryMock.orm.save).toHaveBeenCalledWith({
        user_id: userDummy.id,
        ...DummyCalendarDto,
      });
    });
  });

  describe('updateCalendarStatus', () => {
    it('positive: should update calendar staus', async () => {
      const updateData = {
        id: '7678970d-463d-4c1a-b8cc-9526edd2f803',
        is_selected: true,
      };
      await calendarService.updateCalendarStatus(updateData.id, updateData.is_selected);
      expect(CalendarRepositoryMock.update).toHaveBeenCalledWith(updateData.id, {
        is_selected: updateData.is_selected,
      });
    });
  });

  describe('deleteCalendar', () => {
    it('positive: should delete calendar', async () => {
      const updateData = {
        id: '7678970d-463d-4c1a-b8cc-9526edd2f803',
        is_selected: true,
      };
      await calendarService.deleteCalendar(updateData.id);
      expect(CalendarRepositoryMock.orm.delete).toHaveBeenCalledWith(updateData.id);
    });
  });

  describe('getCalendarExcludedKeywords', () => {
    it('positive: should fetch all calendar keywords by platform and userId', async () => {
      CalendarExcluededKeywordRepositoryMock.orm.find.mockResolvedValueOnce([
        DummyCalendarKeywordOne,
        DummyCalendarKeywordTwo,
      ]);
      const results = await calendarService.getCalendarExcludedKeywords(CalendarPlatforms.GOOGLE, userDummy.id);
      expect(results).toEqual([DummyCalendarKeywordOne, DummyCalendarKeywordTwo]);
    });
  });

  describe('updateCalendarExcludedKeyword', () => {
    it('positive: should upadate calendar keyword status', async () => {
      CalendarExcluededKeywordRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        id: DummyCalendarUpdateDto.id,
      });
      await calendarService.updateCalendarExcludedKeyword(userDummy.id, JSON.stringify(DummyCalendarUpdateDto));
      expect(CalendarExcluededKeywordRepositoryMock.update).toHaveBeenCalledWith(DummyCalendarUpdateDto.id, {
        keyword: DummyCalendarUpdateDto.keyword,
        intitle: DummyCalendarUpdateDto.title,
        indescription: DummyCalendarUpdateDto.description,
      });
    });

    it('positive: should create calendar keyword', async () => {
      const newExcludedCalendarKeyword = new CalendarExcludedKeyword({
        user_id: userDummy.id,
        keyword: DummyCalendarCreateDto.keyword,
        intitle: DummyCalendarCreateDto.title,
        indescription: DummyCalendarCreateDto.description,
        platform: DummyCalendarCreateDto.platform,
      });
      await calendarService.updateCalendarExcludedKeyword(userDummy.id, JSON.stringify(DummyCalendarCreateDto));
      expect(CalendarExcluededKeywordRepositoryMock.create).toHaveBeenCalledWith(newExcludedCalendarKeyword);
    });
  });

  describe('deleteCalendarExcludedKeyword', () => {
    it('negative: should return that the user was not found', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;
      try {
        await calendarService.deleteCalendarExcludedKeyword(userDummy.id, 'calendarExcludedKeyId');
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should return that the user was not found', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      CalendarExcluededKeywordRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `CalendarKeyword with ID: ${DummyCalendarKeywordOne.id} does not exist!`;
      let exception: any;
      try {
        await calendarService.deleteCalendarExcludedKeyword(userDummy.id, DummyCalendarKeywordOne.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should delete Excludedkeyword data', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      CalendarExcluededKeywordRepositoryMock.orm.findOneBy.mockResolvedValueOnce(DummyCalendarKeywordOne);
      await calendarService.deleteCalendarExcludedKeyword(userDummy.id, DummyCalendarKeywordOne.id);
      expect(CalendarExcluededKeywordRepositoryMock.orm.delete).toHaveBeenCalledWith({
        id: DummyCalendarKeywordOne.id,
      });
    });
  });
});
