import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@app/observability';
import { Job } from 'bullmq';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { UsageDataService } from '../services/usage-data/usage-data.service';
import { SyncUsageDataDto } from '../dto/sync-usage-data.dto';

@Processor(BullQueues.USAGE_DATA)
export class UsageDataConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly usageDataService: UsageDataService,
  ) {}

  @Process(BullWorkers.SYNC_USAGE_DATA)
  async process(
    job: Job<{
      userId: string;
      syncDto: SyncUsageDataDto;
    }>,
  ) {
    const { userId, syncDto } = job.data;

    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Processing usage data sync',
        data: {
          userId,
        },
      });

      await this.usageDataService.syncUsageData(userId, syncDto);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
