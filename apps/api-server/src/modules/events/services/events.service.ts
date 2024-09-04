import { InjectQueue } from '@nestjs/bull';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bull';
import axios from 'axios';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { SendGridService } from '@app/send-grid';
import Redis from 'ioredis';
import * as crypto from 'crypto';
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
  ONE_DAY_SECONDS,
  ONE_MINUTE,
  WORDS_TO_LOG_FOR,
} from '../../../shared/utils/constants';
import { UpdateAppVersionDto } from '../dto/update-app-version.dto';
import { TrackEventRepository } from '../repositories/track-event.repository';
import { OperatingSystem } from '../../device/domain/operating-system.enum';
import { TrackEvent } from '../entities/track-event.entity';

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

  async findEmail(userId: string, auth0Id: string): Promise<string> {
    // Try to get the encrypted email from Redis
    let encryptedEmail = await this.redisClient.get(`user:${userId}:email`);
    if (encryptedEmail) {
      // Decrypt and return the email if found in cache
      return this.decryptEmail(encryptedEmail);
    }
    // Fetch the email from Auth0 if not in cache
    const { email } = await this.auth0ManagementService.getAuth0User(auth0Id);

    // Encrypt and save the email in Redis
    encryptedEmail = this.encryptEmail(email);
    await this.redisClient.set(`user:${userId}:email`, encryptedEmail, 'EX', ONE_DAY_SECONDS);

    return email;
  }

  private encryptEmail(email: string): string {
    // Ensure the secret key is 32 bytes long using SHA-256
    const hash = crypto.createHash('sha256');
    hash.update(this.secretKey);
    const key = hash.digest();

    const iv = crypto.randomBytes(16); // AES block size is 16 bytes
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    let encrypted = cipher.update(email, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decryptEmail(encryptedEmail: string): string {
    // Ensure the secret key is 32 bytes long using SHA-256
    const hash = crypto.createHash('sha256');
    hash.update(this.secretKey);
    const key = hash.digest();

    const parts = encryptedEmail.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = parts.join(':');
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

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
      const email = await this.findEmail(user_id, user.auth0_id);

      await this.eventsQueue.add(BullWorkers.TRACK_EVENT, {
        user_id,
        email,
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
    if (!shouldLogEventType) return false;
    const sentenceWords = reason.toLowerCase().split(/\s+/);
    for (const word of WORDS_TO_LOG_FOR) {
      if (sentenceWords.includes(word.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  async emailQuitFeedback(event: TrackEventDto, email: string, quitReason: string) {
    await this.emailService.sendEmail({
      to: FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      replyTo: email,
      text: JSON.stringify(event),
      subject: `${EMAIL_SUBJECTS.APP_QUIT_FEEDBACK}: ${quitReason}`,
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
      switch (event.event_type) {
        case EventTypes.GIVE_ME_4HR_BREAK:
          messagePrefix += 'disabled app for 4 hours';
          break;
        case EventTypes.UNINSTALL:
          messagePrefix += 'uninstalled';
          break;
        default:
          messagePrefix += 'quit app';
      }

      const cliqUrl = `${process.env.ZOHO_CLIQ_BACKEND_BOT_WEBHOOK}?zapikey=${process.env.ZOHO_CLIQ_API_KEY}`;
      const body = {
        channel: process.env.ZOHO_CLIQ_QUIT_UNINSTALL_CHANNEL,
        message: `${messagePrefix}:*\n*User ID:* ${user_id}\n*Event:*\`\`\`${JSON.stringify(event)}\`\`\``,
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
    const hasFeedback = !!event_data?.data?.feedback;
    if (shouldLogEvent) {
      await this.logEventInCliq(userId, trackEventDto);
    }
    if (shouldLogEvent && (event_type === EventTypes.UNINSTALL || hasFeedback)) {
      await this.emailQuitFeedback(trackEventDto, email, reason);
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
}
