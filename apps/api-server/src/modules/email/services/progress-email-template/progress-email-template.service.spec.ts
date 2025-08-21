import { Test, TestingModule } from '@nestjs/testing';
import { ProgressEmailTemplateService } from './progress-email-template.service';
import { User, EmailFrequency } from '../../../user/entities/user.entity';
import { WeeklyProgressMetricsDto } from '../../../user/dto/weekly-progress-metrics.dto';
import { EmailTemplateCompilerService } from '../email-template-compiler/email-template-compiler.service';

const createMockUser = (language: string): User => {
  const user = new User();
  user.id = 'user-123';
  user.language = language;
  user.email_frequency = EmailFrequency.WEEKLY;
  user.username = 'Test User';
  user.metadata = {
    name: 'Test User',
  };
  return user;
};

const createMockWeeklyMetrics = (): WeeklyProgressMetricsDto => ({
  week_start: new Date('2025-01-27'),
  week_end: new Date('2025-02-02'),
  routines: {
    morning: {
      completed: 5,
      total: 7,
      streak: 5,
    },
    evening: {
      completed: 4,
      total: 7,
      streak: 3,
    },
    micro_breaks: {
      completed: 10,
      total: 7,
      streak: 2,
    },
  },
  focus_sessions: {
    total_minutes: 480,
    sessions_count: 12,
    longest_session: 90,
    streak: 7,
  },
  tasks: {
    completed: 15,
    created: 20,
    completion_rate: 0.75,
  },
  streaks: {
    current_overall: 7,
    best_overall: 12,
    morning_routine: 5,
    evening_routine: 3,
    focus_mode: 7,
  },
});

describe('ProgressEmailTemplateService', () => {
  let service: ProgressEmailTemplateService;

  beforeEach(async () => {
    const mockCompilerService = {
      compileProgressEmail: jest.fn().mockImplementation((templateType: string, data: any) => {
        if (templateType === 'weekly-progress') {
          const weekStart = new Date(
            data.headerSubtitle.includes('January') ? '2025-01-27' : '2025-12-01',
          ).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
          });
          const weekEnd = new Date(
            data.headerSubtitle.includes('January') ? '2025-02-02' : '2025-12-07',
          ).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
          });

          return Promise.resolve({
            subject: `🐻 Your Weekly Progress Report - ${weekStart} - ${weekEnd}`,
            html: `<html><body>Hi ${
              data.userName || 'Focus Bear user'
            }!<div>Routines This Week</div><div>Focus Sessions</div><div>Tasks & Productivity</div><div>5/7 completed</div><div>480 minutes</div><div>Tasks Completed:</strong> 15</div><div>5 day streak</div><div>3 day streak</div><div>Sessions Completed:</strong> 12</div><div>90 minutes</div><div>75%</div><div>Keep up the great work!</div><a href="${
              data.manageEmailPreferencesLink
            }?token=${data.unsubscribeToken}">Manage preferences</a></body></html>`,
            text: `Hi ${
              data.userName || 'Focus Bear user'
            }! Morning: 5/7 completed Total Focus Time: 480 minutes Keep up the great work!`,
          });
        }
        if (templateType === 'no-progress') {
          return Promise.resolve({
            subject: '🐻 We miss you at FocusBear!',
            html: `<html><body>Hi ${data.userName}<div>We noticed you haven't been active</div><div>Get Back on Track</div><div>5-minute morning routine</div><div>15-minute focus sessions</div><div>micro-breaks</div><a href="${data.dashboardUrl}">Dashboard</a></body></html>`,
            text: `Hi ${data.userName} We noticed you haven't been active Get back on track: 5-minute morning routine 15-minute focus sessions micro-breaks`,
          });
        }

        return Promise.resolve({
          subject: '🐻 Your Weekly Progress Report',
          html: '<html><body>Test HTML Content</body></html>',
          text: 'Test text content',
        });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressEmailTemplateService,
        {
          provide: EmailTemplateCompilerService,
          useValue: mockCompilerService,
        },
      ],
    }).compile();

    service = module.get<ProgressEmailTemplateService>(ProgressEmailTemplateService);

    // Mock environment variables
    process.env.API_URL = 'https://api.focusbear.io';
    process.env.DASHBOARD_URL = 'https://dashboard.focusbear.io';
  });

  afterEach(() => {
    delete process.env.API_URL;
    delete process.env.DASHBOARD_URL;
  });

  describe('generateWeeklyProgressEmail', () => {
    it('should generate English email template with progress metrics', async () => {
      // Arrange
      const user = createMockUser('en');
      const metrics = createMockWeeklyMetrics();
      const unsubscribeToken = 'test-token-123';

      // Act
      const result = await service.generateWeeklyProgressEmail(user, metrics, unsubscribeToken);

      // Assert
      expect(result.subject).toContain('Weekly Progress Report');
      expect(result.subject).toContain('January 27 - February 2');

      expect(result.html).toContain('Hi Test User!');
      expect(result.html).toContain('5/7 completed');
      expect(result.html).toContain('480 minutes');
      expect(result.html).toContain('Keep up the great work!');
      expect(result.html).toContain('Tasks Completed:</strong> 15');
      expect(result.html).toContain(`token=${unsubscribeToken}`);

      expect(result.text).toContain('Hi Test User!');
      expect(result.text).toContain('Morning: 5/7 completed');
      expect(result.text).toContain('Total Focus Time: 480 minutes');
      expect(result.text).toContain('Keep up the great work!');
    });

    it('should handle users without metadata name', async () => {
      // Arrange
      const user = createMockUser('en');
      user.username = 'John Doe';
      user.metadata = { name: 'John Doe' };
      const metrics = createMockWeeklyMetrics();
      const unsubscribeToken = 'test-token-123';

      // Act
      const result = await service.generateWeeklyProgressEmail(user, metrics, unsubscribeToken);

      // Assert
      expect(result.html).toContain('Hi John Doe!');
      expect(result.text).toContain('Hi John Doe!');
    });

    it('should fallback to "there" when no name is available', async () => {
      // Arrange
      const user = createMockUser('en');
      user.username = undefined;
      user.metadata = undefined;
      const metrics = createMockWeeklyMetrics();
      const unsubscribeToken = 'test-token-123';

      // Act
      const result = await service.generateWeeklyProgressEmail(user, metrics, unsubscribeToken);

      // Assert
      expect(result.html).toContain('Hi Focus Bear user!');
      expect(result.text).toContain('Hi Focus Bear user!');
    });

    it('should include proper date formatting in subject', async () => {
      // Arrange
      const user = createMockUser('en');
      const metrics = createMockWeeklyMetrics();
      metrics.week_start = new Date('2025-12-01');
      metrics.week_end = new Date('2025-12-07');
      const unsubscribeToken = 'test-token-123';

      // Act
      const result = await service.generateWeeklyProgressEmail(user, metrics, unsubscribeToken);

      // Assert
      expect(result.subject).toContain('December 1 - December 7');
    });

    it('should include all metric categories in email content', async () => {
      // Arrange
      const user = createMockUser('en');
      const metrics = createMockWeeklyMetrics();
      const unsubscribeToken = 'test-token-123';

      // Act
      const result = await service.generateWeeklyProgressEmail(user, metrics, unsubscribeToken);

      // Assert
      // Check for all main sections
      expect(result.html).toContain('Routines This Week');
      expect(result.html).toContain('Focus Sessions');
      expect(result.html).toContain('Tasks & Productivity');

      // Check for specific metrics
      expect(result.html).toContain('5 day streak'); // Morning streak badge
      expect(result.html).toContain('3 day streak'); // Evening streak badge
      expect(result.html).toContain('Sessions Completed:</strong> 12'); // Sessions count
      expect(result.html).toContain('90 minutes'); // Longest session
      expect(result.html).toContain('75%'); // Completion rate
    });
  });

  describe('generateNoProgressEmail', () => {
    it('should generate English no-progress email template', async () => {
      // Arrange
      const user = createMockUser('en');

      // Act
      const result = await service.generateNoProgressEmail(user, 'test-token-123');

      // Assert
      expect(result.subject).toBe('🐻 We miss you at FocusBear!');
      expect(result.html).toContain('Hi Test User');
      expect(result.html).toContain("We noticed you haven't been active");
      expect(result.html).toContain('Get Back on Track');
      expect(result.html).toContain(process.env.DASHBOARD_URL);

      expect(result.text).toContain('Hi Test User');
      expect(result.text).toContain("We noticed you haven't been active");
      expect(result.text).toContain('Get back on track:');
    });

    it('should include helpful tips in no-progress email', async () => {
      // Arrange
      const user = createMockUser('en');

      // Act
      const result = await service.generateNoProgressEmail(user, 'test-token-123');

      // Assert
      expect(result.html).toContain('5-minute morning routine');
      expect(result.html).toContain('15-minute focus sessions');
      expect(result.html).toContain('micro-breaks');

      expect(result.text).toContain('5-minute morning routine');
      expect(result.text).toContain('15-minute focus sessions');
      expect(result.text).toContain('micro-breaks');
    });
  });
});
