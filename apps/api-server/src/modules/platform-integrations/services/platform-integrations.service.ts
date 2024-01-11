import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PlatformIntegrationRepository } from '../repositories/platform-integration.repository';
import { IntegrationPlatforms } from '../domain/integration-platforms.enum';
import { PlatformIntegration } from '../entities/platform-integration.entity';
import { PlatformIntegrationMetadataDto } from '../dto/platform-integration-metadata.dto';

@Injectable()
export class PlatformIntegrationsService {
  constructor(private readonly platformIntegrationsRepository: PlatformIntegrationRepository) {}

  async getPlatformIntegrationData(platform: IntegrationPlatforms, userId: string, userExternalId?: string) {
    let platformRecord;
    if (platform === IntegrationPlatforms.GOOGLE || platform === IntegrationPlatforms.MICROSOFT) {
      platformRecord = await this.platformIntegrationsRepository.orm.findOne({
        where: { user_id: userId, platform, external_user_id: userExternalId },
      });
      return platformRecord;
    }
    platformRecord = await this.platformIntegrationsRepository.orm.findOne({
      where: { user_id: userId, platform },
    });
    return platformRecord;
  }

  async updatePlatformIntegration(
    userId: string,
    platform: IntegrationPlatforms,
    data: PlatformIntegrationMetadataDto,
    userExternalId?: string,
  ) {
    const existingRecord = await this.getPlatformIntegrationData(platform, userId, userExternalId);
    if (existingRecord) {
      const platformIntegration = new PlatformIntegration({
        ...existingRecord,
        data: { ...existingRecord.data, ...data },
      });
      await this.platformIntegrationsRepository.orm.save(platformIntegration);
      return;
    }
    const platformIntegration = new PlatformIntegration({
      user_id: userId,
      platform,
      ...(userExternalId && { external_user_id: userExternalId }),
      data,
    });
    await this.platformIntegrationsRepository.orm.save(platformIntegration);
  }

  async getUserSyncedPlatforms(userId: string) {
    const syncedProjects = await this.platformIntegrationsRepository.orm.find({
      where: { user_id: userId },
      select: ['platform'],
    });
    const platforms = syncedProjects.map((project) => project.platform);
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
    const accountInfos = await integrationRecords.map((account) => {
      const data = {
        email: account.external_user_id,
        expired: account.data.expiry_date < DateTime.local().toMillis() + 1000,
      };
      return data;
    });
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
