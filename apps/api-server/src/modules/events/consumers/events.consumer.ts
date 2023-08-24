import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import axios from 'axios';
import { BrevoService } from '@app/brevo/brevo.service';
import { I18nService } from 'nestjs-i18n';
import { BeamsPublishRequest } from '@app/pusher-beams/domains/pusher-beams-publish-request.model';
import { PusherBeamsService } from '@app/pusher-beams';
import { TrackEventDto } from '../dto/track-event.dto';

@Processor('events')
export class EventsConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly brevoService: BrevoService,
    private readonly pusherBeamsService: PusherBeamsService,
    private readonly i18nService: I18nService,
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
        message: 'Registering Brevo event',
        data: {
          user_id,
          treack_event: trackEventDto,
        },
      });
      await this.brevoService.registerBrevoEvent(email, trackEventDto);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      await axios.post(process.env.SLACK_BACKEND_ALERTS_WEBHOOK, {
        text: `Error in track-event queue for user with ID: ${user_id}\nTrack event: \`\`\`${JSON.stringify(
          trackEventDto,
        )}\`\`\`\nError: \`\`\`${error}\`\`\``,
      });
    }
  }

  @Process('resume-habits-notification')
  async sendResumeHabitsNotification(job: Job<{ user_id: string; language: string }>) {
    try {
      const {
        data: { user_id, language },
      } = job;
      const title = this.i18nService.t('common.resume_habits_title', { lang: language });
      const body = this.i18nService.t('common.resume_habits_body', { lang: language });
      const publishRequest = new BeamsPublishRequest({
        apns: { aps: { alert: { title, body } } },
        fcm: { notification: { title, body } },
      });
      await this.pusherBeamsService.publishToUsers([user_id], publishRequest);
    } catch (error) {
      console.error('Error in resume-habits-notification queued job:', error);
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
    }
  }
}
