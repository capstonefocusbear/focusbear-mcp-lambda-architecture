import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { DateTime } from 'luxon';
import { ChatCompletionRequestMessage } from 'openai';
import { FastifyReply } from 'fastify';
import { Auth0ManagementService } from '../../../../../../../libs/auth0/src';
import { UserRepository } from '../../repositories/user.repository';
import { SyncUserAccountDto } from '../../dto/sync-user-account.dto';
import { UserAuthContext } from '../../../auth/domain/user-auth-context.model';
import { User } from '../../entities/user.entity';
import { RevenueCatService } from '../../../../../../../libs/revenue-cat/src';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { UpdateLocalDeviceSettingsDto } from '../../dto/update-local-device-settings.dto';
import { StripeService } from '../../../../../../../libs/stripe/src';
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
import { OpenAIService } from '../../../../../../../libs/openai/src';
import { AiToneOptions } from '../../../../../../../libs/openai/src/domain/ai-tones.enum';

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
  ) {}

  async syncUserAccount({ auth0_id, email, name }: SyncUserAccountDto): Promise<UserAuthContext> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Syncing user account',
        data: {
          auth0_id,
          email,
          name,
        },
      });
      const [auth0User, registeredUser] = await this.consistentlyGetUser(auth0_id);
      if (!auth0User) throw new NotFoundException('User does not exit in Auth0!');
      const { id, stripe_customer_id } = await this.updateOrCreateUser({ auth0_id, email, name }, registeredUser);
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

  private async updateOrCreateUser(
    { auth0_id, email, name }: SyncUserAccountDto,
    registeredUser?: User,
  ): Promise<User> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating or creating user',
        data: {
          auth0_id,
          email,
          name,
        },
      });
      const hasNoStripeCustomer = !registeredUser?.stripe_customer_id;
      const hasNameDefined = Boolean(registeredUser?.name);
      const userProperties = hasNameDefined ? { auth0_id, email } : { auth0_id, email, name };
      if (hasNoStripeCustomer) {
        this.sentryService.instance().addBreadcrumb({
          category: 'Service',
          level: 'debug',
          message: 'Registering new user in Stripe',
        });
        const stripeCustomer = await this.stripeService.registerNewCustomer(email);
        Object.assign(userProperties, { stripe_customer_id: stripeCustomer.id });
      }
      return await this.userRepository.upsert(userProperties, ['auth0_id']);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
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

  async getUserDetails(id: string): Promise<User> {
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
      if (!userDetails) throw new NotFoundException(`User with id: ${id} does not exit!`);
      const { focus_modes } = userDetails;
      // map focus_mode_template_id null values to undefined to exclude property from response
      const formattedFocusModes = focus_modes?.map((focusMode) => {
        if (focusMode.focus_mode_template_id === null) {
          return { ...focusMode, focus_mode_template_id: undefined };
        }
        return focusMode;
      });
      return { ...userDetails, focus_modes: formattedFocusModes };
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
      if (!partialUser) throw new NotFoundException(`User with id: ${id} does not exit!`);
      if (partialUser.current_activity) {
        const updatedPartialUser = await this.recalculateActivityProps(partialUser);
        partialUser = updatedPartialUser;
      }
      const currentActivityProps = new CurrentActivityProps(partialUser);
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
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating user local device settings',
        data: {
          user_id,
          local_device_settings,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exit!`);
      const updatedSettings = this.mergeLocalSettings(user.local_device_settings, local_device_settings);
      await this.userRepository.orm.update(user_id, { local_device_settings: updatedSettings });
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
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exit!`);
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
    if (order_by) {
      return this.userRepository.orm.find({
        order: { [order_by]: { direction: 'DESC', nulls: 'LAST' } },
        take,
        skip,
      });
    }
    return this.userRepository.orm.find({
      order: { created_at: { direction: 'DESC' } },
      take,
      skip,
    });
  }

  async getUserById(user_id: string, id: string, stripe_customer_id: string): Promise<User> {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (user.user_type !== UserTypes.ADMIN) {
      throw new UnauthorizedException(`User with ID: ${user_id} is not authorized to access this endpoint!`);
    }
    const fetchedUser = await this.userRepository.getUserForAdmin(id, stripe_customer_id);
    if (!fetchedUser) {
      return null;
    }
    // returning empty activities array here temporarily until dashboard has implemented new endpoint to get activities
    return { ...fetchedUser, activities: [] };
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
    await this.userRepository.orm.update(user_id, { metadata: { profile_image, description } });
  }

  async getSubscription(user_id: string) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    const subscriber = await this.revenueCatService.getOrCreateSubscriber(user_id);
    if (!subscriber) throw new NotFoundException('No user found in RevenueCat!');
    return this.revenueCatService.checkSubscriptionStatus(subscriber.subscriber);
  }

  async getMotivationalMessage(response: FastifyReply, user_id: string, language = 'english', tone: AiToneOptions) {
    try {
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
      const { morning_routines_streak, evening_routines_streak, focus_modes_streak } =
        await this.userDailyStatsService.getUserStreaks(user);
      const input = [
        {
          name: 'Morning routine',
          streak_days: morning_routines_streak,
        },
        {
          name: 'Evening routine',
          streak_days: evening_routines_streak,
        },
        {
          name: 'Focus blocks',
          streak_days: focus_modes_streak,
        },
      ];
      return await this.openAIService.createMotivationalSummary(response, input, language, tone);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async generateChatReply(
    response: FastifyReply,
    user_id: string,
    messages: ChatCompletionRequestMessage[],
    language: string,
  ) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    await this.openAIService.streamChatReply(response, messages, language);
  }
}
