import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { BearsonaProfile } from '../../domain/onboarding/bearsona-profile.enum';
import { OnboardFlowFeature } from '../../domain/onboarding/onboarding-flow-feature.enum';
import { OnboardFlowStep } from '../../domain/onboarding/onboarding-flow-step.enum';
import { OnboardFlowTimeUI } from '../../domain/onboarding/onboarding-flow-time-ui.enum';
import { RoutineType } from '../../domain/routine-type.enum';
import { OnboardingDto } from '../../dto/onboarding';
import { UpdateOnboardingProgressDto } from '../../dto/onboarding/update-onboarding-progress.dto';
import { UserOnboarding } from '../../entities/user-onboarding.entity';
import { UserOnboardingRepository } from '../../repositories/user-onboarding.repository';
import { UserRepository } from '../../repositories/user.repository';

@Injectable()
export class UserOnboardingService {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly userOnboardingRepository: UserOnboardingRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async updateOnboardingProgress(dto: UpdateOnboardingProgressDto): Promise<{ success: boolean; message: string }> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating onboarding data',
        data: {
          ...dto,
        },
      });

      const userExists = await this.userRepository.orm.findOne({
        where: { id: dto.user_id },
        select: ['id'],
      });

      if (!userExists) {
        throw new NotFoundException(`User with id ${dto.user_id} does not exist.`);
      }

      const userOnboarding = new UserOnboarding(
        {
          user_id: dto.user_id,
          onboarding: dto.onboarding,
        },
        { generateId: true },
      );

      await this.userOnboardingRepository.upsert(userOnboarding, ['user_id']);

      return {
        success: true,
        message: 'Onboarding data saved successfully',
      };
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getOnboardingProgress(userId: string): Promise<OnboardingDto | null> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Retrieving temporary onboarding data',
        data: { user_id: userId },
      });

      const userData = await this.userOnboardingRepository.findByUserId(userId);

      if (!userData) {
        throw new NotFoundException(`No onboarding data found for user ID ${userId}.`);
      }

      return userData.onboarding;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async createOnboardingData(userId: string): Promise<UserOnboarding | null> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Creating default onboarding data for user',
        data: { user_id: userId },
      });

      const userOnboarding = new UserOnboarding(
        {
          user_id: userId,
          onboarding: {
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
          },
        },
        { generateId: true },
      );

      await this.userOnboardingRepository.upsert(userOnboarding, ['user_id']);

      return userOnboarding;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
