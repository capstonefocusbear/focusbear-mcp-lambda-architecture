import { Test, TestingModule } from '@nestjs/testing';
import { UserStreaksService } from './user-streaks.service';
import { DailyStats } from '../../entities/user-daily-stats.entity';
import { DailySequenceDurations } from '../../../activity/domain/daily-sequence-durations.model';
import * as helpers from '../../../../../../../cron-jobs/user-stats-cron-job/helpers';

// Mock the helpers import
jest.mock('../../../../../../../cron-jobs/user-stats-cron-job/helpers');

const createMockDailyStats = (date: string): DailyStats => {
  const dailyStats = new DailyStats();
  dailyStats.id = '123e4567-e89b-12d3-a456-426614174000';
  dailyStats.user_id = 'user-123';
  dailyStats.date_completed = new Date(date);
  dailyStats.morning_routine_completion_percentage = 80;
  dailyStats.evening_routine_completion_percentage = 75;
  dailyStats.micro_breaks_routine_completion_percentage = 90;
  dailyStats.focus_modes_completed = 3;
  dailyStats.seconds_spent_doing_breaks = 1800; // 30 minutes
  dailyStats.seconds_spent_in_focus_sessions = 7200; // 2 hours
  return dailyStats;
};

const createMockDailySequenceDurations = (): DailySequenceDurations => ({
  MON: 1800, // 30 minutes
  TUE: 1800,
  WED: 1800,
  THU: 1800,
  FRI: 1800,
  SAT: 1800,
  SUN: 1800,
});

describe('UserStreaksService', () => {
  let service: UserStreaksService;
  const mockCalculateStreaks = jest.mocked(helpers.calculateStreaks);
  const mockCalculateRoutineStatsIn90Days = jest.mocked(helpers.calculateRoutineStatsIn90Days);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserStreaksService],
    }).compile();

    service = module.get<UserStreaksService>(UserStreaksService);
    jest.clearAllMocks();
  });

  describe('calculateStreaksForUser', () => {
    it('should delegate to the existing calculateStreaks function', () => {
      // Arrange
      const mockUserDailyStats = [createMockDailyStats('2025-08-06')];
      const mockTimeZone = 'America/New_York';
      const mockDailySequenceDurations = {
        morningRoutineDailyDurations: createMockDailySequenceDurations(),
        eveningRoutineDailyDurations: createMockDailySequenceDurations(),
        microBreaksDailyDurations: createMockDailySequenceDurations(),
      };
      const mockUserCreatedAt = new Date('2025-01-01');
      const mockResult = {
        focus_modes_streak: 5,
        morning_routines_streak: 3,
        evening_routines_streak: 2,
        micro_breaks_streak: 1,
      };

      mockCalculateStreaks.mockReturnValue(mockResult as any);

      // Act
      const result = service.calculateStreaksForUser(
        mockUserDailyStats,
        mockTimeZone,
        mockDailySequenceDurations,
        mockUserCreatedAt,
      );

      // Assert
      expect(mockCalculateStreaks).toHaveBeenCalledWith(
        mockUserDailyStats,
        mockTimeZone,
        mockDailySequenceDurations,
        mockUserCreatedAt,
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('get90DayStats', () => {
    it('should delegate to the existing calculateRoutineStatsIn90Days function', () => {
      // Arrange
      const mockUserDailyStats = [createMockDailyStats('2025-08-06')];
      const mockUserCreatedAt = new Date('2025-01-01');
      const mockTimeZone = 'America/New_York';
      const mockResult = {
        daysWhereMorningRoutinesWereCompletedIn90Days: [],
        daysWhereEveningRoutinesWereCompletedIn90Days: [],
        daysWhereMicroBreaksWereCompletedIn90Days: [],
        daysWhereFocusModesWereCompletedIn90Days: [],
        num_days_of_stats: 90,
        number_days_completed: 30,
      };

      mockCalculateRoutineStatsIn90Days.mockReturnValue(mockResult as any);

      // Act
      const result = service.get90DayStats(mockUserDailyStats, mockUserCreatedAt, mockTimeZone);

      // Assert
      expect(mockCalculateRoutineStatsIn90Days).toHaveBeenCalledWith(
        mockUserDailyStats,
        mockUserCreatedAt,
        mockTimeZone,
      );
      expect(result).toBe(mockResult);
    });
  });
});
