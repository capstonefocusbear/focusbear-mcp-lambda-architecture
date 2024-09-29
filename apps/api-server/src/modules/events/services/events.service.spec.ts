/* eslint-disable global-require */
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException } from '@nestjs/common';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { BrevoService } from '@app/brevo/brevo.service';
import axios from 'axios';
import { SendGridService } from '@app/send-grid';
import { randomUUID } from 'crypto';
import { prettyJson } from '../../../shared/utils/helpers';
import { userDummy, QueueMock, auth0UserDummy } from '../../../../test/dummies';
import { EMAIL_SUBJECTS, FOCUS_BEAR_EMAILS, BullQueues, BullWorkers } from '../../../shared/utils/constants';
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

describe('EventService', () => {
  let eventsService: EventsService;
  const headersDummy = { app_version: '1.0.0', device_id: randomUUID() };
  const MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK = 'some-url?zapikey=key';

  beforeEach(async () => {
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

    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(eventsService).toBeDefined();
  });

  describe('handleEventBroadcast', () => {
    const reason = 'muy dañado';
    const testCases = [
      {
        description: 'positive: should broadcast to cliq and email on an app quit event with feedback',
        msgPrefix: '*User quit app:*',
        dummyEvent: {
          event_type: EventTypes.APP_QUIT,
          event_data: { data: { quitReason: reason, feedback: 'me gustan los ponis' } },
        },
        expectCliq: true,
        expectEmail: true,
      },
      {
        description: 'positive: should broadcast to cliq on an app quit event with no feedback',
        msgPrefix: '*User quit app:*',
        dummyEvent: {
          event_type: EventTypes.APP_QUIT,
          event_data: { data: { quitReason: reason } },
        },
        expectCliq: true,
        expectEmail: false,
      },
      {
        description: 'positive: should broadcast to cliq and email on a 4 hr break event with feedback',
        msgPrefix: '*User disabled app for 4 hours:*',
        dummyEvent: {
          event_type: EventTypes.GIVE_ME_4HR_BREAK,
          event_data: { data: { quitReason: reason, feedback: 'me gustan los ponis' } },
        },
        expectCliq: true,
        expectEmail: true,
      },
      {
        description: 'positive: should broadcast to cliq on a 4 hour break event with no feedback',
        msgPrefix: '*User disabled app for 4 hours:*',
        dummyEvent: {
          event_type: EventTypes.GIVE_ME_4HR_BREAK,
          event_data: { data: { quitReason: reason } },
        },
        expectCliq: true,
        expectEmail: false,
      },
      {
        description: 'positive: should broadcast to cliq and email on an uninstall event with feedback',
        msgPrefix: '*User uninstalled:*',
        dummyEvent: {
          event_type: EventTypes.UNINSTALL,
          event_data: { data: { uninstallDescription: reason, feedback: 'me gustan los ponis' } },
        },
        expectCliq: true,
        expectEmail: true,
      },
      {
        description: 'positive: should broadcast to cliq and email on an uninstall event with no feedback',
        msgPrefix: '*User uninstalled:*',
        dummyEvent: {
          event_type: EventTypes.UNINSTALL,
          event_data: { data: { uninstallDescription: reason } },
        },
        expectCliq: true,
        expectEmail: true,
      },
      {
        description: 'negative: should not broadcast to cliq or email on non matching event type',
        dummyEvent: {
          event_type: EventTypes.BLOCK_DISTRACTING_APP,
          event_data: { data: { quitReason: reason, feedback: 'me gustan los ponis' } },
        },
        expectCliq: false,
        expectEmail: false,
      },
    ];

    it.each(testCases)('$description', async (tc) => {
      await eventsService.handleEventBroadcast(userDummy.id, tc.dummyEvent, auth0UserDummy.email);

      if (tc.expectCliq) {
        expect(mockedAxios.post).toBeCalledWith(MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK, {
          channel: 'channel',
          message: `${tc.msgPrefix}\n*User ID:* ${userDummy.id}\n*Event:*\`\`\`${JSON.stringify(tc.dummyEvent)}\`\`\``,
        });
      } else {
        expect(mockedAxios.post).not.toBeCalled();
      }

      // Hardcoded for now
      // TODO: - Mock the events array using getLastFiftyEvents function

      const hardcodedEventString = 'Cannot find the last 50 events.';
      if (tc.expectEmail) {
        expect(SendGridServiceMock.sendEmail).toBeCalledWith({
          to: FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
          from: FOCUS_BEAR_EMAILS.SUPPORT,
          replyTo: auth0UserDummy.email,
          text: `${prettyJson(tc.dummyEvent, 'pretty')}\n\nLast 50 Events:\n\n${hardcodedEventString}`,
          subject: `${EMAIL_SUBJECTS.APP_QUIT_FEEDBACK}: ${reason}`,
        });
      } else {
        expect(SendGridServiceMock.sendEmail).not.toBeCalled();
      }
    });
  });

  describe('handleIncomingEvent', () => {
    beforeEach(() => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue(auth0UserDummy);
    });

    it('negative: should return a not found exception if user is not found in DB', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;

      await expect(
        eventsService.handleIncomingEvent({ event_type: 'test-event' }, userDummy.id, headersDummy),
      ).rejects.toThrow(new NotFoundException(errorMessage));
    });

    it('positive: should add the incoming track event to the events queue', async () => {
      await eventsService.handleIncomingEvent({ event_type: 'test-event' }, userDummy.id, headersDummy);

      expect(QueueMock.add).toBeCalledWith(BullWorkers.TRACK_EVENT, {
        user_id: userDummy.id,
        email: auth0UserDummy.email,
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

      expect(mockedAxios.post).toBeCalledWith(MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK, {
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

      expect(mockedAxios.post).toBeCalledWith(MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK, {
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

      expect(mockedAxios.post).toBeCalledWith(MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK, {
        channel: 'channel',
        message,
      });
    });
  });
});
