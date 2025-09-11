import { DateTime } from 'luxon';
import { LessThan } from 'typeorm';
import { CronJobDataSource } from '../data-source';
import { StudyParticipant } from '../../apps/api-server/src/modules/user/entities/study-participant.entity';

// Lean-context related mocks
jest.mock('@nestjs/core', () => ({
  NestFactory: { createApplicationContext: jest.fn() },
}));
jest.mock('auth0', () => ({
  ManagementClient: jest.fn().mockImplementation(() => ({
    users: { get: jest.fn().mockResolvedValue({ data: { email: 'user@example.com' } }) },
  })),
}));

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn().mockResolvedValue({
        text: '{"mock": "response"}',
      }),
    },
  })),
}));

// Mock the data source
jest.mock('../data-source', () => {
  const mockManager = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const mockDataSource = {
    manager: mockManager,
    initialize: jest.fn(),
    destroy: jest.fn(),
  };
  return { CronJobDataSource: mockDataSource };
});

describe('getUsersWithOutdatedData', () => {
  let mockManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockManager = CronJobDataSource.manager;
  });

  it('should fetch participants with outdated usage data', async () => {
    // only this if it called the typeorm find method, cant test the filter without integration tests
    const mockNow = DateTime.fromISO('2025-07-09T13:56:07.635Z') as DateTime<any>;
    jest.spyOn(DateTime, 'now').mockReturnValue(mockNow);

    const threeDaysAgo = mockNow.minus({ days: 3 }).toJSDate();
    const mockParticipants = [
      { id: '1', userId: 'user1', usageDataLastReceived: mockNow.minus({ days: 4 }).toJSDate() },
      { id: '2', userId: 'user2', usageDataLastReceived: mockNow.minus({ days: 5 }).toJSDate() },
    ];
    mockManager.find.mockResolvedValue(mockParticipants);

    const { getUsersWithOutdatedData } = await import('./cron-job');
    const result = await getUsersWithOutdatedData();

    expect(mockManager.find).toHaveBeenCalledWith(StudyParticipant, {
      where: { usageDataLastReceived: LessThan(threeDaysAgo) },
    });
    expect(result).toEqual(mockParticipants);
  });

  it('should filter out participants without userId', async () => {
    const mockNow = DateTime.fromISO('2025-07-09T13:56:07.635Z') as DateTime<any>;
    jest.spyOn(DateTime, 'now').mockReturnValue(mockNow);

    const mockParticipants = [
      { id: '1', userId: 'user1', usageDataLastReceived: mockNow.minus({ days: 4 }).toJSDate() },
      { id: '2', userId: null, usageDataLastReceived: mockNow.minus({ days: 5 }).toJSDate() },
      { id: '3', userId: undefined, usageDataLastReceived: mockNow.minus({ days: 6 }).toJSDate() },
      { id: '4', userId: 'user4', usageDataLastReceived: mockNow.minus({ days: 7 }).toJSDate() },
    ];
    mockManager.find.mockResolvedValue(mockParticipants);

    const { getUsersWithOutdatedData } = await import('./cron-job');
    const result = await getUsersWithOutdatedData();

    expect(result).toEqual([
      { id: '1', userId: 'user1', usageDataLastReceived: mockNow.minus({ days: 4 }).toJSDate() },
      { id: '4', userId: 'user4', usageDataLastReceived: mockNow.minus({ days: 7 }).toJSDate() },
    ]);
  });

  it('should return empty array when no participants found', async () => {
    const mockNow = DateTime.fromISO('2025-07-09T13:56:07.635Z') as DateTime<any>;
    jest.spyOn(DateTime, 'now').mockReturnValue(mockNow);

    mockManager.find.mockResolvedValue([]);

    const { getUsersWithOutdatedData } = await import('./cron-job');
    const result = await getUsersWithOutdatedData();

    expect(result).toEqual([]);
  });

  it('should calculate three days ago correctly', async () => {
    const mockNow = DateTime.fromISO('2025-07-09T13:56:07.635Z') as DateTime<any>;
    jest.spyOn(DateTime, 'now').mockReturnValue(mockNow);

    const expectedThreeDaysAgo = mockNow.minus({ days: 3 }).toJSDate();
    mockManager.find.mockResolvedValue([]);

    const { getUsersWithOutdatedData } = await import('./cron-job');
    await getUsersWithOutdatedData();

    expect(mockManager.find).toHaveBeenCalledWith(StudyParticipant, {
      where: { usageDataLastReceived: LessThan(expectedThreeDaysAgo) },
    });
  });
});

// Additional lean behavior tests (from cron-job.lean.spec.ts)
describe('data-sync-notification cron (lean behavior)', () => {
  // Spy on fs and sendgrid to ensure no heavy work at import
  const fs = require('fs');
  const sendGrid = require('@sendgrid/mail');
  const readSpy = jest.spyOn(fs, 'readFileSync');
  const apiKeySpy = jest.spyOn(sendGrid, 'setApiKey');

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('does not read translations or set SendGrid API key at import-time', async () => {
    await import('./cron-job');
    const translationReads = readSpy.mock.calls.filter((c) => String(c[0]).includes('/shared/i18n/'));
    expect(translationReads.length).toBe(0);
    expect(apiKeySpy).not.toHaveBeenCalled();
  });

  it('uses a minimal Nest application context (not AppModule) and closes it', async () => {
    // Ensure canned message IDs are present to avoid early validation error
    process.env.ZOHO_CANNED_MESSAGE_ID_IOS = '123456';
    process.env.ZOHO_CANNED_MESSAGE_ID_ANDROID = '789012';

    const { NestFactory } = require('@nestjs/core');
    const createCtx = NestFactory.createApplicationContext as any;

    const mockZoho = { initiateWhatsAppSession: jest.fn().mockResolvedValue({}) };
    const mockApp = {
      get: jest.fn().mockReturnValue(mockZoho),
      close: jest.fn().mockResolvedValue(undefined),
    };
    createCtx.mockResolvedValue(mockApp);

    // Set up participants and user details in data source (re-require after resetModules)
    const { CronJobDataSource: DS } = require('../data-source');
    const manager = DS.manager as any;
    manager.find.mockResolvedValue([
      {
        userId: 'u1',
        participantCode: 'P-001',
      },
    ]);
    manager.findOne
      // StudyParticipant
      .mockResolvedValueOnce({ name: 'Alice', phoneNumber: '+50370000000', metadata: { mobileOS: 'ios' } })
      // User
      .mockResolvedValueOnce({ id: 'u1', auth0_id: 'auth0|u1', language: 'es' });

    const mod = await import('./cron-job');
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    await mod.runDataSyncCronJob();

    expect(createCtx).toHaveBeenCalled();
    const moduleArg = createCtx.mock.calls[0][0];
    expect(moduleArg && (moduleArg as any).name).not.toBe('AppModule');
    expect(mockApp.get).toHaveBeenCalled();
    expect(mockZoho.initiateWhatsAppSession).toHaveBeenCalledWith(
      '+50370000000',
      'es',
      expect.any(Number),
      expect.stringContaining('Focus Bear'),
    );
    expect(mockApp.close).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalled();
    exitSpy.mockRestore();
  });
});

// Rate limiting & batching tests (integrated from rate-limiting.spec.ts)
describe('processInBatches utility (TDD for rate limiting)', () => {
  // We import lazily so the test can fail first when the function is missing
  const importModule = async () => import('./cron-job');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('processes items in batches and waits a cooldown between batches', async () => {
    const { processInBatches } = await importModule();

    const items = Array.from({ length: 120 }, (_, i) => i + 1);

    const processed: number[] = [];
    const processItem = jest.fn(async (n: number) => {
      processed.push(n);
    });

    // Custom sleep where we control when it resolves
    const sleepResolvers: Array<() => void> = [];
    const sleep = jest.fn(() => new Promise<void>((resolve) => sleepResolvers.push(resolve)));

    const promise = processInBatches<number>({
      items,
      batchSize: 50,
      cooldownMs: 60_000,
      processItem,
      sleep,
    });

    // Flush enough microtasks for first batch to complete and reach sleep
    for (let i = 0; i < 60; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.resolve();
    }
    // First sleep
    sleepResolvers.shift()?.();
    // Flush enough microtasks for second batch to complete and reach sleep
    for (let i = 0; i < 60; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.resolve();
    }
    // Second sleep
    sleepResolvers.shift()?.();

    await promise; // finish

    expect(processItem).toHaveBeenCalledTimes(120);
    // processed items are in order
    expect(processed[0]).toBe(1);
    expect(processed[49]).toBe(50);
    expect(processed[99]).toBe(100);
    expect(processed[119]).toBe(120);
    // Two cooldowns for 120 items with batch size 50
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('does not sleep if items fit into a single batch', async () => {
    const { processInBatches } = await importModule();

    const items = Array.from({ length: 50 }, (_, i) => i + 1);
    const processItem = jest.fn(async () => {});
    const sleep = jest.fn(async () => {});

    await processInBatches<number>({ items, batchSize: 50, cooldownMs: 60_000, processItem, sleep });

    expect(processItem).toHaveBeenCalledTimes(50);
    expect(sleep).not.toHaveBeenCalled();
  });
});
