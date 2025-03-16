import { forwardRef, Module } from '@nestjs/common';
import { PlatformIntegrationRepository } from './repositories/platform-integration.repository';
import { PlatformIntegrationsService } from './services/platform-integrations.service';
import { AuthModule } from '../auth/auth.module';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  providers: [PlatformIntegrationRepository, PlatformIntegrationsService],
  exports: [PlatformIntegrationRepository, PlatformIntegrationsService],
  imports: [forwardRef(() => AuthModule), forwardRef(() => CalendarModule)],
  controllers: [],
})
export class PlatformIntegrationsModule {}
