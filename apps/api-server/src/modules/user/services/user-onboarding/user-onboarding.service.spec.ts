import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SENTRY_TOKEN, SentryService } from '@ntegral/nestjs-sentry';
import { randomUUID } from 'crypto';
import { UserOnboardingService } from './user-onboarding.service';
import { UserOnboardingRepository } from '../../repositories/user-onboarding.repository';
import { UserRepository } from '../../repositories/user.repository';
import { UserOnboarding } from '../../entities/user-onboarding.entity';
import { UpdateOnboardingProgressDto } from '../../dto/onboarding/update-onboarding-progress.dto';
import { OnboardingDto } from '../../dto/onboarding';
import { OnboardFlowStep } from '../../domain/onboarding/onboarding-flow-step.enum';
import { OnboardFlowFeature } from '../../domain/onboarding/onboarding-flow-feature.enum';
import { RoutineType } from '../../domain/routine-type.enum';
import { BearsonaProfile } from '../../domain/onboarding/bearsona-profile.enum';
import { OnboardFlowTimeUI } from '../../domain/onboarding/onboarding-flow-time-ui.enum';
import { SentryServiceMock, UserOnboardingRepositoryMock, UserRepositoryMock } from '../../../../../test/mocks';

describe('UserOnboardingService', () => {
  let service: UserOnboardingService;

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
    const mockUserId = randomUUID();
    const mockOnboardingDto: OnboardingDto = {
      currentStep: OnboardFlowStep.DATA_PRIVACY,
      features: [OnboardFlowFeature.BUILD_HEALTHY_HABITS],
      routines: [RoutineType.MORNING_ROUTINE],
      profile: { name: BearsonaProfile.OG, useProfileLang: true },
      activities: { morning_activities: [], evening_activities: [] },
      selectedGoals: [],
      times: {
        [OnboardFlowTimeUI.WAKE_UP]: '06:00',
        [OnboardFlowTimeUI.START_STUDY]: '08:00',
        [OnboardFlowTimeUI.FINISH_STUDY]: '17:30',
        [OnboardFlowTimeUI.GO_TO_SLEEP]: '21:00',
      },
      currentTimeUI: OnboardFlowTimeUI.WAKE_UP,
      break_after_minutes: 20,
      skippedSteps: [],
    };

    const mockUpdateDto: UpdateOnboardingProgressDto = {
      user_id: mockUserId,
      onboarding: mockOnboardingDto,
    };

    it('should successfully update onboarding progress when user exists', async () => {
      const mockUser = { id: mockUserId };
      UserRepositoryMock.orm.findOne.mockResolvedValue(mockUser as any);
      UserOnboardingRepositoryMock.upsert.mockResolvedValue(undefined);

      const result = await service.updateOnboardingProgress(mockUpdateDto);

      expect(UserRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: ['id'],
      });
      expect(UserOnboardingRepositoryMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          onboarding: mockOnboardingDto,
        }),
        ['user_id'],
      );
      expect(result).toEqual({
        success: true,
        message: 'Onboarding data saved successfully',
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue(null);

      await expect(service.updateOnboardingProgress(mockUpdateDto)).rejects.toThrow(
        new NotFoundException(`User with id ${mockUserId} does not exist.`),
      );
      expect(UserRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: ['id'],
      });
      expect(UserOnboardingRepositoryMock.upsert).not.toHaveBeenCalled();
    });

    it('should handle database errors and capture exception', async () => {
      const mockError = new Error('Database connection failed');
      UserRepositoryMock.orm.findOne.mockRejectedValue(mockError);

      await expect(service.updateOnboardingProgress(mockUpdateDto)).rejects.toThrow(mockError);
    });
  });

  describe('getOnboardingProgress', () => {
    const mockUserId = randomUUID();
    const mockOnboardingData: OnboardingDto = {
      currentStep: OnboardFlowStep.FEATURE_SELECTION,
      features: [OnboardFlowFeature.BUILD_HEALTHY_HABITS],
      routines: [RoutineType.MORNING_ROUTINE],
      profile: { name: BearsonaProfile.OG, useProfileLang: true },
      activities: { morning_activities: [], evening_activities: [] },
      selectedGoals: [],
      times: {
        [OnboardFlowTimeUI.WAKE_UP]: '06:00',
        [OnboardFlowTimeUI.START_STUDY]: '08:00',
        [OnboardFlowTimeUI.FINISH_STUDY]: '17:30',
        [OnboardFlowTimeUI.GO_TO_SLEEP]: '21:00',
      },
      currentTimeUI: OnboardFlowTimeUI.WAKE_UP,
      break_after_minutes: 20,
      skippedSteps: [],
    };

    it('should successfully return onboarding progress when data exists', async () => {
      const mockUserOnboarding = {
        id: randomUUID(),
        user_id: mockUserId,
        onboarding: mockOnboardingData,
      } as UserOnboarding;
      UserOnboardingRepositoryMock.findByUserId.mockResolvedValue(mockUserOnboarding);

      const result = await service.getOnboardingProgress(mockUserId);

      expect(UserOnboardingRepositoryMock.findByUserId).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockOnboardingData);
    });

    it('should throw NotFoundException when no onboarding data found', async () => {
      UserOnboardingRepositoryMock.findByUserId.mockResolvedValue(null);

      await expect(service.getOnboardingProgress(mockUserId)).rejects.toThrow(
        new NotFoundException(`No onboarding data found for user ID ${mockUserId}.`),
      );
      expect(UserOnboardingRepositoryMock.findByUserId).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle database errors and capture exception', async () => {
      const mockError = new Error('Database query failed');
      UserOnboardingRepositoryMock.findByUserId.mockRejectedValue(mockError);

      await expect(service.getOnboardingProgress(mockUserId)).rejects.toThrow(mockError);
    });
  });

  describe('createOnboardingData', () => {
    const mockUserId = randomUUID();

    it('should successfully create default onboarding data', async () => {
      UserOnboardingRepositoryMock.upsert.mockResolvedValue(undefined);

      const result = await service.createOnboardingData(mockUserId);

      expect(UserOnboardingRepositoryMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          onboarding: expect.objectContaining({
            currentStep: OnboardFlowStep.DATA_PRIVACY,
            features: [OnboardFlowFeature.BUILD_HEALTHY_HABITS],
            routines: [RoutineType.MORNING_ROUTINE, RoutineType.EVENING_ROUTINE],
            profile: { name: BearsonaProfile.OG, useProfileLang: true },
            activities: { morning_activities: [], evening_activities: [] },
            selectedGoals: [],
            times: {
              [OnboardFlowTimeUI.WAKE_UP]: '06:00',
              [OnboardFlowTimeUI.START_STUDY]: '08:00',
              [OnboardFlowTimeUI.FINISH_STUDY]: '17:30',
              [OnboardFlowTimeUI.GO_TO_SLEEP]: '21:00',
            },
            currentTimeUI: OnboardFlowTimeUI.WAKE_UP,
            break_after_minutes: 20,
            skippedSteps: [],
          }),
        }),
        ['user_id'],
      );
      expect(result).toBeInstanceOf(UserOnboarding);
      expect(result.user_id).toBe(mockUserId);
    });

    it('should handle database errors and capture exception', async () => {
      const mockError = new Error('Database insert failed');
      UserOnboardingRepositoryMock.upsert.mockRejectedValue(mockError);

      await expect(service.createOnboardingData(mockUserId)).rejects.toThrow(mockError);
    });

    it('should create onboarding data with correct default values', async () => {
      UserOnboardingRepositoryMock.upsert.mockResolvedValue(undefined);

      const result = await service.createOnboardingData(mockUserId);

      expect(result.onboarding).toEqual({
        currentStep: OnboardFlowStep.DATA_PRIVACY,
        features: [OnboardFlowFeature.BUILD_HEALTHY_HABITS],
        routines: [RoutineType.MORNING_ROUTINE, RoutineType.EVENING_ROUTINE],
        profile: { name: BearsonaProfile.OG, useProfileLang: true },
        activities: { morning_activities: [], evening_activities: [] },
        selectedGoals: [],
        times: {
          [OnboardFlowTimeUI.WAKE_UP]: '06:00',
          [OnboardFlowTimeUI.START_STUDY]: '08:00',
          [OnboardFlowTimeUI.FINISH_STUDY]: '17:30',
          [OnboardFlowTimeUI.GO_TO_SLEEP]: '21:00',
        },
        currentTimeUI: OnboardFlowTimeUI.WAKE_UP,
        break_after_minutes: 20,
        skippedSteps: [],
      });
    });
  });
});
