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
  stats.focus_modes_completed = overrides.focus_modes_completed || Math.floor(Math.random() * 5) + 1;
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
});
