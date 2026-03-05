import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { QueueMock, userDummy } from '../../../../../test/dummies';
import { WebhookHandlerStrategy } from './webhook-handler.strategy';
import { BullQueues } from '../../../../shared/utils/constants';
import { SubscriptionEmailService } from '../subscription-email/subscription-email.service';

const mockSubscriptionEmailService = {
  sendThankYouEmail: jest.fn().mockResolvedValue(undefined),
};

describe('WebhookHandlerStrategy', () => {
  let webhookHandlerStrategy: WebhookHandlerStrategy;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        WebhookHandlerStrategy,
        {
          provide: getQueueToken(BullQueues.REVENUE_CAT_STATUS),
          useValue: QueueMock,
        },
        {
          provide: SubscriptionEmailService,
          useValue: mockSubscriptionEmailService,
        },
      ],
    }).compile();

    webhookHandlerStrategy = moduleRef.get<WebhookHandlerStrategy>(WebhookHandlerStrategy);
  });

  it('should be defined', () => {
    expect(webhookHandlerStrategy).toBeDefined();
  });

  const testEventWithTeamEntitlement = {
    entitlement_ids: ['team_owner', 'team_size_5'],
    app_user_id: userDummy.id,
    expiration_at_ms: Date.now(),
  };
  const testEventWithPersonalEntitlement = {
    entitlement_ids: ['personal'],
  };

  describe('INITIAL_PURCHASE', () => {
    it('positive: if there is no team_owner entitlement return null', async () => {
      const result = await webhookHandlerStrategy.INITIAL_PURCHASE(testEventWithPersonalEntitlement);

      expect(result).toBeNull();
    });

    it('positive: should call sendThankYouEmail with the app_user_id', async () => {
      await webhookHandlerStrategy.INITIAL_PURCHASE(testEventWithTeamEntitlement);

      expect(mockSubscriptionEmailService.sendThankYouEmail).toHaveBeenCalledWith(userDummy.id);
    });
  });

  describe('TEST', () => {
    it('positive: should return null', () => {
      const result = webhookHandlerStrategy.TEST();

      expect(result).toBeNull();
    });
  });

  describe('NON_RENEWING_PURCHASE', () => {
    it('positive: should return null', async () => {
      const result = await webhookHandlerStrategy.NON_RENEWING_PURCHASE(testEventWithTeamEntitlement);

      expect(result).toBeNull();
    });
  });

  describe('CANCELLATION', () => {
    it('positive: should return null', async () => {
      const result = await webhookHandlerStrategy.CANCELLATION(testEventWithTeamEntitlement);

      expect(result).toBeNull();
    });
  });

  describe('PRODUCT_CHANGE', () => {
    it('positive: should return null', async () => {
      const result = await webhookHandlerStrategy.PRODUCT_CHANGE(testEventWithTeamEntitlement);

      expect(result).toBeNull();
    });
  });

  describe('UNCANCELLATION', () => {
    it('positive: should return null', async () => {
      const result = await webhookHandlerStrategy.UNCANCELLATION(testEventWithTeamEntitlement);

      expect(result).toBeNull();
    });
  });

  describe('BILLING_ISSUE', () => {
    it('positive: should return null', () => {
      const result = webhookHandlerStrategy.BILLING_ISSUE();

      expect(result).toBeNull();
    });
  });

  describe('SUBSCRIPTION_PAUSED', () => {
    it('positive: should return null', () => {
      const result = webhookHandlerStrategy.SUBSCRIPTION_PAUSED();

      expect(result).toBeNull();
    });
  });

  describe('TRANSFER', () => {
    it('positive: should return null', () => {
      const result = webhookHandlerStrategy.TRANSFER();

      expect(result).toBeNull();
    });
  });
});
