import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { PusherService } from '@app/pusher';
import { Job } from 'bull';
import { PusherServiceMock, SentryServiceMock } from '../../../../test/mocks';
import { BullWorkers } from '../../../shared/utils/constants';
import { SettingsNotificationConsumer, SettingsNotificationJobData } from './settings-notification.consumer';

describe('SettingsNotificationConsumer', () => {
  let consumer: SettingsNotificationConsumer;

  const buildJob = (attemptsMade = 0, attempts = 3): Job<SettingsNotificationJobData> =>
    ({
      id: 'job-1',
      data: {
        userId: 'user-1',
        deviceId: 'device-1',
      },
      attemptsMade,
      opts: { attempts },
    } as Job<SettingsNotificationJobData>);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsNotificationConsumer,
        { provide: PusherService, useValue: PusherServiceMock },
        { provide: SENTRY_TOKEN, useValue: SentryServiceMock },
      ],
    }).compile();

    consumer = module.get<SettingsNotificationConsumer>(SettingsNotificationConsumer);
    jest.clearAllMocks();
  });

  it('sends settings update notification through pusher', async () => {
    await consumer.handleSettingsNotification(buildJob());

    expect(PusherServiceMock.trigger).toHaveBeenCalledWith('private-user-1', 'settings-updated', {
      device_id: 'device-1',
    });
  });

  it('captures warning in sentry and retries when sending fails before last attempt', async () => {
    const error = new Error('pusher unavailable');
    PusherServiceMock.trigger.mockRejectedValueOnce(error);

    await expect(consumer.handleSettingsNotification(buildJob(0, 3))).rejects.toThrow(error);

    expect(SentryServiceMock.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        level: 'warning',
        tags: expect.objectContaining({
          job: BullWorkers.SEND_SETTINGS_NOTIFICATION,
          attempt: '1',
          isLastAttempt: 'false',
        }),
      }),
    );
  });

  it('captures error level in sentry when final retry fails', async () => {
    const error = new Error('pusher unavailable');
    PusherServiceMock.trigger.mockRejectedValueOnce(error);

    await expect(consumer.handleSettingsNotification(buildJob(2, 3))).rejects.toThrow(error);

    expect(SentryServiceMock.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({
          attempt: '3',
          isLastAttempt: 'true',
        }),
      }),
    );
  });
});
