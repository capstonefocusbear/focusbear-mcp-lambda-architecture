import { Module } from '@nestjs/common';
import { PlatformIntegrationRepository } from './repositories/platform-integration.repository';
import { PlatformIntegrationsService } from './services/platform-integrations.service';

@Module({
  providers: [PlatformIntegrationRepository, PlatformIntegrationsService],
  exports: [PlatformIntegrationRepository, PlatformIntegrationsService],
  imports: [],
  controllers: [],
})
export class PlatformIntegrationsModule {}
