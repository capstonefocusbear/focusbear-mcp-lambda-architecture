import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import axios from 'axios';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';

@Processor(BullQueues.ACTIVITY_IMAGE)
export class ActivityImageConsumer {
  constructor(@InjectSentry() private readonly sentryService: SentryService) {}

  @Process(BullWorkers.DELETE_ACTIVITY_IMAGE)
  async readOperationJob(job: Job<{ user_id: string; filePath: string }>) {
    const {
      data: { user_id, filePath },
    } = job;
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Deleting image from upload.io',
        data: {
          user_id,
          file_path: filePath,
        },
      });
      await axios.delete(
        `https://api.upload.io/v2/accounts/${process.env.UPLOAD_IO_ACCOUNT_ID}/files?filePath=${filePath}`,
        { headers: { authorization: `Bearer ${process.env.UPLOAD_IO_SECRET_API_KEY}` } },
      );
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      await axios.post(process.env.SLACK_BACKEND_ALERTS_WEBHOOK, {
        text: `Error in delete-activity-image queue for user with ID: ${user_id}\nFile Path: ${filePath}\nError: \`\`\`${error}\`\`\``,
      });
    }
  }
}
