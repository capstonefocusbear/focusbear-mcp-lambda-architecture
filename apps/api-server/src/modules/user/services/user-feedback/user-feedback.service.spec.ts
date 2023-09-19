import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import axios from 'axios';
import { userDummy } from '../../../../../test/dummies';
import { UserRepositoryMock, SentryServiceMock, UserFeedbackRepositoryMock } from '../../../../../test/mocks';
import { UserRepository } from '../../repositories/user.repository';
import { UserFeedbackService } from './user-feedback.service';
import { UserFeedbackRepository } from '../../repositories/user-feedback.repository';
import { UserFeedback } from '../../entities/user-feedback.entity';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UserFeedbackService', () => {
  let service: UserFeedbackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserFeedbackService,
        UserFeedbackRepository,
        UserRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(UserFeedbackRepository)
      .useValue(UserFeedbackRepositoryMock)
      .compile();

    service = module.get<UserFeedbackService>(UserFeedbackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveUserFeedback', () => {
    const userFeedbackDummy = {
      rating: 5,
      feedback: 'Just a test!',
    };
    const dummyHeaders = { 'app-version': '1.0.100', platform: 'Windows' };

    it('negative: should throw not found error if user ot returned from DB', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      let exception: any;
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;

      try {
        await service.saveUserFeedback(userDummy.id, userFeedbackDummy, dummyHeaders);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should save user feedback in DB and update user', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      await service.saveUserFeedback(userDummy.id, userFeedbackDummy, dummyHeaders);

      expect(UserFeedbackRepositoryMock.orm.save).toBeCalledWith(
        new UserFeedback({
          user_id: userDummy.id,
          feedback: userFeedbackDummy.feedback,
          rating: userFeedbackDummy.rating,
          metadata: { app: dummyHeaders.platform, version: dummyHeaders['app-version'], user_id: userDummy.id },
        }),
      );
      expect(UserRepositoryMock.update).toBeCalledWith(userDummy.id, { last_date_gave_feedback: expect.toBeDate() });
      expect(mockedAxios.post).toBeCalled();
    });
  });
});
