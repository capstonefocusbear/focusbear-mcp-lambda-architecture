import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import axios from 'axios';
import { BrevoService } from '@app/brevo/brevo.service';
import { I18nService } from 'nestjs-i18n';
import { PusherBeamsService } from '@app/pusher-beams';
import { TrackEventDto } from '../dto/track-event.dto';
import { BullQueues, BullWorkers, DISTRACTION_BLOCK_EVENTS, IMPACT_MEASUREMENT_EVENT_TYPES } from '../../../shared/utils/constants';
import { EventTypes } from '../domain/event-types.enum';
import { EventsService } from '../services/events.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { DeviceService } from '../../device/services/device/device.service';
import { UserDailyStatsService } from '../../user/services/user-daily-stats/user-daily-stats.service';

@Processor(BullQueues.EVENTS)
export class EventsConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly brevoService: BrevoService,
    private readonly pusherBeamsService: PusherBeamsService,
    private readonly i18nService: I18nService,
    private readonly eventsService: EventsService,
    private readonly userRepository: UserRepository,
    private readonly userDailyStatsService: UserDailyStatsService,
    private readonly deviceService: DeviceService,
  ) {}

  @Process(BullWorkers.TRACK_EVENT)
  async readOperationJob(job: Job<{
    trackEventDto: TrackEventDto; user_id: string;
    email: string, device_id: string, app_version: string, user_language: string, user_timezone: string
  }>) {
    const {
      data: { user_id, email, trackEventDto, device_id, app_version, user_language, user_timezone },
    } = job;
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Registering Brevo event',
        data: {
          user_id,
          track_event: trackEventDto,
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
      await this.eventsService.handleMobilePostpone(
        user_id,
        event_type as EventTypes,
        trackEventDto?.event_data?.data?.quantity,
        user_language,
      );

      let device = null;
      if (device_id) {
        device = await this.deviceService.updateDeviceAppVersion(device_id, app_version);
      }

      await this.eventsService.saveTrackEvent(user_id, trackEventDto, device?.operating_system ?? null);
      await this.eventsService.saveImpactEvent(event_type as EventTypes, user_id, trackEventDto.event_data?.data?.quantity);

      const isDistractionBlockEvent = DISTRACTION_BLOCK_EVENTS.includes(event_type as EventTypes);
      if (isDistractionBlockEvent) {
        await this.userDailyStatsService.updateDistractionBlockCount(user_id, user_timezone);
      }

      await this.eventsService.handleEventBroadcast(user_id, trackEventDto, email);

      const brevoResponse = await this.brevoService.registerBrevoEvent(email, trackEventDto);

      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: `Save Brevo event response status: ${brevoResponse.status} Data: ${JSON.stringify(
          brevoResponse.data,
        )}`,
        data: {
          user_id,
          track_event: trackEventDto,
        },
      });
      // update user updated_at field to indicate activity
      await this.userRepository.update(user_id, { updated_at: new Date().toISOString() });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      await axios.post(process.env.SLACK_BACKEND_ALERTS_WEBHOOK, {
        text: `Error in track-event queue for user with ID: ${user_id}\nTrack event: \`\`\`${JSON.stringify(
          trackEventDto,
        )}\`\`\`\nError: \`\`\`${error}\`\`\``,
      });
    }
  }

  @Process(BullWorkers.RESUME_NOTIFICATION)
  async sendResumeHabitsNotification(job: Job<{ user_id: string; event_type: EventTypes; language: string }>) {
    try {
      const {
        data: { user_id, event_type, language },
      } = job;
      const { title, body } = this.getNotificationTitleAndBody(language, event_type);
      const publishRequest = this.pusherBeamsService.createBeamsPublishRequest({
        title,
        body,
        pushData: {
          id: event_type,
        },
      });
      await this.pusherBeamsService.publishToUsers([user_id], publishRequest);
    } catch (error) {
      console.error('Error in resume-habits-notification queued job:', error);
      this.sentryService.instance().captureException(error, { level: 'error' });
    }
  }

  getNotificationTitleAndBody(language: string, eventType: EventTypes) {
    const title = this.i18nService.t(
      eventType === EventTypes.POSTPONE_HABITS_FROM_MOBILE
        ? 'common.resume_habits_title'
        : 'common.resume_focus_mode_title',
      { lang: language },
    );
    const body = this.i18nService.t(
      eventType === EventTypes.POSTPONE_HABITS_FROM_MOBILE
        ? 'common.resume_habits_body'
        : 'common.resume_focus_mode_body',
      { lang: language },
    );
    return { title, body };
  }
}
