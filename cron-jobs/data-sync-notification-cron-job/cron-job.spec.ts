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
      'ios',
      expect.any(Number),
      expect.stringContaining('Focus Bear'),
    );
    expect(mockApp.close).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalled();
    exitSpy.mockRestore();
  });
});
