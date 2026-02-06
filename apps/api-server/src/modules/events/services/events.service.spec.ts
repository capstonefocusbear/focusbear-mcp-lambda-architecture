/* eslint-disable global-require */
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { UnauthorizedException } from '@nestjs/common';
import { SENTRY_TOKEN } from '@app/observability';
import { BrevoService } from '@app/brevo/brevo.service';
import axios from 'axios';
import { SendGridService } from '@app/send-grid';
import { randomUUID } from 'crypto';
import { prettyJson } from '../../../shared/utils/helpers';
import { userDummy, QueueMock, auth0UserDummy, lastFiftyEventsDummy, adminUserDummy } from '../../../../test/dummies';
import {
  EMAIL_SUBJECTS,
  FOCUS_BEAR_EMAILS,
  BullQueues,
  BullWorkers,
  ONE_HOUR_MILLISECONDS,
} from '../../../shared/utils/constants';
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
} from '../../../../test/mocks';
import { EventsService } from './events.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { Auth0ManagementService } from '../../../../../../libs/auth0/src';
import { EventTypes } from '../domain/event-types.enum';
import { EventsRepository } from '../repositories/events.repository';
import { UserDailyStatsService } from '../../user/services/user-daily-stats/user-daily-stats.service';
import { DeviceService } from '../../device/services/device/device.service';

import { TrackEventRepository } from '../repositories/track-event.repository';

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
const currentDate = new Date();

describe('EventService', () => {
  let eventsService: EventsService;
  const headersDummy = { app_version: '1.0.0', device_id: randomUUID() };
  const MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK = 'some-url?zapikey=key';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
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
          provide: getQueueToken(BullQueues.EVENTS),
          useValue: QueueMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
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

    eventsService = moduleRef.get<EventsService>(EventsService);

    process.env = {
      ZOHO_CLIQ_BACKEND_BOT_WEBHOOK: 'some-url',
      ZOHO_CLIQ_API_KEY: 'key',
      ZOHO_CLIQ_QUIT_UNINSTALL_CHANNEL: 'channel',
      REDIS_PORT: '6379',
      REDIS__HOSTNAME: 'localhost',
      FIELD_TRANSFORMER_ENCRYPTION_KEY: 'super-secret-key',
    };
  });

  it('should be defined', () => {
    expect(eventsService).toBeDefined();
  });

  describe('handleEventBroadcast', () => {
    const reason = 'muy dañado';

    const testCases = [
      {
        description: 'positive: should broadcast to cliq and email on an app quit event with feedback (old user)',
        msgPrefix: '*User quit app:*',
        dummyEvent: {
          event_type: EventTypes.APP_QUIT,
          event_data: { data: { quitReason: reason, feedback: 'me gustan los ponis' } },
        },
        expectCliq: true,
        expectEmail: true,
        isOldUser: true,
      },
      {
        description: 'positive: should broadcast to cliq on an app quit event with no feedback (old user)',
        msgPrefix: '*User quit app:*',
        dummyEvent: {
          event_type: EventTypes.APP_QUIT,
          event_data: { data: { quitReason: reason } },
        },
        expectCliq: true,
        expectEmail: false,
        isOldUser: true,
      },
      {
        description: 'positive: should broadcast to cliq and email on a 4 hr break event with feedback (old user)',
        msgPrefix: '*User disabled app for 4 hours:*',
        dummyEvent: {
          event_type: EventTypes.GIVE_ME_4HR_BREAK,
          event_data: { data: { quitReason: reason, feedback: 'me gustan los ponis' } },
        },
        expectCliq: true,
        expectEmail: true,
        isOldUser: true,
      },
      {
        description: 'positive: should broadcast to cliq on a 4 hour break event with no feedback (old user)',
        msgPrefix: '*User disabled app for 4 hours:*',
        dummyEvent: {
          event_type: EventTypes.GIVE_ME_4HR_BREAK,
          event_data: { data: { quitReason: reason } },
        },
        expectCliq: true,
        expectEmail: false,
        isOldUser: true,
      },
      {
        description: 'positive: should broadcast to cliq and email on an uninstall event with feedback (old user)',
        msgPrefix: '*User uninstalled:*',
        dummyEvent: {
          event_type: EventTypes.UNINSTALL,
          event_data: { data: { uninstallDescription: reason, feedback: 'me gustan los ponis' } },
        },
        expectCliq: true,
        expectEmail: true,
        isOldUser: true,
      },
      {
        description: 'positive: should broadcast to cliq and email on an uninstall event with no feedback (old user)',
        msgPrefix: '*User uninstalled:*',
        dummyEvent: {
          event_type: EventTypes.UNINSTALL,
          event_data: { data: { uninstallDescription: reason } },
        },
        expectCliq: true,
        expectEmail: true,
        isOldUser: true,
      },
      {
        description: 'negative: should not broadcast to cliq or email on non-matching event type (old user)',
        dummyEvent: {
          event_type: EventTypes.BLOCK_DISTRACTING_APP,
          event_data: { data: { quitReason: reason, feedback: 'me gustan los ponis' } },
        },
        expectCliq: false,
        expectEmail: false,
        isOldUser: true,
      },
      {
        description: 'should broadcast to Cliq and send email (APP_QUIT with feedback, new user)',
        msgPrefix: '*User quit app:*',
        dummyEvent: {
          event_type: EventTypes.APP_QUIT,
          event_data: { data: { quitReason: reason, feedback: 'test feedback' } },
        },
        expectCliq: true,
        expectEmail: true,
        isOldUser: false,
      },
      {
        description: 'should broadcast to Cliq and send email (APP_QUIT without feedback, new user)',
        msgPrefix: '*User quit app:*',
        dummyEvent: {
          event_type: EventTypes.APP_QUIT,
          event_data: { data: { quitReason: reason } },
        },
        expectCliq: true,
        expectEmail: true,
        isOldUser: false,
      },
      {
        description: 'should broadcast to Cliq and send email (GIVE_ME_4HR_BREAK with feedback, new user)',
        msgPrefix: '*User disabled app for 4 hours:*',
        dummyEvent: {
          event_type: EventTypes.GIVE_ME_4HR_BREAK,
          event_data: { data: { quitReason: reason, feedback: 'test feedback' } },
        },
        expectCliq: true,
        expectEmail: true,
        isOldUser: false,
      },
      {
        description: 'should broadcast to Cliq and send email (GIVE_ME_4HR_BREAK without feedback, new user)',
        msgPrefix: '*User disabled app for 4 hours:*',
        dummyEvent: {
          event_type: EventTypes.GIVE_ME_4HR_BREAK,
          event_data: { data: { quitReason: reason } },
        },
        expectCliq: true,
        expectEmail: true,
        isOldUser: false,
      },
      {
        description: 'should broadcast to Cliq and send email (UNINSTALL with feedback, new user)',
        msgPrefix: '*User uninstalled:*',
        dummyEvent: {
          event_type: EventTypes.UNINSTALL,
          event_data: { data: { uninstallDescription: reason, feedback: 'test feedback' } },
        },
        expectCliq: true,
        expectEmail: true,
        isOldUser: false,
      },
      {
        description: 'should broadcast to Cliq and send email (UNINSTALL without feedback, new user)',
        msgPrefix: '*User uninstalled:*',
        dummyEvent: {
          event_type: EventTypes.UNINSTALL,
          event_data: { data: { uninstallDescription: reason } },
        },
        expectCliq: true,
        expectEmail: true,
        isOldUser: false,
      },
      {
        description: 'should not broadcast to cliq or email on non-matching event type (new user)',
        dummyEvent: {
          event_type: EventTypes.BLOCK_DISTRACTING_APP,
          event_data: { data: { quitReason: reason, feedback: 'test feedback' } },
        },
        expectCliq: false,
        expectEmail: false,
        isOldUser: false,
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it.each(testCases)('$description', async (tc) => {
      // Dynamically set the user creation time based on whether the user is old or new
      const userCreationTime = tc.isOldUser
        ? currentDate.getTime() - 49 * ONE_HOUR_MILLISECONDS // Old user: created 49 hours ago
        : currentDate.getTime() - 47 * ONE_HOUR_MILLISECONDS; // New user: created 47 hours ago

      UserRepositoryMock.orm.findOneBy.mockResolvedValue({
        ...userDummy,
        created_at: new Date(userCreationTime),
      });

      TrackEventRepositoryMock.orm.find.mockResolvedValue(lastFiftyEventsDummy);
      await eventsService.handleEventBroadcast(userDummy.id, tc.dummyEvent, auth0UserDummy.email);

      if (tc.expectCliq) {
        expect(mockedAxios.post).toHaveBeenCalledWith(MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK, {
          channel: 'channel',
          message: `${tc.msgPrefix}\n*User ID:* ${userDummy.id}\n*Event:*\`\`\`${JSON.stringify(tc.dummyEvent)}\`\`\``,
        });
      } else {
        expect(mockedAxios.post).not.toHaveBeenCalled();
      }

      if (tc.expectEmail) {
        expect(SendGridServiceMock.sendEmail).toHaveBeenCalledWith({
          to: FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
          from: FOCUS_BEAR_EMAILS.SUPPORT,
          replyTo: auth0UserDummy.email,
          text: `${prettyJson(tc.dummyEvent, 'pretty')}\n\nLast 50 Events:\n\n${prettyJson(
            lastFiftyEventsDummy,
            'jsonarray',
            'event_type',
          )}`,
          subject: `${EMAIL_SUBJECTS.APP_QUIT_FEEDBACK}: ${reason}`,
        });
      } else {
        expect(SendGridServiceMock.sendEmail).not.toHaveBeenCalled();
      }
    });
  });

  describe('handleIncomingEvent', () => {
    beforeEach(() => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue(auth0UserDummy);
    });

    it('positive: should return early without saving when user is not found in DB (deprecated endpoint)', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);

      await eventsService.handleIncomingEvent({ event_type: 'test-event' }, userDummy.id, headersDummy);

      expect(QueueMock.add).not.toHaveBeenCalled();
    });

    it('positive: should add the incoming track event to the events queue', async () => {
      await eventsService.handleIncomingEvent({ event_type: 'test-event' }, userDummy.id, headersDummy);

      expect(QueueMock.add).toHaveBeenCalledWith(BullWorkers.TRACK_EVENT, {
        user_id: userDummy.id,
        user_auth0_id: userDummy.auth0_id,
        trackEventDto: { event_type: 'test-event' },
        device_id: headersDummy.device_id,
        app_version: headersDummy.app_version,
        user_language: userDummy.language,
        user_timezone: userDummy.timezone,
      });
    });
  });

  describe('logEventInCliq', () => {
    it('positive: should send appropriate message to cliq when user disables app for 4 hours', async () => {
      const dummyEvent = { event_type: EventTypes.GIVE_ME_4HR_BREAK };
      const message = `*User disabled app for 4 hours:*\n*User ID:* ${userDummy.id}\n*Event:*\`\`\`${JSON.stringify(
        dummyEvent,
      )}\`\`\``;
      await eventsService.logEventInCliq(userDummy.id, dummyEvent);

      expect(mockedAxios.post).toHaveBeenCalledWith(MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK, {
        channel: 'channel',
        message,
      });
    });

    it('positive: should send appropriate message to cliq when user uninstalls', async () => {
      const dummyEvent = {
        event_type: EventTypes.UNINSTALL,
        event_data: { data: { uninstallDescription: '2 awesum 4 m3' } },
      };
      const message = `*User uninstalled:*\n*User ID:* ${userDummy.id}\n*Event:*\`\`\`${JSON.stringify(
        dummyEvent,
      )}\`\`\``;
      await eventsService.logEventInCliq(userDummy.id, dummyEvent);

      expect(mockedAxios.post).toHaveBeenCalledWith(MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK, {
        channel: 'channel',
        message,
      });
    });

    it('positive: should send appropriate message to cliq when user quits app', async () => {
      const dummyEvent = {
        event_type: EventTypes.APP_QUIT,
        event_data: { data: { quitReason: '2 awesum 4 m3' } },
      };
      const message = `*User quit app:*\n*User ID:* ${userDummy.id}\n*Event:*\`\`\`${JSON.stringify(dummyEvent)}\`\`\``;
      await eventsService.logEventInCliq(userDummy.id, dummyEvent);

      expect(mockedAxios.post).toHaveBeenCalledWith(MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK, {
        channel: 'channel',
        message,
      });
    });
  });

  describe('getTrackEventsForAdminDashboard', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('positive: should return track events for a user when called by an admin', async () => {
      const mockEvents = [
        {
          id: randomUUID(),
          event_type: 'FOCUS_MODE_ENABLED',
          event_data: { duration: 60 },
          created_at: '2024-01-15T10:00:00.000Z',
        },
        {
          id: randomUUID(),
          event_type: 'FOCUS_MODE_DISABLED',
          event_data: null,
          created_at: '2024-01-15T11:00:00.000Z',
        },
      ];

      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(adminUserDummy);
      TrackEventRepositoryMock.orm.find.mockResolvedValueOnce(mockEvents);

      const result = await eventsService.getTrackEventsForAdminDashboard(adminUserDummy.id, userDummy.id, 100);

      expect(result).toHaveLength(2);
      expect(result[0].event_name).toBe('FOCUS_MODE_ENABLED');
      expect(result[1].event_name).toBe('FOCUS_MODE_DISABLED');
      expect(TrackEventRepositoryMock.orm.find).toHaveBeenCalledWith({
        where: { user_id: userDummy.id },
        order: { created_at: 'DESC' },
        take: 100,
      });
    });

    it('negative: should throw UnauthorizedException when called by a non-admin user', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      await expect(eventsService.getTrackEventsForAdminDashboard(userDummy.id, userDummy.id, 100)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('positive: should use default take value of 100 when not specified', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(adminUserDummy);
      TrackEventRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await eventsService.getTrackEventsForAdminDashboard(adminUserDummy.id, userDummy.id);

      expect(TrackEventRepositoryMock.orm.find).toHaveBeenCalledWith({
        where: { user_id: userDummy.id },
        order: { created_at: 'DESC' },
        take: 100,
      });
    });
  });
});
