import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import axios from 'axios';
import { BrevoService } from '@app/brevo/brevo.service';
import { I18nService } from 'nestjs-i18n';
import { PusherBeamsService } from '@app/pusher-beams';
import { TrackEventDto } from '../dto/track-event.dto';
import { IMPACT_MEASUREMENT_EVENT_TYPES } from '../../../shared/utils/constants';
import { EventTypes } from '../domain/event-types.enum';
import { EventsService } from '../services/events.service';

@Processor('events')
export class EventsConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly brevoService: BrevoService,
    private readonly pusherBeamsService: PusherBeamsService,
    private readonly i18nService: I18nService,
    private readonly eventsService: EventsService,
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
      const { event_type } = trackEventDto;
      if (IMPACT_MEASUREMENT_EVENT_TYPES.includes(event_type as EventTypes)) {
        await this.eventsService.saveImpactEvent(
          event_type as EventTypes,
          user_id,
          trackEventDto.event_data?.data?.quantity,
        );
      }
      await this.brevoService.registerBrevoEvent(email, trackEventDto);
      if (IMPACT_MEASUREMENT_EVENT_TYPES.includes(event_type as EventTypes)) {
        await this.eventsService.saveImpactEvent(
          event_type as EventTypes,
          user_id,
          trackEventDto.event_data?.data?.quantity,
        );
      }
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      await axios.post(process.env.SLACK_BACKEND_ALERTS_WEBHOOK, {
        text: `Error in track-event queue for user with ID: ${user_id}\nTrack event: \`\`\`${JSON.stringify(
          trackEventDto,
        )}\`\`\`\nError: \`\`\`${error}\`\`\``,
      });
    }
  }

  @Process('resume-notification')
  async sendResumeHabitsNotification(job: Job<{ user_id: string; event_type: EventTypes; language: string }>) {
    try {
      const {
        data: { user_id, event_type, language },
      } = job;
      const title = this.i18nService.t(
        event_type === EventTypes.POSTPONE_HABITS_FROM_MOBILE
          ? 'common.resume_habits_title'
          : 'common.resume_focus_mode_title',
        { lang: language },
      );
      const body = this.i18nService.t(
        event_type === EventTypes.POSTPONE_HABITS_FROM_MOBILE
          ? 'common.resume_habits_body'
          : 'common.resume_focus_mode_body',
        { lang: language },
      );
      const publishRequest = this.pusherBeamsService.createBeamsPublishRequest(title, body, {
        id: event_type,
      });
      await this.pusherBeamsService.publishToUsers([user_id], publishRequest);
    } catch (error) {
      console.error('Error in resume-habits-notification queued job:', error);
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
    }
  }
}
