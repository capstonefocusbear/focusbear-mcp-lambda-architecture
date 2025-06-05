import { Controller, Body, UseGuards, Put } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { HealthMetricsService } from '../../services/health-metrics/health-metrics.service';
import { SyncHealthMetricsDto } from '../../dto/sync-health-metrics.dto';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';

@Controller('health-metrics')
@UseGuards(IsAuth)
@ApiTags('health-metrics')
@ApiSecurity('Auth0AccessToken')
export class HealthMetricsController {
  constructor(private readonly healthMetricsService: HealthMetricsService) {}

  @Put('sync')
  async syncHealthMetrics(@Body() syncDto: SyncHealthMetricsDto, @AuthContext() { user }: Passport): Promise<void> {
    await this.healthMetricsService.syncHealthMetrics(user.id, syncDto);
  }
}
