import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { configsArray } from '../../../apps/api-server/src/config';
import { IStripeOptions } from './interfaces';
import { StripeModule } from './stripe.module';
import { StripeService } from './stripe.service';
import { dummySubscriptionCancelFeedback, userDummy } from '../../../apps/api-server/test/dummies';

describe('StripeService', () => {
  let service: StripeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cancelSubscriptionSession', () => {
    it("negative:should throw BadRequestException, if user subscription couldn't be found in Stripe", async () => {
      const exceptionMessage = `No active subscription found for user ID: ${userDummy.id}`;
      let exception: any;
      service.subscriptions.list = jest.fn().mockResolvedValue({ data: [] });

      try {
        await service.cancelSubscriptionSession(
          { cancel_subscription_reason: dummySubscriptionCancelFeedback.VALID_FEEDBACK },
          { id: userDummy.id, stripeCustomerId: userDummy.stripe_customer_id },
        );
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception.message).toMatch(exceptionMessage);
    });
  });
});
