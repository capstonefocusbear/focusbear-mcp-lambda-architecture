// Mock @sentry/nestjs before any imports that use it
import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { getQueueToken } from '@nestjs/bull';
import { RevenueCatService } from '@app/revenue-cat';
import { Auth0ManagementService } from '@app/auth0';
import { StripeService } from '@app/stripe';
import { BrevoService } from '@app/brevo/brevo.service';
import { SendGridService } from '@app/send-grid';
import axios from 'axios';
import {
  Auth0ManagementServiceMock,
  BrevoServiceMock,
  RevenueCatServiceMock,
  SendGridServiceMock,
  SentryServiceMock,
  StripeServiceMock,
  UserRepositoryMock,
} from '../../../../../test/mocks';
import { UserRepository } from '../../repositories/user.repository';
import { UserDataService } from './user-data.service';
import { dummyRevenueCatCustomer, QueueMock, userDummy } from '../../../../../test/dummies';
import { LanguageOptions } from '../../../../shared/domain/language-options.enum';
import { BullQueues, BullWorkers } from '../../../../shared/utils/constants';
import { SurveyAnswerMetadata } from '../../../survey/entities/survey-answer-metadata.entity';
import { SurveyAnswer } from '../../../survey/entities/survey-answer.entity';
import { Survey } from '../../../survey/entities/survey.entity';
import { LessonCompletion } from '../../../lesson/entities/lesson-completion.entity';
import { Tutorial } from '../../../activity/entities/tutorial.entity';
import { UsageData } from '../../entities/usage-data.entity';
import { HealthMetrics } from '../../entities/health-metrics.entity';
import { User } from '../../entities/user.entity';

jest.mock('@sentry/nestjs', () => {
  const mockDecorator = (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor;

  const SentryTracedMock = () => mockDecorator;
  const SentryCronMock = () => mockDecorator;

  return {
    init: jest.fn(),
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    flush: jest.fn().mockResolvedValue(true),
    withScope: jest.fn((callback) => {
      const scope = {
        setTag: jest.fn(),
        setUser: jest.fn(),
        setContext: jest.fn(),
        setLevel: jest.fn(),
      };
      return callback(scope);
    }),
    cron: {
      instrumentCron: jest.fn(),
    },
    SentryTraced: SentryTracedMock,
    SentryCron: SentryCronMock,
  };
});

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UserDataService', () => {
  let service: UserDataService;
  const MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK = 'some-url?zapikey=key';

  process.env = {
    ZOHO_CLIQ_BACKEND_BOT_WEBHOOK: 'some-url',
    ZOHO_CLIQ_API_KEY: 'key',
    ZOHO_CLIQ_QUIT_UNINSTALL_CHANNEL: 'channel',
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserDataService,
        UserRepository,
        Auth0ManagementService,
        StripeService,
        RevenueCatService,
        BrevoService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: getQueueToken(BullQueues.USER_DATA),
          useValue: QueueMock,
        },
        SendGridService,
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(Auth0ManagementService)
      .useValue(Auth0ManagementServiceMock)
      .overrideProvider(RevenueCatService)
      .useValue(RevenueCatServiceMock)
      .overrideProvider(StripeService)
      .useValue(StripeServiceMock)
      .overrideProvider(BrevoService)
      .useValue(BrevoServiceMock)
      .overrideProvider(SendGridService)
      .useValue(SendGridServiceMock)
      .compile();

    service = module.get<UserDataService>(UserDataService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processAndEmailUserData', () => {
    it('positive: should enter job into queue to process and email user their data', async () => {
      await service.processAndEmailUserData(userDummy.id, LanguageOptions.ENGLISH);

      expect(QueueMock.add).toHaveBeenCalledWith(BullWorkers.GET_USER_PERSONAL_DATA, {
        user_id: userDummy.id,
        language: LanguageOptions.ENGLISH,
      });
    });
  });

  describe('deleteUser', () => {
    it('positive: user should be deleted from DB and third -party services', async () => {
      const dummyEmail = 'test@mail.com';
      const dummyStripeId = 'cus_12345';
      const managerDelete = jest.fn().mockResolvedValue(undefined);
      UserRepositoryMock.orm.manager.transaction.mockImplementationOnce(async (callback) =>
        callback({ delete: managerDelete }),
      );
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({ ...userDummy, stripe_customer_id: dummyStripeId });
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ email: dummyEmail });
      RevenueCatServiceMock.getSubscriberFromRevenueCat.mockResolvedValueOnce(dummyRevenueCatCustomer);
      StripeServiceMock.subscriptions.list.mockResolvedValue({ data: [] });

      const dummyHeaders = { 'app-version': '1.0.100', platform: 'Windows' };
      await service.deleteUser(userDummy.id, { can_contact: false, message: 'some text' }, dummyHeaders);

      expect(RevenueCatServiceMock.deleteUserFromRevenueCat).toHaveBeenCalledWith(userDummy.id);
      expect(Auth0ManagementServiceMock.deleteAuth0User).toHaveBeenCalledWith(userDummy.auth0_id);
      expect(BrevoServiceMock.deleteContactFromBrevo).toHaveBeenCalledWith(dummyEmail);
      expect(UserRepositoryMock.orm.manager.transaction).toHaveBeenCalled();
      expect(managerDelete).toHaveBeenNthCalledWith(1, SurveyAnswerMetadata, { user_id: userDummy.id });
      expect(managerDelete).toHaveBeenNthCalledWith(2, SurveyAnswer, { user_id: userDummy.id });
      expect(managerDelete).toHaveBeenNthCalledWith(3, Survey, { creator: userDummy.id });
      expect(managerDelete).toHaveBeenNthCalledWith(4, LessonCompletion, { user_id: userDummy.id });
      expect(managerDelete).toHaveBeenNthCalledWith(5, Tutorial, { user_id: userDummy.id });
      expect(managerDelete).toHaveBeenNthCalledWith(6, UsageData, { userId: userDummy.id });
      expect(managerDelete).toHaveBeenNthCalledWith(7, HealthMetrics, { userId: userDummy.id });
      expect(managerDelete).toHaveBeenNthCalledWith(8, User, { id: userDummy.id });
      expect(StripeServiceMock.deleteStripeCustomer).toHaveBeenCalledWith(dummyStripeId);
      expect(mockedAxios.post).toHaveBeenCalledWith(MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK, {
        channel: 'channel',
        message: `Account deleted for user with email: te**@mail.com and ID: ${
          userDummy.id
        } \n\n Message: some text \n\n Can contact: ${false} \n\n Platform: ${dummyHeaders.platform}`,
      });
    });

    it('throws if deleting the user row from the database fails', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ email: 'test@mail.com' });
      UserRepositoryMock.orm.manager.transaction.mockRejectedValueOnce(new Error('fk violation'));

      await expect(
        service.deleteUser(userDummy.id, { can_contact: false, message: 'some text' }, { platform: 'Windows' }),
      ).rejects.toThrow(`Failed to delete user ${userDummy.id} from database`);
    });
  });
});
