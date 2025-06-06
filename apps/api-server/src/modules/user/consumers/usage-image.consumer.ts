/* eslint-disable no-console */
import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { OpenAIService } from '@app/openai';
import { R2Service } from '@app/r2';
import axios from 'axios';
import { SendGridService } from '@app/send-grid';
import { Auth0ManagementService } from '@app/auth0';
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
        subject: 'We couldn’t process your Screen Time screenshot',
        text: 'Hi there,\n\nUnfortunately, we ran into an issue while trying to process your Screen Time screenshot. Please try uploading it again. If the problem persists, feel free to contact our support team.\n\nThanks for your understanding!\n\n– The Focus Bear Team',
      });
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
