import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullQueueMetricsService } from './bull-queue-metrics.service';

@Module({
  imports: [ConfigModule],
  providers: [BullQueueMetricsService],
  exports: [BullQueueMetricsService],
})
export class ObservabilityModule {}
