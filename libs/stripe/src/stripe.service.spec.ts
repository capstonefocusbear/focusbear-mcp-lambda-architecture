import axios from 'axios';
import { NotFoundException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { Test, TestingModule } from '@nestjs/testing';
import { RevenueCatService } from '@app/revenue-cat';
import { SentryService } from '@ntegral/nestjs-sentry';
import { Auth0ManagementService } from '@app/auth0';
import { UserRepository } from '../../../apps/api-server/src/modules/user/repositories/user.repository';
import { prettyJson } from '../../../apps/api-server/src/shared/utils/helpers';
import { configsArray } from '../../../apps/api-server/src/config';
import { IStripeOptions } from './interfaces';
import { StripeModule } from './stripe.module';
import { StripeService } from './stripe.service';
import { EMAIL_SUBJECTS, FOCUS_BEAR_EMAILS } from '../../../apps/api-server/src/shared/utils/constants';
import { dummySubscriptionCancelFeedback, userDummy, auth0UserDummy } from '../../../apps/api-server/test/dummies';
import {
  UserRepositoryMock,
  Auth0ManagementServiceMock,
  RevenueCatServiceMock,
} from '../../../apps/api-server/test/mocks';
import { Feedback } from './entities/feedback.entity';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('StripeService', () => {
  let service: StripeService;
  let mockEmailQueue: jest.Mocked<Pick<Queue, 'add'>>;
  const MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK = 'some-url?zapikey=key';

  beforeEach(async () => {
    mockEmailQueue = {
      add: jest.fn().mockImplementation(() => Promise.resolve({} as Job)),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ load: configsArray }),
        BullModule.forRoot({
          redis: {
            host: 'localhost',
            port: 6379,
          },
        }),
        StripeModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (): IStripeOptions => ({
            secretKey: 'sk_test_4eC39HqLyjWDarjtT1zdp7dc',
            apiVersion: '2022-08-01',
            checkout: {
              success_url: 'http://localhost:3000/success',
              cancel_url: 'http://localhost:3000/cancel',
            },
            webhook: {
              secret: 'whsec_test',
            },
          }),
        }),
      ],
    })
      .overrideProvider(getQueueToken('emailQueue'))
      .useValue(mockEmailQueue)
      .overrideProvider(SentryService)
      .useValue({
        instance: () => ({
          captureException: jest.fn(),
        }),
      })
      .overrideProvider(RevenueCatService)
      .useValue(RevenueCatServiceMock)
      .overrideProvider(Auth0ManagementService)
      .useValue(Auth0ManagementServiceMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .compile();

    service = module.get<StripeService>(StripeService);

    process.env = {
      ZOHO_CLIQ_BACKEND_BOT_WEBHOOK: 'some-url',
      ZOHO_CLIQ_API_KEY: 'key',
      ZOHO_CLIQ_CUSTOMER_FEEDBACK_CHANNEL: 'channel',
    };

    // Mock Stripe methods
    service.subscriptions = {
      list: jest.fn(),
      del: jest.fn(),
    } as any;

    jest.clearAllMocks();
  });

  describe('logCancellation', () => {
    const mockSession = {
      cancel_subscription_reason: dummySubscriptionCancelFeedback.VALID_FEEDBACK,
      entitlement_id: 'prod_B4DMIzxyNLnP2a',
    };

    it('should successfully log cancellation and queue email', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: {} });

      await service.logCancellation(mockSession, auth0UserDummy.id, auth0UserDummy.email);

      expect(mockedAxios.post).toHaveBeenCalledWith(MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK, {
        channel: 'channel',
        message: `Subscription canceled\n\n User:${auth0UserDummy.id} \n\n Reason:${mockSession.cancel_subscription_reason}`,
      });

      expect(mockEmailQueue.add).toHaveBeenCalledWith('sendEmail', {
        to: FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
        from: FOCUS_BEAR_EMAILS.SUPPORT,
        replyTo: auth0UserDummy.email,
        text: `User ID: ${auth0UserDummy.id}\n\n${prettyJson(mockSession)}`,
        subject: `${EMAIL_SUBJECTS.USER_UNSUBSCRIBE_FEEDBACK}: ${mockSession.cancel_subscription_reason}`,
      });
    });

    it('should throw error if axios post fails', async () => {
      const mockError = new Error('Network error');
      mockedAxios.post.mockRejectedValue(mockError);

      await expect(service.logCancellation(mockSession, auth0UserDummy.id)).rejects.toThrow(mockError);

      expect(mockEmailQueue.add).not.toHaveBeenCalled();
    });

    it('should throw error if email queueing fails', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: {} });

      const mockError = new Error('Queue error');
      mockEmailQueue.add.mockImplementationOnce(() => Promise.reject(mockError));

      await expect(service.logCancellation(mockSession, auth0UserDummy.id, auth0UserDummy.email)).rejects.toThrow(
        mockError,
      );
    });
  });

  describe('cancelSubscriptionSession', () => {
    const userAuthContext = { id: userDummy.id, stripeCustomerId: 'customer_123' };
    const cancelSubscriptionSessionDto = {
      cancel_subscription_reason: dummySubscriptionCancelFeedback.VALID_FEEDBACK,
      entitlement_id: 'prod_B4DMIzxyNLnP2a',
    };

    it('negative: should throw NotFoundException if the user does not exist', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(null);

      await expect(service.cancelSubscriptionSession(cancelSubscriptionSessionDto, userAuthContext)).rejects.toThrow(
        new NotFoundException(`User with ID: ${userDummy.id} does not exist!`),
      );
    });

    it('negative: should throw NotFoundException if no active subscription is found', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      service.subscriptions.list = jest.fn().mockResolvedValue({ data: [] });

      await expect(service.cancelSubscriptionSession(cancelSubscriptionSessionDto, userAuthContext)).rejects.toThrow(
        new NotFoundException(`No active subscription found for user ID: ${userDummy.id}`),
      );
    });

    it('positive: should handle successful cancellation and save feedback', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      RevenueCatServiceMock.revokeUserEntitlementFromRevenueCat.mockResolvedValue({ status: 200, data: {} });
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue(auth0UserDummy);

      service.subscriptions.list = jest.fn().mockResolvedValue({ data: [{ id: 'sub_123' }] });
      service.cancelSubscription = jest.fn().mockResolvedValue({ status: 'canceled' });
      service.ormFeedback.save = jest.fn().mockResolvedValue(new Feedback(cancelSubscriptionSessionDto));

      const logCancellationSpy = jest.spyOn(service, 'logCancellation');

      await service.cancelSubscriptionSession(cancelSubscriptionSessionDto, userAuthContext);

      expect(logCancellationSpy).toHaveBeenCalledWith(cancelSubscriptionSessionDto, userDummy.id, auth0UserDummy.email);
    });
  });
});
