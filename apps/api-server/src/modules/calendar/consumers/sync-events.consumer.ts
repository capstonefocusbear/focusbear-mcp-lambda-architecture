import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectSentry, SentryService } from '@app/observability';
import { Job, UnrecoverableError } from 'bullmq';
import { In, MoreThan } from 'typeorm';
import { DateTime } from 'luxon';
import axios from 'axios';
import { calendar_v3, google as Google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { NotificationRepository } from '../../notification/repository/notification.repository';
import { CalendarPlatforms } from '../../platform-integrations/domain/calendar-platforms.enum';
import { CalendarRepository } from '../repositories/calendar.repository';
import { PlatformIntegrationRepository } from '../../platform-integrations/repositories/platform-integration.repository';
import { MicrosoftCalendarEventDto } from '../dto/microsoft-calendar-event.dto';
import { Notification } from '../../notification/entities/notification.entity';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { PlatformIntegration } from '../../platform-integrations/entities/platform-integration.entity';
import { PlatformIntegrationMetadataDto } from '../../platform-integrations/dto/platform-integration-metadata.dto';
import {
  InvalidRefreshTokenError,
  InsufficientPermissionsError,
  TransientNetworkError,
  TokenRefreshError,
  AuthenticationFailedError,
} from '../errors/oauth.errors';
import { ReauthService } from '../services/reauth.service';

@Processor(BullQueues.SYNC_EVENTS)
export class SyncEventsConsumer extends WorkerHost {
  private readonly logger = new Logger(SyncEventsConsumer.name);

  // Circuit breaker pattern properties
  private readonly userFailures = new Map<
    string,
    {
      count: number;
      firstFailure: Date;
      lastFailure: Date;
    }
  >();

  // Circuit breaker configuration
  private readonly FAILURE_THRESHOLD = 5;

  private readonly FAILURE_WINDOW_MS = 3600000; // 1 hour

  private readonly BLOCK_DURATION_MS = 86400000; // 24 hours

  // Token refresh configuration
  private readonly TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly notificationRepository: NotificationRepository,
    private readonly calendarRepository: CalendarRepository,
    private readonly platformIntegrationRepository: PlatformIntegrationRepository,
    protected readonly configService: ConfigService,
    private readonly reauthService: ReauthService,
  ) {
    super();
  }

  async process(job: Job<{ platform: CalendarPlatforms; userId: string; account: string }>): Promise<any> {
    const {
      data: { platform, userId, account },
    } = job;

    // Check if user is blocked by circuit breaker
    if (this.isUserBlocked(userId)) {
      // Don't retry blocked users
      throw new UnrecoverableError(`User ${userId} is blocked due to repeated failures`);
    }

    switch (job.name) {
      case BullWorkers.SYNC_EVENTS_FOR_PLATFORM: {
        // Check if account requires reauth - skip silently if so
        const integrationRecord = await this.platformIntegrationRepository.orm.findOne({
          where: { user_id: userId, platform, external_user_id: account },
        });
        if (integrationRecord?.data?.requires_reauth) {
          this.logger.debug(`Skipping sync for user ${userId}, account ${account}: requires reauth`);
          return; // Job completes successfully, exit function entirely
        }

        try {
          this.sentryService.instance().addBreadcrumb({
            category: 'Service',
            level: 'debug',
            message: 'Syncing calendar events',
            data: {
              platform,
              userId,
            },
          });
          const userSyncedEvents = await this.getUserSyncedEvents(platform, userId);
          const externalEventIds = userSyncedEvents.map((syncedEvent) => syncedEvent.external_id);
          const allUserEvents = await this.getAllUserEvents(platform, userId, account);

          const externalUserEventsIds = allUserEvents.map((userEvent) => userEvent.external_id);
          const eventsFromSyncedEvents = allUserEvents.filter((userEvent) => {
            const isEventFromSyncedEvents = externalEventIds.includes(userEvent?.external_id);
            if (isEventFromSyncedEvents) return true;
            return false;
          });

          const eventsToSync = allUserEvents.filter((userEvent) => {
            const isEventFromSyncedEvents = externalEventIds.includes(userEvent?.external_id);
            if (isEventFromSyncedEvents) return false;
            return true;
          });

          const eventsToRemoveIds = externalEventIds.filter((id) => {
            const isEventFromNewData = externalUserEventsIds.includes(id);
            if (isEventFromNewData) return false;
            return true;
          });

          if (userId === '9884b0af-dc9f-4207-964e-e4db537a2234') {
            // Jeremy's Events
            this.logger.debug(`Events From Synced Events: ${eventsFromSyncedEvents.length}`);
            this.logger.debug(`Events To Sync (New): ${JSON.stringify(eventsToSync)}`);
            this.logger.debug(`Events To Remove Ids: ${JSON.stringify(eventsToRemoveIds)}`);
          }

          await Promise.all(
            eventsFromSyncedEvents.map(async (syncedEvent) => {
              const updateData = {
                summary: syncedEvent.summary,
                description: syncedEvent.description,
                event_begins: syncedEvent.event_begins,
                event_ends: syncedEvent.event_ends,
                external_metadata: syncedEvent.external_metadata,
              };
              await this.notificationRepository.orm.update({ external_id: syncedEvent.external_id }, updateData);
            }),
          );

          await this.notificationRepository.orm.save(eventsToSync);
          await this.notificationRepository.orm.delete({ external_id: In(eventsToRemoveIds) });

          // Reset failure count on success
          this.resetUserFailureCount(userId);
        } catch (error) {
          // Track failures for circuit breaker
          this.incrementUserFailureCount(userId);

          // Determine if error is recoverable
          if (
            error instanceof InvalidRefreshTokenError ||
            error instanceof InsufficientPermissionsError ||
            error instanceof AuthenticationFailedError
          ) {
            // These errors require user action - don't retry
            throw new UnrecoverableError(error.message);
          }

          if (error instanceof TransientNetworkError) {
            // Network errors should retry with backoff
            throw error; // Will trigger BullMQ retry
          }

          // Check if we've exceeded retry attempts
          if (job.attemptsStarted >= (job.opts?.attempts || 3)) {
            // Final attempt failed
            this.sentryService.instance().captureException(error, {
              level: 'error',
              extra: {
                userId,
                platform,
                account,
                attemptsMade: job.attemptsStarted,
                jobId: job.id,
              },
            });
            throw new UnrecoverableError(`Max retries exceeded: ${error.message}`);
          }

          // Log and re-throw for retry
          this.sentryService.instance().captureException(error, { level: 'warning' });
          console.error(
            'Problem with calendar events. Error in sync-events-for-platform queued job: ',
            userId,
            error,
            platform,
            account,
          );
          throw error;
        }
        break;
      }

      default:
        break;
    }

    throw new Error('Method not implemented.');
  }

  async getUserSyncedEvents(platform: CalendarPlatforms, userId: string) {
    const currentTime: Date = DateTime.now().toJSDate();
    return this.notificationRepository.orm.find({
      where: { user_id: userId, event_begins: MoreThan(currentTime), platform },
    });
  }

  async getAllUserEvents(platform: CalendarPlatforms, userId: string, account: string) {
    if (platform === CalendarPlatforms.GOOGLE) return this.getGoogleEvents(userId, account);
    if (platform === CalendarPlatforms.MICROSOFT) return this.getMicrosoftEvents(userId, account);
    return null;
  }

  async getPlatformIntegrationData(platform: string, userId: string, userExternalId?: string) {
    if (platform === IntegrationPlatforms.GOOGLE || platform === IntegrationPlatforms.MICROSOFT) {
      const platformRecord = await this.platformIntegrationRepository.orm.findOne({
        where: { user_id: userId, platform, external_user_id: userExternalId },
      });
      return platformRecord;
    }
    const platformRecord = await this.platformIntegrationRepository.orm.findOne({
      where: { user_id: userId, platform },
    });
    return platformRecord;
  }

  async getGoogleEvents(userId: string, account: string) {
    const platform = CalendarPlatforms.GOOGLE;
    // get platform integration data according to userId and accountId.
    const record = await this.platformIntegrationRepository.orm.findOne({
      where: { user_id: userId, platform, external_user_id: account },
    });
    if (!record) throw new Error('No platform integration data found');
    const nodeEnv = this.configService.get('NODE_ENV') ? this.configService.get('NODE_ENV') : 'dev';
    const clientId =
      nodeEnv === 'dev'
        ? this.configService.get('GOOGLE_DEVELOPMENT_CLIENT_ID')
        : this.configService.get('GOOGLE_CLIENT_ID');
    const clientSecret =
      nodeEnv === 'dev'
        ? this.configService.get('GOOGLE_DEVELOPMENT_CLIENT_SECRET')
        : this.configService.get('GOOGLE_CLIENT_SECRET');
    const callbackUrl =
      nodeEnv === 'dev'
        ? this.configService.get('GOOGLE_DEVELOPMENT_CALLBACK_URL')
        : this.configService.get('GOOGLE_CALLBACK_URL');

    const oauth2Client = new Google.auth.OAuth2(clientId, clientSecret, callbackUrl);
    oauth2Client.setCredentials(record.data);

    // Add token event listener for monitoring token refreshes
    oauth2Client.on('tokens', (tokens) => {
      // Log token refresh for monitoring
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'info',
        message: 'OAuth2 tokens refreshed automatically',
        data: {
          userId,
          account,
          hasRefreshToken: !!tokens.refresh_token,
          expiryDate: tokens.expiry_date,
          expiresIn: tokens.expiry_date ? tokens.expiry_date - DateTime.local().toMillis() : 'unknown',
        },
      });

      // Store new tokens asynchronously (fire-and-forget to avoid blocking)
      this.updateStoredTokens(userId, account, tokens, platform).catch((error) => {
        console.error('Failed to update stored tokens:', error);
        this.sentryService.instance().captureException(error, {
          level: 'warning',
          extra: { userId, account, platform },
        });
      });
    });

    // Validate required scopes before API calls
    const REQUIRED_SCOPES = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
    ];

    // Validate scopes if available
    if ((record.data as any).scope) {
      const grantedScopes = (record.data as any).scope.split(' ');
      const missingScopes = REQUIRED_SCOPES.filter((scope) => !grantedScopes.includes(scope));

      if (missingScopes.length > 0) {
        await this.reauthService.markIntegrationForReauth(userId, account, {
          reason: 'missing_scopes',
          required: REQUIRED_SCOPES,
          granted: grantedScopes,
          missing: missingScopes,
        });

        throw new UnrecoverableError(`Missing required scopes: ${missingScopes.join(', ')}`);
      }
    }

    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Token data',
      data: {
        platform,
        hasAccessToken: !!record.data.access_token,
        hasRefreshToken: !!record.data.refresh_token,
        expiryDate: record.data.expiry_date ? DateTime.fromMillis(record.data.expiry_date).toISO() : null,
      },
    });

    // Proactive token refresh with configurable buffer to prevent expiration
    const now = DateTime.local().toMillis();
    const shouldRefresh = !record.data.expiry_date || record.data.expiry_date < now + this.TOKEN_REFRESH_BUFFER_MS;

    if (shouldRefresh) {
      if (!record.data.refresh_token) {
        // No refresh token available - mark for reauth
        await this.reauthService.markIntegrationForReauth(userId, account, {
          reason: 'no_refresh_token',
          hasExpired: !record.data.expiry_date || record.data.expiry_date < now,
          tokenExpiryDate: record.data.expiry_date,
        });
        throw new InvalidRefreshTokenError(
          `No refresh token available for user ${userId}. Re-authorization required.`,
          { userId, account, hasRefreshToken: false },
        );
      }

      // Log proactive refresh attempt
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'info',
        message: 'Proactive token refresh initiated',
        data: {
          userId,
          account,
          expiryDate: record.data.expiry_date,
          timeUntilExpiry: record.data.expiry_date ? record.data.expiry_date - now : 'unknown',
          isProactive: record.data.expiry_date > now,
        },
      });

      // Perform token refresh
      try {
        const response = await oauth2Client.refreshAccessToken();
        const authToken: PlatformIntegrationMetadataDto = response.credentials;

        // Update stored tokens with success logging
        await this.updateStoredTokens(userId, account, authToken, platform);

        // Set the new credentials
        oauth2Client.setCredentials(authToken);

        // Log successful proactive refresh
        this.sentryService.instance().addBreadcrumb({
          category: 'Service',
          level: 'info',
          message: 'Proactive token refresh completed successfully',
          data: {
            userId,
            account,
            previousExpiryDate: record.data.expiry_date,
            newExpiryDate: authToken.expiry_date,
            refreshedBeforeExpiry: record.data.expiry_date > now,
          },
        });
      } catch (error) {
        const googleError = error as any;
        const errorDetails = {
          statusCode: googleError?.response?.status,
          errorCode: googleError?.response?.data?.error,
          errorDescription: googleError?.response?.data?.error_description,
          message: googleError?.message,
          userId,
          account,
          hasRefreshToken: !!record.data.refresh_token,
          tokenExpiryDate: record.data.expiry_date,
        };

        // Log to Sentry with full context including proactive refresh info
        this.sentryService.instance().captureException(error, {
          level: 'error',
          extra: {
            ...errorDetails,
            isProactiveRefresh: record.data.expiry_date > now,
            refreshBuffer: this.TOKEN_REFRESH_BUFFER_MS,
            timeUntilExpiry: record.data.expiry_date ? record.data.expiry_date - now : 'unknown',
          },
          fingerprint: ['google-oauth', googleError?.response?.data?.error || 'unknown'],
        });

        // Throw specific error types for different failures
        if (googleError?.response?.status === 401 && googleError?.response?.data?.error === 'invalid_grant') {
          // Refresh token is invalid - user must re-authenticate
          await this.reauthService.markIntegrationForReauth(userId, account, {
            reason: 'invalid_refresh_token',
            errorCode: googleError?.response?.data?.error,
            statusCode: googleError?.response?.status,
          });

          throw new InvalidRefreshTokenError(
            `Refresh token invalid for user ${userId}. Re-authorization required.`,
            errorDetails,
          );
        }

        if (googleError?.code === 'ENOTFOUND' || googleError?.code === 'ETIMEDOUT') {
          // Network error - should retry
          throw new TransientNetworkError(`Network error refreshing token: ${googleError.message}`, errorDetails);
        }

        // Unknown error - preserve original message
        throw new TokenRefreshError(
          `Failed to refresh Google token: ${googleError?.message || 'Unknown error'}`,
          errorDetails,
        );
      }
    }

    const calendar = Google.calendar({ version: 'v3', auth: oauth2Client });

    let googleCalendars;
    try {
      const response = await calendar.calendarList.list();
      googleCalendars = response.data;
    } catch (error) {
      const apiError = error as any;

      if (apiError?.response?.status === 403) {
        // Insufficient permissions - user needs to re-authorize
        const missingScope = apiError?.response?.data?.error_description;

        await this.reauthService.markIntegrationForReauth(userId, account, {
          reason: 'insufficient_permissions',
          missingScope,
          currentScopes: (record.data as any).scope,
        });

        this.sentryService.instance().captureException(error, {
          level: 'warning',
          extra: {
            userId,
            account,
            missingScope,
            currentScopes: (record.data as any).scope,
          },
          fingerprint: ['google-calendar', 'insufficient-permissions'],
        });

        throw new InsufficientPermissionsError(
          `Calendar access denied for user ${userId}. Missing scope: ${missingScope}`,
          { userId, account, missingScope },
        );
      }

      if (apiError?.response?.status === 401) {
        // Token invalid even after refresh - critical failure
        await this.reauthService.markIntegrationForReauth(userId, account, {
          reason: 'authentication_failed',
          statusCode: apiError?.response?.status,
        });

        throw new AuthenticationFailedError(`Authentication failed after token refresh for user ${userId}`, {
          userId,
          account,
        });
      }

      throw error;
    }

    const { items: calendarList } = googleCalendars;
    const calendarsFromGoogleIds: string[] = calendarList.map((googleCalendar) => googleCalendar.id);
    const syncedGoogleCalendars = await this.calendarRepository.orm.find({
      where: { calendar_id: In(calendarsFromGoogleIds), user_id: userId, platform, is_selected: true },
    });
    const syncedGoogleCalendarIds = syncedGoogleCalendars.map((syncedCalendar) => syncedCalendar.calendar_id);

    // fetch events from only selected calendars
    const events = await Promise.all(
      calendarsFromGoogleIds
        .filter((calendarId) => syncedGoogleCalendarIds.includes(calendarId))
        .map(async (calendarId) => this.getGoogleEvent({ userId, calendarId, calendar })),
    );

    return events.flat().filter((event) => !!event);
  }

  async getMicrosoftEvents(userId: string, accountId: string) {
    const platform = CalendarPlatforms.MICROSOFT;
    // get platform integration data accoding to userId and accountId.
    const record = await this.platformIntegrationRepository.orm.findOne({
      where: { user_id: userId, platform, external_user_id: accountId },
    });
    const { access_token } = record.data;
    const baseUrl = 'https://graph.microsoft.com/v1.0';
    if (!record.data.expiry_date || record.data.expiry_date < DateTime.local().toMillis() + 1000) {
      return [];
    }
    const headers = {
      Authorization: `Bearer ${access_token}`,
    };
    const { data: microsoftCalendars } = await axios.get(`${baseUrl}/me/calendars`, { headers });
    const { value: calendarList } = microsoftCalendars;
    const calendarsFromMicroSoftIds: string[] = calendarList.map((microsoftCalendar) => microsoftCalendar.id);
    const syncedMicrosoftCalendars = await this.calendarRepository.orm.find({
      where: { calendar_id: In(calendarsFromMicroSoftIds), user_id: userId, platform, is_selected: true },
    });
    const syncedMicrosoftCalendarIds = syncedMicrosoftCalendars.map(
      (microsoftCalendar) => microsoftCalendar.calendar_id,
    );
    // fetch events from only selected calendars
    const events = await Promise.all(
      calendarsFromMicroSoftIds
        .filter((calenarId) => syncedMicrosoftCalendarIds.includes(calenarId))
        .map(async (calendarId) => this.getMicrosoftEvent({ userId, calendarId, headers, accountId })),
    );

    return events.flat().filter((event) => !!event);
  }

  async getGoogleEvent({
    userId,
    calendarId,
    calendar,
  }: {
    userId: string;
    calendarId: string;
    calendar: calendar_v3.Calendar;
  }) {
    const { data } = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    if (!data?.items?.length) return [];
    const eventsData = await calendar.events.get({ calendarId, eventId: data?.items[0]?.id });
    const creatorEmail = eventsData?.data?.creator?.email;

    return data.items.map((event) => this.notificationGoogleAdapter({ event, userId, calendarId, creatorEmail }));
  }

  async getMicrosoftEvent({
    userId,
    calendarId,
    headers,
    accountId,
  }: {
    userId: string;
    calendarId: string;
    headers: any;
    accountId: string;
  }) {
    const baseUrl = 'https://graph.microsoft.com/v1.0';
    const { data: eventData } = await axios.get(`${baseUrl}/me/calendars/${calendarId}/events`, {
      headers,
      params: {
        $filter: `start/dateTime ge '${new Date().toISOString()}'`,
        $orderby: 'start/dateTime',
      },
    });
    const { value: eventList } = eventData;
    return eventList.map((event) => this.notificationMicrosoftAdapter({ event, calendarId, userId, accountId }));
  }

  notificationGoogleAdapter({
    event,
    userId,
    calendarId,
    creatorEmail: accountId,
  }: {
    event: calendar_v3.Schema$Event;
    userId: string;
    calendarId: string;
    creatorEmail: string;
  }) {
    const { id, summary, description, start, end } = event;
    const { date, dateTime: event_begins } = start;
    const { dateTime: event_ends } = end;

    if (date) {
      return;
    }
    return new Notification({
      user_id: userId,
      platform: CalendarPlatforms.GOOGLE,
      platform_account: accountId,
      calendar_id: calendarId,
      external_id: id,
      summary,
      description,
      event_begins: new Date(event_begins),
      event_ends: new Date(event_ends),
      external_metadata: event,
    });
  }

  notificationMicrosoftAdapter({
    event,
    userId,
    calendarId,
    accountId,
  }: {
    event: MicrosoftCalendarEventDto;
    userId: string;
    calendarId: string;
    accountId: string;
  }) {
    const { id, subject, bodyPreview, start, end, isAllDay } = event;
    const { dateTime: event_begins } = start;
    const { dateTime: event_ends } = end;
    if (isAllDay) return;

    return new Notification({
      user_id: userId,
      platform: CalendarPlatforms.MICROSOFT,
      calendar_id: calendarId,
      platform_account: accountId,
      external_id: id,
      summary: subject,
      description: bodyPreview,
      event_begins: new Date(event_begins),
      event_ends: new Date(event_ends),
      external_metadata: event,
    });
  }

  private isUserBlocked(userId: string): boolean {
    const failures = this.userFailures.get(userId);
    if (!failures) return false;

    // Check if blocked period has expired
    const blockExpiry = failures.lastFailure.getTime() + this.BLOCK_DURATION_MS;
    if (Date.now() > blockExpiry) {
      this.userFailures.delete(userId);
      return false;
    }

    // Check if user has exceeded failure threshold
    return failures.count >= this.FAILURE_THRESHOLD;
  }

  private incrementUserFailureCount(userId: string): void {
    const existing = this.userFailures.get(userId) || {
      count: 0,
      firstFailure: new Date(),
      lastFailure: new Date(),
    };

    // Reset if outside failure window
    if (Date.now() - existing.firstFailure.getTime() > this.FAILURE_WINDOW_MS) {
      existing.count = 0;
      existing.firstFailure = new Date();
    }

    existing.count++;
    existing.lastFailure = new Date();
    this.userFailures.set(userId, existing);

    // Log if threshold reached
    if (existing.count === this.FAILURE_THRESHOLD) {
      this.logger.warn(`User ${userId} blocked due to ${this.FAILURE_THRESHOLD} failures`);

      // Log to Sentry
      this.sentryService.instance().captureMessage(`User ${userId} circuit breaker activated`, 'warning');
    }
  }

  private resetUserFailureCount(userId: string): void {
    this.userFailures.delete(userId);
  }

  // Helper method to update stored OAuth tokens
  private async updateStoredTokens(userId: string, account: string, tokens: any, platform: string): Promise<void> {
    try {
      const existingRecord = await this.getPlatformIntegrationData(platform, userId, account);

      if (!existingRecord) {
        throw new Error(`No existing platform integration found for user ${userId}, account ${account}`);
      }

      // Merge new token data with existing data, preserving other fields
      const updatedData = {
        ...existingRecord.data,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || existingRecord.data.refresh_token, // Keep existing if not provided
        expiry_date: tokens.expiry_date,
        // Preserve any existing fields not related to tokens
        requires_reauth: false, // Clear reauth flag on successful refresh
      };

      const platformIntegration = new PlatformIntegration({
        ...existingRecord,
        data: updatedData,
      });

      await this.platformIntegrationRepository.orm.save(platformIntegration);

      // Log successful token update
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'OAuth tokens updated in database',
        data: {
          userId,
          account,
          platform,
          expiryDate: tokens.expiry_date,
          hasRefreshToken: !!(tokens.refresh_token || existingRecord.data.refresh_token),
        },
      });
    } catch (error) {
      // Log error but don't throw - token updates shouldn't block sync
      console.error('Failed to update stored tokens:', error);
      this.sentryService.instance().captureException(error, {
        level: 'error',
        extra: { userId, account, platform, tokenData: tokens },
        fingerprint: ['token-update-failure'],
      });
      throw error; // Re-throw for caller to handle
    }
  }
}
