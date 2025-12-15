/* eslint-disable global-require */
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { SENTRY_TOKEN, SentryService } from '@app/observability';
import { BrevoService } from '@app/brevo/brevo.service';
import axios from 'axios';
import { SendGridService } from '@app/send-grid';
import { randomUUID } from 'crypto';
import { PusherBeamsService } from '@app/pusher-beams';
import { I18nService } from 'nestjs-i18n';
import { mockDeep } from 'jest-mock-extended';
import { Job } from 'bull';
import { prettyJson } from '../../../shared/utils/helpers';
import { userDummy, QueueMock, auth0UserDummy, DeviceDummy, lastFiftyEventsDummy } from '../../../../test/dummies';
import {
  Auth0ManagementServiceMock,
  EventsRepositoryMock,
  BrevoServiceMock,
  SentryServiceMock,
  UserRepositoryMock,
  UserDailyStatsServiceMock,
  SendGridServiceMock,
  DeviceServiceMock,
  TrackEventRepositoryMock,
  PusherBeamsServiceMock,
} from '../../../../test/mocks';
import { UserRepository } from '../../user/repositories/user.repository';
import { Auth0ManagementService } from '../../../../../../libs/auth0/src';
import { EventTypes } from '../domain/event-types.enum';
import { EventsRepository } from '../repositories/events.repository';
import { ImpactEvent } from '../entities/impact-event.entity';
import { ImpactCategory } from '../../activity/domain/impact-category.enum';
import { TrackEventDto } from '../dto/track-event.dto';
import { UserDailyStatsService } from '../../user/services/user-daily-stats/user-daily-stats.service';
import { DeviceService } from '../../device/services/device/device.service';
import { BullQueues, BullWorkers, EMAIL_SUBJECTS, FOCUS_BEAR_EMAILS } from '../../../shared/utils/constants';
import { TrackEventRepository } from '../repositories/track-event.repository';
import { TrackEvent } from '../entities/track-event.entity';
import { EventsConsumer } from './events.consumer';
import { EventsService } from '../services/events.service';

jest.mock('ioredis', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RedisMock = require('ioredis-mock');
  if (typeof RedisMock === 'function') {
    // ioredis-mock exports a constructor function
    return RedisMock;
  }
  // ioredis-mock exports an object (or class), so we return a constructor function
  return jest.fn(() => RedisMock);
});

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK = 'some-url?zapikey=key';

describe('EventConsumer', () => {
  let eventsConsumer: EventsConsumer;
  const i18nServiceMock = mockDeep<I18nService>();
  const setTranslations = (translations: Record<string, string>) =>
    (i18nServiceMock.t as jest.MockedFunction<any>).mockImplementation((key: string) => translations[key] ?? '');
  const headersDummy = { app_version: '1.0.0', device_id: randomUUID() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EventsConsumer,
        SentryService,
        PusherBeamsService,
        EventsService,
        BrevoService,
        UserRepository,
        Auth0ManagementService,
        EventsRepository,
        UserDailyStatsService,
        SendGridService,
        DeviceService,
        TrackEventRepository,
        {
          provide: I18nService,
          useValue: i18nServiceMock,
        },
        {
          provide: getQueueToken(BullQueues.EVENTS),
          useValue: QueueMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(PusherBeamsService)
      .useValue(PusherBeamsServiceMock)
      .overrideProvider(BrevoService)
      .useValue(BrevoServiceMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(Auth0ManagementService)
      .useValue(Auth0ManagementServiceMock)
      .overrideProvider(EventsRepository)
      .useValue(EventsRepositoryMock)
      .overrideProvider(UserDailyStatsService)
      .useValue(UserDailyStatsServiceMock)
      .overrideProvider(SendGridService)
      .useValue(SendGridServiceMock)
      .overrideProvider(DeviceService)
      .useValue(DeviceServiceMock)
      .overrideProvider(TrackEventRepository)
      .useValue(TrackEventRepositoryMock)
      .compile();

    eventsConsumer = moduleRef.get<EventsConsumer>(EventsConsumer);

    process.env = {
      ZOHO_CLIQ_BACKEND_BOT_WEBHOOK: 'some-url',
      ZOHO_CLIQ_API_KEY: 'key',
      ZOHO_CLIQ_QUIT_UNINSTALL_CHANNEL: 'channel',
      REDIS_PORT: '6379',
      REDIS__HOSTNAME: 'localhost',
      FIELD_TRANSFORMER_ENCRYPTION_KEY: 'super-secret-key',
    };

    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(eventsConsumer).toBeDefined();
  });

  describe('track-event', () => {
    beforeEach(() => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue({
        ...userDummy,
        created_at: new Date('22/10/2023'),
      });
    });
    it('positive: should log event in cliq for quit or disable app for 4 hours events', async () => {
      const dummyEvent = { event_type: EventTypes.APP_QUIT, event_data: { data: { quitReason: 'App is broken' } } };
      const message = `*User quit app:*\n*User ID:* ${userDummy.id}\n*Event:*\`\`\`${JSON.stringify(dummyEvent)}\`\`\``;
      const job = {
        data: {
          user_id: userDummy.id,
          user_auth0_id: userDummy.auth0_id,
          trackEventDto: dummyEvent,
          device_id: headersDummy.device_id,
          app_version: headersDummy.app_version,
          user_language: userDummy.language,
          user_timezone: userDummy.timezone,
        },
      } as Job;

      await eventsConsumer.readOperationJob(job);

      expect(mockedAxios.post).toHaveBeenCalledWith(MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK, {
        channel: 'channel',
        message,
      });
    });

    it('positive: if event is of type postpone_habits_from_mobile, event should be added to queue to send push notification to user', async () => {
      const minutesToPostpone = 1;
      const dummyEvent = {
        event_type: EventTypes.POSTPONE_HABITS_FROM_MOBILE,
        event_data: { data: { quantity: minutesToPostpone } },
      };

      const job = {
        data: {
          user_id: userDummy.id,
          user_auth0_id: userDummy.auth0_id,
          trackEventDto: dummyEvent,
          device_id: headersDummy.device_id,
          app_version: headersDummy.app_version,
          user_language: 'en',
          user_timezone: userDummy.timezone,
        },
      } as Job;

      await eventsConsumer.readOperationJob(job);

      expect(QueueMock.add).toHaveBeenCalledWith(
        BullWorkers.RESUME_NOTIFICATION,
        {
          user_id: userDummy.id,
          event_type: EventTypes.POSTPONE_HABITS_FROM_MOBILE,
          language: 'en',
        },
        { delay: 60000 },
      );
    });

    it('positive: if event is impact measurement event, event should be saved in DB', async () => {
      const dummyEvent: TrackEventDto = {
        event_type: EventTypes.POSTPONE_FOCUS_MODE_FROM_MOBILE,
        event_data: { data: { quantity: 5 } },
      };

      const job = {
        data: {
          user_id: userDummy.id,
          user_auth0_id: userDummy.auth0_id,
          trackEventDto: dummyEvent,
          device_id: headersDummy.device_id,
          app_version: headersDummy.app_version,
          user_language: 'en',
          user_timezone: userDummy.timezone,
        },
      } as Job;

      await eventsConsumer.readOperationJob(job);

      expect(EventsRepositoryMock.orm.save).toHaveBeenCalledWith(
        new ImpactEvent({
          user_id: userDummy.id,
          quantity: 5,
          impact_category: ImpactCategory.MINUTES_SPENT_POSTPONING_APP_BLOCKS,
        }),
      );
    });

    it('positive: if event is distraction block event, daily stats distraction block count should be incremented', async () => {
      const job = {
        data: {
          user_id: userDummy.id,
          user_auth0_id: userDummy.auth0_id,
          trackEventDto: { event_type: EventTypes.BLOCK_DISTRACTING_APP },
          device_id: headersDummy.device_id,
          app_version: headersDummy.app_version,
          user_language: userDummy.language,
          user_timezone: userDummy.timezone,
        },
      } as Job;

      await eventsConsumer.readOperationJob(job);

      expect(UserDailyStatsServiceMock.updateDistractionBlockCount).toHaveBeenCalledWith(
        userDummy.id,
        userDummy.timezone,
      );
    });

    it('positive: if event type is app-quit and feedback is sent, email should be sent to customer support channel', async () => {
      TrackEventRepositoryMock.orm.find.mockResolvedValue(lastFiftyEventsDummy);

      const dummyEvent = {
        event_type: EventTypes.APP_QUIT,
        event_data: { data: { quitReason: 'App is broken', feedback: 'Test feedback' } },
      };

      const job = {
        data: {
          user_id: userDummy.id,
          user_auth0_id: userDummy.auth0_id,
          trackEventDto: dummyEvent,
          device_id: headersDummy.device_id,
          app_version: headersDummy.app_version,
          user_language: userDummy.language,
          user_timezone: userDummy.timezone,
        },
      } as Job;

      await eventsConsumer.readOperationJob(job);

      expect(SendGridServiceMock.sendEmail).toHaveBeenCalledWith({
        to: FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
        from: FOCUS_BEAR_EMAILS.SUPPORT,
        replyTo: auth0UserDummy.email,
        text: `${prettyJson(dummyEvent, 'pretty')}\n\nLast 50 Events:\n\n${prettyJson(
          lastFiftyEventsDummy,
          'jsonarray',
          'event_type',
        )}`,
        subject: `${EMAIL_SUBJECTS.APP_QUIT_FEEDBACK}: ${dummyEvent.event_data.data.quitReason}`,
      });
    });

    it('positive: track event should be saved in DB', async () => {
      const dummyEvent = {
        event_type: EventTypes.APP_QUIT,
        event_data: { data: { quitReason: 'App is broken', feedback: 'Test feedback' } },
        user_properties: { id: userDummy.id },
      };
      DeviceServiceMock.updateDeviceAppVersion.mockResolvedValueOnce(DeviceDummy);

      const job = {
        data: {
          user_id: userDummy.id,
          user_auth0_id: userDummy.auth0_id,
          trackEventDto: dummyEvent,
          device_id: headersDummy.device_id,
          app_version: headersDummy.app_version,
          user_language: userDummy.language,
          user_timezone: userDummy.timezone,
        },
      } as Job;

      await eventsConsumer.readOperationJob(job);

      expect(TrackEventRepositoryMock.orm.save).toHaveBeenCalledWith(
        new TrackEvent({
          user_id: userDummy.id,
          event_data: dummyEvent.event_data,
          event_type: dummyEvent.event_type,
          user_properties: dummyEvent.user_properties,
          operating_system: DeviceDummy.operating_system,
        }),
      );
    });
  });

  describe('sendResumeHabitsNotification', () => {
    it('positive: should send push notification for postponed habits', async () => {
      setTranslations({
        'common.resume_habits_title': 'Resume your habits',
        'common.resume_habits_body': 'Time to continue your routine',
      });

      const mockPublishRequest = { notification: { title: 'test', body: 'test' } };
      PusherBeamsServiceMock.createBeamsPublishRequest.mockReturnValue(mockPublishRequest);

      const job = {
        data: {
          user_id: userDummy.id,
          event_type: EventTypes.POSTPONE_HABITS_FROM_MOBILE,
          language: 'en',
        },
      } as Job;

      await eventsConsumer.sendResumeHabitsNotification(job);

      expect(PusherBeamsServiceMock.createBeamsPublishRequest).toHaveBeenCalledWith({
        title: expect.any(String),
        body: expect.any(String),
        pushData: {
          id: EventTypes.POSTPONE_HABITS_FROM_MOBILE,
        },
      });

      expect(PusherBeamsServiceMock.publishToUsers).toHaveBeenCalledWith([userDummy.id], expect.any(Object));
    });

    it('positive: should send push notification for postponed focus mode', async () => {
      setTranslations({
        'common.resume_focus_mode_title': 'Resume focus mode',
        'common.resume_focus_mode_body': 'Time to focus again',
      });

      const mockPublishRequest = { notification: { title: 'test', body: 'test' } };
      PusherBeamsServiceMock.createBeamsPublishRequest.mockReturnValue(mockPublishRequest);

      const job = {
        data: {
          user_id: userDummy.id,
          event_type: EventTypes.POSTPONE_FOCUS_MODE_FROM_MOBILE,
          language: 'es',
        },
      } as Job;

      await eventsConsumer.sendResumeHabitsNotification(job);

      expect(PusherBeamsServiceMock.createBeamsPublishRequest).toHaveBeenCalledWith({
        title: expect.any(String),
        body: expect.any(String),
        pushData: {
          id: EventTypes.POSTPONE_FOCUS_MODE_FROM_MOBILE,
        },
      });

      expect(PusherBeamsServiceMock.publishToUsers).toHaveBeenCalledWith([userDummy.id], expect.any(Object));
    });

    it('negative: should handle errors gracefully and log to Sentry', async () => {
      const job = {
        data: {
          user_id: userDummy.id,
          event_type: EventTypes.POSTPONE_HABITS_FROM_MOBILE,
          language: 'en',
        },
      } as Job;

      const error = new Error('Push notification failed');
      PusherBeamsServiceMock.publishToUsers.mockRejectedValueOnce(error);

      await eventsConsumer.sendResumeHabitsNotification(job);

      expect(SentryServiceMock.instance().captureException).toHaveBeenCalledWith(error, { level: 'error' });
    });
  });

  describe('getNotificationTitleAndBody', () => {
    it('positive: should return correct title and body for postponed habits', () => {
      setTranslations({
        'common.resume_habits_title': 'Resume your habits',
        'common.resume_habits_body': 'Time to continue your routine',
      });

      const result = eventsConsumer.getNotificationTitleAndBody('en', EventTypes.POSTPONE_HABITS_FROM_MOBILE);

      expect(result).toEqual({
        title: 'Resume your habits',
        body: 'Time to continue your routine',
      });
      expect(i18nServiceMock.t).toHaveBeenCalledWith('common.resume_habits_title', { lang: 'en' });
      expect(i18nServiceMock.t).toHaveBeenCalledWith('common.resume_habits_body', { lang: 'en' });
    });

    it('positive: should return correct title and body for postponed focus mode', () => {
      setTranslations({
        'common.resume_focus_mode_title': 'Resume focus mode',
        'common.resume_focus_mode_body': 'Time to focus again',
      });

      const result = eventsConsumer.getNotificationTitleAndBody('es', EventTypes.POSTPONE_FOCUS_MODE_FROM_MOBILE);

      expect(result).toEqual({
        title: 'Resume focus mode',
        body: 'Time to focus again',
      });
      expect(i18nServiceMock.t).toHaveBeenCalledWith('common.resume_focus_mode_title', { lang: 'es' });
      expect(i18nServiceMock.t).toHaveBeenCalledWith('common.resume_focus_mode_body', { lang: 'es' });
    });
  });

  describe('findEmail', () => {
    beforeEach(async () => {
      await (eventsConsumer as unknown as { redisClient: { flushall: () => Promise<void> } }).redisClient.flushall();
    });

    it('positive: should fetch email from Auth0 when not in cache', async () => {
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue(auth0UserDummy);

      const result = await eventsConsumer.findEmail(userDummy.id, userDummy.auth0_id);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('positive: should use default email if Auth0 user has no email', async () => {
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue({ ...auth0UserDummy, email: null });

      const result = await eventsConsumer.findEmail(userDummy.id, userDummy.auth0_id);

      expect(result).toBe('some@email.com');
    });
  });
});
