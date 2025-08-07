import { Test, TestingModule } from '@nestjs/testing';
import { SendGridService } from '@app/send-grid';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { EmailProcessor } from './email.processor';
import { ProgressEmailTemplateService } from './progress-email-template/progress-email-template.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';
import { WeeklyProgressMetricsDto } from '../../user/dto/weekly-progress-metrics.dto';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let sendGridMock: Partial<SendGridService>;
  let progressEmailTemplateServiceMock: Partial<ProgressEmailTemplateService>;
  let userRepositoryMock: Partial<UserRepository>;
  let sentryServiceMock: any;

  const mockUser: Partial<User> = {
    id: 'user-123',
    language: 'en',
    metadata: { name: 'Test User' },
  };

  const mockMetrics: WeeklyProgressMetricsDto = {
    week_start: new Date('2025-08-01'),
    week_end: new Date('2025-08-07'),
    routines: {
      morning: { completed: 5, total: 7, streak: 3 },
      evening: { completed: 4, total: 7, streak: 2 },
      micro_breaks: { completed: 12, total: 14, streak: 5 },
    },
    focus_sessions: {
      total_minutes: 120,
      sessions_count: 8,
      longest_session: 25,
      streak: 7,
    },
    tasks: {
      completed: 15,
      created: 20,
      completion_rate: 0.75,
    },
    streaks: {
      current_overall: 10,
      best_overall: 15,
      morning_routine: 3,
      evening_routine: 2,
      focus_mode: 5,
    },

  };

  beforeEach(async () => {
    sendGridMock = {
      sendEmail: jest.fn(),
    };

    progressEmailTemplateServiceMock = {
      generateWeeklyProgressEmail: jest.fn().mockResolvedValue({
        subject: 'Test Progress Email',
        html: '<html>Test HTML</html>',
        text: 'Test text content',
      }),
      generateNoProgressEmail: jest.fn().mockResolvedValue({
        subject: 'Test No Progress Email',
        html: '<html>No Progress HTML</html>',
        text: 'No progress text content',
      }),
      generateInactivityWarningEmail: jest.fn().mockResolvedValue({
        subject: 'Test Inactivity Warning',
        html: '<html>Warning HTML</html>',
        text: 'Warning text content',
      }),
    };

    userRepositoryMock = {
      orm: {
        findOneBy: jest.fn().mockResolvedValue(mockUser),
      } as any,
      update: jest.fn().mockResolvedValue(undefined),
    };

    sentryServiceMock = {
      instance: jest.fn().mockReturnValue({
        captureException: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        {
          provide: SendGridService,
          useValue: sendGridMock,
        },
        {
          provide: ProgressEmailTemplateService,
          useValue: progressEmailTemplateServiceMock,
        },
        {
          provide: UserRepository,
          useValue: userRepositoryMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: sentryServiceMock,
        },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
  });

  it('should call sendEmail when handling sendEmail jobs', async () => {
    const mockJobData = {
      to: 'zoho@desk.com',
      from: 'support@focusbear.io',
      replyTo: 'someuser@example.com',
      subject: 'User Unsubscribe Feedback',
      text: 'User ID: user-id-abc\n\nReason: Some reason...',
    };

    const mockJob = { data: mockJobData } as Job;

    await processor.handleSendEmail(mockJob);

    expect(sendGridMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(sendGridMock.sendEmail).toHaveBeenCalledWith(mockJobData);
  });

  it('should handle progress email jobs correctly', async () => {
    const mockJobData = {
      user: { ...mockUser, email: 'test@example.com' },
      metrics: mockMetrics,
      unsubscribe_token: 'test-token-123',
    };

    const mockJob = { id: 'job-123', data: mockJobData } as Job;

    // Setup mock to return user when looking for it
    userRepositoryMock.orm.findOne = jest.fn().mockResolvedValue(mockUser);

    const result = await processor.handleProgressEmail(mockJob);

    expect(progressEmailTemplateServiceMock.generateWeeklyProgressEmail).toHaveBeenCalledWith(
      mockJobData.user,
      mockJobData.metrics,
      mockJobData.unsubscribe_token
    );
    expect(sendGridMock.sendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      from: 'noreply@focusbear.io',
      subject: 'Test Progress Email',
      html: '<html>Test HTML</html>',
      text: 'Test text content',
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
    });
    expect(userRepositoryMock.update).toHaveBeenCalledWith('user-123', {
      metadata: { ...mockUser.metadata, last_email_sent: expect.any(Date) },
    });
    expect(result).toEqual({ success: true, userId: 'user-123' });
  });

  it('should handle no progress email jobs correctly', async () => {
    const mockJobData = {
      user: { ...mockUser, email: 'test@example.com' },
    };

    const mockJob = { id: 'job-456', data: mockJobData } as Job;

    // Setup mock to return user when looking for it
    userRepositoryMock.orm.findOne = jest.fn().mockResolvedValue(mockUser);

    const result = await processor.handleNoProgressEmail(mockJob);

    expect(progressEmailTemplateServiceMock.generateNoProgressEmail).toHaveBeenCalledWith(
      mockJobData.user
    );
    expect(sendGridMock.sendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      from: 'noreply@focusbear.io',
      subject: 'Test No Progress Email',
      html: '<html>No Progress HTML</html>',
      text: 'No progress text content',
    });
    expect(userRepositoryMock.update).toHaveBeenCalledWith('user-123', {
      metadata: { ...mockUser.metadata, last_email_sent: expect.any(Date) },
    });
    expect(result).toEqual({ success: true, userId: 'user-123' });
  });

  it('should handle inactivity warning email jobs correctly', async () => {
    const mockJobData = {
      user: { ...mockUser, email: 'test@example.com' },
      warningType: 'account_deletion',
      daysUntilDeletion: 30,
    };

    const mockJob = { id: 'job-789', data: mockJobData } as Job;

    // Setup mock to return user when looking for it
    userRepositoryMock.orm.findOne = jest.fn().mockResolvedValue(mockUser);

    const result = await processor.handleInactivityWarningEmail(mockJob);

    expect(progressEmailTemplateServiceMock.generateInactivityWarningEmail).toHaveBeenCalledWith(
      mockJobData.user,
      'account_deletion',
      30
    );
    expect(sendGridMock.sendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      from: 'noreply@focusbear.io',
      subject: 'Test Inactivity Warning',
      html: '<html>Warning HTML</html>',
      text: 'Warning text content',
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
    });
    expect(userRepositoryMock.update).toHaveBeenCalledWith('user-123', {
      metadata: { ...mockUser.metadata, last_email_sent: expect.any(Date) },
    });
    expect(result).toEqual({ success: true, userId: 'user-123' });
  });

  it('should handle enhanced progress email jobs correctly', async () => {
    const mockJobData = {
      user: { ...mockUser, email: 'test@example.com' },
      metrics: mockMetrics,
      unsubscribe_token: 'test-token-456',
      emailType: 'inactive_user_progress',
    };

    const mockJob = { id: 'job-enhanced', data: mockJobData } as Job;

    // Setup mock to return user when looking for it
    userRepositoryMock.orm.findOne = jest.fn().mockResolvedValue(mockUser);

    const result = await processor.handleEnhancedProgressEmail(mockJob);

    expect(progressEmailTemplateServiceMock.generateWeeklyProgressEmail).toHaveBeenCalledWith(
      mockJobData.user,
      mockJobData.metrics,
      mockJobData.unsubscribe_token,
      'inactive_user_progress'
    );
    expect(sendGridMock.sendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      from: 'noreply@focusbear.io',
      subject: 'Test Progress Email',
      html: '<html>Test HTML</html>',
      text: 'Test text content',
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
    });
    expect(userRepositoryMock.update).toHaveBeenCalledWith('user-123', {
      metadata: { ...mockUser.metadata, last_email_sent: expect.any(Date) },
    });
    expect(result).toEqual({ success: true, userId: 'user-123' });
  });

  it('should handle errors and log to Sentry', async () => {
    const mockJobData = {
      user: { ...mockUser, email: 'test@example.com' },
      metrics: mockMetrics,
      unsubscribe_token: 'test-token-123',
    };

    const mockJob = { id: 'job-error', data: mockJobData } as Job;
    const testError = new Error('SendGrid failed');

    // Mock SendGrid to throw an error
    (sendGridMock.sendEmail as jest.Mock).mockRejectedValue(testError);

    await expect(processor.handleProgressEmail(mockJob)).rejects.toThrow('SendGrid failed');

    expect(sentryServiceMock.instance().captureException).toHaveBeenCalledWith(testError, {
      extra: {
        jobId: 'job-error',
        userId: 'user-123',
        operation: 'handleProgressEmail',
      },
    });
  });
});
