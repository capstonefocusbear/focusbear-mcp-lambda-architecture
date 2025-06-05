/* eslint-disable no-console */
import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { OpenAIService } from '@app/openai';
import { R2Service } from '@app/r2';
import axios from 'axios';
import { UsageDataService } from '../services/usage-data/usage-data.service';
import { BullQueues, BullWorkers, S3_BUCKET_USAGE_IMAGES } from '../../../shared/utils/constants';

@Processor(BullQueues.USAGE_IMAGE)
export class UsageImageConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly openAIService: OpenAIService,
    private readonly r2Service: R2Service,
    private readonly usageDataService: UsageDataService,
  ) {}

  @Process(BullWorkers.PROCESS_USAGE_IMAGE)
  async processUsageImage(
    job: Job<{
      userId: string;
      imageKey: string;
      startDate: Date;
      endDate: Date;
      platform?: string;
      deviceId?: string;
    }>,
  ) {
    const { userId, imageKey, startDate, endDate, platform, deviceId } = job.data;

    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Processing usage image from R2',
        data: {
          userId,
          imageKey,
        },
      });

      const imageUrl = await this.r2Service.getPresignedUrl(S3_BUCKET_USAGE_IMAGES, imageKey);

      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const base64 = Buffer.from(imageResponse.data, 'binary').toString('base64');
      const imageBuffer = `data:image/png;base64,${base64}`;

      const usageData = await this.openAIService.processUsageImage(imageBuffer);

      await this.usageDataService.saveUsageData(userId, usageData.apps, {
        startDate,
        endDate,
        platform,
        deviceId,
      });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
