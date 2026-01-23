import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getQueueToken } from '@nestjs/bull';
import { SENTRY_TOKEN } from '@app/observability';
import { SendGridService } from '@app/send-grid';
import { DataSource } from 'typeorm';
import { UserEmailPreferencesService } from './user-email-preferences.service';
import { UserRepository } from '../../repositories/user.repository';
import { User, EmailFrequency } from '../../entities/user.entity';
import { UpdateEmailPreferencesDto } from '../../dto/update-email-preferences.dto';
import { UnsubscribeEmailDto } from '../../dto/unsubscribe-email.dto';

describe('UserEmailPreferencesService', () => {
  let service: UserEmailPreferencesService;

  const createMockUser = (id: string, emailFrequency: EmailFrequency): User => {
    const user = new User();
    user.id = id;
    user.email_frequency = emailFrequency;
    user.metadata = {
      name: 'Test User',
      email_preferences: {
        include_shareable_content: true,
      },
    };
    return user;
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    updateEmailFrequency: jest.fn(),
    update: jest.fn(),
    orm: {
      findOne: jest.fn(),
      find: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  const mockSentryInstance = {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
  };

  const mockSentryService = {
    instance: () => mockSentryInstance,
  };

  const mockSendGridService = {
    sendEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserEmailPreferencesService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: SendGridService,
          useValue: mockSendGridService,
        },
        {
          provide: getQueueToken('emailQueue'),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: SENTRY_TOKEN,
          useValue: mockSentryService,
        },
      ],
    }).compile();

    service = module.get<UserEmailPreferencesService>(UserEmailPreferencesService);

    // Set up transaction mock
    mockDataSource.transaction.mockImplementation(async (callback) => {
      const mockManager = {
        getRepository: jest.fn().mockReturnValue({
          findOne: mockUserRepository.findOne,
          update: mockUserRepository.update,
        }),
        withRepository: jest.fn().mockReturnThis(),
        findOne: mockUserRepository.findOne,
        updateEmailFrequency: mockUserRepository.updateEmailFrequency,
        update: mockUserRepository.update,
      };
      return callback(mockManager);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEmailPreferences', () => {
    it('should return email preferences for existing user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = createMockUser(userId, EmailFrequency.WEEKLY);
      mockUserRepository.orm.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-token');

      // Act
      const result = await service.getEmailPreferences(userId);

      // Assert
      expect(result).toEqual({
        email_frequency: EmailFrequency.WEEKLY,
        last_email_sent: null,
        unsubscribe_token: 'mock-token',
      });
      expect(mockUserRepository.orm.findOne).toHaveBeenCalledWith({ where: { id: userId } });
    });

    it('should throw BadRequestException for non-existent user', async () => {
      // Arrange
      const userId = 'non-existent';
      mockUserRepository.orm.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getEmailPreferences(userId)).rejects.toThrow(BadRequestException);
      expect(mockUserRepository.orm.findOne).toHaveBeenCalledWith({ where: { id: userId } });
    });

    it('should handle users with existing email preferences in metadata', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = createMockUser(userId, EmailFrequency.DAILY);
      mockUser.metadata = {
        name: 'Test User',
        last_email_sent: new Date('2025-08-01'),
        email_preferences: {},
      };
      mockUserRepository.orm.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-token');

      // Act
      const result = await service.getEmailPreferences(userId);

      // Assert
      expect(result).toEqual({
        email_frequency: EmailFrequency.DAILY,
        last_email_sent: mockUser.metadata.last_email_sent,
        unsubscribe_token: 'mock-token',
      });
    });
  });

  describe('updateEmailPreferences', () => {
    it('should update email frequency successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = createMockUser(userId, EmailFrequency.WEEKLY);
      const dto: UpdateEmailPreferencesDto = {
        email_frequency: EmailFrequency.MONTHLY,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      jest.spyOn(service, 'getEmailPreferences').mockResolvedValue({
        email_frequency: EmailFrequency.MONTHLY,
        last_email_sent: null,
        unsubscribe_token: 'mock-token',
      });

      // Act
      const result = await service.updateEmailPreferences(userId, dto);

      // Assert
      expect(result.email_frequency).toBe(EmailFrequency.MONTHLY);
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should update email preferences in metadata', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = createMockUser(userId, EmailFrequency.WEEKLY);
      const dto: UpdateEmailPreferencesDto = {
        email_frequency: EmailFrequency.MONTHLY,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      jest.spyOn(service, 'getEmailPreferences').mockResolvedValue({
        email_frequency: EmailFrequency.WEEKLY,
        last_email_sent: null,
        unsubscribe_token: 'mock-token',
      });

      // Act
      await service.updateEmailPreferences(userId, dto);

      // Assert
      const transactionCallback = (mockDataSource.transaction as jest.Mock).mock.calls[0][0];
      const mockManager = {
        getRepository: jest.fn().mockReturnValue({
          findOne: mockUserRepository.findOne,
          update: mockUserRepository.update,
        }),
        withRepository: jest.fn().mockReturnThis(),
        findOne: mockUserRepository.findOne,
        update: mockUserRepository.update,
        updateEmailFrequency: mockUserRepository.updateEmailFrequency,
      };
      await transactionCallback(mockManager);

      expect(mockUserRepository.updateEmailFrequency).toHaveBeenCalledWith(userId, dto.email_frequency);
    });
  });

  describe('unsubscribeFromEmails', () => {
    it('should unsubscribe user with valid token', async () => {
      // Arrange
      const userId = 'user-123';
      const token = 'valid-token';
      const dto: UnsubscribeEmailDto = { token };

      mockJwtService.verify.mockReturnValue({ userId, purpose: 'unsubscribe' });
      mockUserRepository.updateEmailFrequency.mockResolvedValue(undefined);

      // Act
      await service.unsubscribeFromEmails(dto);

      // Assert
      expect(mockJwtService.verify).toHaveBeenCalledWith(token);
      expect(mockUserRepository.updateEmailFrequency).toHaveBeenCalledWith(userId, EmailFrequency.UNSUBSCRIBED);
    });

    it('should unsubscribe user with direct user_id', async () => {
      // Arrange
      const userId = 'user-123';
      const dto: UnsubscribeEmailDto = { user_id: userId };

      mockUserRepository.updateEmailFrequency.mockResolvedValue(undefined);

      // Act
      await service.unsubscribeFromEmails(dto);

      // Assert
      expect(mockUserRepository.updateEmailFrequency).toHaveBeenCalledWith(userId, EmailFrequency.UNSUBSCRIBED);
    });

    it('should throw BadRequestException for invalid token purpose', async () => {
      // Arrange
      const token = 'invalid-token';
      const dto: UnsubscribeEmailDto = { token };

      mockJwtService.verify.mockReturnValue({ userId: 'user-123', purpose: 'different' });

      // Act & Assert
      await expect(service.unsubscribeFromEmails(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when neither token nor user_id provided', async () => {
      // Arrange
      const dto: UnsubscribeEmailDto = {};

      // Act & Assert
      await expect(service.unsubscribeFromEmails(dto)).rejects.toThrow(BadRequestException);
    });

    it('should log unsubscribe reason to Sentry', async () => {
      // Arrange
      const userId = 'user-123';
      const dto: UnsubscribeEmailDto = {
        user_id: userId,
        reason: 'Too many emails',
      };

      mockUserRepository.updateEmailFrequency.mockResolvedValue(undefined);

      // Act
      await service.unsubscribeFromEmails(dto);

      // Assert
      expect(mockSentryInstance.captureMessage).toHaveBeenCalledWith('User unsubscribed from emails', {
        level: 'info',
        extra: { userId, reason: dto.reason },
        tags: { email_action: 'unsubscribe' },
      });
    });
  });
});
