import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { userDummy, QueueMock } from '../../../../test/dummies';
import { SendinblueServiceMock, UserRepositoryMock } from '../../../../test/mocks';
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
    it('positive: should add the incoming track event to the events queue', async () => {
      await eventsService.addEventToQueue({ event_type: 'test-event' }, userDummy.id);

      expect(QueueMock.add).toBeCalledWith('track-event', {
        user_id: userDummy.id,
        trackEventDto: { event_type: 'test-event' },
      });
    });
  });
});
