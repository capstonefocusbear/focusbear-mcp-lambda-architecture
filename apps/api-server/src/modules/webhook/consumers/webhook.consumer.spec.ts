import { WebhookConsumer } from './webhook.consumer';
import { WebhookEventType } from '../domain/webhook-event-type.enum';

describe('WebhookConsumer', () => {
  const sentryInstance = {
    addBreadcrumb: jest.fn(),
    captureException: jest.fn(),
  };

  const sentryServiceMock = {
    instance: jest.fn().mockReturnValue(sentryInstance),
  };

  const webhookDispatcherServiceMock = {
    sendWebhook: jest.fn(),
  };

  const job = {
    data: {
      subscriptionId: 'sub-1',
      url: 'https://example.com/webhook',
      secret: 'secret',
      payload: {
        event_type: WebhookEventType.HABIT_COMPLETED,
        timestamp: new Date('2024-01-01T00:00:00Z').toISOString(),
        user_id: 'user-1',
        data: { habit_name: 'Test' },
      },
    },
  };

  let consumer: WebhookConsumer;

  beforeEach(() => {
    consumer = new WebhookConsumer(webhookDispatcherServiceMock as any, sentryServiceMock as any);
    jest.clearAllMocks();
  });

  it('delegates webhook delivery to dispatcher', async () => {
    webhookDispatcherServiceMock.sendWebhook.mockResolvedValueOnce(undefined);

    await consumer.handleSendWebhook(job as any);

    expect(webhookDispatcherServiceMock.sendWebhook).toHaveBeenCalledWith(
      job.data.subscriptionId,
      job.data.url,
      job.data.secret,
      job.data.payload,
    );
  });

  it('captures and rethrows errors from dispatcher', async () => {
    const error = new Error('delivery failed');
    webhookDispatcherServiceMock.sendWebhook.mockRejectedValueOnce(error);

    await expect(consumer.handleSendWebhook(job as any)).rejects.toThrow('delivery failed');
    expect(sentryInstance.captureException).toHaveBeenCalledWith(error, expect.any(Object));
  });
});
