// biome-ignore-all lint/suspicious/noConsole: service logging
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Raw } from 'typeorm';
import { SentryTraced } from '@sentry/nestjs';
import { InjectSentry, SentryService, emitUserActivityMetric } from '@app/observability';
import { DateTime } from 'luxon';
import { FastifyReply } from 'fastify';
import { RevenueCatService } from '@app/revenue-cat';
import { Auth0ManagementService } from '@app/auth0';
import { HabitOption, OpenAIService } from '@app/openai';
import { StripeService } from '@app/stripe';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ChatCompletionMessageParam } from 'openai/resources';
import { SendGridService, isTestEmail } from '@app/send-grid';
import { R2Service } from '@app/r2';
import { GetUsers200ResponseOneOfInner } from 'auth0';
import axios from 'axios';
import { sanitizeUrl } from '@braintree/sanitize-url';
import { OperatingSystem } from '../../../../shared/domain/operating-system.enum';
import { callPromiseWithTimeout, maskEmail } from '../../../../shared/utils/helpers';
import { UserRepository } from '../../repositories/user.repository';
import { SyncUserAccountDto } from '../../dto/sync-user-account.dto';
import { UserStripePropertiesDto } from '../../dto/update-user-stripe-property.dto';
import { UserAuthContext } from '../../../auth/domain/user-auth-context.model';
import { User } from '../../entities/user.entity';
import { UserSummaryResponseDto } from '../../dto/user-summary-response.dto';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { UpdateLocalDeviceSettingsDto } from '../../dto/update-local-device-settings.dto';
import { CurrentActivityProps } from '../../../activity/domain/current-activity-props.model';
import { GetUsersQueryDto } from '../../dto/get-users-query.dto';
import { CompletedActivityRepository } from '../../../activity/repositories/completed-activity.repository';
import { CompletedFocusBlockRepository } from '../../../focus-mode/repositories/completed-focus-block.repository';
import { CompletedFocusBlock } from '../../../focus-mode/entities/completed-focus-block.entity';
import { UpdateFocusBlockDto } from '../../dto/update-focus-block.dto';
import { CreateFocusBlockDto } from '../../dto/create-focus-block.dto';
import { UserTypes } from '../../domain/user-types.enum';
import { HabitPackRepository } from '../../../habit-pack/repositories/habit-pack.repository';
import { FocusModeTemplatesRepository } from '../../../focus-mode-template/repositories/focus-mode-templates.repository';
import { FocusModeService } from '../../../focus-mode/services/focus-mode/focus-mode.service';
import { FocusMode } from '../../../focus-mode/entities/focus-mode.entity';
import { UpdateUserSignUpFieldDto } from '../../dto/update-user-sign-up-field.dto';
import { UpdateUserMetadataDto } from '../../dto/update-user-metadata.dto';
import { UserDailyStatsService } from '../user-daily-stats/user-daily-stats.service';
import { UserProgressUpdateTypes } from '../../domain/user-progress-update-types.enum';
import { AdminAccessRequestRepository } from '../../repositories/admin-access-requests.repository';
import { AdminAccessRequest } from '../../entities/admin-access-requests.entity';
import { UsersOrderByOptions } from '../../domain/find-users-sort-by-options.enum';
import { CompletedActivityService } from '../../../activity/services/completed-activity/completed-activity.service';
import { CompletedActivitySequence } from '../../../activity/entities/completed-activity-sequence.entity';
import { UpdateLongTermGoalsDto } from '../../dto/update-long-term-goals.dto';
import { UpdateUsernameDto } from '../../dto/update-username.dto';
import {
  BullQueues,
  BullWorkers,
  DEFAULT_AI_RESPONSE_TIMEOUT_MS,
  EMAIL_SUBJECTS,
  FOCUS_BEAR_EMAILS,
  MAX_ATTACHMENT_SIZE_BYTES,
  USERNAME_VALIDATION_TIMEOUT,
  S3_BUCKET_PROFILE_IMAGES,
} from '../../../../shared/utils/constants';
import { RoutineType } from '../../domain/routine-type.enum';
import { MotivationalSummaryQueryDto } from '../../dto/get-motivational-summary-query.dto';
import { SearchForUserDto } from '../../dto/search-for-user.dto';
import { PlatformIntegrationsService } from '../../../platform-integrations/services/platform-integrations.service';
import { DeviceRepository } from '../../../device/repositories/device.repository';
import { IsUrlSafeDto } from '../../dto/is-url-safe.dto';
import { IsAppSafeDto } from '../../dto/is-app-safe.dto';
import { GenerateOccupationSitesDto } from '../../dto/generate-occupation-sites.dto';
import { DeviceService } from '../../../device/services/device/device.service';
import { Streak } from '../../intefaces/streak.interface';
import { UninstallApplicationQueryDto } from '../../dto/uninstall-application-query.dto';
import { CompletedActivitySequenceService } from '../../../activity/services/completed-activity-sequence/completed-activity-sequence.service';
import {
  DEFAULT_AI_PIPELINE_METRICS_NAMESPACE,
  DEFAULT_METRICS_SERVICE,
  DEFAULT_QUEUE_METRICS_NAMESPACE,
  MetricsConfig,
} from '../../../../config/metrics.config';
import { AccountabilityBuddyService } from '../../../accountability-buddy/services/accountability-buddy.service';

const JEREMYS_USER_ID = '9884b0af-dc9f-4207-964e-e4db537a2234';

@Injectable()
export class UserService {
  private static readonly ALLOWED_PROFILE_IMAGE_CONTENT_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ]);

  private readonly verboseLogger = new Logger(UserService.name);

  private verboseLogCache = new Map<string, boolean>();

  constructor(
    private readonly completedFocusBlock: CompletedFocusBlockRepository,
    private readonly completedActivityRepository: CompletedActivityRepository,
    private readonly completedActivityService: CompletedActivityService,
    private readonly userRepository: UserRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly revenueCatService: RevenueCatService,
    private readonly userSettingsService: UserSettingsService,
    private readonly stripeService: StripeService,
    private readonly habitPackRepository: HabitPackRepository,
    private readonly focusModeTemplateRepository: FocusModeTemplatesRepository,
    @Inject(forwardRef(() => FocusModeService))
    private readonly focusModeService: FocusModeService,
    private readonly config: ConfigService,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly userDailyStatsService: UserDailyStatsService,
    private readonly adminAccessRequestRepository: AdminAccessRequestRepository,
    private readonly openAIService: OpenAIService,
    @InjectQueue(BullQueues.REVENUE_CAT_STATUS) private revenueCatQueue: Queue,
    @InjectQueue(BullQueues.STRIPE_CUSTOMER) private stripeCustomerQueue: Queue,
    private readonly platformIntegrationsService: PlatformIntegrationsService,
    private readonly deviceRepository: DeviceRepository,
    @Inject(forwardRef(() => DeviceService))
    private readonly deviceService: DeviceService,
    private readonly emailService: SendGridService,
    @Inject(forwardRef(() => CompletedActivitySequenceService))
    private completedActivitySequenceService: CompletedActivitySequenceService,
    @Inject(forwardRef(() => AccountabilityBuddyService))
    private readonly accountabilityBuddyService: AccountabilityBuddyService,
    private readonly r2Service: R2Service,
  ) {}

  @SentryTraced('syncUserAccount')
  async syncUserAccount({ auth0_id, email, auth0_client }: SyncUserAccountDto): Promise<UserAuthContext> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Syncing user account',
        data: {
          auth0_id,
        },
      });
      const [auth0User, registeredUser] = await this.consistentlyGetUser(auth0_id);
      if (!auth0User) throw new NotFoundException('User does not exist in Auth0!');
      const accountsWithSameEmail = await this.auth0ManagementService.getAuth0UsersWithEmail(email);
      const user = await this.updateOrCreateUser({ auth0_id, email, auth0_client }, registeredUser);
      if (!registeredUser) {
        await Promise.allSettled([
          this.handleInitialRegistration(user.id),
          this.accountabilityBuddyService.linkPendingInvitationsForNewUser(user.id, email), // Link pending accountability buddy invitations for the newly registered user
        ]);
      }
      // Send email to support if user signs up with existing email
      if (!registeredUser && accountsWithSameEmail?.length > 1) {
        await this.sendDuplicatesEmail(auth0_id, accountsWithSameEmail);
      }
      const subscriptionStatus = await this.getSubscription(user.id);

      return { id: user.id, subscriptionStatus, stripeCustomerId: user.stripe_customer_id };
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private async consistentlyGetUser(auth0_id: string): Promise<[any, User]> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Fetching auth0 user',
      data: {
        auth0_id,
      },
    });
    const auth0UserPromise = this.auth0ManagementService.getAuth0User(auth0_id).catch(() => undefined);
    const dbUserPromise = this.userRepository.orm.findOne({ where: { auth0_id } });
    const [auth0User, dbUser] = await Promise.all([auth0UserPromise, dbUserPromise]);
    return [auth0User, dbUser];
  }

  @SentryTraced('updateOrCreateUser')
  async updateOrCreateUser(
    { auth0_id, email, auth0_client }: SyncUserAccountDto,
    registeredUser?: User,
  ): Promise<User> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating or creating user',
        data: {
          auth0_id,
        },
      });

      const operatingSystem =
        (this.deviceService.parseDeviceFromAuth0Client(auth0_client, auth0_client?.user_agent) as OperatingSystem) ??
        OperatingSystem.Unknown;

      // Queue background job to create Stripe customer if needed
      // This makes the endpoint faster by not waiting for Stripe API calls
      if (registeredUser) {
        // For existing users, only queue job if they don't have a stripe_customer_id
        if (!registeredUser.stripe_customer_id) {
          await this.stripeCustomerQueue.add(
            BullWorkers.CREATE_STRIPE_CUSTOMER,
            {
              user_id: registeredUser.id,
              email,
              operating_system: operatingSystem,
            },
            {
              jobId: `create-stripe-customer:${registeredUser.id}`,
              removeOnComplete: true,
              removeOnFail: false,
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000, // 2s, 4s, 8s
              },
            },
          );
        }
        return registeredUser;
      }

      // For new users, create user first then queue Stripe customer creation
      const newUserProperties: UserStripePropertiesDto = {
        auth0_id,
        stripe_customer_id: null, // Will be set by background job
      };
      const newUser = new User({ ...newUserProperties });
      const newlySavedUser = await this.userRepository.create(newUser);

      // Queue background job to create Stripe customer
      await this.stripeCustomerQueue.add(
        BullWorkers.CREATE_STRIPE_CUSTOMER,
        {
          user_id: newlySavedUser.id,
          email,
          operating_system: operatingSystem,
        },
        {
          jobId: `create-stripe-customer:${newlySavedUser.id}`,
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000, // 2s, 4s, 8s
          },
        },
      );

      // Create device entry for new users
      if (operatingSystem !== OperatingSystem.Unknown) {
        try {
          await this.deviceService.createOrUpdateDevice(
            {
              operating_system: operatingSystem,
              metadata: {
                source: 'user_creation',
                auth0_client_id: auth0_client?.client_id,
                created_at: new Date().toISOString(),
              },
            },
            newlySavedUser.id,
          );
        } catch (error) {
          this.sentryService.instance().captureException(error, {
            level: 'error',
            extra: {
              auth0_id,
              email,
              operating_system: operatingSystem,
            },
          });
        }
      }

      return newlySavedUser;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private async handleInitialRegistration(user_id: string): Promise<void> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Handling initial registration',
        data: {
          user_id,
        },
      });
      const settingsConfig = this.config.get('constants.userSettings');
      const defaultSettings = settingsConfig.generateDefault();

      const registrationTasks = [
        this.revenueCatService.grantTrialAccess(user_id),
        this.userSettingsService.updateSettings({ user_id }, defaultSettings, false, { is_onboarding: true }),
      ];

      await Promise.all([...registrationTasks]);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getUserDetails(id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting user details',
        data: {
          user_id: id,
        },
      });
      const userDetails = await this.userRepository.getUserDetails(id);
      if (!userDetails) throw new NotFoundException(`User with id: ${id} does not exist!`);
      const auth0User = await this.auth0ManagementService.getAuth0User(userDetails.auth0_id);
      const email = auth0User?.email || '';
      const {
        focus_modes,
        teamToAdmin,
        local_device_settings: _localDeviceSettings,
        onboarding_progress: _onboardingProgress,
        ...userDetailsWithoutDeprecated
      } = userDetails;
      // map focus_mode_template_id null values to undefined to exclude property from response
      const formattedFocusModes = focus_modes?.map((focusMode) => {
        if (focusMode.focus_mode_template_id === null) {
          return { ...focusMode, focus_mode_template_id: undefined };
        }
        return focusMode;
      });

      const adminForTeams = teamToAdmin?.map(({ team }) => team);

      return {
        ...userDetailsWithoutDeprecated,
        email,
        focus_modes: formattedFocusModes,
        email_verified: auth0User.email_verified,
        adminForTeams,
      };
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getUserSummary(id: string, from?: string): Promise<UserSummaryResponseDto> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting user summary',
        data: {
          user_id: id,
          from,
        },
      });
      const userSummary = await this.userRepository.getUserSummary(id);
      if (!userSummary) throw new NotFoundException(`User with id: ${id} does not exist!`);
      const auth0User = await this.auth0ManagementService.getAuth0User(userSummary.auth0_id);
      const {
        teamToAdmin,
        id: userId,
        stripe_customer_id,
        username,
        language,
        has_consented_to_terms_of_service,
        user_type,
        has_consented_to_privacy_policy,
      } = userSummary;
      const adminForTeams =
        teamToAdmin
          ?.map(({ team }) => (team ? { id: team.id, name: team.name } : null))
          .filter((team): team is { id: string; name: string } => Boolean(team)) ?? [];

      return {
        id: userId,
        stripe_customer_id,
        email: auth0User?.email ?? '',
        email_verified: auth0User?.email_verified ?? false,
        username,
        language,
        adminForTeams,
        has_consented_to_terms_of_service,
        user_type,
        has_consented_to_privacy_policy,
      };
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getUserCurrentActivityProps(userId: string): Promise<CurrentActivityProps> {
    const startTimeMs = Date.now();
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'info',
        message: 'getUserCurrentActivityProps:start',
        data: { user_id: userId },
      });

      // fetch minimal user state
      let partialUser = await this.userRepository.getUserCurrentActivityProps(userId);
      if (!partialUser) {
        throw new NotFoundException(`User with id: ${userId} does not exist!`);
      }

      const initialCurrentActivity = partialUser.current_activity_id;
      let currentSequenceCompletedActivityIds: string[] = [];

      // start in parallel
      const todayRoutineProgressPromise = this.completedActivitySequenceService.getRoutinesProgress(
        partialUser.id,
        partialUser.timezone,
      );

      if (partialUser.current_activity) {
        partialUser = await this.recalculateActivityProps(partialUser);

        if (partialUser.current_completing_sequence_log_id) {
          currentSequenceCompletedActivityIds =
            await this.completedActivityService.getCurrentSequenceCompletedActivityIds(
              partialUser.current_completing_sequence_log_id,
            );
        }
      }

      const todayRoutineProgress = await todayRoutineProgressPromise;

      const currentActivityProps = new CurrentActivityProps({
        ...partialUser,
        current_sequence_completed_activities: currentSequenceCompletedActivityIds,
        today_routine_progress: todayRoutineProgress,
      });

      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'getUserCurrentActivityProps:success',
        data: {
          user_id: userId,
          initialCurrentActivity,
          current_activity_id: currentActivityProps.current_activity,
        },
      });

      const elapsedMs = Date.now() - startTimeMs;
      this.logCurrentActivityPropsLatency(userId, elapsedMs, true);
      await this.emitCurrentActivityPropsMetric(userId, elapsedMs, true);

      return currentActivityProps;
    } catch (error) {
      const elapsedMs = Date.now() - startTimeMs;
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.logCurrentActivityPropsLatency(userId, elapsedMs, false, normalizedError);
      await this.emitCurrentActivityPropsMetric(userId, elapsedMs, false, normalizedError);
      this.sentryService.instance().captureException(error, {
        level: 'error',
      });
      throw error;
    }
  }

  private async recalculateActivityProps(partialUser: User) {
    const { activity, shouldRefetchUser } = await this.completedActivityService.recalculateCurrentActivity(partialUser);

    let updatedUser: Partial<User> = partialUser;
    if (partialUser.id === JEREMYS_USER_ID) {
      console.log("Jeremy's values for recalculateActivityProps: ");
      console.log({ activity, shouldRefetchUser });
    }
    if (shouldRefetchUser) {
      updatedUser = await this.userRepository.getUserCurrentActivityProps(partialUser.id);
    }
    return { ...updatedUser, current_activity: activity };
  }

  async updateUserLocalDeviceSettings(
    user_id: string,
    local_device_settings: UpdateLocalDeviceSettingsDto,
  ): Promise<UpdateLocalDeviceSettingsDto> {
    try {
      const { isVerboseLoggingAllowed } = await this.isVerboseLoggingAllowed(user_id);
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating user local device settings',
        data: {
          user_id,
          ...(isVerboseLoggingAllowed && { local_device_settings }),
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
      const updatedSettings = this.mergeLocalSettings(user.local_device_settings, local_device_settings);
      await this.userRepository.orm.update(user_id, {
        local_device_settings: updatedSettings,
        updated_at: new Date().toISOString(),
        has_received_inactivity_warning: false,
      });
      if (local_device_settings?.MacOS?.has_edited_blocked_urls) {
        await this.userDailyStatsService.updateUserOnboardingProgress(
          user_id,
          UserProgressUpdateTypes.EDIT_BLOCKED_URLS,
        );
      }
      return updatedSettings;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getUserLocalDeviceSettings(user_id: string): Promise<UpdateLocalDeviceSettingsDto> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting user local device settings',
        data: {
          user_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
      if (!user.local_device_settings) {
        return { iOS: null, Windows: null, MacOS: null, Android: null, Web: { hasEditedSettings: false } };
      }
      return user.local_device_settings;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private mergeLocalSettings(saved?: UpdateLocalDeviceSettingsDto, update?: UpdateLocalDeviceSettingsDto) {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Merging local settings',
    });
    const baseVersion = {
      MacOS: saved?.MacOS || null,
      Windows: saved?.Windows || null,
      Android: saved?.Android || null,
      iOS: saved?.iOS || null,
      Web: saved?.Web || { hasEditedSettings: false },
    };
    const hasWrongSchema = !update || typeof update !== 'object' || Array.isArray(update);
    if (hasWrongSchema) return baseVersion;
    return Object.assign(baseVersion, update);
  }

  async getUsers({ search }: GetUsersQueryDto) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting users',
        data: {
          search,
        },
      });
      return await this.userRepository.getUsersList({ search });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getFocusBlockSummary(user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Focus blocks weekly summary',
        data: {
          user_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
      const currentTime = DateTime.local();
      const end_date = currentTime.toJSDate();
      const start_date = currentTime.minus({ days: 6 }).toJSDate();
      return await this.completedFocusBlock.getLogsByUserInTimeRange(user_id, {
        from_time: start_date,
        to_time: end_date,
      });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateFocusBlock(user_id: string, id: string, payload: UpdateFocusBlockDto): Promise<CompletedFocusBlock> {
    // `as any` is required because TypeORM's FindOptionsWhere doesn't expose inherited BaseEntity columns
    // (id, user_id) in its generic type parameters for this repository — the query is correct at runtime.
    //
    // TOCTOU note: this is a find-then-update pattern. A concurrent delete between the findOneBy and
    // the update call would result in a no-op update rather than a NotFoundException. Acceptable for
    // this use case — the window is tiny and focus blocks are user-owned with no concurrent deleters
    // in normal operation.
    const block = await this.completedFocusBlock.orm.findOneBy({ id, user_id } as any);
    if (!block) throw new NotFoundException(`Focus block ${id} not found for user`);

    // Preserve original data in metadata (non-destructive edit — only capture on first edit)
    const existingMetadata = block.metadata ?? {};
    const original = existingMetadata.original ?? {
      intention: block.intention,
      achievements: block.achievements,
      distractions: block.distractions,
      focus_duration_seconds: block.focus_duration_seconds,
    };
    const updatedMetadata = { ...existingMetadata, original };

    // `as any` required for same reason as above (metadata partial update shape)
    return this.completedFocusBlock.update(id, {
      ...(payload.intention !== undefined && { intention: payload.intention }),
      ...(payload.achievements !== undefined && { achievements: payload.achievements }),
      ...(payload.distractions !== undefined && { distractions: payload.distractions }),
      ...(payload.focus_duration_seconds !== undefined && { focus_duration_seconds: payload.focus_duration_seconds }),
      metadata: updatedMetadata,
    } as any);
  }

  async deleteFocusBlock(user_id: string, id: string): Promise<void> {
    // `as any` required — see updateFocusBlock comment above
    const block = await this.completedFocusBlock.orm.findOneBy({ id, user_id } as any);
    if (!block) throw new NotFoundException(`Focus block ${id} not found for user`);
    await this.completedFocusBlock.orm.delete({ id, user_id } as any);
  }

  async createManualFocusBlock(user_id: string, payload: CreateFocusBlockDto): Promise<CompletedFocusBlock> {
    // Use provided focus_mode_id or resolve the "Manual Entry" focus mode for this user
    const focus_mode_id = payload.focus_mode_id ?? (await this.resolveManualFocusModeId(user_id));

    // Service-level temporal sanity check (DTO cross-field validator already catches this for HTTP
    // requests, but we guard here too for programmatic callers).
    if (new Date(payload.start_time) >= new Date(payload.finish_time)) {
      throw new BadRequestException('start_time must be earlier than finish_time');
    }

    const block = new CompletedFocusBlock(
      {
        user_id,
        focus_mode_id,
        start_time: new Date(payload.start_time),
        finish_time: new Date(payload.finish_time),
        scheduled_finish_time: new Date(payload.finish_time),
        intention: payload.intention,
        achievements: payload.achievements,
        distractions: payload.distractions,
        focus_duration_seconds: payload.focus_duration_seconds,
        metadata: { is_manual: true },
      },
      { generateId: true },
    );

    return this.completedFocusBlock.create(block);
  }

  /** Returns the id of a "Manual Entry" focus mode for this user, creating it if needed.
   *
   * Note: We fetch all focus modes and filter in memory because the `metadata` column is encrypted,
   * preventing efficient DB-level JSONB path queries. The number of focus modes per user is small,
   * so this is acceptable. We match on `metadata.isManualEntry === true` (not name) so renaming
   * the mode doesn't break the lookup or cause duplicates.
   */
  private async resolveManualFocusModeId(user_id: string): Promise<string> {
    const MANUAL_FOCUS_MODE_NAME = 'Manual Entry';

    // Match by metadata flag (robust to user renaming) rather than name
    const existing = await this.focusModeService.fetchUserFocusModes(user_id);
    const manualMode = existing.find((fm) => fm.metadata?.isManualEntry === true);
    if (manualMode) return manualMode.id;

    // Create one on demand
    const created = await this.focusModeService.createFocusMode(user_id, {
      name: MANUAL_FOCUS_MODE_NAME,
      metadata: { isManualEntry: true },
      allowed_apps: [],
      allowed_urls: [],
      is_ai_enabled: false,
    } as any);

    return created.id;
  }

  async getCompletedActivitySummary(user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting completed activity week summary',
        data: {
          user_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
      return await this.completedActivityRepository.getWeekSummary(user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getUserFocusModes(user_id: string): Promise<FocusMode[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching user focus modes',
        data: {
          user_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
      return await this.focusModeService.fetchUserFocusModes(user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getListOfUsers(
    adminUserId: string,
    take: number,
    skip: number,
    order_by?: UsersOrderByOptions,
  ): Promise<User[]> {
    const adminUser = await this.userRepository.orm.findOneBy({ id: adminUserId });
    if (adminUser.user_type !== UserTypes.ADMIN) {
      throw new UnauthorizedException(`User with ID: ${adminUserId} is not authorized to access this endpoint!`);
    }
    let users: User[] = [];
    if (order_by) {
      users = await this.userRepository.orm.find({
        order: { [order_by]: { direction: 'DESC', nulls: 'LAST' } },
        take,
        skip,
      });
    } else {
      users = await this.userRepository.orm.find({
        order: { created_at: { direction: 'DESC' } },
        take,
        skip,
      });
    }
    const getUserEmail = async (user: User) => {
      try {
        const { email } = await this.auth0ManagementService.getAuth0User(user.auth0_id);
        return { ...user, email };
      } catch (_error) {
        return { ...user, email: null };
      }
    };
    const usersWithEmailsPromise = users.map(getUserEmail);
    return Promise.all(usersWithEmailsPromise);
  }

  async getUserById(user_id: string, { id: searchedId, email, stripe_customer_id }: SearchForUserDto) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (user.user_type !== UserTypes.ADMIN) {
      throw new UnauthorizedException(`User with ID: ${user_id} is not authorized to access this endpoint!`);
    }
    let stripeIdToSearchBy = stripe_customer_id;
    // If searching by email, get user Stripe ID from Stripe and then fetch user using stripe ID
    if (email) {
      const searchedUserStripeId = await this.stripeService.getStripeCustomerId(email);
      if (searchedUserStripeId) {
        stripeIdToSearchBy = searchedUserStripeId;
      } else {
        // Return null if no user in Stripe matches email
        return null;
      }
    }
    const fetchedUser = await this.userRepository.getUserForAdmin(searchedId, stripeIdToSearchBy);
    if (!fetchedUser) {
      return null;
    }
    const { email: userEmail } = await this.auth0ManagementService.getAuth0User(fetchedUser.auth0_id);
    // Returning empty activities array here temporarily until dashboard has implemented new endpoint to get activities
    return { ...fetchedUser, email: userEmail, activities: [] };
  }

  removeUserIncompleteSequences(activitySequenceRecords: CompletedActivitySequence[]) {
    return activitySequenceRecords.filter((sequence) => sequence.is_completed);
  }

  async saveAdminAccessRequest(user_id: string, accessReason: string) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (user.user_type !== UserTypes.ADMIN) {
      throw new UnauthorizedException(`User with ID: ${user_id} is not authorized to access this endpoint!`);
    }
    const accessRequest = new AdminAccessRequest({ admin_user_id: user_id, access_reason: accessReason });
    await this.adminAccessRequestRepository.create(accessRequest);
  }

  async updateUserSignUpField(ids: UpdateUserSignUpFieldDto, user_id: string) {
    const { pack_id, focus_mode_template_id } = ids;
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    // return if user already has a sign up habit pack or focus mode
    if (user.signed_up_via_habit_pack || user.signed_up_via_focus_mode) return;
    if (pack_id) {
      const habitPack = await this.habitPackRepository.orm.findOneBy({ id: pack_id });
      if (!habitPack) throw new NotFoundException(`Habit pack with id: ${pack_id} does not exist!`);
      this.userRepository.orm.update(user_id, { signed_up_via_habit_pack: pack_id });
      return;
    }
    if (focus_mode_template_id) {
      const focusModeTemplate = await this.focusModeTemplateRepository.orm.findOneBy({ id: pack_id });
      if (!focusModeTemplate) {
        throw new NotFoundException(`Focus mode template with id: ${focus_mode_template_id} does not exist!`);
      }
      this.userRepository.orm.update(user_id, { signed_up_via_focus_mode: focus_mode_template_id });
    }
  }

  async updateMetadata(
    {
      profile_image,
      description,
      name,
      email_preferences,
      user_job_details,
      user_typical_distractions,
    }: UpdateUserMetadataDto,
    user_id: string,
  ): Promise<void> {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);

    if (profile_image) {
      await this.validateProfileImageBeforeSave(profile_image);
    }

    const updateData: Partial<User> = {
      updated_at: new Date().toISOString(),
      has_received_inactivity_warning: false,
    };

    if (
      profile_image !== undefined ||
      description !== undefined ||
      name !== undefined ||
      email_preferences !== undefined
    ) {
      // Preserve existing metadata fields while updating
      const existingMetadata = user.metadata || {};
      updateData.metadata = {
        ...existingMetadata,
        ...(profile_image !== undefined && { profile_image }),
        ...(description !== undefined && { description }),
        ...(name !== undefined && { name }),
        ...(email_preferences !== undefined && { email_preferences }),
      };
    }

    if (user_job_details !== undefined) {
      updateData.user_job_details = user_job_details;
    }

    if (user_typical_distractions !== undefined) {
      updateData.user_typical_distractions = user_typical_distractions;
    }

    await this.userRepository.orm.update(user_id, updateData);
  }

  private async validateProfileImageBeforeSave(profileImageUrl: string): Promise<void> {
    const profileImageKey = this.getProfileImageKeyFromPublicUrl(profileImageUrl);
    if (!profileImageKey) return;

    let metadata: { contentLength: number; contentType: string };
    try {
      metadata = await this.r2Service.getObjectMetadata(S3_BUCKET_PROFILE_IMAGES, profileImageKey);
    } catch (_error) {
      throw new BadRequestException('Profile image not found in storage. Please upload the image first.');
    }

    const normalizedContentType = metadata.contentType?.toLowerCase();
    const isInvalidMimeType = !UserService.ALLOWED_PROFILE_IMAGE_CONTENT_TYPES.has(normalizedContentType);
    const isInvalidSize = metadata.contentLength <= 0 || metadata.contentLength > MAX_ATTACHMENT_SIZE_BYTES;

    if (!isInvalidMimeType && !isInvalidSize) return;

    try {
      await this.r2Service.deleteObject(S3_BUCKET_PROFILE_IMAGES, profileImageKey);
    } catch (deleteError) {
      this.verboseLogger.error(
        `Failed to delete invalid profile image (bucket=${S3_BUCKET_PROFILE_IMAGES}, key=${profileImageKey}): ${deleteError.message}`,
      );
    }

    if (isInvalidSize) {
      throw new BadRequestException('Profile image exceeds maximum allowed size of 20 MB');
    }

    throw new BadRequestException(
      'Invalid profile image type. Allowed types: image/jpeg, image/png, image/gif, image/webp.',
    );
  }

  private getProfileImageKeyFromPublicUrl(profileImageUrl: string): string | null {
    const r2PublicUrl = this.config.get<string>('r2.publicUrl');
    if (!r2PublicUrl) return null;

    try {
      const baseUrl = new URL(r2PublicUrl.replace(/\/+$/, ''));
      const imageUrl = new URL(profileImageUrl);

      if (baseUrl.origin !== imageUrl.origin) return null;

      const normalizedBasePath = baseUrl.pathname.replace(/\/+$/, '');
      const expectedPrefix = `${normalizedBasePath}/${S3_BUCKET_PROFILE_IMAGES}/`.replace(/\/{2,}/g, '/');
      if (!imageUrl.pathname.startsWith(expectedPrefix)) return null;

      const key = decodeURIComponent(imageUrl.pathname.slice(expectedPrefix.length));
      return key || null;
    } catch (_error) {
      return null;
    }
  }

  shouldSyncWithRevenueCat(user: User) {
    if (!user.revenue_cat_data || !user.last_date_revenue_cat_data_synced) return true;
    const currentDate = DateTime.local();
    const lastDateSynced = DateTime.fromJSDate(user.last_date_revenue_cat_data_synced);
    const wasSyncedToday = currentDate.hasSame(lastDateSynced, 'day');
    return !wasSyncedToday;
  }

  async getSubscription(user_id: string) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Getting user subscription',
      data: {
        user_id,
      },
    });

    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    // get stripe customer id from user
    const stripeCustomerId = user.stripe_customer_id;
    if (!stripeCustomerId) {
      console.log('No stripe customer ID found. Creating new stripe customer on user subscription');
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'No stripe customer ID found. Creating new stripe customer on user subscription',
        data: {
          user_id,
        },
      });
      // get value from auth token
      const auth0User = await this.auth0ManagementService.getAuth0User(user.auth0_id);
      const { email } = auth0User;
      await this.updateOrCreateUser({ auth0_id: user.auth0_id, email }, user);
    }

    const shouldUpdateCache = this.shouldSyncWithRevenueCat(user);
    if (shouldUpdateCache) {
      await this.revenueCatQueue.add(BullWorkers.UPDATE_REVENUE_CAT_STATUS, { user_id });
    }
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Checking user subscription status',
      data: {
        revenueCatData: user.revenue_cat_data,
      },
    });
    if (!shouldUpdateCache && user.revenue_cat_data) {
      return user.revenue_cat_data;
    }
    try {
      const subscriber = await this.revenueCatService.getOrCreateSubscriber(user_id);
      return this.revenueCatService.checkSubscriptionStatus(subscriber);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getMotivationalMessage(
    fastifyReply: FastifyReply,
    user_id: string,
    { language = 'english', tone, routine, device_type }: MotivationalSummaryQueryDto,
  ) {
    try {
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);

      const [longTermGoalsResponse, streaksResponse] = await Promise.allSettled([
        this.getUserLongTermGoals(user_id),
        this.userDailyStatsService.getUserStreaks(user),
      ]);

      const longTermGoals = (longTermGoalsResponse as PromiseFulfilledResult<string[]>).value || [];
      const streaks = (streaksResponse as PromiseFulfilledResult<Streak>).value || {
        focus_modes_streak: 0,
        morning_routines_streak: 0,
        evening_routines_streak: 0,
      };

      const streakData = this.constructStreaksArray(streaks, routine);
      const response = await callPromiseWithTimeout(
        this.openAIService.createMotivationalSummary(fastifyReply, streakData, longTermGoals, {
          language,
          tone,
          device_type,
        }),
        DEFAULT_AI_RESPONSE_TIMEOUT_MS,
      );

      return response;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  constructStreaksArray(streaks: Streak, routineType: RoutineType) {
    const { morning_routines_streak, evening_routines_streak, focus_modes_streak } = streaks;
    const morningStreak = {
      name: 'Morning routine',
      streak_days: morning_routines_streak,
    };
    const eveningStreak = {
      name: 'Evening routine',
      streak_days: evening_routines_streak,
    };
    const focusBlocksStreak = {
      name: 'Focus blocks',
      streak_days: focus_modes_streak,
    };
    let streakData: HabitOption[] = [];
    switch (routineType) {
      case RoutineType.MORNING_ROUTINE:
        streakData = [morningStreak];
        break;
      case RoutineType.EVENING_ROUTINE:
        streakData = [eveningStreak];
        break;
      default:
        streakData = [morningStreak, eveningStreak, focusBlocksStreak];
    }
    return streakData;
  }

  async generateChatReply(
    response: FastifyReply,
    user_id: string,
    messages: ChatCompletionMessageParam[],
    language: string,
  ) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    if (!user?.onboarding_progress?.has_chatted_with_focus_bear) {
      await this.userDailyStatsService.updateUserOnboardingProgress(
        user_id,
        UserProgressUpdateTypes.CHAT_WITH_FOCUS_BEAR,
      );
    }
    await this.openAIService.streamChatReply(response, messages, language);
  }

  async checkIsUrlSafe(isUrlSafeDto: IsUrlSafeDto, user_id: string) {
    const user = await this.userRepository.orm.findOne({ where: { id: user_id } });
    if (!user) {
      throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
    }
    // Normalise justification field so all clients (Mac, mobile, future) map into
    // a single canonical property that the OpenAI service and prompts expect.
    const normalisedDto: IsUrlSafeDto & { [key: string]: any } = {
      ...isUrlSafeDto,
      url: this.getRefactoredURLWithRespectToPrivacy(isUrlSafeDto.url),
    };

    normalisedDto.justificationForThisUrl =
      isUrlSafeDto.justificationForThisUrl ??
      // Generic alias used by some clients
      isUrlSafeDto.justification ??
      // Mac app "new intention" flow
      isUrlSafeDto.extraJustificationForThisSite ??
      undefined;

    return this.openAIService.checkIfUrlIsSafeToUse(normalisedDto, user.language, {
      jobDetails: user.user_job_details ?? null,
      typicalDistractions: user.user_typical_distractions ?? null,
    });
  }

  async checkIsAppSafe(isAppSafeDto: IsAppSafeDto, user_id: string) {
    const user = await this.userRepository.orm.findOne({ where: { id: user_id } });
    if (!user) {
      throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
    }
    const normalisedDto: IsAppSafeDto & { [key: string]: any } = { ...isAppSafeDto };

    normalisedDto.justificationForThisSpecificApp =
      isAppSafeDto.justificationForThisSpecificApp ?? isAppSafeDto.justification ?? undefined;

    return this.openAIService.checkIfAppIsSafeToUse(normalisedDto, user.language, {
      jobDetails: user.user_job_details ?? null,
      typicalDistractions: user.user_typical_distractions ?? null,
    });
  }

  async generateOccupationSites({ user_occupation }: GenerateOccupationSitesDto) {
    return this.openAIService.generateOccupationSites(user_occupation);
  }

  async updateLongTermGoals(user_id: string, { goals }: UpdateLongTermGoalsDto) {
    const user = await this.userRepository.orm.findOne({ where: { id: user_id } });
    if (!user) {
      throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
    }
    await this.userRepository.update(user_id, {
      long_term_goals: goals,
      updated_at: new Date().toISOString(),
      has_received_inactivity_warning: false,
    });
  }

  async getUserLongTermGoals(user_id: string) {
    const partialUser = await this.userRepository.orm.findOne({ where: { id: user_id }, select: ['long_term_goals'] });
    return partialUser?.long_term_goals ?? [];
  }

  async isVerboseLoggingAllowed(user_id: string) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    return { isVerboseLoggingAllowed: user?.verbose_logging, user };
  }

  private async getVerboseLoggingCached(userId: string): Promise<boolean> {
    const cached = this.verboseLogCache.get(userId);
    if (cached !== undefined) {
      return cached;
    }

    const { isVerboseLoggingAllowed } = await this.isVerboseLoggingAllowed(userId);
    const value = isVerboseLoggingAllowed || false;
    this.verboseLogCache.set(userId, value);
    return value;
  }

  // Clear cache for a user when verbose_logging setting is updated
  clearVerboseLoggingCache(userId: string): void {
    this.verboseLogCache.delete(userId);
  }

  // Centralized function to log messages only if the user has verbose logging enabled
  async logVerboselyIfUserHasVerboseLoggingEnabled(user_id: string, logArgs: any[]): Promise<void> {
    try {
      const isVerboseLoggingAllowed = await this.getVerboseLoggingCached(user_id);
      if (isVerboseLoggingAllowed) {
        if (!logArgs?.length) {
          this.verboseLogger.log('');
          return;
        }
        const [firstArg, ...restArgs] = logArgs;
        this.verboseLogger.log(firstArg, ...restArgs);
      }
    } catch (_error) {
      // Silently fail if we can't check verbose logging status
    }
  }

  async updateUsername(user_id: string, { username }: UpdateUsernameDto) {
    const normalizedUsername = username?.normalize('NFC').trim();
    if (!normalizedUsername) {
      throw new BadRequestException('Username cannot be empty');
    }

    const existingUserWithSameUsername = await this.userRepository.orm.findOne({
      where: {
        username: Raw((alias) => `LOWER(${alias}) = LOWER(:username)`, {
          username: normalizedUsername,
        }),
      },
    });
    if (existingUserWithSameUsername && existingUserWithSameUsername.id !== user_id) {
      throw new ConflictException(
        `Username: ${username} already taken by user with ID: ${existingUserWithSameUsername.id}`,
      );
    }
    let timeoutId: NodeJS.Timeout;
    // Set a default response after 15 seconds
    const timeoutPromise = new Promise<{ allowed: boolean }>((resolve) => {
      timeoutId = setTimeout(async () => {
        console.log(`Error: OpenAI username validation timed out - user ID: ${user_id}, username: ${username} `);
        resolve({ allowed: true });
      }, USERNAME_VALIDATION_TIMEOUT);
    });
    const usernameIsValidPromise = this.openAIService.checkIfUsernameIsValid(normalizedUsername);
    // Check if username is allowed or default to true after 15 seconds
    const { allowed } = await Promise.race([usernameIsValidPromise, timeoutPromise]);
    clearTimeout(timeoutId); // Clear the timeout if usernameIsValidPromise has resolved
    if (!allowed) {
      throw new BadRequestException(`Username: ${normalizedUsername} not accepted because it is deemed offensive`);
    }
    await this.userRepository.update(user_id, {
      username: normalizedUsername,
      updated_at: new Date().toISOString(),
      has_received_inactivity_warning: false,
    });
  }

  isValidURL(string: string) {
    // biome-ignore-start lint/suspicious/noMisleadingCharacterClass: regex requires escaped character class
    const validUrl = /^(https?|ftp):\/\/[a-zA-Z0-9-\\.]+\.[a-zA-Z]{2,6}(\/\S*)?$/;
    const validUrlWithoutProtocol =
      /^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]*(\.[a-zA-Z]{2,3})?(\/[a-zA-Z0-9@:%_\+.~#?&//=]*)?$/;
    // biome-ignore-end lint/suspicious/noMisleadingCharacterClass: regex requires escaped character class
    return validUrl.test(string) || validUrlWithoutProtocol.test(string);
  }

  getRefactoredURLWithRespectToPrivacy(url: string) {
    const trimmedUrl = typeof url === 'string' ? url.trim() : '';
    const sanitizedUrl = sanitizeUrl(trimmedUrl);

    if (sanitizedUrl === 'about:blank') {
      return sanitizedUrl;
    }

    const hasHttpProtocol = /^https?:\/\//i.test(trimmedUrl);
    const hasUnsupportedScheme =
      !hasHttpProtocol &&
      (trimmedUrl.includes('://') ||
        /^(about|mailto|tel|file|chrome|edge|moz-extension|safari-web-extension):/i.test(trimmedUrl));

    if (trimmedUrl.startsWith('/') || hasUnsupportedScheme) {
      return sanitizedUrl;
    }

    const incomingURL = hasHttpProtocol ? trimmedUrl : `https://${trimmedUrl}`;

    try {
      const oldURL = new URL(incomingURL);
      if (!oldURL.hostname) {
        return sanitizedUrl;
      }

      const isYoutubeHostname = oldURL.hostname === 'youtube.com' || oldURL.hostname.endsWith('.youtube.com');

      if (isYoutubeHostname) {
        const videoId = oldURL.searchParams.get('v');
        if (videoId) {
          return `${oldURL.origin}${oldURL.pathname}?v=${videoId}`;
        }
      }

      return oldURL.origin + oldURL.pathname;
    } catch (_error) {
      const sanitizedFallbackUrl = sanitizedUrl.replace(/[?#].*$/, '');

      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Failed to refactor URL for privacy, falling back to sanitized URL',
        data: { sanitizedUrl: sanitizedFallbackUrl },
      });
      return sanitizedFallbackUrl;
    }
  }

  async getSyncedExternalPlatforms(user_id: string) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) {
      throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    }
    return this.platformIntegrationsService.getUserSyncedPlatforms(user_id);
  }

  private async sendDuplicatesEmail(auth0Id: string, accountsWithSameEmail: GetUsers200ResponseOneOfInner[]) {
    const body = `New sign up is associated with multiple Auth0 accounts. Current: ${auth0Id}, Others: ${accountsWithSameEmail
      .map((u) => u.user_id)
      .join(', ')}`;
    const emailPayload = {
      to: [FOCUS_BEAR_EMAILS.SUPPORT],
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      text: body,
      subject: `${EMAIL_SUBJECTS.DUPLICATE_EMAIL_SIGN_UP}`,
    };

    await this.emailService.sendEmail(emailPayload);
  }

  async uninstallApplication(uninstallApplicationQueryDto: UninstallApplicationQueryDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'uninstall Application',
        data: {
          ...uninstallApplicationQueryDto,
          user_id,
        },
      });

      const user = await this.userRepository.orm.findOne({ where: { id: user_id } });
      const email = user ? (await this.auth0ManagementService.getAuth0User(user.auth0_id)).email : '';

      const stringifiedUninstallFeedback = JSON.stringify({
        ...uninstallApplicationQueryDto,
        email: maskEmail(email),
      });

      const cliqUrl = `${process.env.ZOHO_CLIQ_BACKEND_BOT_WEBHOOK}?zapikey=${process.env.ZOHO_CLIQ_API_KEY}`;
      const body = {
        channel: process.env.ZOHO_CLIQ_QUIT_UNINSTALL_CHANNEL,
        message: `*Uninstalling User feedback *\n\`\`\`${stringifiedUninstallFeedback}\`\`\``,
      };

      await Promise.allSettled(
        [axios.post(cliqUrl, body)].concat(
          !isTestEmail(email)
            ? [
                this.emailService.sendEmail({
                  to: [FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT],
                  from: FOCUS_BEAR_EMAILS.SUPPORT,
                  replyTo: email,
                  text: stringifiedUninstallFeedback,
                  subject: `${EMAIL_SUBJECTS.USER_FEEDBACK_AND_APP_LOGS}`,
                }),
              ]
            : [],
        ),
      );
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private async emitCurrentActivityPropsMetric(
    userId: string,
    durationMs: number,
    success: boolean,
    error?: Error,
  ): Promise<void> {
    const metrics = this.getMetricsConfig();
    const shouldEmitMetrics = Boolean(metrics.emitUserActivityMetrics || metrics.emitQueueMetrics);

    if (!shouldEmitMetrics) {
      return;
    }

    try {
      await emitUserActivityMetric({
        namespace: metrics.namespace,
        environment: metrics.environment,
        service: metrics.service,
        operation: 'getUserCurrentActivityProps',
        durationMs,
        success,
        userId,
        errorName: error?.name,
        errorMessage: error?.message,
      });
    } catch (emitError) {
      this.verboseLogger.warn(
        'Failed to emit getUserCurrentActivityProps metric',
        emitError instanceof Error ? emitError.message : undefined,
      );
    }
  }

  private logCurrentActivityPropsLatency(userId: string, durationMs: number, success: boolean, error?: Error): void {
    const payload = {
      event: success ? 'GetUserCurrentActivityPropsLatency' : 'GetUserCurrentActivityPropsError',
      user_id: userId,
      durationMs,
      success,
      error_name: error?.name,
      error_message: error?.message,
    };
    const serializedPayload = JSON.stringify(payload);

    if (success) {
      this.verboseLogger.log(serializedPayload);
      return;
    }

    const trace = error?.stack || error?.message;
    this.verboseLogger.error(serializedPayload, trace);
  }

  private getMetricsConfig(): MetricsConfig {
    return (
      this.config.get<MetricsConfig>('metrics') || {
        emitQueueMetrics: true,
        emitUserActivityMetrics: true,
        pollIntervalMs: 60_000,
        namespace: DEFAULT_QUEUE_METRICS_NAMESPACE,
        service: DEFAULT_METRICS_SERVICE,
        aiPipelineNamespace: DEFAULT_AI_PIPELINE_METRICS_NAMESPACE,
        aiPipelineService: DEFAULT_METRICS_SERVICE,
        environment: 'prod',
        logQueueFailures: true,
      }
    );
  }

  async getProfileImageUploadUrl(
    userId: string,
    filename: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    const user = await this.userRepository.orm.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with id: ${userId} does not exist!`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `${userId}/${timestamp}-${filename}`;

    const uploadUrl = await this.r2Service.getPresignedUploadUrl(S3_BUCKET_PROFILE_IMAGES, key, contentType);

    const r2PublicUrl = this.config.get<string>('r2.publicUrl');
    if (!r2PublicUrl) {
      throw new InternalServerErrorException('R2 public URL is not configured');
    }
    const publicUrl = `${r2PublicUrl}/${S3_BUCKET_PROFILE_IMAGES}/${key}`;

    return { uploadUrl, publicUrl };
  }
}
