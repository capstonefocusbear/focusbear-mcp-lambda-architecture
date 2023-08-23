import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import axios from 'axios';
import { SendinblueService } from '@app/sendinblue/sendinblue.service';
import { TrackEventDto } from '../dto/track-event.dto';
import { IMPACT_MEASUREMENT_EVENT_TYPES } from '../../../shared/utils/constants';
import { EventTypes } from '../domain/event-types.enum';
import { EventsService } from '../services/events.service';

@Processor('events')
export class EventsConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly sendinblueService: SendinblueService,
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
        message: 'Registering sendinblue event',
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
      await this.sendinblueService.registerSendinblueEvent(email, trackEventDto);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      await axios.post(process.env.SLACK_BACKEND_ALERTS_WEBHOOK, {
        text: `Error in track-event queue for user with ID: ${user_id}\nTrack event: \`\`\`${JSON.stringify(
          trackEventDto,
        )}\`\`\`\nError: \`\`\`${error}\`\`\``,
      });
    }
  }
}
