import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { SendinblueServiceMock, SentryServiceMock, UserRepositoryMock } from '../../../../test/mocks';
import { SendinblueService } from '../../../../../../libs/sendinblue/src/sendinblue.service';
import { EventsService } from './events.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { sendinblueEventDummy, userDummy } from '../../../../test/dummies';

describe('EventService', () => {
  let eventsService: EventsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EventsService,
        SendinblueService,
        UserRepository,
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

  describe('registerEvent', () => {
    it('negative: should return that the user does not exist', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const responseMessage = `User with ID: ${userDummy.id} does not exist!`;

      let response;
      try {
        response = await eventsService.registerEvent({ event_type: 'test-event' }, userDummy.id);
      } catch (error) {
        response = error;
      }

      expect(response.message).toMatch(responseMessage);
    });

    it('positive: sendinblueService.registerSendinblueEvent should be called', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      await eventsService.registerEvent(sendinblueEventDummy, userDummy.id);

      expect(SendinblueServiceMock.registerSendinblueEvent).toBeCalledWith(userDummy.email, sendinblueEventDummy);
    });
  });
});
