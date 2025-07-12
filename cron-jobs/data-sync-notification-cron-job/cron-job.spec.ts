import { DateTime } from 'luxon';
import { LessThan } from 'typeorm';
import { StudyParticipant } from '../../apps/api-server/src/modules/user/entities/study-participant.entity';
import { getUsersWithOutdatedData } from './cron-job';

// Mock the data source
jest.mock('../data-source', () => {
  const mockManager = {
    find: jest.fn(),
  };
  const mockDataSource = {
    manager: mockManager,
    initialize: jest.fn(),
  };
  return { CronJobDataSource: mockDataSource };
});

describe('getUsersWithOutdatedData', () => {
  let mockManager: any;
  let mockDataSource: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const { CronJobDataSource } = require('../data-source');
    mockDataSource = CronJobDataSource;
    mockManager = CronJobDataSource.manager;
  });

  it('should fetch participants with outdated usage data', async () => {
    //only this if it called the typeorm find method, cant test the filter without integration tests
    const mockNow = DateTime.fromISO('2025-07-09T13:56:07.635Z') as DateTime<any>;
    jest.spyOn(DateTime, 'now').mockReturnValue(mockNow);

    const threeDaysAgo = mockNow.minus({ days: 3 }).toJSDate();
    const mockParticipants = [
      { id: '1', userId: 'user1', usageDataLastReceived: mockNow.minus({ days: 4 }).toJSDate() },
      { id: '2', userId: 'user2', usageDataLastReceived: mockNow.minus({ days: 5 }).toJSDate() },
    ];
    mockManager.find.mockResolvedValue(mockParticipants);
    
    const result = await getUsersWithOutdatedData();
    console.log(result);

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
    
    const result = await getUsersWithOutdatedData();
    console.log(result);

    expect(result).toEqual([
      { id: '1', userId: 'user1', usageDataLastReceived: mockNow.minus({ days: 4 }).toJSDate() },
      { id: '4', userId: 'user4', usageDataLastReceived: mockNow.minus({ days: 7 }).toJSDate() },
    ]);
  });

  it('should return empty array when no participants found', async () => {
    const mockNow = DateTime.fromISO('2025-07-09T13:56:07.635Z') as DateTime<any>;
    jest.spyOn(DateTime, 'now').mockReturnValue(mockNow);

    mockManager.find.mockResolvedValue([]);
    
    const result = await getUsersWithOutdatedData();

    expect(result).toEqual([]);
  });

  it('should calculate three days ago correctly', async () => {
    const mockNow = DateTime.fromISO('2025-07-09T13:56:07.635Z') as DateTime<any>;
    jest.spyOn(DateTime, 'now').mockReturnValue(mockNow);

    const expectedThreeDaysAgo = mockNow.minus({ days: 3 }).toJSDate();
    mockManager.find.mockResolvedValue([]);
    
    await getUsersWithOutdatedData();

    expect(mockManager.find).toHaveBeenCalledWith(StudyParticipant, {
      where: { usageDataLastReceived: LessThan(expectedThreeDaysAgo) },
    });
  });

  
});
