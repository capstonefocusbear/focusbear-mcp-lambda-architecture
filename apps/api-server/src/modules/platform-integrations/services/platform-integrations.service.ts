import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PlatformIntegrationRepository } from '../repositories/platform-integration.repository';
import { IntegrationPlatforms } from '../domain/integration-platforms.enum';
import { PlatformIntegration } from '../entities/platform-integration.entity';
import { PlatformIntegrationMetadataDto } from '../dto/platform-integration-metadata.dto';
import { GoogleAuthService } from '../../auth/services/google-auth.service';

@Injectable()
export class PlatformIntegrationsService {
  constructor(
    private readonly platformIntegrationsRepository: PlatformIntegrationRepository,
    @Inject(forwardRef(() => GoogleAuthService))
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  async getPlatformIntegrationData(
    platform: IntegrationPlatforms,
    userId: string,
    userExternalId?: string,
  ): Promise<PlatformIntegration> {
    if (platform === IntegrationPlatforms.GOOGLE || platform === IntegrationPlatforms.MICROSOFT) {
      const platformRecord = await this.platformIntegrationsRepository.orm.findOne({
        where: { user_id: userId, platform, external_user_id: userExternalId },
      });
      return platformRecord;
    }
    const platformRecord = await this.platformIntegrationsRepository.orm.findOne({
      where: { user_id: userId, platform },
    });

    return platformRecord;
  }

  async updatePlatformIntegration(
    userId: string,
    platform: IntegrationPlatforms,
    authData: Partial<PlatformIntegrationMetadataDto>,
    userExternalId?: string,
  ) {
    const existingRecord = await this.getPlatformIntegrationData(platform, userId, userExternalId);
    if (!existingRecord) {
      const platformIntegration = new PlatformIntegration({
        user_id: userId,
        platform,
        ...(userExternalId && { external_user_id: userExternalId }),
        data: authData,
      });
      return this.platformIntegrationsRepository.orm.save(platformIntegration);
    }

    // Update only relevant fields
    const updatedData = {
      ...existingRecord.data,
      ...(authData.access_token && { access_token: authData.access_token }),
      ...(authData.refresh_token && { refresh_token: authData.refresh_token }),
      ...(authData.expiry_date && { expiry_date: authData.expiry_date }),
    };

    return this.platformIntegrationsRepository.orm.update(
      { user_id: userId, platform, external_user_id: userExternalId },
      { data: updatedData },
    );
  }

  async getUserSyncedPlatforms(userId: string) {
    const syncedPlatforms = await this.platformIntegrationsRepository.orm.find({
      where: { user_id: userId },
      select: ['platform'],
    });
    const platforms = syncedPlatforms.map((syncedPlatform) => syncedPlatform.platform);
    return {
      zoho: platforms.includes(IntegrationPlatforms.ZOHO),
      jira: platforms.includes(IntegrationPlatforms.JIRA),
      clickup: platforms.includes(IntegrationPlatforms.CLICK_UP),
      trello: platforms.includes(IntegrationPlatforms.TRELLO),
      asana: platforms.includes(IntegrationPlatforms.ASANA),
      monday: platforms.includes(IntegrationPlatforms.MONDAY),
      google: platforms.includes(IntegrationPlatforms.GOOGLE),
      microsoft: platforms.includes(IntegrationPlatforms.MICROSOFT),
    };
  }

  async getPlatformAccounts(platform: IntegrationPlatforms, userId: string) {
    const integrationRecords = await this.platformIntegrationsRepository.orm.find({
      where: { platform, user_id: userId },
    });

    const accountInfos = await Promise.all(
      integrationRecords.map(async (account) => {
        let isExpired =
          account.data.expiry_date < DateTime.local().toMillis() + 1000 ||
          (account.platform === IntegrationPlatforms.GOOGLE && !account.data.refresh_token);

        // If Google token is expired, attempt refresh
        if (isExpired && account.platform === IntegrationPlatforms.GOOGLE) {
          try {
            const newAccessToken = await this.googleAuthService.refreshToken(userId, account.external_user_id);
            if (newAccessToken) {
              isExpired = false; // Token successfully refreshed
            }
          } catch (refreshError) {
            // eslint-disable-next-line no-console
            console.warn(
              `Failed to refresh token for user ${userId} (account: ${account.external_user_id}):`,
              refreshError,
            );
          }
        }

        return {
          email: account.external_user_id,
          expired: isExpired,
        };
      }),
    );
    return accountInfos;
  }

  async getAssigneeStatus(userId: string) {
    const integrationRecords = await this.platformIntegrationsRepository.orm.find({
      where: { user_id: userId },
    });
    const isCalendarIntegration = (platform) =>
      platform === IntegrationPlatforms.GOOGLE || platform === IntegrationPlatforms.MICROSOFT;
    return Object.values(IntegrationPlatforms)
      .filter((platform) => {
        return !isCalendarIntegration(platform);
      })
      .map((platform) => {
        const record = integrationRecords.find((integrationRecord) => integrationRecord.platform === platform);
        if (!record) {
          return {
            platform,
            status: '1',
          };
        }
        return {
          platform,
          status: record.only_assigned === true ? '1' : '2',
        };
      });
  }

  async updateAssigneeStatus(userId: string, platform: IntegrationPlatforms, only_assigned: boolean) {
    await this.platformIntegrationsRepository.orm.update(
      {
        user_id: userId,
        platform,
      },
      {
        only_assigned,
      },
    );
  }
}
