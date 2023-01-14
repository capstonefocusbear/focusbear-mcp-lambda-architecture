import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException } from '@nestjs/common';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { userDummy, QueueMock } from '../../../../test/dummies';
import { SendinblueServiceMock, SentryServiceMock, UserRepositoryMock } from '../../../../test/mocks';
import { SendinblueService } from '../../../../../../libs/sendinblue/src/sendinblue.service';
import { EventsService } from './events.service';
import { UserRepository } from '../../user/repositories/user.repository';

describe('EventService', () => {
  let eventsService: EventsService;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EventsService,
        SendinblueService,
        UserRepository,
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
      .overrideProvider(SendinblueService)
      .useValue(SendinblueServiceMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .compile();

    eventsService = moduleRef.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(eventsService).toBeDefined();
  });

  describe('addEventToQueue', () => {
    it('negative: should return a not found exceptionif user is not found in DB', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;

      try {
        await eventsService.addEventToQueue({ event_type: 'test-event' }, userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should add the incoming track event to the events queue', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      await eventsService.addEventToQueue({ event_type: 'test-event' }, userDummy.id);

      expect(QueueMock.add).toBeCalledWith('track-event', {
        user_id: userDummy.id,
        email: userDummy.email,
        trackEventDto: { event_type: 'test-event' },
      });
    });
  });
});
