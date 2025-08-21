import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { SendGridService } from '@app/send-grid';
import { Auth0ManagementService } from '@app/auth0';
import { I18nService } from 'nestjs-i18n';
import { StudyParticipantService } from './study-participant.service';
import { StudyParticipant, AppActivationStatus } from '../../entities/study-participant.entity';
import { User } from '../../entities/user.entity';
import { FlankerTestService } from '../flanker-test/flanker-test.service';
import { StudyGroup } from '../../domain/study-groups.enum';
import { AddParticipantDetailsDto, LinkUserToParticipantCodeDto } from '../../dto/study-participant';

describe('StudyParticipantService', () => {
  let service: StudyParticipantService;

  const mockStudyParticipantRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOneBy: jest.fn(),
  };

  const mockSendGridService = {
    sendEmail: jest.fn(),
  };

  const mockAuth0ManagementService = {
    getAuth0User: jest.fn(),
  };

  const mockFlankerTestService = {
    saveFlankerTestResult: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudyParticipantService,
        {
          provide: getRepositoryToken(StudyParticipant),
          useValue: mockStudyParticipantRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: SendGridService,
          useValue: mockSendGridService,
        },
        {
          provide: Auth0ManagementService,
          useValue: mockAuth0ManagementService,
        },
        {
          provide: FlankerTestService,
          useValue: mockFlankerTestService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<StudyParticipantService>(StudyParticipantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignParticipantToGroup', () => {
    it('should assign participant to group with lowest count for matching characteristics', async () => {
      const dto: AddParticipantDetailsDto = {
        name: 'Test User',
        email: 'test@catolica.edu.sv',
        phoneNumber: '1234567890',
        whatsappConsent: true,
        metadata: {
          mobileOS: 'iOS',
          yearLevel: '2',
          faculty: 'engineering',
        },
      };

      // Mock repository responses for group counts (difference <= 10)
      mockStudyParticipantRepository.count
        .mockResolvedValueOnce(20) // Group 1 total
        .mockResolvedValueOnce(15) // Group 2 total
        .mockResolvedValueOnce(10); // Group 3 total

      // Mock characteristic-based counts
      mockStudyParticipantRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest
          .fn()
          .mockResolvedValueOnce(2) // Group 1 characteristic count
          .mockResolvedValueOnce(1) // Group 2 characteristic count
          .mockResolvedValueOnce(3), // Group 3 characteristic count
      });

      const result = await (service as any).assignParticipantToGroup(dto);

      expect(result).toBe(StudyGroup.GROUP_2);
      expect(mockStudyParticipantRepository.count).toHaveBeenCalledTimes(3);
      expect(mockStudyParticipantRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should assign to group with lowest overall count when groups are balanced', async () => {
      const dto: AddParticipantDetailsDto = {
        name: 'Test User',
        email: 'test@catolica.edu.sv',
        phoneNumber: '1234567890',
        whatsappConsent: true,
        metadata: {
          mobileOS: 'iOS',
          yearLevel: '2',
          faculty: 'engineering',
        },
      };

      // Mock balanced groups (difference <= 10)
      mockStudyParticipantRepository.count
        .mockResolvedValueOnce(30) // Group 1 total
        .mockResolvedValueOnce(25) // Group 2 total
        .mockResolvedValueOnce(21); // Group 3 total

      // Mock characteristic-based counts
      mockStudyParticipantRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest
          .fn()
          .mockResolvedValueOnce(5) // Group 1
          .mockResolvedValueOnce(7) // Group 2
          .mockResolvedValueOnce(2), // Group 3
      });

      const result = await (service as any).assignParticipantToGroup(dto);

      expect(result).toBe(StudyGroup.GROUP_3);
    });

    it('should throw error if required metadata fields are missing', async () => {
      const dto: AddParticipantDetailsDto = {
        name: 'Test User',
        email: 'test@catolica.edu.sv',
        phoneNumber: '1234567890',
        whatsappConsent: true,
        metadata: {
          mobileOS: 'iOS',
          // Missing yearLevel and faculty
        },
      };

      await expect((service as any).assignParticipantToGroup(dto)).rejects.toThrow(
        'Mobile operating system, year level, and faculty of enrollment are required in metadata',
      );
    });

    it('should throw error if metadata is completely missing', async () => {
      const dto: AddParticipantDetailsDto = {
        name: 'Test User',
        email: 'test@catolica.edu.sv',
        phoneNumber: '1234567890',
        whatsappConsent: true,
        metadata: undefined,
      };

      await expect((service as any).assignParticipantToGroup(dto)).rejects.toThrow(
        'Mobile operating system, year level, and faculty of enrollment are required in metadata',
      );
    });
  });

  describe('addParticipantDetails', () => {
    const validDto: AddParticipantDetailsDto = {
      name: 'Test User',
      email: 'test@catolica.edu.sv',
      phoneNumber: '1234567890',
      whatsappConsent: true,
      metadata: {
        mobileOS: 'iOS',
        yearLevel: '2',
        faculty: 'engineering',
      },
    };

    it('should successfully add participant with valid data', async () => {
      mockStudyParticipantRepository.find.mockResolvedValue([]);
      mockStudyParticipantRepository.save.mockResolvedValue({} as StudyParticipant);
      // Mock group assignment logic
      mockStudyParticipantRepository.count
        .mockResolvedValueOnce(10) // Group 1 total
        .mockResolvedValueOnce(15) // Group 2 total
        .mockResolvedValueOnce(20); // Group 3 total
      mockStudyParticipantRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      });
      // NOTE: Email sending temporarily disabled (issue #1274) — rely on WhatsApp for now.
      // mockSendGridService.sendEmail.mockResolvedValue(undefined);
      mockI18nService.translate.mockResolvedValue('Test subject');
      mockI18nService.translate.mockResolvedValue('Test body');

      await service.addParticipantDetails(validDto);

      expect(mockStudyParticipantRepository.find).toHaveBeenCalled();
      expect(mockStudyParticipantRepository.save).toHaveBeenCalled();
      // NOTE: Email sending temporarily disabled (issue #1274) — rely on WhatsApp for now.
      // expect(mockSendGridService.sendEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const existingParticipant = { email: validDto.email, participantCode: 'existing123' } as StudyParticipant;
      mockStudyParticipantRepository.find.mockResolvedValue([existingParticipant]);

      await expect(service.addParticipantDetails(validDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid email domain', async () => {
      const invalidDto = { ...validDto, email: 'test@invalid.com' };

      await expect(service.addParticipantDetails(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should accept focusbear.io emails for testing', async () => {
      const focusbearDto = { ...validDto, email: 'test@focusbear.io' };
      mockStudyParticipantRepository.find.mockResolvedValue([]);
      mockStudyParticipantRepository.save.mockResolvedValue({} as StudyParticipant);
      // Mock group assignment logic
      mockStudyParticipantRepository.count
        .mockResolvedValueOnce(10) // Group 1 total
        .mockResolvedValueOnce(15) // Group 2 total
        .mockResolvedValueOnce(20); // Group 3 total
      mockStudyParticipantRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      });
      mockSendGridService.sendEmail.mockResolvedValue(undefined);
      mockI18nService.translate.mockResolvedValue('Test subject');
      mockI18nService.translate.mockResolvedValue('Test body');

      await service.addParticipantDetails(focusbearDto);

      expect(mockStudyParticipantRepository.save).toHaveBeenCalled();
    });

    it('should extract participant code from focusbear.io email', async () => {
      const focusbearDto = { ...validDto, email: 'internaltest+unicaes_ABC123@focusbear.io' };
      mockStudyParticipantRepository.find.mockResolvedValue([]);
      mockStudyParticipantRepository.save.mockResolvedValue({} as StudyParticipant);
      // Mock group assignment logic
      mockStudyParticipantRepository.count
        .mockResolvedValueOnce(10) // Group 1 total
        .mockResolvedValueOnce(15) // Group 2 total
        .mockResolvedValueOnce(20); // Group 3 total
      mockStudyParticipantRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      });
      // NOTE: Email sending temporarily disabled (issue #1274) — rely on WhatsApp for now.
      // mockSendGridService.sendEmail.mockResolvedValue(undefined);
      mockI18nService.translate.mockResolvedValue('Test subject');
      mockI18nService.translate.mockResolvedValue('Test body');

      await service.addParticipantDetails(focusbearDto);

      expect(mockStudyParticipantRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          participantCode: 'ABC123',
        }),
      );
    });
  });

  describe('verifyParticipantCode', () => {
    it('should return participant data for valid code', async () => {
      const mockParticipant = {
        email: 'test@catolica.edu.sv',
        userId: 'user123',
      };

      mockStudyParticipantRepository.findOne.mockResolvedValue(mockParticipant);

      const result = await service.verifyParticipantCode('ABC123');

      expect(result).toEqual({
        email: 'test@catolica.edu.sv',
        userId: 'user123',
      });
    });

    it('should throw NotFoundException for invalid code', async () => {
      mockStudyParticipantRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyParticipantCode('INVALID')).rejects.toThrow(NotFoundException);
    });

    it('should get email from Auth0 if userId exists but email is null', async () => {
      const mockParticipant = {
        email: null,
        userId: 'user123',
      };
      const mockUser = { auth0_id: 'auth0_123' };
      const mockAuth0User = { email: 'test@catolica.edu.sv' };

      mockStudyParticipantRepository.findOne.mockResolvedValue(mockParticipant);
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockAuth0ManagementService.getAuth0User.mockResolvedValue(mockAuth0User);

      const result = await service.verifyParticipantCode('ABC123');

      expect(result).toEqual({
        email: 'test@catolica.edu.sv',
        userId: 'user123',
      });
    });
  });

  describe('linkUserToParticipantCode', () => {
    const linkDto: LinkUserToParticipantCodeDto = {
      participantCode: 'ABC123',
    };

    it('should successfully link user to participant code', async () => {
      const mockParticipant = {
        participantCode: 'ABC123',
        userId: null,
        email: 'test@catolica.edu.sv',
      };
      const mockUser = { id: 'user123', auth0_id: 'auth0_123' };
      const mockAuth0User = { email: 'test@catolica.edu.sv' };

      mockStudyParticipantRepository.findOne.mockResolvedValue(mockParticipant);
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockAuth0ManagementService.getAuth0User.mockResolvedValue(mockAuth0User);
      mockStudyParticipantRepository.update.mockResolvedValue(undefined);

      const result = await service.linkUserToParticipantCode(linkDto, 'user123');

      expect(result).toEqual({ user_id: 'user123' });
      expect(mockStudyParticipantRepository.update).toHaveBeenCalledWith(
        { participantCode: 'ABC123' },
        { userId: 'user123', email: null },
      );
    });

    it('should throw NotFoundException for invalid participant code', async () => {
      mockStudyParticipantRepository.findOne.mockResolvedValue(null);

      await expect(service.linkUserToParticipantCode(linkDto, 'user123')).rejects.toThrow(NotFoundException);
    });

    it('should return existing link if already linked to same user', async () => {
      const mockParticipant = {
        participantCode: 'ABC123',
        userId: 'user123',
        email: 'test@catolica.edu.sv',
      };

      mockStudyParticipantRepository.findOne.mockResolvedValue(mockParticipant);

      const result = await service.linkUserToParticipantCode(linkDto, 'user123');

      expect(result).toEqual({ user_id: 'user123' });
    });

    it('should throw ConflictException if linked to different user', async () => {
      const mockParticipant = {
        participantCode: 'ABC123',
        userId: 'different_user',
        email: 'test@catolica.edu.sv',
      };

      mockStudyParticipantRepository.findOne.mockResolvedValue(mockParticipant);

      await expect(service.linkUserToParticipantCode(linkDto, 'user123')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if email mismatch', async () => {
      const mockParticipant = {
        participantCode: 'ABC123',
        userId: null,
        email: 'different@catolica.edu.sv',
      };
      const mockUser = { id: 'user123', auth0_id: 'auth0_123' };
      const mockAuth0User = { email: 'test@catolica.edu.sv' };

      mockStudyParticipantRepository.findOne.mockResolvedValue(mockParticipant);
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockAuth0ManagementService.getAuth0User.mockResolvedValue(mockAuth0User);

      await expect(service.linkUserToParticipantCode(linkDto, 'user123')).rejects.toThrow(ConflictException);
    });
  });

  describe('getCodeActivationStatus', () => {
    it('should return activation status for valid code', async () => {
      const mockParticipant = {
        appActivationStatus: AppActivationStatus.ALL_INTERVENTIONS_ACTIVE,
      };

      mockStudyParticipantRepository.findOne.mockResolvedValue(mockParticipant);

      const result = await service.getCodeActivationStatus('ABC123');

      expect(result).toBe(AppActivationStatus.ALL_INTERVENTIONS_ACTIVE);
    });

    it('should throw NotFoundException for invalid code', async () => {
      mockStudyParticipantRepository.findOne.mockResolvedValue(null);

      await expect(service.getCodeActivationStatus('INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getParticipantLastReceivedData', () => {
    it('should return last received data for valid user', async () => {
      const mockParticipant = {
        healthDataLastReceived: new Date('2023-01-01'),
        usageDataLastReceived: new Date('2023-01-02'),
      };

      mockStudyParticipantRepository.findOne.mockResolvedValue(mockParticipant);

      const result = await service.getParticipantLastReceivedData('user123');

      expect(result).toEqual({
        healthDataLastReceived: new Date('2023-01-01'),
        usageDataLastReceived: new Date('2023-01-02'),
      });
    });

    it('should throw NotFoundException for invalid user', async () => {
      mockStudyParticipantRepository.findOne.mockResolvedValue(null);

      await expect(service.getParticipantLastReceivedData('invalid_user')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markCompleteQuestionnaire', () => {
    it('should mark questionnaire as completed', async () => {
      mockStudyParticipantRepository.update.mockResolvedValue(undefined);

      await service.markCompleteQuestionnaire('user123');

      expect(mockStudyParticipantRepository.update).toHaveBeenCalledWith(
        { userId: 'user123' },
        { isQuestionnaireCompleted: true },
      );
    });
  });

  describe('markEndOfStudyQuestionnaireCompleted', () => {
    it('should mark end of study questionnaire as completed', async () => {
      mockStudyParticipantRepository.update.mockResolvedValue(undefined);

      await service.markEndOfStudyQuestionnaireCompleted('user123');

      expect(mockStudyParticipantRepository.update).toHaveBeenCalledWith(
        { userId: 'user123' },
        { isEndOfStudyQuestionnaireCompleted: true },
      );
    });
  });

  describe('getGroupStatistics', () => {
    it('should return comprehensive group statistics', async () => {
      // Mock total count
      mockStudyParticipantRepository.count
        .mockResolvedValueOnce(100) // Total participants
        .mockResolvedValueOnce(35) // Group 1 count
        .mockResolvedValueOnce(33) // Group 2 count
        .mockResolvedValueOnce(32); // Group 3 count

      // Mock query builder for distributions
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { mobileOS: 'iOS', group: 'group_1', count: '15' },
          { mobileOS: 'Android', group: 'group_1', count: '20' },
          { yearLevel: '1', group: 'group_1', count: '10' },
          { yearLevel: '2', group: 'group_1', count: '25' },
          { faculty: 'engineering', group: 'group_1', count: '20' },
          { faculty: 'science', group: 'group_1', count: '15' },
        ]),
      };

      mockStudyParticipantRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getGroupStatistics();

      expect(result.totalParticipants).toBe(100);
      expect(result.groupCounts).toEqual({
        group_1: 35,
        group_2: 33,
        group_3: 32,
      });
      expect(result.groupDistributionByCharacteristics).toBeDefined();
      expect(mockStudyParticipantRepository.count).toHaveBeenCalledTimes(4);
      expect(mockStudyParticipantRepository.createQueryBuilder).toHaveBeenCalledTimes(3);
    });

    it('should handle empty database', async () => {
      mockStudyParticipantRepository.count.mockResolvedValue(0);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      mockStudyParticipantRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getGroupStatistics();

      expect(result.totalParticipants).toBe(0);
      expect(result.groupCounts).toEqual({
        group_1: 0,
        group_2: 0,
        group_3: 0,
      });
    });
  });
});
