import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bullmq';
import { BullWorkers } from '@api-server/shared/utils/constants';
import { SyncHealthMetricsDto } from '../dto/sync-health-metrics.dto';
import { HealthMetricsService } from '../services/health-metrics/health-metrics.service';

@Processor('health-metrics-sync')
export class SyncHealthMetricsConsumer {
  constructor(private readonly healthMetricsService: HealthMetricsService) {}

  @Process(BullWorkers.SYNC_HEALTH_METRICS)
  async process(job: Job<{ userId: string; data: SyncHealthMetricsDto }>): Promise<void> {
    const { userId, data } = job.data;
    await this.healthMetricsService.syncHealthMetrics(userId, data);
  }
}
