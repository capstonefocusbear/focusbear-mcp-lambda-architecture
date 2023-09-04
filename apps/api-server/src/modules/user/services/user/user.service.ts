import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { DateTime } from 'luxon';
import { ChatCompletionRequestMessage } from 'openai';
import { FastifyReply } from 'fastify';
import { RevenueCatService } from '@app/revenue-cat';
import { Auth0ManagementService } from '@app/auth0';
import { HabitOption, OpenAIService } from '@app/openai';
import { StripeService } from '@app/stripe';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { UserRepository } from '../../repositories/user.repository';
import { SyncUserAccountDto } from '../../dto/sync-user-account.dto';
import { UserAuthContext } from '../../../auth/domain/user-auth-context.model';
import { User } from '../../entities/user.entity';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { UpdateLocalDeviceSettingsDto } from '../../dto/update-local-device-settings.dto';
import { CurrentActivityProps } from '../../../activity/domain/current-activity-props.model';
import { GetUsersQueryDto } from '../../dto/get-users-query.dto';
import { CompletedActivityRepository } from '../../../activity/repositories/completed-activity.repository';
import { CompletedFocusBlockRepository } from '../../../focus-mode/repositories/completed-focus-block.repository';
import { UserTypes } from '../../domain/user-types.enum';
import { HabitPackRepository } from '../../../habit-pack/repositories/habit-pack.repository';
import { FocusModeTemplatesRepository } from '../../../focus-mode-template/repositories/focus-mode-templates.repository';
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
  INTERNAL_TEST,
  ONE_MINUTE,
  TRIAL,
  TRIAL_COST_CENTS,
  USERNAME_VALIDATION_TIMEOUT,
} from '../../../../shared/utils/constants';
import { RoutineType } from '../../domain/routine-type.enum';
import { MotivationalSummaryQueryDto } from '../../dto/get-motivational-summary-query.dto';
import { Entitlement } from '../../../subscription/domain/entitlement.enum';
import { SearchForUserDto } from '../../dto/search-for-user.dto';

const JEREMYS_USER_ID = '9884b0af-dc9f-4207-964e-e4db537a2234';

@Injectable()
export class UserService {
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
    private readonly config: ConfigService,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly userDailyStatsService: UserDailyStatsService,
    private readonly adminAccessRequestRepository: AdminAccessRequestRepository,
    private readonly openAIService: OpenAIService,
    @InjectQueue('profitwell') private profitwellQueue: Queue,
    @InjectQueue('revenue-cat-status') private revenueCatQueue: Queue,
  ) {}

  async syncUserAccount({ auth0_id, email }: SyncUserAccountDto): Promise<UserAuthContext> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Syncing user account',
        data: {
          auth0_id,
          email,
        },
      });
      const [auth0User, registeredUser] = await this.consistentlyGetUser(auth0_id);
      if (!auth0User) throw new NotFoundException('User does not exist in Auth0!');
      const { id, stripe_customer_id } = await this.updateOrCreateUser({ auth0_id, email }, registeredUser);
      if (!registeredUser) await this.handleInitialRegistration(id);
      const subscriber = await this.revenueCatService.getOrCreateSubscriber(id);
      if (!subscriber) throw new NotFoundException('No user found in RevenueCat!');
      const subscriptionStatus = this.revenueCatService.checkSubscriptionStatus(subscriber.subscriber);
      return { id, subscriptionStatus, stripeCustomerId: stripe_customer_id };
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
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
    const auth0UserPromise = this.auth0ManagementService.getUser({ id: auth0_id }).catch(() => undefined);
    const dbUserPromise = this.userRepository.orm.findOne({ where: { auth0_id } });
    const [auth0User, dbUser] = await Promise.all([auth0UserPromise, dbUserPromise]);
    return [auth0User, dbUser];
  }

  async updateOrCreateUser({ auth0_id, email }: SyncUserAccountDto, registeredUser?: User): Promise<User> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating or creating user',
        data: {
          auth0_id,
        },
      });
      const userProperties = { auth0_id };
      let stripeId = await this.stripeService.getStripeCustomerId(email);
      if (!stripeId) {
        this.sentryService.instance().addBreadcrumb({
          category: 'Service',
          level: 'debug',
          message: 'Registering new user in Stripe',
        });
        const stripeCustomer = await this.stripeService.registerNewCustomer(email);
        stripeId = stripeCustomer.id;
        Object.assign(userProperties, { stripe_customer_id: stripeId });
      } else {
        Object.assign(userProperties, { stripe_customer_id: stripeId });
      }
      if (registeredUser) {
        const isTestUser = email.toLowerCase().includes(INTERNAL_TEST);
        const isUserRegisteredInProfitWell = !!registeredUser.profitwell_id;
        if (!isTestUser && !isUserRegisteredInProfitWell) {
          await this.handleRegisterUserInProfitWell(registeredUser, stripeId);
        }
        return await this.userRepository.update(registeredUser.id, userProperties);
      }
      const newUser = new User({ auth0_id });
      const newlySavedUser = await this.userRepository.create(newUser);
      await this.handleRegisterUserInProfitWell(newlySavedUser, stripeId);
      return newlySavedUser;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async handleRegisterUserInProfitWell(user: User | null, stripeId: string) {
    const { revenue_cat_data, revenue_cat_status } = user;
    const revenueCatStatus = revenue_cat_status ?? TRIAL;
    let renewalAmountCents = TRIAL_COST_CENTS;
    const hasPersonalSubscription = revenue_cat_data?.activeEntitlements?.includes(Entitlement.personal);
    if (hasPersonalSubscription) {
      renewalAmountCents = await this.stripeService.getCustomerSubscriptionRate(stripeId);
    }
    const effectiveDate = revenue_cat_data?.hasActiveSubscription
      ? Math.round(new Date(revenue_cat_data?.expirations[revenueCatStatus].purchase_date).getTime() / 1000)
      : Math.round(new Date().getTime() / 1000);
    await this.profitwellQueue.add(
      'register-profitwell-user',
      {
        user_id: user.id,
        stripe_id: stripeId,
        plan_id: revenueCatStatus,
        renewalAmountCents,
        effectiveDate,
      },
      {
        delay: ONE_MINUTE,
      },
    );
  }

  private async handleInitialRegistration(id: string): Promise<void> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Handling initial registration',
        data: {
          user_id: id,
        },
      });
      const settingsConfig = this.config.get('constants.userSettings');
      const defaultSettings = settingsConfig.generateDefault();
      await Promise.all([
        this.revenueCatService.grantTrialAccess(id),
        this.userSettingsService.updateSettings({ user_id: id }, defaultSettings, false),
      ]);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
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
      const { email } = await this.auth0ManagementService.getUser({ id: userDetails.auth0_id });
      const { focus_modes } = userDetails;
      // map focus_mode_template_id null values to undefined to exclude property from response
      const formattedFocusModes = focus_modes?.map((focusMode) => {
        if (focusMode.focus_mode_template_id === null) {
          return { ...focusMode, focus_mode_template_id: undefined };
        }
        return focusMode;
      });
      return { ...userDetails, email, focus_modes: formattedFocusModes };
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async getUserCurrentActivityProps(id: string): Promise<CurrentActivityProps> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting user current activity props',
        data: {
          user_id: id,
        },
      });
      let partialUser = await this.userRepository.getUserCurrentActivityProps(id);
      if (!partialUser) throw new NotFoundException(`User with id: ${id} does not exist!`);
      let current_sequence_completed_activities = [];
      if (partialUser.current_activity) {
        const updatedPartialUser = await this.recalculateActivityProps(partialUser);
        partialUser = updatedPartialUser;
        if (partialUser.current_completing_sequence_log_id) {
          current_sequence_completed_activities =
            await this.completedActivityService.getCurrentSequenceCompletedActivityIds(
              partialUser.current_completing_sequence_log_id,
            );
        }
      }
      const currentActivityProps = new CurrentActivityProps({ ...partialUser, current_sequence_completed_activities });
      if (id === JEREMYS_USER_ID) {
        // eslint-disable-next-line no-console
        console.log('Jeremy current user state', { partialUser, updatedActivityProps: currentActivityProps });
      }
      return currentActivityProps;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  private async recalculateActivityProps(partialUser: User) {
    const { activity, shouldRefetchUser } = await this.completedActivityService.recalculateCurrentActivity(partialUser);
    let updatedUser = partialUser;
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
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
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
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
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
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
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
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
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
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
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
      } catch (error) {
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

  async updateMetadata({ profile_image, description }: UpdateUserMetadataDto, user_id: string): Promise<void> {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    await this.userRepository.orm.update(user_id, {
      metadata: { profile_image, description },
      updated_at: new Date().toISOString(),
      has_received_inactivity_warning: false,
    });
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
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    const shouldUpdateCache = this.shouldSyncWithRevenueCat(user);
    if (shouldUpdateCache) {
      await this.revenueCatQueue.add('update-revenue-cat-status', { user_id });
    }
    if (!shouldUpdateCache && user.revenue_cat_data) {
      return user.revenue_cat_data;
    }
    // if there's no cache to use or cache is outdated, get data from RevenueCat directly
    const subscriber = await this.revenueCatService.getOrCreateSubscriber(user_id);
    if (!subscriber) throw new NotFoundException('No user found in RevenueCat!');
    return this.revenueCatService.checkSubscriptionStatus(subscriber.subscriber);
  }

  async getMotivationalMessage(
    response: FastifyReply,
    user_id: string,
    { language = 'english', tone, routine, device_type }: MotivationalSummaryQueryDto,
  ) {
    try {
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
      const streakData = await this.constructStreaksArray(routine, user);
      const longTermGoals = await this.getUserLongTermGoals(user_id);
      return await this.openAIService.createMotivationalSummary(response, streakData, longTermGoals, {
        language,
        tone,
        device_type,
      });
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async constructStreaksArray(routineType: RoutineType, user: User): Promise<HabitOption[]> {
    const { morning_routines_streak, evening_routines_streak, focus_modes_streak } =
      await this.userDailyStatsService.getUserStreaks(user);
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
    let streakData = [];
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
    messages: ChatCompletionRequestMessage[],
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
    return partialUser?.long_term_goals;
  }

  async isVerboseLoggingAllowed(user_id: string) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    return { isVerboseLoggingAllowed: user?.verbose_logging, user };
  }

  async updateUsername(user_id: string, { username }: UpdateUsernameDto) {
    const existingUserWithSameUsername = await this.userRepository.orm.findOne({
      where: { username: username.toLowerCase() },
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
        // eslint-disable-next-line no-console
        console.log(`Error: OpenAI username validation timed out - user ID: ${user_id}, username: ${username} `);
        resolve({ allowed: true });
      }, USERNAME_VALIDATION_TIMEOUT);
    });
    const usernameIsValidPromise = this.openAIService.checkIfUsernameIsValid(username);
    // Check if username is allowed or default to true after 15 seconds
    const { allowed } = await Promise.race([usernameIsValidPromise, timeoutPromise]);
    clearTimeout(timeoutId); // Clear the timeout if usernameIsValidPromise has resolved
    if (!allowed) {
      throw new BadRequestException(`Username: ${username} not accepted because it is deemed offensive`);
    }
    await this.userRepository.update(user_id, {
      username: username.toLowerCase(),
      updated_at: new Date().toISOString(),
      has_received_inactivity_warning: false,
    });
  }
}
