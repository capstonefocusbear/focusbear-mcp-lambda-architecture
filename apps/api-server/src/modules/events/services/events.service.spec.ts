import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException } from '@nestjs/common';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { BrevoService } from '@app/brevo/brevo.service';
import axios from 'axios';
import { userDummy, QueueMock, auth0UserDummy } from '../../../../test/dummies';
import {
  Auth0ManagementServiceMock,
  EventsRepositoryMock,
  BrevoServiceMock,
  SentryServiceMock,
  UserRepositoryMock,
} from '../../../../test/mocks';
import { EventsService } from './events.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { Auth0ManagementService } from '../../../../../../libs/auth0/src';
import { EventTypes } from '../domain/event-types.enum';
import { EventsRepository } from '../repositories/events.repository';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EventService', () => {
  let eventsService: EventsService;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EventsService,
        BrevoService,
        UserRepository,
        Auth0ManagementService,
        EventsRepository,
        {
          provide: getQueueToken('events'),
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
      .compile();

    eventsService = moduleRef.get<EventsService>(EventsService);

    process.env = {
      SLACK_WEBHOOKS_CHANNEL: 'some-url',
    };
  });

  it('should be defined', () => {
    expect(eventsService).toBeDefined();
  });

  describe('handleIncomingEvent', () => {
    it('negative: should return a not found exception if user is not found in DB', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;

      try {
        await eventsService.handleIncomingEvent({ event_type: 'test-event' }, userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should add the incoming track event to the events queue', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(auth0UserDummy);

      await eventsService.handleIncomingEvent({ event_type: 'test-event' }, userDummy.id);

      expect(QueueMock.add).toBeCalledWith('track-event', {
        user_id: userDummy.id,
        email: auth0UserDummy.email,
        trackEventDto: { event_type: 'test-event' },
      });
    });

    it('positive: should log event in slack for quit or disable app for 4 hours events', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(auth0UserDummy);
      const dummyEvent = { event_type: EventTypes.APP_QUIT };
      const message = `*User quit app:*\n*User ID:* ${userDummy.id}\n*Event:*\`\`\`${JSON.stringify(dummyEvent)}\`\`\``;

      await eventsService.handleIncomingEvent({ event_type: EventTypes.APP_QUIT }, userDummy.id);

      expect(mockedAxios.post).toBeCalledWith('some-url', {
        text: message,
      });
    });
  });

  describe('logEventInSlack', () => {
    it('positive: should send appropriate message to slack when user disables app for 4 hours', async () => {
      const dummyEvent = { event_type: EventTypes.GIVE_ME_4HR_BREAK };
      const message = `*User disabled app for 4 hours:*\n*User ID:* ${userDummy.id}\n*Event:*\`\`\`${JSON.stringify(
        dummyEvent,
      )}\`\`\``;
      await eventsService.logEventInSlack(userDummy.id, dummyEvent);

      expect(mockedAxios.post).toBeCalledWith('some-url', {
        text: message,
      });
    });

    it('positive: should send appropriate message to slack when user quits app', async () => {
      const dummyEvent = { event_type: EventTypes.APP_QUIT };
      const message = `*User quit app:*\n*User ID:* ${userDummy.id}\n*Event:*\`\`\`${JSON.stringify(dummyEvent)}\`\`\``;
      await eventsService.logEventInSlack(userDummy.id, dummyEvent);

      expect(mockedAxios.post).toBeCalledWith('some-url', {
        text: message,
      });
    });
  });
});
