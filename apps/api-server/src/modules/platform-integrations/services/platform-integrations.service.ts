import { Injectable } from '@nestjs/common';
import { PlatformIntegrationRepository } from '../repositories/platform-integration.repository';
import { IntegrationPlatforms } from '../domain/integration-platforms.enum';
import { PlatformIntegration } from '../entities/platform-integration.entity';

@Injectable()
export class PlatformIntegrationsService {
  constructor(private readonly platformIntegrationsRepository: PlatformIntegrationRepository) {}

  async getPlatformIntegrationData(platform: IntegrationPlatforms, userId: string) {
    const platformRecord = await this.platformIntegrationsRepository.orm.findOne({
      where: { user_id: userId, platform },
    });
    return platformRecord;
  }

  async updatePlatformIntegration(userId: string, platform: IntegrationPlatforms, data: any, userExternalId?: string) {
    const existingRecord = await this.getPlatformIntegrationData(platform, userId);
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
}
