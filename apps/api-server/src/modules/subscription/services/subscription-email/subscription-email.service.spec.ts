import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { SubscriptionEmailService } from './subscription-email.service';
import { UserRepository } from '../../../user/repositories/user.repository';
import { EmailTemplateCompilerService } from '../../../email/services/email-template-compiler/email-template-compiler.service';
import { EmailFrequency } from '../../../user/entities/user.entity';

const mockQueue = {
  add: jest.fn(),
};

const mockUserRepository = {
  orm: {
    findOne: jest.fn(),
  },
};

const mockEmailTemplateCompilerService = {
  compileEmailByPath: jest.fn(),
};

const mockAuth0ManagementService = {
  getAuth0User: jest.fn(),
};

describe('SubscriptionEmailService', () => {
  let service: SubscriptionEmailService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionEmailService,
        {
          provide: getQueueToken('emailQueue'),
          useValue: mockQueue,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: EmailTemplateCompilerService,
          useValue: mockEmailTemplateCompilerService,
        },
        {
          provide: 'Auth0ManagementService',
          useValue: mockAuth0ManagementService,
        },
      ],
    })
      .overrideProvider('Auth0ManagementService')
      .useValue(mockAuth0ManagementService)
      .compile();

    service = module.get<SubscriptionEmailService>(SubscriptionEmailService);
    // Inject auth0 service directly since it uses a custom provider key
    (service as any).auth0ManagementService = mockAuth0ManagementService;
  });

  describe('sendThankYouEmail', () => {
    const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const mockUser = {
      id: userId,
      auth0_id: 'auth0|123',
      username: 'TestUser',
      email_frequency: EmailFrequency.WEEKLY,
    };
    const mockCompiledEmail = {
      subject: '🐻 Thank you for subscribing to Focus Bear!',
      html: '<html><body>Thank you!</body></html>',
      text: 'Thank you for subscribing!',
    };

    it('should enqueue a thank-you email when user is found and has email', async () => {
      mockUserRepository.orm.findOne.mockResolvedValue(mockUser);
      mockAuth0ManagementService.getAuth0User.mockResolvedValue({ email: 'user@example.com' });
      mockEmailTemplateCompilerService.compileEmailByPath.mockResolvedValue(mockCompiledEmail);

      await service.sendThankYouEmail(userId);

      expect(mockUserRepository.orm.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        select: ['id', 'auth0_id', 'username', 'email_frequency'],
      });
      expect(mockAuth0ManagementService.getAuth0User).toHaveBeenCalledWith('auth0|123');
      expect(mockEmailTemplateCompilerService.compileEmailByPath).toHaveBeenCalledWith(
        'subscription/thank-you',
        expect.objectContaining({ userName: 'TestUser' }),
        expect.objectContaining({ subject: '🐻 Thank you for subscribing to Focus Bear!' }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'sendEmail',
        expect.objectContaining({
          to: 'user@example.com',
          subject: mockCompiledEmail.subject,
          html: mockCompiledEmail.html,
          text: mockCompiledEmail.text,
        }),
        expect.any(Object),
      );
    });

    it('should skip when userId is not a valid UUID', async () => {
      await service.sendThankYouEmail('not-a-uuid');

      expect(mockUserRepository.orm.findOne).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should skip when user is not found', async () => {
      mockUserRepository.orm.findOne.mockResolvedValue(null);

      await service.sendThankYouEmail(userId);

      expect(mockAuth0ManagementService.getAuth0User).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should skip when user is unsubscribed', async () => {
      mockUserRepository.orm.findOne.mockResolvedValue({
        ...mockUser,
        email_frequency: EmailFrequency.UNSUBSCRIBED,
      });

      await service.sendThankYouEmail(userId);

      expect(mockAuth0ManagementService.getAuth0User).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should skip when user has no email in Auth0', async () => {
      mockUserRepository.orm.findOne.mockResolvedValue(mockUser);
      mockAuth0ManagementService.getAuth0User.mockResolvedValue({ email: null });

      await service.sendThankYouEmail(userId);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should skip internal test email accounts', async () => {
      mockUserRepository.orm.findOne.mockResolvedValue(mockUser);
      mockAuth0ManagementService.getAuth0User.mockResolvedValue({ email: 'test@focusbear.io' });

      await service.sendThankYouEmail(userId);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should use "Friend" as username fallback when user has no username', async () => {
      mockUserRepository.orm.findOne.mockResolvedValue({ ...mockUser, username: null });
      mockAuth0ManagementService.getAuth0User.mockResolvedValue({ email: 'user@example.com' });
      mockEmailTemplateCompilerService.compileEmailByPath.mockResolvedValue(mockCompiledEmail);

      await service.sendThankYouEmail(userId);

      expect(mockEmailTemplateCompilerService.compileEmailByPath).toHaveBeenCalledWith(
        'subscription/thank-you',
        expect.objectContaining({ userName: 'Friend' }),
        expect.any(Object),
      );
    });

    it('should not throw when Auth0 lookup fails', async () => {
      mockUserRepository.orm.findOne.mockResolvedValue(mockUser);
      mockAuth0ManagementService.getAuth0User.mockRejectedValue(new Error('Auth0 down'));

      await expect(service.sendThankYouEmail(userId)).resolves.not.toThrow();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });
});
