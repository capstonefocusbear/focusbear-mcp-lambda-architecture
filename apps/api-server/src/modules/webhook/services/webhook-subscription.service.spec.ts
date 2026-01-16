import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SentryService } from '@app/observability';
import { WebhookSubscriptionService } from './webhook-subscription.service';
import { WebhookSubscriptionRepository } from '../repositories/webhook-subscription.repository';
import { WebhookSubscription } from '../entities/webhook-subscription.entity';
import { WebhookEventType } from '../domain/webhook-event-type.enum';

describe('WebhookSubscriptionService', () => {
  let service: WebhookSubscriptionService;
  let webhookSubscriptionRepository: jest.Mocked<WebhookSubscriptionRepository>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockSubscriptionId = '987fcdeb-51a2-3b4c-5d6e-7f8a9b0c1d2e';

  const mockSentryInstance = {
    addBreadcrumb: jest.fn(),
    captureException: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookSubscriptionService,
        {
          provide: WebhookSubscriptionRepository,
          useValue: {
            orm: {
              save: jest.fn(),
              findOne: jest.fn(),
              delete: jest.fn(),
            },
            findByUserId: jest.fn(),
            findByEventType: jest.fn(),
          },
        },
        {
          provide: SentryService,
          useValue: {
            instance: jest.fn().mockReturnValue(mockSentryInstance),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookSubscriptionService>(WebhookSubscriptionService);
    webhookSubscriptionRepository = module.get(WebhookSubscriptionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubscription', () => {
    it('should create a new webhook subscription', async () => {
      const createDto = {
        name: 'Test Webhook',
        url: 'https://hooks.zapier.com/test',
        event_types: [WebhookEventType.ACTIVITY_COMPLETED],
      };

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

      webhookSubscriptionRepository.orm.save.mockResolvedValue(savedSubscription as WebhookSubscription);

      const result = await service.createSubscription(mockUserId, createDto);

      expect(result).toHaveProperty('id', mockSubscriptionId);
      expect(result).toHaveProperty('name', createDto.name);
      expect(result).toHaveProperty('url', createDto.url);
      expect(result).toHaveProperty('event_types', createDto.event_types);
      expect(webhookSubscriptionRepository.orm.save).toHaveBeenCalled();
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
          event_types: [WebhookEventType.ACTIVITY_COMPLETED],
          is_active: true,
          failure_count: 0,
          created_at: new Date().toISOString(),
        },
        {
          id: '456',
          user_id: mockUserId,
          name: 'Webhook 2',
          url: 'https://hooks.zapier.com/test2',
          event_types: [WebhookEventType.TODO_CREATED],
          is_active: true,
          failure_count: 0,
          created_at: new Date().toISOString(),
        },
      ];

      webhookSubscriptionRepository.findByUserId.mockResolvedValue(mockSubscriptions as WebhookSubscription[]);

      const result = await service.getSubscriptions(mockUserId);

      expect(result).toHaveLength(2);
      expect(webhookSubscriptionRepository.findByUserId).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('getSubscription', () => {
    it('should return a specific subscription', async () => {
      const mockSubscription = {
        id: mockSubscriptionId,
        user_id: mockUserId,
        name: 'Test Webhook',
        url: 'https://hooks.zapier.com/test',
        event_types: [WebhookEventType.ACTIVITY_COMPLETED],
        is_active: true,
        failure_count: 0,
        created_at: new Date().toISOString(),
      };

      webhookSubscriptionRepository.orm.findOne.mockResolvedValue(mockSubscription as WebhookSubscription);

      const result = await service.getSubscription(mockUserId, mockSubscriptionId);

      expect(result).toHaveProperty('id', mockSubscriptionId);
      expect(webhookSubscriptionRepository.orm.findOne).toHaveBeenCalledWith({
        where: { id: mockSubscriptionId, user_id: mockUserId },
      });
    });

    it('should throw NotFoundException if subscription not found', async () => {
      webhookSubscriptionRepository.orm.findOne.mockResolvedValue(null);

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
        event_types: [WebhookEventType.ACTIVITY_COMPLETED],
        is_active: true,
        failure_count: 0,
        created_at: new Date().toISOString(),
      };

      const updateDto = { name: 'Updated Webhook' };

      webhookSubscriptionRepository.orm.findOne.mockResolvedValue(mockSubscription as WebhookSubscription);
      webhookSubscriptionRepository.orm.save.mockResolvedValue({
        ...mockSubscription,
        ...updateDto,
      } as WebhookSubscription);

      const result = await service.updateSubscription(mockUserId, mockSubscriptionId, updateDto);

      expect(result).toHaveProperty('name', 'Updated Webhook');
      expect(webhookSubscriptionRepository.orm.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if subscription not found', async () => {
      webhookSubscriptionRepository.orm.findOne.mockResolvedValue(null);

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

      webhookSubscriptionRepository.orm.findOne.mockResolvedValue(mockSubscription as WebhookSubscription);
      webhookSubscriptionRepository.orm.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteSubscription(mockUserId, mockSubscriptionId);

      expect(webhookSubscriptionRepository.orm.delete).toHaveBeenCalledWith(mockSubscriptionId);
    });

    it('should throw NotFoundException if subscription not found', async () => {
      webhookSubscriptionRepository.orm.findOne.mockResolvedValue(null);

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
          event_types: [WebhookEventType.ACTIVITY_COMPLETED],
          is_active: true,
        },
      ];

      webhookSubscriptionRepository.findByEventType.mockResolvedValue(mockSubscriptions as WebhookSubscription[]);

      const result = await service.getSubscriptionsByEventType(mockUserId, WebhookEventType.ACTIVITY_COMPLETED);

      expect(result).toHaveLength(1);
      expect(webhookSubscriptionRepository.findByEventType).toHaveBeenCalledWith(
        mockUserId,
        WebhookEventType.ACTIVITY_COMPLETED,
      );
    });
  });
});
