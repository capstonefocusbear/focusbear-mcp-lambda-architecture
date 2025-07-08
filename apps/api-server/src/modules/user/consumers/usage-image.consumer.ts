/* eslint-disable no-console */
import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { OpenAIService } from '@app/openai';
import { R2Service } from '@app/r2';
import axios from 'axios';
import { SendGridService } from '@app/send-grid';
import { Auth0ManagementService } from '@app/auth0';
import { I18nService } from 'nestjs-i18n';
import { UsageDataService } from '../services/usage-data/usage-data.service';
import { BullQueues, BullWorkers, FOCUS_BEAR_EMAILS, S3_BUCKET_USAGE_IMAGES } from '../../../shared/utils/constants';
import { UserRepository } from '../repositories/user.repository';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTaskStatus } from '../../async-task/domain/async-task-status.enum';

@Processor(BullQueues.USAGE_IMAGE)
export class UsageImageConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly openAIService: OpenAIService,
    private readonly r2Service: R2Service,
    private readonly usageDataService: UsageDataService,
    private readonly sendGridService: SendGridService,
    private readonly userRepository: UserRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly i18nService: I18nService,
    private readonly asyncTaskService: AsyncTaskService,
  ) {}

  private async updateAsyncTaskStatus(
    asyncTaskId: string | undefined,
    status: AsyncTaskStatus,
    baseMetadata: Record<string, any>,
    additionalMetadata: Record<string, any> = {},
  ): Promise<void> {
    if (!asyncTaskId) return;

    try {
      await this.asyncTaskService.updateTaskStatus(asyncTaskId, {
        status,
        metadata: {
          ...baseMetadata,
          ...additionalMetadata,
        },
      });
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        level: 'warning',
        tags: { context: `async-task-${status.toLowerCase()}-update` },
      });
    }
  }

  @Process(BullWorkers.PROCESS_USAGE_IMAGE)
  async processUsageImage(
    job: Job<{
      userId: string;
      imageKey: string;
      startDate: Date;
      endDate: Date;
      platform?: string;
      deviceId?: string;
      asyncTaskId?: string;
    }>,
  ) {
    const { userId, imageKey, startDate, endDate, platform, deviceId, asyncTaskId } = job.data;

    const baseMetadata = {
      taskType: 'usage-image-processing',
      userId,
      imageKey,
      startDate,
      endDate,
      platform,
      deviceId,
    };

    // Update task status to processing
    await this.updateAsyncTaskStatus(asyncTaskId, AsyncTaskStatus.PROCESSING, baseMetadata, {
      processingStarted: new Date(),
    });

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

      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      const base64 = Buffer.from(imageResponse.data, 'binary').toString('base64');
      const imageBuffer = `data:image/png;base64,${base64}`;

      const usageData = await this.openAIService.processUsageImage(imageBuffer);

      await this.usageDataService.saveUsageData(userId, usageData.apps, {
        startDate,
        endDate,
        platform,
        deviceId,
      });

      // Update task status to completed
      await this.updateAsyncTaskStatus(asyncTaskId, AsyncTaskStatus.COMPLETED, baseMetadata, {
        processingCompleted: new Date(),
        appsProcessed: usageData.apps?.length || 0,
      });
    } catch (error) {
      // Update task status to failed
      await this.updateAsyncTaskStatus(asyncTaskId, AsyncTaskStatus.FAILED, baseMetadata, {
        processingFailed: new Date(),
        errorMessage: error.message,
        errorStack: error.stack,
      });

      const user = await this.userRepository.orm.findOneBy({ id: userId });

      if (!user?.auth0_id) {
        this.sentryService.instance().captureException(error, { level: 'error' });
        throw error;
      }

      const auth0User = await this.auth0ManagementService.getAuth0User(user?.auth0_id);

      await this.sendGridService.sendEmail({
        from: FOCUS_BEAR_EMAILS.SUPPORT,
        to: auth0User.email,
        replyTo: FOCUS_BEAR_EMAILS.SUPPORT,
        subject: this.i18nService.t('common.usage_image_processing_error_subject', { lang: user.language }),
        text: this.i18nService.t('common.usage_image_processing_error_body', {
          lang: user.language,
        }),
      });
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
