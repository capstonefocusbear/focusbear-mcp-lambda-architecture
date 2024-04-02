import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { configsArray } from '../../../apps/api-server/src/config';
import { IStripeOptions } from './interfaces';
import { StripeModule } from './stripe.module';
import { StripeService } from './stripe.service';
import { dummySubscriptionCancelFeedback, userDummy } from '../../../apps/api-server/test/dummies';
import { StripeMock } from '../../../apps/api-server/test/mocks';

describe('StripeService', () => {
  let service: StripeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ load: configsArray }),
        StripeModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService): IStripeOptions => configService.get('stripeConfig'),
        }),
      ],
    })
      .overrideProvider(Stripe)
      .useValue(StripeMock)
      .compile();

    service = module.get<StripeService>(StripeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cancelSubscriptionSession', () => {
    it('negative:should throw BadRequestException, if user feedback character length less than 10', async () => {
      const exceptionMessage = 'Feedback number of characters should be greater than or equal to 10';
      StripeMock.subscriptions.cancel.mockRejectedValueOnce(null);
      let exception: any;

      try {
        await service.cancelSubscriptionSession(
          { cancel_subscription_reason: dummySubscriptionCancelFeedback.INVALID_FEEDBACK },
          { id: userDummy.id, stripeCustomerId: userDummy.stripe_customer_id },
        );
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toMatch(exceptionMessage);
    });

    it("negative:should throw BadRequestException, if user subscription couldn't be found in Stripe", async () => {
      const exceptionMessage = `No such subscription: '${userDummy.stripe_customer_id}'`;
      let exception: any;

      try {
        StripeMock.subscriptions.cancel.mockRejectedValueOnce({
          statusCode: 404,
          message: exceptionMessage,
        });
        await service.cancelSubscriptionSession(
          { cancel_subscription_reason: dummySubscriptionCancelFeedback.VALID_FEEDBACK },
          { id: userDummy.id, stripeCustomerId: userDummy.stripe_customer_id },
        );
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception.statusCode).toBe(404);
      expect(exception.message).toMatch(exceptionMessage);
    });
  });
});
