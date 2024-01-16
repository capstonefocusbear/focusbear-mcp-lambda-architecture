import { InjectQueue } from '@nestjs/bull';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bull';
import axios from 'axios';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { SendGridService } from '@app/send-grid';
import { Auth0ManagementService } from '../../../../../../libs/auth0/src';
import { UserRepository } from '../../user/repositories/user.repository';
import { TrackEventDto } from '../dto/track-event.dto';
import { EventTypes } from '../domain/event-types.enum';
import { ImpactEvent } from '../entities/impact-event.entity';
import { EventsRepository } from '../repositories/events.repository';
import {
  BullQueues,
  BullWorkers,
  DISTRACTION_BLOCK_EVENTS,
  EMAIL_SUBJECTS,
  EVENTS_TO_IMPACT_CATEGORIES_MAP,
  EVENT_TYPES_TO_ALERT_IN_SLACK,
  FOCUS_BEAR_EMAILS,
  IMPACT_MEASUREMENT_EVENT_TYPES,
  ONE_MINUTE,
  WORDS_TO_LOG_FOR,
} from '../../../shared/utils/constants';
import { UserDailyStatsService } from '../../user/services/user-daily-stats/user-daily-stats.service';
import { DeviceService } from '../../device/services/device/device.service';
import { UpdateAppVersionDto } from '../dto/update-app-version.dto';
import { TrackEventRepository } from '../repositories/track-event.repository';
import { OperatingSystem } from '../../device/domain/operating-system.enum';
import { TrackEvent } from '../entities/track-event.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectQueue(BullQueues.EVENTS) private eventsQueue: Queue,
    private readonly userRepository: UserRepository,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly eventsRepository: EventsRepository,
    private readonly userDailyStatsService: UserDailyStatsService,
    private readonly emailService: SendGridService,
    private readonly deviceService: DeviceService,
    private readonly trackEventRepository: TrackEventRepository,
  ) {}

  async handleIncomingEvent(
    trackEventDto: TrackEventDto,
    user_id: string,
    { device_id, app_version }: UpdateAppVersionDto,
  ) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Adding event to track-event queue',
        data: {
          user_id,
          device_id,
          app_version,
        },
      });

      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      const { email } = await this.auth0ManagementService.getAuth0User(user?.auth0_id);
      const { event_type } = trackEventDto;
      await this.handleEventBroadcast(user_id, trackEventDto, email);
      await this.handleMobilePostpone(
        user_id,
        event_type as EventTypes,
        trackEventDto?.event_data?.data?.quantity,
        user.language,
      );

      await this.eventsQueue.add(BullWorkers.TRACK_EVENT, {
        user_id,
        email,
        trackEventDto,
      });
      let device = null;
      if (device_id) {
        device = await this.deviceService.updateDeviceAppVersion(device_id, app_version);
      }

      await this.saveTrackEvent(user_id, trackEventDto, device?.operating_system ?? null);
      await this.saveImpactEvent(event_type as EventTypes, user_id, trackEventDto.event_data?.data?.quantity);

      const isDistractionBlockEvent = DISTRACTION_BLOCK_EVENTS.includes(event_type as EventTypes);
      if (isDistractionBlockEvent) {
        await this.userDailyStatsService.updateDistractionBlockCount(user_id, user.timezone);
      }
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  shouldEventBeLogged(quitReason: string, event_type: string) {
    const shouldLogEventType = EVENT_TYPES_TO_ALERT_IN_SLACK.includes(event_type as EventTypes);
    if (!shouldLogEventType) return false;
    const sentenceWords = quitReason.toLowerCase().split(/\s+/);
    for (const word of WORDS_TO_LOG_FOR) {
      if (sentenceWords.includes(word.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  async emailQuitFeedback(event: TrackEventDto, email: string) {
    await this.emailService.sendEmail({
      to: FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      replyTo: email,
      text: JSON.stringify(event),
      subject: `${EMAIL_SUBJECTS.APP_QUIT_FEEDBACK}`,
    });
  }

  async handleMobilePostpone(userId: string, eventType: EventTypes, durationMinutes: number, language: string) {
    const isPostponeEvent =
      eventType === EventTypes.POSTPONE_HABITS_FROM_MOBILE || eventType === EventTypes.POSTPONE_FOCUS_MODE_FROM_MOBILE;
    if (!isPostponeEvent) return;
    // Convert minutes to postpone to milliseconds
    const durationMilliseconds = durationMinutes * ONE_MINUTE;
    await this.eventsQueue.add(
      BullWorkers.RESUME_NOTIFICATION,
      {
        user_id: userId,
        event_type: eventType,
        language,
      },
      { delay: durationMilliseconds },
    );
  }

  async logEventInSlack(user_id: string, event: TrackEventDto) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Logging event in Slack Alerts channel',
        data: {
          user_id,
          event,
        },
      });
      const messagePrefix = `*User ${
        event.event_type === EventTypes.GIVE_ME_4HR_BREAK ? 'disabled app for 4 hours' : 'quit app'
      }:*\n*User ID:* ${user_id}\n*Event:*`;
      const message = `${messagePrefix}\`\`\`${JSON.stringify(event)}\`\`\``;

      await axios.post(process.env.SLACK_WEBHOOKS_CHANNEL, { text: message });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async handleEventBroadcast(userId: string, trackEventDto: TrackEventDto, email: string) {
    const { event_data, event_type } = trackEventDto;
    const shouldLogEvent = this.shouldEventBeLogged(event_data?.data?.quitReason, event_type);
    const hasFeedback = !!event_data?.data?.feedback;
    if (shouldLogEvent) {
      await this.logEventInSlack(userId, trackEventDto);
    }
    if (shouldLogEvent && hasFeedback) {
      await this.emailQuitFeedback(trackEventDto, email);
    }
  }

  async saveImpactEvent(eventType: EventTypes, userId: string, quantity = 0) {
    const isImpactMeasurementEvent = IMPACT_MEASUREMENT_EVENT_TYPES.includes(eventType);
    if (!isImpactMeasurementEvent) return;
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Saving impact event',
      data: {
        userId,
        eventType,
        quantity,
      },
    });
    const impactCategory = EVENTS_TO_IMPACT_CATEGORIES_MAP[eventType];
    const impactEvent = new ImpactEvent({ user_id: userId, impact_category: impactCategory, quantity });
    await this.eventsRepository.orm.save(impactEvent);
  }

  async saveTrackEvent(userId: string, trackEventDto: TrackEventDto, operatingSystem?: OperatingSystem) {
    const { user_properties, event_type, event_data } = trackEventDto;
    const trackEvent = new TrackEvent({
      user_id: userId,
      operating_system: operatingSystem,
      user_properties,
      event_data,
      event_type,
    });
    await this.trackEventRepository.orm.save(trackEvent);
  }
}
