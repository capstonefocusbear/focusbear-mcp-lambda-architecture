import { Injectable } from '@nestjs/common';
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

@Injectable()
export class UserOnboardingService {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly userOnboardingRepository: UserOnboardingRepository,
  ) {}

  async updateOnboardingProgress(dto: UpdateOnboardingProgressDto): Promise<{ success: boolean; message: string }> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Saving temporary onboarding data',
        data: {
          ...dto,
        },
      });

      const userOnboarding = new UserOnboarding(
        {
          auth0_id: dto.auth0_id,
          onboarding: dto.onboarding,
        },
        { generateId: true },
      );

      await this.userOnboardingRepository.upsert(userOnboarding, ['auth0_id']);

      return {
        success: true,
        message: 'Onboarding data saved successfully',
      };
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getOnboardingProgress(auth0Id: string): Promise<OnboardingDto | null> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Retrieving temporary onboarding data',
        data: { auth0_id: auth0Id },
      });

      const userData = await this.userOnboardingRepository.findByAuth0Id(auth0Id);

      if (!userData) {
        return null;
      }

      return userData.onboarding;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async createOnboardingData(userId: string, auth0Id: string): Promise<UserOnboarding | null> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Creating default onboarding data for user',
        data: { user_id: userId, auth0_id: auth0Id },
      });

      const userOnboarding = new UserOnboarding(
        {
          auth0_id: auth0Id,
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

      await this.userOnboardingRepository.upsert(userOnboarding, ['auth0_id']);

      return userOnboarding;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
