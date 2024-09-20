import axios from 'axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RevenueCatService } from '@app/revenue-cat';
import { SendGridService } from '@app/send-grid';
import { configsArray } from '../../../apps/api-server/src/config';
import { IStripeOptions } from './interfaces';
import { StripeModule } from './stripe.module';
import { StripeService } from './stripe.service';
import { EMAIL_SUBJECTS, FOCUS_BEAR_EMAILS } from '../../../apps/api-server/src/shared/utils/constants';
import { dummySubscriptionCancelFeedback, userDummy } from '../../../apps/api-server/test/dummies';
import { RevenueCatServiceMock, SendGridServiceMock } from '../../../apps/api-server/test/mocks';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('StripeService', () => {
  let service: StripeService;
  const MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK = 'some-url?zapikey=key';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RevenueCatService],
      imports: [
        ConfigModule.forRoot({ load: configsArray }),
        StripeModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService): IStripeOptions => ({
            ...configService.get('stripeConfig'),
            secretKey: 'sk_test_4eC39HqLyjWDarjtT1zdp7dc',
            apiVersion: '2022-08-01',
          }),
        }),
      ],
    })
      .overrideProvider(RevenueCatService)
      .useValue(RevenueCatServiceMock)
      .overrideProvider(SendGridService)
      .useValue(SendGridServiceMock)
      .compile();

    service = module.get<StripeService>(StripeService);
    process.env = {
      ZOHO_CLIQ_BACKEND_BOT_WEBHOOK: 'some-url',
      ZOHO_CLIQ_API_KEY: 'key',
      ZOHO_CLIQ_CUSTOMER_FEEDBACK_CHANNEL: 'channel',
    };

    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logCancellation', () => {
    it('positive: sends a message to cliq and an email', async () => {
      const dummySession = {
        cancel_subscription_reason: dummySubscriptionCancelFeedback.VALID_FEEDBACK,
        entitlement_id: 'prod_B4DMIzxyNLnP2a',
      };
      const dummyUserAuthCtx = {
        id: userDummy.id,
      };
      const message = `Subscription canceled\n\n User:${dummyUserAuthCtx.id} \n\n Reason:${dummySession.cancel_subscription_reason}`;
      await service.logCancellation(dummySession, dummyUserAuthCtx);

      expect(mockedAxios.post).toBeCalledWith(MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK, {
        channel: 'channel',
        message,
      });

      expect(SendGridServiceMock.sendEmail).toBeCalledWith({
        to: FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
        from: FOCUS_BEAR_EMAILS.SUPPORT,
        text: JSON.stringify(dummySession),
        subject: `${EMAIL_SUBJECTS.USER_UNSUBSCRIBE_FEEDBACK}: ${dummySession.cancel_subscription_reason}`,
      });
    });
  });

  describe('cancelSubscriptionSession', () => {
    it("negative:should throw BadRequestException, if user subscription couldn't be found in Stripe", async () => {
      const exceptionMessage = `No active subscription found for user ID: ${userDummy.id}`;
      let exception: any;
      service.subscriptions.list = jest.fn().mockResolvedValue({ data: [] });

      try {
        await service.cancelSubscriptionSession(
          {
            cancel_subscription_reason: dummySubscriptionCancelFeedback.VALID_FEEDBACK,
            entitlement_id: 'prod_B4DMIzxyNLnP2a',
          },
          { id: userDummy.id, stripeCustomerId: userDummy.stripe_customer_id },
        );
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception.message).toMatch(exceptionMessage);
      expect(SendGridServiceMock.sendEmail).not.toBeCalled();
    });
  });
});
