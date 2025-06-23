/* eslint-disable no-console */
import { Controller, Body, UseGuards, Post } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BullQueues, BullWorkers } from '../../../../shared/utils/constants';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { SyncHealthMetricsDto } from '../../dto/sync-health-metrics.dto';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';

@Controller('health-metrics')
@UseGuards(IsAuth)
@ApiTags('health-metrics')
@ApiSecurity('Auth0AccessToken')
export class HealthMetricsController {
  constructor(@InjectQueue(BullQueues.HEALTH_METRICS_SYNC) private healthMetricsQueue: Queue) {}

  @Post('sync')
  async syncHealthMetrics(@Body() syncDto: SyncHealthMetricsDto, @AuthContext() { user }: Passport): Promise<void> {
    await this.healthMetricsQueue.add(BullWorkers.SYNC_HEALTH_METRICS, {
      userId: user.id,
      data: syncDto,
    });
  }
}
