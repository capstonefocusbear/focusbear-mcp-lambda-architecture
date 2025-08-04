import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SENTRY_TOKEN, SentryService } from '@ntegral/nestjs-sentry';
import { randomUUID } from 'crypto';
import { OperatingSystem } from '@api-server/shared/domain/operating-system.enum';
import { UserOnboardingService } from './user-onboarding.service';
import { UserOnboardingRepository } from '../../repositories/user-onboarding.repository';
import { UserRepository } from '../../repositories/user.repository';
import { UserOnboarding } from '../../entities/user-onboarding.entity';
import { SentryServiceMock, UserOnboardingRepositoryMock, UserRepositoryMock } from '../../../../../test/mocks';
import { mockDefaultOnboardingData, mockUpdateOnboardingProgressDto, userDummy } from '../../../../../test/dummies';

describe('UserOnboardingService', () => {
  let service: UserOnboardingService;
  const user_not_exists_user_id = randomUUID();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserOnboardingService,
        UserOnboardingRepository,
        UserRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(UserOnboardingRepository)
      .useValue(UserOnboardingRepositoryMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(SentryService)
      .useValue(SentryServiceMock)
      .compile();

    service = module.get<UserOnboardingService>(UserOnboardingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateOnboardingProgress', () => {
    it('negative: should throw NotFoundException when user does not exist', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue(null);

      await expect(
        service.updateOnboardingProgress({
          user_id: user_not_exists_user_id,
          onboarding: mockUpdateOnboardingProgressDto,
        }),
      ).rejects.toThrow(new NotFoundException(`User with id ${user_not_exists_user_id} does not exist.`));
      expect(UserRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: { id: user_not_exists_user_id },
        select: ['id'],
      });
      expect(UserOnboardingRepositoryMock.upsert).not.toHaveBeenCalled();
    });

    it('positive: should successfully update onboarding progress when user exists', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      UserOnboardingRepositoryMock.upsert.mockResolvedValue(undefined);
      SentryServiceMock.instance().captureEvent.mockResolvedValueOnce({
        message: 'Stripe ID not found',
        level: 'error',
        extra: {
          user_id: userDummy.id,
          onboarding: mockUpdateOnboardingProgressDto,
        },
      });
      SentryServiceMock.instance().addBreadcrumb.mockResolvedValueOnce({
        category: 'Service',
        level: 'debug',
        message: 'Registering new user in Stripe',
      });
      const result = await service.updateOnboardingProgress({
        user_id: userDummy.id,
        onboarding: mockUpdateOnboardingProgressDto,
      });

      expect(UserRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: { id: userDummy.id },
        select: ['id'],
      });
      expect(UserOnboardingRepositoryMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userDummy.id,
          onboarding: mockUpdateOnboardingProgressDto,
        }),
        ['user_id'],
      );
      expect(result).toEqual({
        success: true,
        message: 'Onboarding data saved successfully',
      });
    });
  });

  describe('getOnboardingProgress', () => {
    it('negative: should throw NotFoundException when user does not exist', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue(null);

      await expect(service.getOnboardingProgress({ user_id: user_not_exists_user_id })).rejects.toThrow(
        new NotFoundException(`User with id ${user_not_exists_user_id} does not exist.`),
      );
    });

    it('negative: should throw NotFoundException when no onboarding data found', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      UserOnboardingRepositoryMock.findByUserIdAndOs.mockResolvedValue(null);

      await expect(service.getOnboardingProgress({ user_id: userDummy.id })).rejects.toThrow(
        new NotFoundException(`No onboarding data found for user ID${userDummy.id} .`),
      );
      expect(UserOnboardingRepositoryMock.findByUserIdAndOs).toHaveBeenCalledWith(userDummy.id, undefined);
    });

    it('positive: should successfully return onboarding progress when data exists', async () => {
      const mockUserOnboarding = {
        id: randomUUID(),
        user_id: userDummy.id,
        onboarding: mockUpdateOnboardingProgressDto,
      };
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      UserOnboardingRepositoryMock.findByUserIdAndOs.mockResolvedValue(mockUserOnboarding);

      const result = await service.getOnboardingProgress({ user_id: userDummy.id });

      expect(UserOnboardingRepositoryMock.findByUserIdAndOs).toHaveBeenCalledWith(userDummy.id, undefined);
      expect(result).toEqual(mockUpdateOnboardingProgressDto);
    });

    it('positive: should successfully return onboarding progress when data exists with OS filter', async () => {
      const mockUserOnboarding = {
        id: randomUUID(),
        user_id: userDummy.id,
        onboarding: mockUpdateOnboardingProgressDto,
        os: OperatingSystem.Web,
      };
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      UserOnboardingRepositoryMock.findByUserIdAndOs.mockResolvedValue(mockUserOnboarding);

      const result = await service.getOnboardingProgress({ user_id: userDummy.id, os: OperatingSystem.Web });

      expect(UserOnboardingRepositoryMock.findByUserIdAndOs).toHaveBeenCalledWith(userDummy.id, OperatingSystem.Web);
      expect(result).toEqual(mockUpdateOnboardingProgressDto);
    });
  });

  describe('createOnboardingData', () => {
    const mockUserId = randomUUID();
    const mockPlatform = OperatingSystem.Web;

    it('positive: should successfully create default onboarding data', async () => {
      UserOnboardingRepositoryMock.upsert.mockResolvedValue(undefined);

      const result = await service.createOnboardingData(mockUserId, mockPlatform);

      expect(UserOnboardingRepositoryMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          onboarding: expect.objectContaining(mockDefaultOnboardingData),
          platform: mockPlatform,
        }),
        ['user_id'],
      );
      expect(result).toBeInstanceOf(UserOnboarding);
      expect(result.user_id).toBe(mockUserId);
    });

    it('positive: should create onboarding data with correct default values', async () => {
      UserOnboardingRepositoryMock.upsert.mockResolvedValue(undefined);

      const result = await service.createOnboardingData(mockUserId, mockPlatform);

      expect(result.onboarding).toEqual(mockDefaultOnboardingData);
      expect(result.platform).toEqual(mockPlatform);
    });
  });
});
