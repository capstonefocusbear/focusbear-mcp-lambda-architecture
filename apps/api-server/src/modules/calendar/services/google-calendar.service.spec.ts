import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { ConfigService } from '@nestjs/config';
import { userDummy } from '../../../../test/dummies';
import {
  CalendarServiceMock,
  ConfigServiceMock,
  NotificationRepositoryMock,
  NotificationServiceMock,
  PlatformIntegrationsServiceMock,
  SentryServiceMock,
  UserRepositoryMock,
} from '../../../../test/mocks';
import { NotificationRepository } from '../../notification/repository/notification.repository';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { GoogleCalendarService } from './google-calendar.service';
import { NotificationService } from '../../notification/services/notification.service';
import { CalendarService } from './calendar.service';

describe('GoogleCalendarService', () => {
  let googleCalendarService: GoogleCalendarService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GoogleCalendarService,
        ConfigService,
        PlatformIntegrationsService,
        NotificationRepository,
        NotificationService,
        UserRepository,
        CalendarService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(ConfigServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .overrideProvider(NotificationRepository)
      .useValue(NotificationRepositoryMock)
      .overrideProvider(NotificationService)
      .useValue(NotificationServiceMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(CalendarService)
      .useValue(CalendarServiceMock)
      .compile();
    googleCalendarService = moduleRef.get<GoogleCalendarService>(GoogleCalendarService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('positive: should be defined', () => {
    expect(googleCalendarService).toBeDefined();
  });

  describe('updateEvents', () => {
    it('negative: should return that the user was not found', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;
      try {
        await googleCalendarService.updateEvents(userDummy.id, 'email');
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });
  });
});
