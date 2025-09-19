import { jest } from '@jest/globals';
import { ManagementClient } from 'auth0';
import { NestFactory } from '@nestjs/core';
import { CronJobDataSource } from '../data-source';
import { StudyParticipant } from '../../apps/api-server/src/modules/user/entities/study-participant.entity';
import { User } from '../../apps/api-server/src/modules/user/entities/user.entity';
import { getUserDetails, runDataSyncCronJob } from './cron-job';

jest.mock('auth0', () => {
  return {
    ManagementClient: (jest as any).fn().mockImplementation(() => ({
      users: {
        get: ((jest as any).fn().mockResolvedValue({ data: { email: 'user@example.com' } }) as any),
      },
    })),
  } as unknown as typeof import('auth0');
});

jest.mock('@nestjs/core', () => {
  return {
    NestFactory: {
      createApplicationContext: jest.fn(),
    },
  } as unknown as typeof import('@nestjs/core');
});

describe('data-sync-notification cron job', () => {
  const origEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...origEnv };
    process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || 'host';
    process.env.POSTGRES_USERNAME = process.env.POSTGRES_USERNAME || 'user';
    process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'pass';
    process.env.POSTGRES_DB = process.env.POSTGRES_DB || 'db';
    process.env.AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'example.auth0.com';
    process.env.AUTH0_MANAGEMENT_CLIENT_ID = process.env.AUTH0_MANAGEMENT_CLIENT_ID || 'cid';
    process.env.AUTH0_MANAGEMENT_CLIENT_SECRET = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET || 'secret';
    process.env.ZOHO_CANNED_MESSAGE_ID_IOS = '1111';
    process.env.ZOHO_CANNED_MESSAGE_ID_ANDROID = '2222';
  });

  afterAll(() => {
    process.env = origEnv;
  });

  // Focus on lifecycle and clean shutdown; external SDKs mocked in other tests

  test('runDataSyncCronJob initializes and destroys datasource and closes app', async () => {
    // Fake manager: first query returns reservation row, subsequent updates noop
    const query: any = (jest as any)
      .fn()
      .mockResolvedValueOnce([{ id: 'sp1', participant_code: 'PC-1', user_id: 'u1' }])
      .mockResolvedValue([]);

    const findOne = jest.fn((entity: any) => {
      if (entity === StudyParticipant) {
        return Promise.resolve({
          id: 'sp1',
          userId: 'u1',
          name: 'Alice',
          phoneNumber: '+50312345678',
          metadata: { mobileOS: 'ios' },
        });
      }
      if (entity === User) return Promise.resolve(null); // avoid hitting Auth0 in this unit test
      return Promise.resolve(null);
    });

    const fakeManager = { query, findOne } as any;
    Object.defineProperty(CronJobDataSource, 'manager', { get: () => fakeManager });

    // DataSource lifecycle
    (CronJobDataSource as any).isInitialized = false;
    const initSpy = jest.spyOn(CronJobDataSource, 'initialize').mockImplementation(async () => {
      (CronJobDataSource as any).isInitialized = true;
      return CronJobDataSource as any;
    });
    const destroySpy = jest.spyOn(CronJobDataSource, 'destroy').mockResolvedValue();

    // Fake Nest app context
    const close: any = (jest as any).fn().mockResolvedValue(undefined);
    const zohoService = { initiateWhatsAppSession: ((jest as any).fn().mockResolvedValue({}) as any) } as any;
    (NestFactory.createApplicationContext as any).mockResolvedValue({
      get: () => zohoService,
      close,
    });

    await runDataSyncCronJob();

    expect(initSpy).toHaveBeenCalled();
    expect(zohoService.initiateWhatsAppSession).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });
});
