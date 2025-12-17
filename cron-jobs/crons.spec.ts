import * as Sentry from '@sentry/nestjs';
import * as sentryModule from './sentry';
import { withTimeout } from '../apps/api-server/src/shared/utils/helpers';
import { CRON_JOB_TIMEOUT_MS } from '../apps/api-server/src/shared/utils/constants';

jest.mock('@sentry/nestjs', () => {
  const mockDecorator = (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor;

  const SentryTracedMock = () => mockDecorator;
  const SentryCronMock = () => mockDecorator;

  return {
    init: jest.fn(),
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    flush: jest.fn().mockResolvedValue(true),
    withScope: jest.fn((callback) => {
      const scope = {
        setTag: jest.fn(),
        setUser: jest.fn(),
        setContext: jest.fn(),
        setLevel: jest.fn(),
      };
      return callback(scope);
    }),
    cron: {
      instrumentCron: jest.fn(),
    },
    SentryTraced: SentryTracedMock,
    SentryCron: SentryCronMock,
  };
});

describe('Cron Job Wrapper Integration', () => {
  let originalProcessExit: any;
  let exitMock: jest.SpyInstance;
  beforeAll(() => {
    originalProcessExit = process.exit;
    exitMock = jest.spyOn(process, 'exit').mockImplementation((() => { }) as any);
  });
  afterAll(() => {
    exitMock.mockRestore();
    process.exit = originalProcessExit;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const cronJobs = [
    { name: 'user-stats', fn: async () => 'ok' },
    { name: 'routine-notifications', fn: async () => 'ok' },
    { name: 'integration', fn: async () => 'ok' },
    { name: 'pusher', fn: async () => 'ok' },
    { name: 'expired-team-members', fn: async () => 'ok' },
    { name: 'inactive-accounts', fn: async () => 'ok' },
    { name: 'data-sync-notification', fn: async () => 'ok' },
    { name: 'calendar-event', fn: async () => 'ok' },
  ];

  it.each(cronJobs)('should run $name cron job and terminate process', async ({ fn }) => {
    await sentryModule.withSentry(() => withTimeout(fn(), CRON_JOB_TIMEOUT_MS));
    expect(exitMock).toHaveBeenCalled();
    expect(Sentry.flush).toHaveBeenCalled();
  });

  it('should handle errors and report to Sentry', async () => {
    const error = new Error('fail');
    const failingJob = async () => { throw error; };
    await expect(sentryModule.withSentry(() => withTimeout(failingJob(), CRON_JOB_TIMEOUT_MS))).rejects.toThrow('fail');
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(exitMock).toHaveBeenCalled();
  });

  it('should throw and report timeout error', async () => {
    const slowJob = async () => {
      await new Promise((resolve) => setTimeout(resolve, CRON_JOB_TIMEOUT_MS + 1000));
    };
    const promise = sentryModule.withSentry(() => withTimeout(slowJob(), CRON_JOB_TIMEOUT_MS));
    jest.advanceTimersByTime(CRON_JOB_TIMEOUT_MS + 2000);
    await expect(promise).rejects.toThrow('Operation timed out');
    expect(Sentry.captureException).toHaveBeenCalled();
    expect(exitMock).toHaveBeenCalled();
  });

  it('should clear timeout timer when job completes', async () => {
    const promise = withTimeout(Promise.resolve('ok'), CRON_JOB_TIMEOUT_MS);
    await expect(promise).resolves.toBe('ok');
    expect(jest.getTimerCount()).toBe(0);
  });
}); 
