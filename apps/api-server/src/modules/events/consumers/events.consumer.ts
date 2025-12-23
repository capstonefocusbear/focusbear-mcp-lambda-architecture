import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@app/observability';
import { Job } from 'bull';
import axios from 'axios';
import { BrevoService } from '@app/brevo/brevo.service';
import { I18nService } from 'nestjs-i18n';
import { PusherBeamsService } from '@app/pusher-beams';
import { Auth0ManagementService } from '@app/auth0/services/auth0-management.service';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { TrackEventDto } from '../dto/track-event.dto';
import {
  BullQueues,
  BullWorkers,
  DISTRACTION_BLOCK_EVENTS,
  IMPACT_MEASUREMENT_EVENT_TYPES,
  ONE_DAY_SECONDS,
} from '../../../shared/utils/constants';
import { EventTypes } from '../domain/event-types.enum';
import { EventsService } from '../services/events.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { DeviceService } from '../../device/services/device/device.service';
import { UserDailyStatsService } from '../../user/services/user-daily-stats/user-daily-stats.service';

@Processor(BullQueues.EVENTS)
export class EventsConsumer {
  private readonly secretKey = process.env.FIELD_TRANSFORMER_ENCRYPTION_KEY;

  private readonly algorithm = 'aes-256-cbc';

  private redisClient = new Redis(`redis://${process.env.REDIS_HOSTNAME}:${process.env.REDIS_PORT}`);

  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly brevoService: BrevoService,
    private readonly pusherBeamsService: PusherBeamsService,
    private readonly i18nService: I18nService,
    private readonly eventsService: EventsService,
    private readonly userRepository: UserRepository,
    private readonly userDailyStatsService: UserDailyStatsService,
    private readonly deviceService: DeviceService,
    private readonly auth0ManagementService: Auth0ManagementService,
  ) {}

  @Process(BullWorkers.TRACK_EVENT)
  async readOperationJob(
    job: Job<{
      trackEventDto: TrackEventDto;
      user_id: string;
      user_auth0_id: string;
      device_id: string;
      app_version: string;
      user_language: string;
      user_timezone: string;
    }>,
  ) {
    const {
      data: { user_id, user_auth0_id, trackEventDto, device_id, app_version, user_language, user_timezone },
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
      await this.eventsService.saveImpactEvent(
        event_type as EventTypes,
        user_id,
        trackEventDto.event_data?.data?.quantity,
      );

      const isDistractionBlockEvent = DISTRACTION_BLOCK_EVENTS.includes(event_type as EventTypes);
      if (isDistractionBlockEvent) {
        await this.userDailyStatsService.updateDistractionBlockCount(user_id, user_timezone);
      }

      const email = await this.findEmail(user_id, user_auth0_id);
      await this.eventsService.handleEventBroadcast(user_id, trackEventDto, email);

      const brevoResponse = await this.safeRegisterBrevoEvent(email, trackEventDto);

      if (brevoResponse) {
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
      }

      // update user updated_at field to indicate activity
      await this.userRepository.update(user_id, { updated_at: new Date().toISOString() });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      const cliqUrl = `${process.env.ZOHO_CLIQ_BACKEND_BOT_WEBHOOK}?zapikey=${process.env.ZOHO_CLIQ_API_KEY}`;
      const body = {
        channel: process.env.ZOHO_CLIQ_QUIT_UNINSTALL_CHANNEL,
        message: `Error in track-event queue for user with ID: ${user_id}\nTrack event: \`\`\`${JSON.stringify(
          trackEventDto,
        )}\`\`\`\nError: \`\`\`${error}\`\`\``,
      };

      await axios.post(cliqUrl, body);
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

  async findEmail(userId: string, auth0Id: string): Promise<string> {
    // Try to get the encrypted email from Redis
    let encryptedEmail = await this.redisClient.get(`user:${userId}:email`);
    if (encryptedEmail) {
      // Decrypt and return the email if found in cache
      return this.decryptEmail(encryptedEmail);
    }
    // Fetch the email from Auth0 if not in cache
    const auth0User = await this.auth0ManagementService.getAuth0User(auth0Id);
    const email = auth0User?.email || 'some@email.com';

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

  private async safeRegisterBrevoEvent(email: string, trackEventDto: TrackEventDto) {
    try {
      return await this.brevoService.registerBrevoEvent(email, trackEventDto);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      return { status: 'error', message: 'Failed to register Brevo event', error, data: {} };
    }
  }
}
