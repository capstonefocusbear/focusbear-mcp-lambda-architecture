import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SENTRY_TOKEN } from '@app/observability';
import { WebhookSubscriptionService } from './webhook-subscription.service';
import { WebhookSubscriptionRepository } from '../repositories/webhook-subscription.repository';
import { WebhookSubscription } from '../entities/webhook-subscription.entity';
import { WebhookEventType } from '../domain/webhook-event-type.enum';

describe('WebhookSubscriptionService', () => {
  let service: WebhookSubscriptionService;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockSubscriptionId = '987fcdeb-51a2-3b4c-5d6e-7f8a9b0c1d2e';

  const mockSentryInstance = {
    addBreadcrumb: jest.fn(),
    captureException: jest.fn(),
  };

  const mockSentryService = {
    instance: jest.fn().mockReturnValue(mockSentryInstance),
  };

  const webhookSubscriptionRepositoryMock = {
    orm: {
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    },
    findByUserId: jest.fn(),
    findByEventType: jest.fn(),
    countByUserId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookSubscriptionService,
        {
          provide: WebhookSubscriptionRepository,
          useValue: webhookSubscriptionRepositoryMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: mockSentryService,
        },
      ],
    }).compile();

    service = module.get<WebhookSubscriptionService>(WebhookSubscriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubscription', () => {
    it('should create a new webhook subscription', async () => {
      const createDto = {
        name: 'Test Webhook',
        url: 'https://hooks.zapier.com/test',
        event_types: [WebhookEventType.HABIT_COMPLETED],
      };

      webhookSubscriptionRepositoryMock.countByUserId.mockResolvedValueOnce(0);
      const savedSubscription = {
        id: mockSubscriptionId,
        user_id: mockUserId,
        name: createDto.name,
        url: createDto.url,
        event_types: createDto.event_types,
        is_active: true,
        failure_count: 0,
        created_at: new Date().toISOString(),
      };

      webhookSubscriptionRepositoryMock.orm.save.mockResolvedValueOnce(savedSubscription as WebhookSubscription);

      const result = await service.createSubscription(mockUserId, createDto);

      expect(result).toHaveProperty('id', mockSubscriptionId);
      expect(result).toHaveProperty('name', createDto.name);
      expect(result).toHaveProperty('url', createDto.url);
      expect(result).toHaveProperty('event_types', createDto.event_types);
      expect(webhookSubscriptionRepositoryMock.orm.save).toHaveBeenCalled();
    });

    it('should throw when user exceeds subscription limit', async () => {
      const createDto = {
        name: 'Test Webhook',
        url: 'https://hooks.zapier.com/test',
        event_types: [WebhookEventType.HABIT_COMPLETED],
      };

      webhookSubscriptionRepositoryMock.countByUserId.mockResolvedValueOnce(10);

      await expect(service.createSubscription(mockUserId, createDto)).rejects.toThrow('Webhook subscription limit');
    });
  });

  describe('getSubscriptions', () => {
    it('should return all subscriptions for a user', async () => {
      const mockSubscriptions = [
        {
          id: mockSubscriptionId,
          user_id: mockUserId,
          name: 'Webhook 1',
          url: 'https://hooks.zapier.com/test1',
          event_types: [WebhookEventType.HABIT_COMPLETED],
          is_active: true,
          failure_count: 0,
          created_at: new Date().toISOString(),
        },
        {
          id: '456',
          user_id: mockUserId,
          name: 'Webhook 2',
          url: 'https://hooks.zapier.com/test2',
          event_types: [WebhookEventType.ROUTINE_COMPLETED],
          is_active: true,
          failure_count: 0,
          created_at: new Date().toISOString(),
        },
      ];

      webhookSubscriptionRepositoryMock.findByUserId.mockResolvedValueOnce(mockSubscriptions as WebhookSubscription[]);

      const result = await service.getSubscriptions(mockUserId);

      expect(result).toHaveLength(2);
      expect(webhookSubscriptionRepositoryMock.findByUserId).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('getSubscription', () => {
    it('should return a specific subscription', async () => {
      const mockSubscription = {
        id: mockSubscriptionId,
        user_id: mockUserId,
        name: 'Test Webhook',
        url: 'https://hooks.zapier.com/test',
        event_types: [WebhookEventType.HABIT_COMPLETED],
        is_active: true,
        failure_count: 0,
        created_at: new Date().toISOString(),
      };

      webhookSubscriptionRepositoryMock.orm.findOne.mockResolvedValueOnce(mockSubscription as WebhookSubscription);

      const result = await service.getSubscription(mockUserId, mockSubscriptionId);

      expect(result).toHaveProperty('id', mockSubscriptionId);
      expect(webhookSubscriptionRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: { id: mockSubscriptionId, user_id: mockUserId },
      });
    });

    it('should throw NotFoundException if subscription not found', async () => {
      webhookSubscriptionRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(service.getSubscription(mockUserId, mockSubscriptionId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSubscription', () => {
    it('should update a subscription', async () => {
      const mockSubscription = {
        id: mockSubscriptionId,
        user_id: mockUserId,
        name: 'Test Webhook',
        url: 'https://hooks.zapier.com/test',
        event_types: [WebhookEventType.HABIT_COMPLETED],
        is_active: true,
        failure_count: 0,
        created_at: new Date().toISOString(),
      };

      const updateDto = { name: 'Updated Webhook' };

      webhookSubscriptionRepositoryMock.orm.findOne.mockResolvedValueOnce(mockSubscription as WebhookSubscription);
      webhookSubscriptionRepositoryMock.orm.save.mockResolvedValueOnce({
        ...mockSubscription,
        ...updateDto,
      } as WebhookSubscription);

      const result = await service.updateSubscription(mockUserId, mockSubscriptionId, updateDto);

      expect(result).toHaveProperty('name', 'Updated Webhook');
      expect(webhookSubscriptionRepositoryMock.orm.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if subscription not found', async () => {
      webhookSubscriptionRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(service.updateSubscription(mockUserId, mockSubscriptionId, { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteSubscription', () => {
    it('should delete a subscription', async () => {
      const mockSubscription = {
        id: mockSubscriptionId,
        user_id: mockUserId,
      };

      webhookSubscriptionRepositoryMock.orm.findOne.mockResolvedValueOnce(mockSubscription as WebhookSubscription);
      webhookSubscriptionRepositoryMock.orm.delete.mockResolvedValueOnce({ affected: 1 } as any);

      await service.deleteSubscription(mockUserId, mockSubscriptionId);

      expect(webhookSubscriptionRepositoryMock.orm.delete).toHaveBeenCalledWith(mockSubscriptionId);
    });

    it('should throw NotFoundException if subscription not found', async () => {
      webhookSubscriptionRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(service.deleteSubscription(mockUserId, mockSubscriptionId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSubscriptionsByEventType', () => {
    it('should return subscriptions for a specific event type', async () => {
      const mockSubscriptions = [
        {
          id: mockSubscriptionId,
          user_id: mockUserId,
          name: 'Webhook 1',
          url: 'https://hooks.zapier.com/test1',
          event_types: [WebhookEventType.HABIT_COMPLETED],
          is_active: true,
        },
      ];

      webhookSubscriptionRepositoryMock.findByEventType.mockResolvedValueOnce(
        mockSubscriptions as WebhookSubscription[],
      );

      const result = await service.getSubscriptionsByEventType(mockUserId, WebhookEventType.HABIT_COMPLETED);

      expect(result).toHaveLength(1);
      expect(webhookSubscriptionRepositoryMock.findByEventType).toHaveBeenCalledWith(
        mockUserId,
        WebhookEventType.HABIT_COMPLETED,
      );
    });
  });
});
