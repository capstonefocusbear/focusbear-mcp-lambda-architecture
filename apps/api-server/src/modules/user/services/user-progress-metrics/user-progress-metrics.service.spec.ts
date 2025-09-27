import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { DateTime } from 'luxon';
import { UserProgressMetricsService } from './user-progress-metrics.service';
import { DailyStatsRepository } from '../../repositories/user-daily-stats.repository';
import { UserStreaksService } from '../user-streaks/user-streaks.service';
import { ActivitySequenceService } from '../../../activity/services/activity-sequence/activity-sequence.service';
import { User, EmailFrequency } from '../../entities/user.entity';
import { DailyStats } from '../../entities/user-daily-stats.entity';

const createMockUser = (): User => {
  const user = new User();
  user.id = 'user-123';
  user.timezone = 'UTC';
  user.language = 'en';
  user.email_frequency = EmailFrequency.WEEKLY;
  user.created_at = '2025-01-01T00:00:00.000Z';
  user.metadata = {
    name: 'Test User',
  };
  return user;
};

const createMockDailyStats = (date: string, overrides: Partial<DailyStats> = {}): DailyStats => {
  const stats = new DailyStats();
  stats.date_completed = new Date(date);
  stats.morning_routine_completion_percentage = overrides.morning_routine_completion_percentage || 0;
  stats.evening_routine_completion_percentage = overrides.evening_routine_completion_percentage || 0;
  stats.micro_breaks_routine_completion_percentage = overrides.micro_breaks_routine_completion_percentage || 0;
  stats.seconds_spent_in_focus_sessions = (overrides.seconds_spent_in_focus_sessions || 0) * 60;
  stats.seconds_spent_doing_breaks = overrides.seconds_spent_doing_breaks || 0;
  stats.focus_modes_completed =
    overrides.focus_modes_completed !== undefined ? overrides.focus_modes_completed : Math.floor(Math.random() * 5) + 1;
  return stats;
};

describe('UserProgressMetricsService', () => {
  let service: UserProgressMetricsService;
  let userStreaksService: jest.Mocked<UserStreaksService>;

  const mockDailyStatsRepository = {
    find: jest.fn(),
    getUserDailyStats: jest.fn(),
    orm: {
      find: jest.fn(),
    },
  };

  const mockUserStreaksService = {
    calculateStreaksForUser: jest.fn(),
  };

  const mockActivitySequenceService = {
    getUserRoutineDailyDurations: jest.fn(),
  };

  const mockSentryInstance = {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
  };

  const mockSentryService = {
    instance: () => mockSentryInstance,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProgressMetricsService,
        {
          provide: DailyStatsRepository,
          useValue: mockDailyStatsRepository,
        },
        {
          provide: UserStreaksService,
          useValue: mockUserStreaksService,
        },
        {
          provide: ActivitySequenceService,
          useValue: mockActivitySequenceService,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: mockSentryService,
        },
      ],
    }).compile();

    service = module.get<UserProgressMetricsService>(UserProgressMetricsService);
    userStreaksService = module.get(UserStreaksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateWeeklyProgress', () => {
    it('should calculate weekly progress metrics successfully', async () => {
      // Arrange
      const user = createMockUser();
      const weekStart = new Date('2025-08-04'); // Monday

      const weeklyStats = [
        createMockDailyStats('2025-08-04', {
          morning_routine_completion_percentage: 100,
          seconds_spent_in_focus_sessions: 120,
        }),
        createMockDailyStats('2025-08-05', {
          evening_routine_completion_percentage: 100,
          seconds_spent_in_focus_sessions: 90,
        }),
        createMockDailyStats('2025-08-06', {
          morning_routine_completion_percentage: 100,
          seconds_spent_in_focus_sessions: 150,
        }),
      ];

      const allTimeStats = [...weeklyStats, createMockDailyStats('2025-07-01')];

      const mockRoutineDurations = {
        morningRoutineDailyDurations: {
          MONDAY: 1800,
          TUESDAY: 1800,
          WEDNESDAY: 1800,
          THURSDAY: 1800,
          FRIDAY: 1800,
          SATURDAY: 1800,
          SUNDAY: 1800,
        },
        eveningRoutineDailyDurations: {
          MONDAY: 1800,
          TUESDAY: 1800,
          WEDNESDAY: 1800,
          THURSDAY: 1800,
          FRIDAY: 1800,
          SATURDAY: 1800,
          SUNDAY: 1800,
        },
        microBreaksDailyDurations: {
          MONDAY: 600,
          TUESDAY: 600,
          WEDNESDAY: 600,
          THURSDAY: 600,
          FRIDAY: 600,
          SATURDAY: 600,
          SUNDAY: 600,
        },
      };

      const mockStreaks = {
        focus_modes_streak: 5,
        morning_routines_streak: 3,
        evening_routines_streak: 2,
        micro_breaks_streak: 0,
      };

      mockDailyStatsRepository.orm.find.mockResolvedValue(weeklyStats);
      mockDailyStatsRepository.getUserDailyStats.mockResolvedValue(allTimeStats);
      mockActivitySequenceService.getUserRoutineDailyDurations.mockResolvedValue(mockRoutineDurations as any);
      mockUserStreaksService.calculateStreaksForUser.mockReturnValue(mockStreaks as any);

      // Act
      const result = await service.calculateWeeklyProgress(user, weekStart);

      // Assert
      expect(result).toEqual({
        week_start: expect.any(Date),
        week_end: expect.any(Date),
        routines: {
          morning: {
            completed: 2,
            total: 7,
            streak: 3,
          },
          evening: {
            completed: 1,
            total: 7,
            streak: 2,
          },
          micro_breaks: {
            completed: 0,
            total: 7,
            streak: 0,
          },
        },
        focus_sessions: {
          total_minutes: 360, // 120 + 90 + 150
          sessions_count: expect.any(Number), // Random sessions from test data
          longest_session: 150, // Longest session in minutes
          streak: 5,
        },
        tasks: expect.any(Object),
        streaks: {
          current_overall: 5,
          best_overall: 5,
          morning_routine: 3,
          evening_routine: 2,
          focus_mode: 5,
        },
      });

      expect(userStreaksService.calculateStreaksForUser).toHaveBeenCalledWith(
        allTimeStats,
        user.timezone,
        mockRoutineDurations,
        new Date(user.created_at),
      );
    });

    it('should use current week when weekStart is not provided', async () => {
      // Arrange
      const user = createMockUser();

      mockDailyStatsRepository.orm.find.mockResolvedValue([]);
      mockDailyStatsRepository.getUserDailyStats.mockResolvedValue([]);
      mockActivitySequenceService.getUserRoutineDailyDurations.mockResolvedValue({} as any);
      mockUserStreaksService.calculateStreaksForUser.mockReturnValue({} as any);

      // Act
      const result = await service.calculateWeeklyProgress(user);

      // Assert
      expect(result.week_start).toBeInstanceOf(Date);
      expect(result.week_end).toBeInstanceOf(Date);

      const startOfWeek = DateTime.now().setZone(user.timezone).startOf('week');
      const expectedStart = startOfWeek.startOf('day').toJSDate();

      expect(result.week_start.toISOString().split('T')[0]).toBe(expectedStart.toISOString().split('T')[0]);
    });

    it('should handle errors and log to Sentry', async () => {
      // Arrange
      const user = createMockUser();
      const error = new Error('Database error');

      mockDailyStatsRepository.orm.find.mockRejectedValue(error);

      // Act & Assert
      await expect(service.calculateWeeklyProgress(user)).rejects.toThrow(error);
      expect(mockSentryInstance.captureException).toHaveBeenCalledWith(error, {
        extra: { userId: user.id, operation: 'calculateWeeklyProgress' },
      });
    });
  });

  describe('calculateMonthlyProgress', () => {
    it('should calculate monthly progress metrics successfully', async () => {
      // Arrange
      const user = createMockUser();
      const monthStart = new Date('2025-08-01'); // First day of August

      const monthlyStats = [
        createMockDailyStats('2025-08-01', {
          morning_routine_completion_percentage: 100,
          seconds_spent_in_focus_sessions: 120,
          focus_modes_completed: 2,
        }),
        createMockDailyStats('2025-08-02', {
          evening_routine_completion_percentage: 100,
          seconds_spent_in_focus_sessions: 90,
          focus_modes_completed: 1,
        }),
        createMockDailyStats('2025-08-03', {
          morning_routine_completion_percentage: 100,
          seconds_spent_in_focus_sessions: 150,
          focus_modes_completed: 3,
          seconds_spent_doing_breaks: 600, // 10 minutes
        }),
      ];

      const allTimeStats = [...monthlyStats, createMockDailyStats('2025-07-01')];

      const mockRoutineDurations = {
        morningRoutineDailyDurations: {
          MONDAY: 1800,
          TUESDAY: 1800,
          WEDNESDAY: 1800,
          THURSDAY: 1800,
          FRIDAY: 1800,
          SATURDAY: 1800,
          SUNDAY: 1800,
        },
        eveningRoutineDailyDurations: {
          MONDAY: 1800,
          TUESDAY: 1800,
          WEDNESDAY: 1800,
          THURSDAY: 1800,
          FRIDAY: 1800,
          SATURDAY: 1800,
          SUNDAY: 1800,
        },
        microBreaksDailyDurations: {
          MONDAY: 600,
          TUESDAY: 600,
          WEDNESDAY: 600,
          THURSDAY: 600,
          FRIDAY: 600,
          SATURDAY: 600,
          SUNDAY: 600,
        },
      };

      const mockStreaks = {
        focus_modes_streak: 8,
        morning_routines_streak: 5,
        evening_routines_streak: 3,
        micro_breaks_streak: 2,
      };

      mockDailyStatsRepository.orm.find.mockResolvedValue(monthlyStats);
      mockDailyStatsRepository.getUserDailyStats.mockResolvedValue(allTimeStats);
      mockActivitySequenceService.getUserRoutineDailyDurations.mockResolvedValue(mockRoutineDurations as any);
      mockUserStreaksService.calculateStreaksForUser.mockReturnValue(mockStreaks as any);

      // Act
      const result = await service.calculateMonthlyProgress(user, monthStart);

      // Assert
      expect(result).toEqual({
        month_start: expect.any(Date),
        month_end: expect.any(Date),
        routines: {
          morning: {
            completed: 2,
            total: 31, // August has 31 days
            streak: 5,
          },
          evening: {
            completed: 1,
            total: 31,
            streak: 3,
          },
          micro_breaks: {
            completed: 1,
            total: 31,
            streak: 2,
          },
        },
        focus_sessions: {
          total_minutes: 360, // 120 + 90 + 150
          sessions_count: 6, // 2 + 1 + 3
          longest_session: 150, // Longest session in minutes
          streak: 8,
        },
        tasks: expect.any(Object),
        streaks: {
          current_overall: 8,
          best_overall: 8,
          morning_routine: 5,
          evening_routine: 3,
          focus_mode: 8,
        },
      });

      expect(userStreaksService.calculateStreaksForUser).toHaveBeenCalledWith(
        allTimeStats,
        user.timezone,
        mockRoutineDurations,
        new Date(user.created_at),
      );
    });

    it('should use current month when monthStart is not provided', async () => {
      // Arrange
      const user = createMockUser();

      mockDailyStatsRepository.orm.find.mockResolvedValue([]);
      mockDailyStatsRepository.getUserDailyStats.mockResolvedValue([]);
      mockActivitySequenceService.getUserRoutineDailyDurations.mockResolvedValue({} as any);
      mockUserStreaksService.calculateStreaksForUser.mockReturnValue({} as any);

      // Act
      const result = await service.calculateMonthlyProgress(user);

      // Assert
      expect(result.month_start).toBeInstanceOf(Date);
      expect(result.month_end).toBeInstanceOf(Date);

      const startOfMonth = DateTime.now().setZone(user.timezone).startOf('month');
      const expectedStart = startOfMonth.startOf('day').toJSDate();

      expect(result.month_start.toISOString().split('T')[0]).toBe(expectedStart.toISOString().split('T')[0]);
    });

    it('should handle empty monthly stats without fetching all-time data', async () => {
      // Arrange
      const user = createMockUser();
      const monthStart = new Date('2025-08-01');

      mockDailyStatsRepository.orm.find.mockResolvedValue([]); // No monthly stats

      // Act
      const result = await service.calculateMonthlyProgress(user, monthStart);

      // Assert
      expect(result.streaks).toEqual({
        current_overall: 0,
        best_overall: 0,
        morning_routine: 0,
        evening_routine: 0,
        focus_mode: 0,
      });

      // Should not fetch all-time stats when no monthly data
      expect(mockDailyStatsRepository.getUserDailyStats).not.toHaveBeenCalled();
      expect(mockActivitySequenceService.getUserRoutineDailyDurations).not.toHaveBeenCalled();
      expect(mockUserStreaksService.calculateStreaksForUser).not.toHaveBeenCalled();
    });

    it('should handle different month lengths correctly', async () => {
      // Arrange - February in a non-leap year
      const user = createMockUser();
      const monthStart = new Date('2025-02-01');

      const monthlyStats = [
        createMockDailyStats('2025-02-01', {
          morning_routine_completion_percentage: 100,
        }),
      ];

      const mockStreaks = {
        focus_modes_streak: 1,
        morning_routines_streak: 1,
        evening_routines_streak: 0,
        micro_breaks_streak: 0,
      };

      mockDailyStatsRepository.orm.find.mockResolvedValue(monthlyStats);
      mockDailyStatsRepository.getUserDailyStats.mockResolvedValue(monthlyStats);
      mockActivitySequenceService.getUserRoutineDailyDurations.mockResolvedValue({} as any);
      mockUserStreaksService.calculateStreaksForUser.mockReturnValue(mockStreaks as any);

      // Act
      const result = await service.calculateMonthlyProgress(user, monthStart);

      // Assert
      expect(result.routines.morning.total).toBe(28); // February 2025 has 28 days
      expect(result.routines.evening.total).toBe(28);
      expect(result.routines.micro_breaks.total).toBe(28);
    });

    it('should use user timezone for date calculations', async () => {
      // Arrange
      const user = createMockUser();
      user.timezone = 'America/New_York';
      const monthStart = new Date('2025-08-01');

      mockDailyStatsRepository.orm.find.mockResolvedValue([]);
      mockDailyStatsRepository.getUserDailyStats.mockResolvedValue([]);
      mockActivitySequenceService.getUserRoutineDailyDurations.mockResolvedValue({} as any);
      mockUserStreaksService.calculateStreaksForUser.mockReturnValue({} as any);

      // Act
      const result = await service.calculateMonthlyProgress(user, monthStart);

      // Assert - Check that the dates are calculated in the correct timezone
      expect(result.month_start).toBeInstanceOf(Date);
      expect(result.month_end).toBeInstanceOf(Date);

      // The month start should be adjusted to the user's timezone
      const expectedStart = DateTime.fromJSDate(monthStart).setZone(user.timezone).startOf('day').toJSDate();
      expect(result.month_start.getTime()).toBe(expectedStart.getTime());
    });

    it('should handle errors and log to Sentry', async () => {
      // Arrange
      const user = createMockUser();
      const error = new Error('Database error');

      mockDailyStatsRepository.orm.find.mockRejectedValue(error);

      // Act & Assert
      await expect(service.calculateMonthlyProgress(user)).rejects.toThrow(error);
      expect(mockSentryInstance.captureException).toHaveBeenCalledWith(error, {
        extra: { userId: user.id, operation: 'calculateMonthlyProgress' },
      });
    });

    it('should only fetch streaks data when monthly stats exist', async () => {
      // Arrange
      const user = createMockUser();
      const monthStart = new Date('2025-08-01');

      const monthlyStats = [
        createMockDailyStats('2025-08-01', {
          morning_routine_completion_percentage: 100,
        }),
      ];

      const mockStreaks = {
        focus_modes_streak: 5,
        morning_routines_streak: 3,
        evening_routines_streak: 2,
        micro_breaks_streak: 1,
      };

      mockDailyStatsRepository.orm.find.mockResolvedValue(monthlyStats);
      mockDailyStatsRepository.getUserDailyStats.mockResolvedValue([]);
      mockActivitySequenceService.getUserRoutineDailyDurations.mockResolvedValue({} as any);
      mockUserStreaksService.calculateStreaksForUser.mockReturnValue(mockStreaks as any);

      // Act
      const result = await service.calculateMonthlyProgress(user, monthStart);

      // Assert - Should fetch all-time data when monthly stats exist
      expect(mockDailyStatsRepository.getUserDailyStats).toHaveBeenCalledWith(user.id);
      expect(mockActivitySequenceService.getUserRoutineDailyDurations).toHaveBeenCalledWith(user.id);
      expect(mockUserStreaksService.calculateStreaksForUser).toHaveBeenCalled();

      expect(result.streaks.current_overall).toBe(5);
      expect(result.streaks.morning_routine).toBe(3);
    });
  });

  describe('Monthly aggregation methods', () => {
    it('should correctly aggregate monthly routine metrics', async () => {
      // Arrange
      const user = createMockUser();
      const monthStart = new Date('2025-08-01');

      const monthlyStats = [
        // Day 1: Morning routine completed
        createMockDailyStats('2025-08-01', {
          morning_routine_completion_percentage: 100,
          evening_routine_completion_percentage: 0,
          seconds_spent_doing_breaks: 0,
        }),
        // Day 2: Evening routine completed
        createMockDailyStats('2025-08-02', {
          morning_routine_completion_percentage: 0,
          evening_routine_completion_percentage: 100,
          seconds_spent_doing_breaks: 0,
        }),
        // Day 3: Both routines + micro breaks
        createMockDailyStats('2025-08-03', {
          morning_routine_completion_percentage: 100,
          evening_routine_completion_percentage: 100,
          seconds_spent_doing_breaks: 600, // 10 minutes
        }),
        // Day 4: Only micro breaks
        createMockDailyStats('2025-08-04', {
          morning_routine_completion_percentage: 0,
          evening_routine_completion_percentage: 0,
          seconds_spent_doing_breaks: 300, // 5 minutes
        }),
      ];

      const mockStreaks = {
        focus_modes_streak: 1,
        morning_routines_streak: 5,
        evening_routines_streak: 3,
        micro_breaks_streak: 7,
      };

      mockDailyStatsRepository.orm.find.mockResolvedValue(monthlyStats);
      mockDailyStatsRepository.getUserDailyStats.mockResolvedValue(monthlyStats);
      mockActivitySequenceService.getUserRoutineDailyDurations.mockResolvedValue({} as any);
      mockUserStreaksService.calculateStreaksForUser.mockReturnValue(mockStreaks as any);

      // Act
      const result = await service.calculateMonthlyProgress(user, monthStart);

      // Assert - Test aggregateMonthlyRoutineMetrics indirectly
      expect(result.routines).toEqual({
        morning: {
          completed: 2, // Days 1 and 3
          total: 31, // August has 31 days
          streak: 5,
        },
        evening: {
          completed: 2, // Days 2 and 3
          total: 31,
          streak: 3,
        },
        micro_breaks: {
          completed: 2, // Days 3 and 4 (seconds_spent_doing_breaks > 0)
          total: 31,
          streak: 7,
        },
      });
    });

    it('should correctly aggregate monthly focus metrics', async () => {
      // Arrange
      const user = createMockUser();
      const monthStart = new Date('2025-08-01');

      const monthlyStats = [
        createMockDailyStats('2025-08-01', {
          seconds_spent_in_focus_sessions: 30, // 30 minutes
          focus_modes_completed: 2,
        }),
        createMockDailyStats('2025-08-02', {
          seconds_spent_in_focus_sessions: 90, // 90 minutes (longest)
          focus_modes_completed: 3,
        }),
        createMockDailyStats('2025-08-03', {
          seconds_spent_in_focus_sessions: 45, // 45 minutes
          focus_modes_completed: 1,
        }),
      ];

      const mockStreaks = {
        focus_modes_streak: 12,
        morning_routines_streak: 0,
        evening_routines_streak: 0,
        micro_breaks_streak: 0,
      };

      mockDailyStatsRepository.orm.find.mockResolvedValue(monthlyStats);
      mockDailyStatsRepository.getUserDailyStats.mockResolvedValue(monthlyStats);
      mockActivitySequenceService.getUserRoutineDailyDurations.mockResolvedValue({} as any);
      mockUserStreaksService.calculateStreaksForUser.mockReturnValue(mockStreaks as any);

      // Act
      const result = await service.calculateMonthlyProgress(user, monthStart);

      // Assert - Test aggregateMonthlyFocusMetrics indirectly
      expect(result.focus_sessions).toEqual({
        total_minutes: 165, // 30 + 90 + 45
        sessions_count: 6, // 2 + 3 + 1
        longest_session: 90, // Longest single session
        streak: 12,
      });
    });

    it('should correctly aggregate monthly task metrics', async () => {
      // Arrange
      const user = createMockUser();
      const monthStart = new Date('2025-08-01');

      const monthlyStats = [
        createMockDailyStats('2025-08-01', {
          focus_modes_completed: 5, // Used as approximation for tasks
        }),
        createMockDailyStats('2025-08-02', {
          focus_modes_completed: 3,
        }),
        createMockDailyStats('2025-08-03', {
          focus_modes_completed: 2,
        }),
      ];

      const mockStreaks = {
        focus_modes_streak: 1,
        morning_routines_streak: 0,
        evening_routines_streak: 0,
        micro_breaks_streak: 0,
      };

      mockDailyStatsRepository.orm.find.mockResolvedValue(monthlyStats);
      mockDailyStatsRepository.getUserDailyStats.mockResolvedValue(monthlyStats);
      mockActivitySequenceService.getUserRoutineDailyDurations.mockResolvedValue({} as any);
      mockUserStreaksService.calculateStreaksForUser.mockReturnValue(mockStreaks as any);

      // Act
      const result = await service.calculateMonthlyProgress(user, monthStart);

      // Assert - Test aggregateMonthlyTaskMetrics indirectly
      expect(result.tasks.completed).toBe(10); // 5 + 3 + 2
      expect(result.tasks.completion_rate).toBe(1); // Math.min(10/3, 1) = 1 (clamped)
      expect(result.tasks.created).toBe(3); // Math.round(10 / Math.max(10/3, 0.1)) = 3
    });

    it('should handle low task completion rate correctly', async () => {
      // Arrange - scenario where completion rate is low
      const user = createMockUser();
      const monthStart = new Date('2025-08-01');

      const monthlyStats = [
        createMockDailyStats('2025-08-01', {
          focus_modes_completed: 1, // Low completion
        }),
        createMockDailyStats('2025-08-02', {
          focus_modes_completed: 0, // Zero completion
        }),
        createMockDailyStats('2025-08-03', {
          focus_modes_completed: 1, // Low completion
        }),
        createMockDailyStats('2025-08-04', {
          focus_modes_completed: 0, // Zero completion
        }),
        createMockDailyStats('2025-08-05', {
          focus_modes_completed: 1, // Low completion
        }),
      ];

      const mockStreaks = {
        focus_modes_streak: 1,
        morning_routines_streak: 0,
        evening_routines_streak: 0,
        micro_breaks_streak: 0,
      };

      mockDailyStatsRepository.orm.find.mockResolvedValue(monthlyStats);
      mockDailyStatsRepository.getUserDailyStats.mockResolvedValue(monthlyStats);
      mockActivitySequenceService.getUserRoutineDailyDurations.mockResolvedValue({} as any);
      mockUserStreaksService.calculateStreaksForUser.mockReturnValue(mockStreaks as any);

      // Act
      const result = await service.calculateMonthlyProgress(user, monthStart);

      // Assert - When completion rate is low, created should be higher than completed
      expect(result.tasks.completed).toBe(3); // 1 + 0 + 1 + 0 + 1
      expect(result.tasks.completion_rate).toBe(0.6); // 3/5 = 0.6
      expect(result.tasks.created).toBe(5); // Math.round(3 / 0.6) = 5
      expect(result.tasks.created).toBeGreaterThan(result.tasks.completed);
    });

    it('should handle edge case with zero monthly stats', async () => {
      // Arrange
      const user = createMockUser();
      const monthStart = new Date('2025-08-01');

      mockDailyStatsRepository.orm.find.mockResolvedValue([]); // No stats

      // Act
      const result = await service.calculateMonthlyProgress(user, monthStart);

      // Assert - Should handle empty data gracefully
      expect(result.routines).toEqual({
        morning: {
          completed: 0,
          total: 31,
          streak: 0,
        },
        evening: {
          completed: 0,
          total: 31,
          streak: 0,
        },
        micro_breaks: {
          completed: 0,
          total: 31,
          streak: 0,
        },
      });

      expect(result.focus_sessions).toEqual({
        total_minutes: 0,
        sessions_count: 0,
        longest_session: 0,
        streak: 0,
      });

      expect(result.tasks.completed).toBe(0);
      expect(result.tasks.completion_rate).toBe(0);
    });

    it('should handle leap year February correctly', async () => {
      // Arrange
      const user = createMockUser();
      const monthStart = new Date('2024-02-01'); // 2024 is a leap year

      const monthlyStats = [
        createMockDailyStats('2024-02-01', {
          morning_routine_completion_percentage: 100,
        }),
      ];

      const mockStreaks = {
        focus_modes_streak: 1,
        morning_routines_streak: 1,
        evening_routines_streak: 0,
        micro_breaks_streak: 0,
      };

      mockDailyStatsRepository.orm.find.mockResolvedValue(monthlyStats);
      mockDailyStatsRepository.getUserDailyStats.mockResolvedValue(monthlyStats);
      mockActivitySequenceService.getUserRoutineDailyDurations.mockResolvedValue({} as any);
      mockUserStreaksService.calculateStreaksForUser.mockReturnValue(mockStreaks as any);

      // Act
      const result = await service.calculateMonthlyProgress(user, monthStart);

      // Assert - February 2024 should have 29 days
      expect(result.routines.morning.total).toBe(29);
      expect(result.routines.evening.total).toBe(29);
      expect(result.routines.micro_breaks.total).toBe(29);
    });
  });
});
