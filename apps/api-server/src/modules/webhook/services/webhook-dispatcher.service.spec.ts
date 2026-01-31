import axios from 'axios';
import { promises as dns } from 'dns';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { WebhookEventType } from '../domain/webhook-event-type.enum';
import { BullWorkers } from '../../../shared/utils/constants';

jest.mock('axios');
jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedDnsLookup = dns.lookup as jest.Mock;

describe('WebhookDispatcherService', () => {
  const sentryInstance = {
    addBreadcrumb: jest.fn(),
    captureException: jest.fn(),
  };

  const sentryServiceMock = {
    instance: jest.fn().mockReturnValue(sentryInstance),
  };

  const webhookQueueMock = {
    add: jest.fn(),
  };

  const webhookSubscriptionRepositoryMock = {
    findByEventType: jest.fn(),
    resetFailureCount: jest.fn(),
    updateLastTriggered: jest.fn(),
    incrementFailureCount: jest.fn(),
  };

  const payload = {
    event_type: WebhookEventType.HABIT_COMPLETED,
    timestamp: new Date('2024-01-01T00:00:00Z').toISOString(),
    user_id: 'user-1',
    data: { habit_name: 'Test' },
  };

  let service: WebhookDispatcherService;

  beforeEach(() => {
    service = new WebhookDispatcherService(
      webhookSubscriptionRepositoryMock as any,
      sentryServiceMock as any,
      webhookQueueMock as any,
    );

    jest.clearAllMocks();
    mockedDnsLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  });

  it('queues webhooks only for subscriptions below failure limit', async () => {
    webhookSubscriptionRepositoryMock.findByEventType.mockResolvedValueOnce([
      {
        id: 'sub-1',
        url: 'https://example.com/webhook',
        secret: null,
        failure_count: 0,
      },
      {
        id: 'sub-2',
        url: 'https://example.com/webhook-2',
        secret: null,
        failure_count: 5,
      },
    ]);

    webhookQueueMock.add.mockResolvedValueOnce({ id: 'job-1' });

    await service.dispatchEvent('user-1', WebhookEventType.HABIT_COMPLETED, { habit_name: 'Test' });

    expect(webhookQueueMock.add).toHaveBeenCalledTimes(1);
    expect(webhookQueueMock.add).toHaveBeenCalledWith(
      BullWorkers.SEND_WEBHOOK,
      expect.objectContaining({ subscriptionId: 'sub-1' }),
      expect.any(Object),
    );
  });

  it('sends webhook with signature and updates subscription metadata on success', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 200 });

    await service.sendWebhook('sub-1', 'https://example.com/webhook', 'secret-key', payload);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://example.com/webhook',
      payload,
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Webhook-Signature': expect.stringMatching(/^sha256=/),
        }),
      }),
    );
    expect(webhookSubscriptionRepositoryMock.resetFailureCount).toHaveBeenCalledWith('sub-1');
    expect(webhookSubscriptionRepositoryMock.updateLastTriggered).toHaveBeenCalledWith('sub-1');
  });

  it('rejects webhooks that resolve to private IPs', async () => {
    mockedDnsLookup.mockResolvedValueOnce([{ address: '10.0.0.1', family: 4 }]);

    await expect(service.sendWebhook('sub-1', 'https://internal.example', null, payload)).rejects.toThrow(
      'Webhook URL resolves to a private or localhost address',
    );

    expect(webhookSubscriptionRepositoryMock.incrementFailureCount).toHaveBeenCalledWith('sub-1');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
