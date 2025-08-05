import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { OperatingSystem } from '@api-server/shared/domain/operating-system.enum';
import { OnboardingDto } from '../../dto/onboarding';
import { UpdateOnboardingProgressDto } from '../../dto/onboarding/update-onboarding-progress.dto';
import { UserOnboarding } from '../../entities/user-onboarding.entity';
import { UserOnboardingRepository } from '../../repositories/user-onboarding.repository';
import { UserRepository } from '../../repositories/user.repository';
import { DEFAULT_ONBOARDING_DATA } from '../../../../shared/utils/constants';
import { GetUserOnboardingQueryDto } from '../../dto/onboarding/get-user-onboarding-query.dto';

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

      await this.checkIfUserExists(dto.user_id);

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

  async getOnboardingProgress(query: GetUserOnboardingQueryDto): Promise<OnboardingDto> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting onboarding data',
        data: { ...query },
      });

      await this.checkIfUserExists(query.user_id);

      const userData = await this.userOnboardingRepository.findByUserIdAndOs(query.user_id, query.os);

      if (!userData) {
        throw new NotFoundException(
          `No onboarding data found for user ID ${query.user_id}${query.os ? ` and OS ${query.os}.` : '.'}`,
        );
      }

      return userData.onboarding;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async createOnboardingData(userId: string, os: OperatingSystem): Promise<UserOnboarding> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Creating default onboarding data for user',
        data: { user_id: userId, os },
      });

      const userOnboarding = new UserOnboarding(
        {
          user_id: userId,
          onboarding: DEFAULT_ONBOARDING_DATA,
          platform: os,
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

  async checkIfUserExists(userId: string): Promise<void> {
    const userExists = await this.userRepository.orm.findOne({
      where: { id: userId },
      select: ['id'],
    });

    if (!userExists) {
      throw new NotFoundException(`User with id ${userId} does not exist.`);
    }
  }
}
