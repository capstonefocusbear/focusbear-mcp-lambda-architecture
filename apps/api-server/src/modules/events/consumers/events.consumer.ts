import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import * as axios from 'axios';
import { SendinblueService } from '@app/sendinblue/sendinblue.service';
import { TrackEventDto } from '../dto/track-event.dto';

@Processor('events')
export class EventsConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly sendinblueService: SendinblueService,
  ) {}

  @Process('track-event')
  async readOperationJob(job: Job<{ trackEventDto: TrackEventDto; user_id: string; email: string }>) {
    const {
      data: { user_id, email, trackEventDto },
    } = job;
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Registering sendinblue event',
        data: {
          user_id,
          treack_event: trackEventDto,
        },
      });
      await this.sendinblueService.registerSendinblueEvent(email, trackEventDto);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      await axios.default.post(process.env.SLACK_BACKEND_ALERTS_WEBHOOK, {
        text: `Error in track-event queue for user with ID: ${user_id}\nTrack event: \`\`\`${JSON.stringify(
          trackEventDto,
        )}\`\`\`\nError: \`\`\`${error}\`\`\``,
      });
    }
  }
}
