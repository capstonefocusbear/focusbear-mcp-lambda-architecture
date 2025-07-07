/* eslint-disable no-console */
import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { OpenAIService } from '@app/openai';
import { R2Service } from '@app/r2';
import axios from 'axios';
import { SendGridService } from '@app/send-grid';
import { Auth0ManagementService } from '@app/auth0';
import { GeminiService } from '@app/gemini';
import { I18nService } from 'nestjs-i18n';
import { UsageDataService } from '../services/usage-data/usage-data.service';
import { BullQueues, BullWorkers, FOCUS_BEAR_EMAILS, S3_BUCKET_USAGE_IMAGES } from '../../../shared/utils/constants';
import { UserRepository } from '../repositories/user.repository';

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
    private readonly geminiService: GeminiService,
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

      // Remove data URL prefix for Gemini (only base64 data)
      const base64Data = base64;

      const usageData = await this.openAIService.processUsageImage(imageBuffer);

      if (!usageData || Object.keys(usageData).length === 0) {
        throw new Error('No usage data detected in image');
      }

      // Cross-check with Gemini
      try {
        const crossCheckResult = await this.geminiService.crossCheckWithGPT(base64Data, usageData);
        if (!crossCheckResult.modelsAgree) {
          throw new Error('Disagreement between OpenAI and Gemini usage image analysis');
        }
      } catch (crossCheckError) {
        this.sentryService.instance().captureException(crossCheckError, { level: 'error' });
        throw crossCheckError;
      }

      await this.usageDataService.saveUsageData(userId, Object.values(usageData).flat(), {
        startDate,
        endDate,
        platform,
        deviceId,
      });
    } catch (error) {
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
        text: this.i18nService.t('common.usage_image_processing_error_body', { lang: user.language }),
      });
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
