import { InjectQueue } from '@nestjs/bull';
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Queue } from 'bull';
import axios from 'axios';
import { InjectSentry, SentryService } from '@app/observability';
import { SendGridService } from '@app/send-grid';
import Redis from 'ioredis';
import { prettyJson } from '../../../shared/utils/helpers';
import { Auth0ManagementService } from '../../../../../../libs/auth0/src';
import { UserRepository } from '../../user/repositories/user.repository';
import { TrackEventDto } from '../dto/track-event.dto';
import { EventTypes } from '../domain/event-types.enum';
import { ImpactEvent } from '../entities/impact-event.entity';
import { EventsRepository } from '../repositories/events.repository';
import {
  BullQueues,
  BullWorkers,
  EMAIL_SUBJECTS,
  EVENTS_TO_IMPACT_CATEGORIES_MAP,
  EVENT_TYPES_TO_ALERT_IN_SLACK as EVENT_TYPES_TO_ALERT_IN_CLIQ,
  FOCUS_BEAR_EMAILS,
  IMPACT_MEASUREMENT_EVENT_TYPES,
  ONE_MINUTE,
  USER_QUIT_TRACKING_DURATION_MILLIS,
  WORDS_TO_LOG_FOR,
} from '../../../shared/utils/constants';
import { UpdateAppVersionDto } from '../dto/update-app-version.dto';
import { TrackEventRepository } from '../repositories/track-event.repository';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';
import { TrackEvent } from '../entities/track-event.entity';
import { UserTypes } from '../../user/domain/user-types.enum';
import { AdminTrackEventResponseDto } from '../dto/admin-track-event-response.dto';

@Injectable()
export class EventsService {
  private redisClient = new Redis(`redis://${process.env.REDIS_HOSTNAME}:${process.env.REDIS_PORT}`);

  private readonly algorithm = 'aes-256-cbc';

  private readonly secretKey = process.env.FIELD_TRANSFORMER_ENCRYPTION_KEY;

  constructor(
    @InjectQueue(BullQueues.EVENTS) private eventsQueue: Queue,
    private readonly userRepository: UserRepository,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly eventsRepository: EventsRepository,
    private readonly emailService: SendGridService,
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

      await this.eventsQueue.add(BullWorkers.TRACK_EVENT, {
        user_id,
        user_auth0_id: user.auth0_id,
        trackEventDto,
        device_id,
        app_version,
        user_language: user.language,
        user_timezone: user.timezone,
      });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  shouldEventBeLogged(reason: string, event_type: string) {
    const shouldLogEventType = EVENT_TYPES_TO_ALERT_IN_CLIQ.includes(event_type as EventTypes);
    if (!shouldLogEventType || !reason) return false;
    const sentenceWords = reason.toLowerCase().split(/\s+/);
    for (const word of WORDS_TO_LOG_FOR) {
      if (sentenceWords.includes(word.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  async shouldNewUserEventBeLogged(event_type: string, userId: string) {
    // check if user signup date is less than 48 hours
    const user = await this.userRepository.orm.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`User with ID: ${userId} does not exist!`);
    const signupDate = new Date(user.created_at);
    const currentDate = new Date();
    const timeDifferenceInMilliSeconds = currentDate.getTime() - signupDate.getTime();
    const isNewUser = timeDifferenceInMilliSeconds <= USER_QUIT_TRACKING_DURATION_MILLIS;

    const shouldLogEventType = EVENT_TYPES_TO_ALERT_IN_CLIQ.includes(event_type as EventTypes);
    if (!shouldLogEventType) return false;
    return isNewUser;
  }

  async emailQuitFeedback(event: TrackEventDto, email: string, quitReason: string, userId?: string) {
    // find recent 50 events for current user
    const events = await this.getLastFiftyEvents(userId);

    // construct 50 events string
    const eventsStr =
      events === undefined || events === null
        ? 'Cannot find the last 50 events.'
        : prettyJson(events, 'jsonarray', 'event_type');

    await this.emailService.sendEmail({
      to: FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      replyTo: email,
      text: `${prettyJson(event, 'pretty')}\n\nLast 50 Events:\n\n${eventsStr}`,
      subject: `${EMAIL_SUBJECTS.APP_QUIT_FEEDBACK}: ${quitReason}`,
    });
  }

  async emailBadAIDecision(event: TrackEventDto, email: string, userId?: string) {
    const eventData = event.event_data as any;
    const userProperties = event.user_properties as any;

    const detailedReport = `
      Bad AI Blocking Decision Report

      User Information:
      - User ID: ${userProperties?.id || userId || 'N/A'}
      - Uses Mac App: ${userProperties?.USES_MAC_APP || false}
      - App Version: ${userProperties?.appVersion || 'N/A'}
      - Day of Usage: ${userProperties?.day_of_usage || 0}
      - macOS Version: ${userProperties?.macOSVersion || 'N/A'}

      AI Decision Details:
      - User Feedback: ${eventData?.data?.userFeedbackOnDecision || 'N/A'}
      - AI Payload: ${eventData?.data?.payloadSentToAIEndpoint || 'N/A'}

      Full Event Data:
      ${prettyJson(event, 'pretty')}
      `;

    await this.emailService.sendEmail({
      to: FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      replyTo: email,
      text: detailedReport,
      subject: 'Bad AI Blocking Decision - Focus Bear',
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

  async logEventInCliq(user_id: string, event: TrackEventDto) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Logging event in Cliq Alerts channel',
        data: {
          user_id,
          event,
        },
      });

      let messagePrefix = '*User ';
      let formattedMessage = '';

      switch (event.event_type) {
        case EventTypes.GIVE_ME_4HR_BREAK:
          messagePrefix += 'disabled app for 4 hours';
          break;
        case EventTypes.UNINSTALL:
          messagePrefix += 'uninstalled';
          break;
        case EventTypes.BAD_AI_BLOCKING_DECISION: {
          messagePrefix = 'Bad AI Blocking Decision';
          const eventData = event.event_data as any;
          const userProperties = event.user_properties as any;
          formattedMessage = `\n*User ID:* ${user_id}\n*User Feedback:* ${
            eventData?.data?.userFeedbackOnDecision || 'N/A'
          }\n*Uses Mac App:* ${userProperties?.USES_MAC_APP || false}\n*App Version:* ${
            userProperties?.appVersion || eventData?.appVersion || 'N/A'
          }\n*Day of Usage:* ${userProperties?.day_of_usage || eventData?.day_of_usage || 0}\n*macOS Version:* ${
            userProperties?.macOSVersion || eventData?.macOSVersion || 'N/A'
          }\n*AI Payload:* \`\`\`${eventData?.data?.payloadSentToAIEndpoint || 'N/A'}\`\`\``;
          break;
        }
        default:
          messagePrefix += 'quit app';
      }

      const cliqUrl = `${process.env.ZOHO_CLIQ_BACKEND_BOT_WEBHOOK}?zapikey=${process.env.ZOHO_CLIQ_API_KEY}`;
      const body = {
        channel: process.env.ZOHO_CLIQ_QUIT_UNINSTALL_CHANNEL,
        message:
          formattedMessage || `${messagePrefix}:*\n*User ID:* ${user_id}\n*Event:*\`\`\`${JSON.stringify(event)}\`\`\``,
      };

      await axios.post(cliqUrl, body);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async handleEventBroadcast(userId: string, trackEventDto: TrackEventDto, email: string) {
    const { event_data, event_type } = trackEventDto;
    const reason = event_data?.data?.quitReason || event_data?.data?.uninstallDescription;
    const shouldLogEvent = this.shouldEventBeLogged(reason, event_type);
    const shouldLogNewUserEvent = await this.shouldNewUserEventBeLogged(event_type, userId);
    const hasFeedback = !!event_data?.data?.feedback;
    const isBadAIDecision = event_type === EventTypes.BAD_AI_BLOCKING_DECISION;

    // log all quit events in cliq if user is new. If user is not new, log only if the event is quit event and reason contains any of the words in WORDS_TO_LOG_FOR
    if (shouldLogNewUserEvent || shouldLogEvent) {
      await this.logEventInCliq(userId, trackEventDto);
    }

    // Handle bad AI decision events separately
    if (isBadAIDecision) {
      await this.emailBadAIDecision(trackEventDto, email, userId);
      return;
    }

    // log all quit events in email if user is new. If user is not new, log only if the event is uninstall or contains feedback
    if (shouldLogNewUserEvent || (shouldLogEvent && (event_type === EventTypes.UNINSTALL || hasFeedback))) {
      await this.emailQuitFeedback(trackEventDto, email, reason, userId);
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

  async getLastFiftyEvents(userId: string) {
    const events = await this.trackEventRepository.orm.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 50,
    });
    return events;
  }

  /**
   * Fetches track events for a specific user. Used by the admin support dashboard
   * to view user activity history in the "Track Events" tab.
   */
  async getTrackEventsForAdminDashboard(
    adminId: string,
    userId: string,
    take = 100,
  ): Promise<AdminTrackEventResponseDto[]> {
    const adminUser = await this.userRepository.orm.findOneBy({ id: adminId });
    const isAdmin = adminUser?.user_type === UserTypes.ADMIN;
    if (!isAdmin) {
      throw new UnauthorizedException(`User with ID: ${adminId} is not admin!`);
    }
    const events = await this.trackEventRepository.orm.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take,
    });
    return events.map((event) => ({
      id: event.id,
      event_name: event.event_type,
      event_data: event.event_data,
      created_at: event.created_at,
    }));
  }
}
