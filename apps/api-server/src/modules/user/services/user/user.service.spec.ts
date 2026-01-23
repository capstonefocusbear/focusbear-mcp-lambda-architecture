import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SENTRY_TOKEN, emitUserActivityMetric } from '@app/observability';
import { FastifyReply } from 'fastify';
import { RevenueCatService } from '@app/revenue-cat';
import { Auth0ManagementService } from '@app/auth0';
import { OpenAIService } from '@app/openai';
import { StripeService } from '@app/stripe';
import { getQueueToken } from '@nestjs/bull';
import { SendGridService } from '@app/send-grid';
import axios from 'axios';
import { configsArray } from '../../../../config/index';
import {
  ActivityDummy,
  QueueMock,
  auth0UserDummy,
  dummyAuth0Client,
  dummyUninstallApplicationQueryDto,
  FocusModeDummy,
  focusModeTemplateDBResponseDummy,
  userDummy,
} from '../../../../../test/dummies';
import {
  AccountabilityBuddyServiceMock,
  Auth0ManagementServiceMock,
  CompletedActivityRepositoryMock,
  CompletedFocusBlockRepositoryMock,
  FocusModeTemplatesRepositoryMock,
  HabitPackRepositoryMock,
  RevenueCatServiceMock,
  SentryServiceMock,
  StripeServiceMock,
  UserRepositoryMock,
  UserSettingsServiceMock,
  UserDailyStatsServiceMock,
  CompletedActivitySequenceRepositoryMock,
  AdminAccessRequestRepositoryMock,
  OpenAIServiceMock,
  CompletedActivityServiceMock,
  PlatformIntegrationsServiceMock,
  DeviceServiceMock,
  DeviceRepositoryMock,
  SendGridServiceMock,
  CompletedActivitySequenceServiceMock,
  FocusModeServiceMock,
} from '../../../../../test/mocks';
import { SyncUserAccountDto } from '../../dto/sync-user-account.dto';
import { UserRepository } from '../../repositories/user.repository';
import { UserService } from './user.service';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { CurrentActivityProps } from '../../../activity/domain/current-activity-props.model';
import { CompletedFocusBlockRepository } from '../../../focus-mode/repositories/completed-focus-block.repository';
import { CompletedActivityRepository } from '../../../activity/repositories/completed-activity.repository';
import { routineHabitPackDBResponseDummy } from '../../../../../test/dummies/habit-packs.dummies';
import { HabitPackRepository } from '../../../habit-pack/repositories/habit-pack.repository';
import { FocusModeTemplatesRepository } from '../../../focus-mode-template/repositories/focus-mode-templates.repository';
import { FocusModeService } from '../../../focus-mode/services/focus-mode/focus-mode.service';
import { UserDailyStatsService } from '../user-daily-stats/user-daily-stats.service';
import { CompletedActivitySequenceRepository } from '../../../activity/repositories/completed-activity-sequence.repository';
import { AdminAccessRequestRepository } from '../../repositories/admin-access-requests.repository';
import { UserTypes } from '../../domain/user-types.enum';
import { UsersOrderByOptions } from '../../domain/find-users-sort-by-options.enum';
import { CompletedActivityService } from '../../../activity/services/completed-activity/completed-activity.service';
import { UserProgressUpdateTypes } from '../../domain/user-progress-update-types.enum';
import { BullQueues, BullWorkers, EMAIL_SUBJECTS, FOCUS_BEAR_EMAILS } from '../../../../shared/utils/constants';
import { AdminAccessRequest } from '../../entities/admin-access-requests.entity';
import { PlatformIntegrationsService } from '../../../platform-integrations/services/platform-integrations.service';
import { DeviceService } from '../../../device/services/device/device.service';
import { DeviceRepository } from '../../../device/repositories/device.repository';
import { maskEmail } from '../../../../shared/utils/helpers';
import { CompletedActivitySequenceService } from '../../../activity/services/completed-activity-sequence/completed-activity-sequence.service';
import { AccountabilityBuddyService } from '../../../accountability-buddy/services/accountability-buddy.service';

// Mock axios and set the type
jest.mock('axios');
jest.mock('@app/observability', () => {
  // Preserve real exports (including InjectSentry, SENTRY_TOKEN, SentryService)
  // and only stub the metric helpers used in this spec.
  const actual = jest.requireActual('@app/observability');
  return {
    ...actual,
    emitQueueMetrics: jest.fn(),
    emitCronMetrics: jest.fn(),
    emitUserActivityMetric: jest.fn(),
  };
});

describe('UserService', () => {
  let userService: UserService;
  const stripeCustomerQueueMock = { add: jest.fn(), process: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ load: configsArray })],
      providers: [
        CompletedFocusBlockRepository,
        CompletedActivityRepository,
        UserRepository,
        UserService,
        UserSettingsService,
        Auth0ManagementService,
        RevenueCatService,
        StripeService,
        ConfigService,
        HabitPackRepository,
        FocusModeTemplatesRepository,
        UserDailyStatsService,
        CompletedActivitySequenceRepository,
        AdminAccessRequestRepository,
        CompletedActivityService,
        OpenAIService,
        PlatformIntegrationsService,
        DeviceService,
        DeviceRepository,
        SendGridService,
        FocusModeService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: getQueueToken(BullQueues.REVENUE_CAT_STATUS),
          useValue: QueueMock,
        },
        {
          provide: getQueueToken(BullQueues.STRIPE_CUSTOMER),
          useValue: stripeCustomerQueueMock,
        },
        CompletedActivitySequenceService,
        AccountabilityBuddyService,
      ],
    })
      .overrideProvider(AccountabilityBuddyService)
      .useValue(AccountabilityBuddyServiceMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(RevenueCatService)
      .useValue(RevenueCatServiceMock)
      .overrideProvider(Auth0ManagementService)
      .useValue(Auth0ManagementServiceMock)
      .overrideProvider(UserSettingsService)
      .useValue(UserSettingsServiceMock)
      .overrideProvider(StripeService)
      .useValue(StripeServiceMock)
      .overrideProvider(CompletedFocusBlockRepository)
      .useValue(CompletedFocusBlockRepositoryMock)
      .overrideProvider(CompletedActivityRepository)
      .useValue(CompletedActivityRepositoryMock)
      .overrideProvider(HabitPackRepository)
      .useValue(HabitPackRepositoryMock)
      .overrideProvider(FocusModeTemplatesRepository)
      .useValue(FocusModeTemplatesRepositoryMock)
      .overrideProvider(UserDailyStatsService)
      .useValue(UserDailyStatsServiceMock)
      .overrideProvider(CompletedActivitySequenceRepository)
      .useValue(CompletedActivitySequenceRepositoryMock)
      .overrideProvider(AdminAccessRequestRepository)
      .useValue(AdminAccessRequestRepositoryMock)
      .overrideProvider(CompletedActivityService)
      .useValue(CompletedActivityServiceMock)
      .overrideProvider(OpenAIService)
      .useValue(OpenAIServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .overrideProvider(DeviceService)
      .useValue(DeviceServiceMock)
      .overrideProvider(DeviceRepository)
      .useValue(DeviceRepositoryMock)
      .overrideProvider(SendGridService)
      .useValue(SendGridServiceMock)
      .overrideProvider(FocusModeService)
      .useValue(FocusModeServiceMock)
      .overrideProvider(CompletedActivitySequenceService)
      .useValue(CompletedActivitySequenceServiceMock)
      .compile();
    userService = moduleRef.get<UserService>(UserService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
  });

  describe('syncUserAccount', () => {
    const [MacOSClient] = dummyAuth0Client;
    const syncAccountDto: SyncUserAccountDto = {
      auth0_id: 'dcidejd348ryhjeckwx3',
      email: 'some@email.com',
      auth0_client: MacOSClient,
    };

    const emptySubscriber = {
      request_date: '2022-09-30T12:59:48Z',
      request_date_ms: 1664542788681,
      subscriber: {
        entitlements: {},
        first_seen: '2022-09-30T12:59:25Z',
        last_seen: '2022-09-30T12:59:25Z',
        management_url: null,
        non_subscriptions: {},
        original_app_user_id: ' sk_jzhSxjCvvjZQzhgBwMKkuBmxynjnG',
        original_application_version: null,
        original_purchase_date: null,
        other_purchases: {},
        subscriptions: {},
      },
    };

    it('negative: if user account does not exist in Auth, throw the NotFoundException', async () => {
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(undefined);
      const errorMessage = 'User does not exist in Auth0!';
      let exception: any;

      try {
        await userService.syncUserAccount(syncAccountDto);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: if user exist in Auth0 but is new for the DB, trial access should be granted and default settings assigned with stripe id', async () => {
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(auth0UserDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserRepositoryMock.create.mockResolvedValueOnce(userDummy);
      DeviceRepositoryMock.orm.find.mockResolvedValue([]);
      DeviceServiceMock.parseDeviceFromAuth0Client.mockReturnValue('MacOS');
      RevenueCatServiceMock.getOrCreateSubscriber.mockResolvedValue(emptySubscriber.subscriber);

      await userService.syncUserAccount(syncAccountDto);

      expect(UserRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          auth0_id: syncAccountDto.auth0_id,
          stripe_customer_id: null,
        }),
      );
      expect(stripeCustomerQueueMock.add).toHaveBeenCalledWith(
        BullWorkers.CREATE_STRIPE_CUSTOMER,
        {
          user_id: userDummy.id,
          email: auth0UserDummy.email,
          operating_system: 'MacOS',
        },
        {
          jobId: `create-stripe-customer:${userDummy.id}`,
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
      expect(RevenueCatServiceMock.grantTrialAccess).toHaveBeenCalledWith(userDummy.id);
      expect(UserSettingsServiceMock.updateSettings).toHaveBeenCalled();
      expect(RevenueCatServiceMock.getOrCreateSubscriber).toHaveBeenCalledWith(userDummy.id);
      expect(RevenueCatServiceMock.checkSubscriptionStatus).toHaveBeenCalledWith(emptySubscriber.subscriber);
    });

    it('positive: if user is new sign up and accounts with same email exist in auth0, duplicate email should be sent to support', async () => {
      const stripeCustomerId = randomUUID();
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(auth0UserDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserRepositoryMock.create.mockResolvedValueOnce(userDummy);
      DeviceRepositoryMock.orm.find.mockResolvedValue([]);
      DeviceServiceMock.parseDeviceFromAuth0Client.mockReturnValue('MacOS');
      StripeServiceMock.registerNewCustomer.mockResolvedValue({ id: stripeCustomerId });
      RevenueCatServiceMock.getOrCreateSubscriber.mockResolvedValue(emptySubscriber.subscriber);
      // mock 2 users to exist in auth0 with same email
      const dummyAuth0Response = [auth0UserDummy, auth0UserDummy];
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValueOnce(dummyAuth0Response);

      await userService.syncUserAccount(syncAccountDto);

      const body = `New sign up is associated with multiple Auth0 accounts. Current: ${
        syncAccountDto.auth0_id
      }, Others: ${dummyAuth0Response.map((u) => u.user_id).join(', ')}`;
      const emailPayload = {
        to: [FOCUS_BEAR_EMAILS.SUPPORT],
        from: FOCUS_BEAR_EMAILS.SUPPORT,
        text: body,
        subject: `${EMAIL_SUBJECTS.DUPLICATE_EMAIL_SIGN_UP}`,
      };

      expect(SendGridServiceMock.sendEmail).toHaveBeenCalledWith(emailPayload);
    });

    it('does not overwrite username for existing users on sync', async () => {
      const existing = { ...userDummy, username: 'Zoë', stripe_customer_id: null };
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue(auth0UserDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(existing);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(existing);
      DeviceRepositoryMock.orm.find.mockResolvedValue([]);
      DeviceServiceMock.parseDeviceFromAuth0Client.mockReturnValue('iOS');
      RevenueCatServiceMock.getOrCreateSubscriber.mockResolvedValue(emptySubscriber.subscriber);
      RevenueCatServiceMock.checkSubscriptionStatus.mockResolvedValueOnce({ status: 'active' });

      await userService.syncUserAccount(syncAccountDto);

      expect(UserRepositoryMock.update).not.toHaveBeenCalled();
      expect(stripeCustomerQueueMock.add).toHaveBeenCalledWith(
        BullWorkers.CREATE_STRIPE_CUSTOMER,
        {
          user_id: userDummy.id,
          email: auth0UserDummy.email,
          operating_system: 'iOS',
        },
        {
          jobId: `create-stripe-customer:${userDummy.id}`,
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
    });
  });

  describe('getUserDetails', () => {
    const id = randomUUID();

    it('positive: getUserDetails should be called', async () => {
      UserRepositoryMock.getUserDetails.mockResolvedValueOnce(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({
        email: auth0UserDummy.email,
        email_verified: true,
      });
      PlatformIntegrationsServiceMock.getUserSyncedPlatforms({
        zoho: true,
        jira: false,
      });

      const response = await userService.getUserDetails(id);

      expect(response.email_verified).toBeTrue();
      expect(UserRepositoryMock.getUserDetails).toHaveBeenCalledWith(id);
    });

    it('positive: response excludes local device settings and onboarding progress', async () => {
      const localDeviceSettings = { windows: { version: '1.0.0' } };
      const onboardingProgress = { has_completed_setup: true };
      UserRepositoryMock.getUserDetails.mockResolvedValueOnce({
        ...userDummy,
        focus_modes: [],
        teamToAdmin: [],
        local_device_settings: localDeviceSettings,
        onboarding_progress: onboardingProgress,
      });
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({
        email: auth0UserDummy.email,
        email_verified: true,
      });

      const response = await userService.getUserDetails(id);

      expect(response).not.toHaveProperty('local_device_settings');
      expect(response).not.toHaveProperty('onboarding_progress');
    });

    it('negative: if user account does not exist, throw the NotFoundException', async () => {
      UserRepositoryMock.getUserDetails.mockResolvedValueOnce(null);
      const errorMessage = `User with id: ${id} does not exist!`;
      let exception: any;
      try {
        await userService.getUserDetails(id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });
  });

  describe('getUserSummary', () => {
    const id = randomUUID();

    it('positive: returns minimal user details and admin teams', async () => {
      const team = { id: randomUUID(), name: 'Bear Tamers' };
      UserRepositoryMock.getUserSummary.mockResolvedValueOnce({
        id,
        stripe_customer_id: 'cus_summary123',
        username: 'summary-user',
        language: 'en',
        has_consented_to_terms_of_service: true,
        user_type: UserTypes.STANDARD,
        teamToAdmin: [{ team }],
        has_consented_to_privacy_policy: true,
      });
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({
        email: auth0UserDummy.email,
        email_verified: auth0UserDummy.email_verified,
      });

      const response = await userService.getUserSummary(id, 'dashboard');

      expect(UserRepositoryMock.getUserSummary).toHaveBeenCalledWith(id);
      expect(response).toStrictEqual({
        id,
        stripe_customer_id: 'cus_summary123',
        email: auth0UserDummy.email,
        email_verified: auth0UserDummy.email_verified,
        username: 'summary-user',
        language: 'en',
        adminForTeams: [team],
        has_consented_to_terms_of_service: true,
        user_type: UserTypes.STANDARD,
        has_consented_to_privacy_policy: true,
      });
    });

    it('negative: throws NotFoundException when repository misses user', async () => {
      UserRepositoryMock.getUserSummary.mockResolvedValueOnce(null);
      let exception: any;

      try {
        await userService.getUserSummary(id, undefined);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception?.message).toBe(`User with id: ${id} does not exist!`);
    });
  });

  describe('getUserCurrentActivityProps', () => {
    let emitMetricMock: jest.MockedFunction<typeof emitUserActivityMetric>;

    beforeEach(() => {
      jest.clearAllMocks();
      emitMetricMock = emitUserActivityMetric as jest.MockedFunction<typeof emitUserActivityMetric>;
      emitMetricMock.mockReset();
      emitMetricMock.mockResolvedValue(undefined);
    });

    it('negative: if there is no user throw NotFoundExcaption', async () => {
      const user_id = randomUUID();
      UserRepositoryMock.getUserCurrentActivityProps.mockResolvedValue(null);
      let exception: any;

      try {
        await userService.getUserCurrentActivityProps(user_id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with id: ${user_id} does not exist!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should return instance of CurrentActivityProps', async () => {
      UserRepositoryMock.getUserCurrentActivityProps.mockResolvedValue(userDummy);

      const result = await userService.getUserCurrentActivityProps(userDummy.id);

      expect(result).toBeInstanceOf(CurrentActivityProps);
    });

    it("positive: user current sequence completed activities' IDs should be included in response", async () => {
      const activityOneId = randomUUID();
      const activityTwoId = randomUUID();
      UserRepositoryMock.getUserCurrentActivityProps.mockResolvedValue({
        ...userDummy,
        current_activity: ActivityDummy,
        current_activity_id: ActivityDummy.id,
        current_completing_sequence_log_id: randomUUID(),
      });
      CompletedActivityServiceMock.getCurrentSequenceCompletedActivityIds.mockResolvedValueOnce([
        activityOneId,
        activityTwoId,
      ]);
      CompletedActivityServiceMock.recalculateCurrentActivity.mockResolvedValueOnce({
        activity: null,
        shouldRefetchUser: true,
      });

      const result = await userService.getUserCurrentActivityProps(userDummy.id);

      expect(result.current_sequence_completed_activities).toEqual([activityOneId, activityTwoId]);
    });

    it('positive: if current activity is null after being recalculated, user data should be fetched again', async () => {
      UserRepositoryMock.getUserCurrentActivityProps.mockResolvedValue({
        ...userDummy,
        current_activity: ActivityDummy,
      });
      CompletedActivityServiceMock.recalculateCurrentActivity.mockResolvedValueOnce({
        activity: null,
        shouldRefetchUser: true,
      });

      await userService.getUserCurrentActivityProps(userDummy.id);

      expect(UserRepositoryMock.getUserCurrentActivityProps).toHaveBeenCalledTimes(2);
    });

    it('positive: if new activity is returned after recalculating current activity, it should be included in response as current_activity', async () => {
      UserRepositoryMock.getUserCurrentActivityProps.mockResolvedValue({
        ...userDummy,
        current_activity: ActivityDummy,
      });
      CompletedActivityServiceMock.recalculateCurrentActivity.mockResolvedValueOnce({
        activity: ActivityDummy,
        shouldRefetchUser: false,
      });

      const response = await userService.getUserCurrentActivityProps(userDummy.id);

      expect(response.current_activity).toBe(ActivityDummy);
    });

    it('positive: emits latency metric metadata on success', async () => {
      UserRepositoryMock.getUserCurrentActivityProps.mockResolvedValue({
        ...userDummy,
        current_activity: null,
      });

      await userService.getUserCurrentActivityProps(userDummy.id);

      expect(emitMetricMock).toHaveBeenCalledTimes(1);
      expect(emitMetricMock).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'getUserCurrentActivityProps',
          success: true,
          durationMs: expect.any(Number),
        }),
      );
    });

    it('negative: emits failure metric and logs structured error metadata', async () => {
      const error = new Error('db unavailable');
      UserRepositoryMock.getUserCurrentActivityProps.mockRejectedValueOnce(error);
      const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      await expect(userService.getUserCurrentActivityProps(userDummy.id)).rejects.toThrow('db unavailable');

      expect(emitMetricMock).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'getUserCurrentActivityProps',
          success: false,
          durationMs: expect.any(Number),
          errorMessage: error.message,
          errorName: error.name,
        }),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('GetUserCurrentActivityPropsError'),
        expect.stringContaining(error.message),
      );
      loggerSpy.mockRestore();
    });
  });

  describe('updateUserLocalDeviceSettings', () => {
    const localSettings = {
      Android: '...',
      MacOS: '...',
      Windows: '...',
      iOS: '...',
      Web: { hasEditedSettings: false },
    };

    it('negative: if there is no user throw NotFoundExcaption', async () => {
      const user_id = randomUUID();
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      let exception: any;

      try {
        await userService.updateUserLocalDeviceSettings(user_id, localSettings);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with id: ${user_id} does not exist!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: user should be saved with updated settings', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);

      await userService.updateUserLocalDeviceSettings(userDummy.id, localSettings);

      expect(UserRepositoryMock.orm.update).toHaveBeenCalledWith(userDummy.id, {
        local_device_settings: localSettings,
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
    });

    it('positive: if user has edited blocked URLs, onboarding data should be updated', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);

      await userService.updateUserLocalDeviceSettings(userDummy.id, {
        ...localSettings,
        MacOS: { has_edited_blocked_urls: true },
      });

      expect(UserDailyStatsServiceMock.updateUserOnboardingProgress).toHaveBeenCalledWith(
        userDummy.id,
        UserProgressUpdateTypes.EDIT_BLOCKED_URLS,
      );
    });
  });

  describe('getUserLocalDeviceSettings', () => {
    it('negative: if there is no user throw NotFoundExcaption', async () => {
      const user_id = randomUUID();
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(null);
      let exception: any;

      try {
        await userService.getUserLocalDeviceSettings(user_id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with id: ${user_id} does not exist!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: if user exists but settings field is empty return null settings ', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);

      const result = await userService.getUserLocalDeviceSettings(userDummy.id);

      expect(result).toBeDefined();
      expect(result).toBeObject();
      expect(result.Android).toBeNull();
      expect(result.MacOS).toBeNull();
      expect(result.Windows).toBeNull();
      expect(result.iOS).toBeNull();
      expect(result.Web).toStrictEqual({ hasEditedSettings: false });
    });

    it('positive: return local setings object', async () => {
      const localSettings = {
        Android: '...',
        MacOS: '...',
        Windows: '...',
        iOS: '...',
        Web: { hasEditedSettings: false },
      };
      userDummy.local_device_settings = localSettings;
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);

      const result = await userService.getUserLocalDeviceSettings(userDummy.id);

      expect(result).toBeDefined();
      expect(result).toBeObject();
      expect(result.Android).toBeDefined();
      expect(result.MacOS).toBeDefined();
      expect(result.Windows).toBeDefined();
      expect(result.iOS).toBeDefined();
      expect(result.Web).toBeDefined();
    });
  });

  describe('getUsers', () => {
    it('positive: getList query should be called', async () => {
      const search = 'edclkedc';

      await userService.getUsers({ search });

      expect(UserRepositoryMock.getUsersList).toHaveBeenCalledWith({ search });
    });
  });

  describe('updateSignedUpViaHabitPack', () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('negative: if user account does not exist, throw NotFoundException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with id: ${userDummy.id} does not exist!`;
      let exception: any;
      try {
        await userService.updateUserSignUpField({ pack_id: routineHabitPackDBResponseDummy.id }, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if habit pack does not exist, throw NotFoundException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `Habit pack with id: ${routineHabitPackDBResponseDummy.id} does not exist!`;
      let exception: any;
      try {
        await userService.updateUserSignUpField({ pack_id: routineHabitPackDBResponseDummy.id }, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if focus mode template does not exist, throw NotFoundException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      FocusModeTemplatesRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `Focus mode template with id: ${focusModeTemplateDBResponseDummy.id} does not exist!`;
      let exception: any;
      try {
        await userService.updateUserSignUpField(
          { focus_mode_template_id: focusModeTemplateDBResponseDummy.id },
          userDummy.id,
        );
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: if user already has signed_up_via_habit_pack value, no update should occur', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, signed_up_via_habit_pack: randomUUID() });
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(routineHabitPackDBResponseDummy);

      await userService.updateUserSignUpField({ pack_id: routineHabitPackDBResponseDummy.id }, userDummy.id);

      expect(UserRepositoryMock.orm.update).toHaveBeenCalledTimes(0);
    });

    it('positive: if user already has signed_up_via_focus_mode value, no update should occur', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, signed_up_via_focus_mode: randomUUID() });

      await userService.updateUserSignUpField(
        { focus_mode_template_id: focusModeTemplateDBResponseDummy.id },
        userDummy.id,
      );

      expect(UserRepositoryMock.orm.update).toHaveBeenCalledTimes(0);
    });

    it("positive: user's signed_up_via_habit_pack property should be updated with incoming pack id", async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(routineHabitPackDBResponseDummy);

      await userService.updateUserSignUpField({ pack_id: routineHabitPackDBResponseDummy.id }, userDummy.id);

      expect(UserRepositoryMock.orm.update).toHaveBeenCalledWith(userDummy.id, {
        signed_up_via_habit_pack: routineHabitPackDBResponseDummy.id,
      });
    });

    it("positive: user's signed_up_via_focus_mode property should be updated with incoming focus mode template id", async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      FocusModeTemplatesRepositoryMock.orm.findOneBy.mockResolvedValueOnce(focusModeTemplateDBResponseDummy);

      await userService.updateUserSignUpField(
        { focus_mode_template_id: focusModeTemplateDBResponseDummy.id },
        userDummy.id,
      );

      expect(UserRepositoryMock.orm.update).toHaveBeenCalledWith(userDummy.id, {
        signed_up_via_focus_mode: focusModeTemplateDBResponseDummy.id,
      });
    });
  });

  describe('getListOfUsers', () => {
    it('negative: if user is not admin type unauthorized exception should be thrown for trying to access user records', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.STANDARD });
      const errorMessage = `User with ID: ${userDummy.id} is not authorized to access this endpoint!`;
      let exception: any;
      try {
        await userService.getListOfUsers(userDummy.id, 100, 0);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: if no field to order by is passed, users should be fetched in  descending order by date they joined', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.ADMIN });
      UserRepositoryMock.orm.find.mockResolvedValueOnce([userDummy]);

      await userService.getListOfUsers(userDummy.id, 100, 0);

      expect(UserRepositoryMock.orm.find).toHaveBeenCalledWith({
        order: { created_at: { direction: 'DESC' } },
        take: 100,
        skip: 0,
      });
    });

    it('positive: if field to order by is passed to function, users should be fetched in descending order ordered by field passed as argument', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.ADMIN });
      UserRepositoryMock.orm.find.mockResolvedValueOnce([userDummy]);

      await userService.getListOfUsers(userDummy.id, 100, 0, UsersOrderByOptions.LAST_COMPLETED_ROUTINE);

      expect(Auth0ManagementServiceMock.getAuth0User).toHaveBeenCalledWith(userDummy.auth0_id);
      expect(UserRepositoryMock.orm.find).toHaveBeenCalledWith({
        order: { last_completed_sequence_started_at: { direction: 'DESC', nulls: 'LAST' } },
        take: 100,
        skip: 0,
      });
    });
  });

  describe('generateChatReply', () => {
    it('positive: if user onboarding has_chatted_with_focus_bear value is false, update onboarding progress', async () => {
      const reply: FastifyReply = null;
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: { has_chatted_with_focus_bear: false },
      });

      await userService.generateChatReply(reply, userDummy.id, [], 'english');

      expect(UserDailyStatsServiceMock.updateUserOnboardingProgress).toHaveBeenCalledWith(
        userDummy.id,
        UserProgressUpdateTypes.CHAT_WITH_FOCUS_BEAR,
      );
    });
  });

  describe('updateUsername', () => {
    it('negative: if username is empty after normalization, error should be thrown', async () => {
      const username = '   '; // Only whitespace
      const errorMessage = 'Username cannot be empty';
      let exception: any;
      try {
        await userService.updateUsername(userDummy.id, { username });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if username is considered offensive, error should be thrown', async () => {
      OpenAIServiceMock.checkIfUsernameIsValid.mockResolvedValueOnce({ allowed: false });
      const username = 'randomusername';
      const errorMessage = `Username: ${username} not accepted because it is deemed offensive`;
      let exception: any;
      try {
        await userService.updateUsername(userDummy.id, { username });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if username is already in use, error should be thrown', async () => {
      OpenAIServiceMock.checkIfUsernameIsValid.mockResolvedValueOnce({ allowed: true });
      const userWIthSameUserName = { ...userDummy, id: randomUUID() };
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWIthSameUserName);
      const username = 'randomusername';
      const errorMessage = `Username: ${username} already taken by user with ID: ${userWIthSameUserName.id}`;
      let exception: any;
      try {
        await userService.updateUsername(userDummy.id, { username });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(ConflictException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: username should be saved if valid', async () => {
      OpenAIServiceMock.checkIfUsernameIsValid.mockResolvedValueOnce({ allowed: true });
      const username = 'randomusername';
      const normalizedUsername = username.normalize('NFC').trim();

      await userService.updateUsername(userDummy.id, { username });

      expect(UserRepositoryMock.update).toHaveBeenCalledWith(userDummy.id, {
        username: normalizedUsername,
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
    });

    it('positive: username with underscores should be handled correctly', async () => {
      OpenAIServiceMock.checkIfUsernameIsValid.mockResolvedValueOnce({ allowed: true });
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null); // No existing user
      const username = 'john_smith';
      const normalizedUsername = username.normalize('NFC').trim();

      await userService.updateUsername(userDummy.id, { username });

      // Verify that the query uses Raw with case-insensitive comparison
      expect(UserRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: {
          username: expect.objectContaining({
            _type: 'raw',
          }),
        },
      });

      expect(UserRepositoryMock.update).toHaveBeenCalledWith(userDummy.id, {
        username: normalizedUsername,
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
    });
  });

  describe('updateUsername Unicode handling', () => {
    it('saves Unicode names, trims and normalizes NFC', async () => {
      OpenAIServiceMock.checkIfUsernameIsValid.mockResolvedValueOnce({ allowed: true });
      const decomposed = ' wants e\u0308 ';
      const expected = 'wants ë';
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await userService.updateUsername(userDummy.id, { username: decomposed });

      expect(UserRepositoryMock.update).toHaveBeenCalledWith(
        userDummy.id,
        expect.objectContaining({
          username: expected,
        }),
      );
    });
  });

  describe('updateUsername case-insensitive handling', () => {
    it('should detect case-insensitive username conflicts', async () => {
      OpenAIServiceMock.checkIfUsernameIsValid.mockResolvedValueOnce({ allowed: true });
      const existingUser = { ...userDummy, id: randomUUID(), username: 'JohnDoe' };
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(existingUser);
      const username = 'johndoe'; // Different case

      let exception: any;
      try {
        await userService.updateUsername(userDummy.id, { username });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(ConflictException);
      expect(exception.message).toEqual(`Username: ${username} already taken by user with ID: ${existingUser.id}`);
    });

    it('should preserve original case when saving username', async () => {
      OpenAIServiceMock.checkIfUsernameIsValid.mockResolvedValueOnce({ allowed: true });
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null); // No existing user
      const username = 'JohnDoe'; // Mixed case

      await userService.updateUsername(userDummy.id, { username });

      expect(UserRepositoryMock.update).toHaveBeenCalledWith(userDummy.id, {
        username: 'JohnDoe', // Should preserve original case
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
    });
  });

  describe('getFocusBlockSummary', () => {
    it('negative: should throw error if user is not found', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with id: ${userDummy.id} does not exist!`;
      let exception: any;
      try {
        await userService.getFocusBlockSummary(userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should fetch focus blocks for user for last 7 days', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      await userService.getFocusBlockSummary(userDummy.id);

      expect(CompletedFocusBlockRepositoryMock.getLogsByUserInTimeRange).toHaveBeenCalledWith(userDummy.id, {
        from_time: expect.toBeDate(),
        to_time: expect.toBeDate(),
      });
    });
  });

  describe('getCompletedActivitySummary', () => {
    it('negative: should throw error if user is not found', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with id: ${userDummy.id} does not exist!`;
      let exception: any;
      try {
        await userService.getCompletedActivitySummary(userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should fetch completed activity summary for user for last 7 days', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      await userService.getCompletedActivitySummary(userDummy.id);

      expect(CompletedActivityRepositoryMock.getWeekSummary).toHaveBeenCalledWith(userDummy.id);
    });
  });

  describe('getUserFocusModes', () => {
    it('positive: should return focus modes for the user', async () => {
      const focusModes = [FocusModeDummy];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      FocusModeServiceMock.fetchUserFocusModes.mockResolvedValueOnce(focusModes);

      const result = await userService.getUserFocusModes(userDummy.id);

      expect(FocusModeServiceMock.fetchUserFocusModes).toHaveBeenCalledWith(userDummy.id);
      expect(result).toEqual(focusModes);
    });

    it('negative: should throw if the user does not exist', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      let exception: any;

      try {
        await userService.getUserFocusModes(userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(`User with id: ${userDummy.id} does not exist!`);
      expect(FocusModeServiceMock.fetchUserFocusModes).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('positive: should fetch user for admin', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.STANDARD });
      let exception: any;
      const errorMessage = `User with ID: ${userDummy.id} is not authorized to access this endpoint!`;
      try {
        await userService.getUserById(userDummy.id, {
          id: userDummy.id,
          stripe_customer_id: userDummy.stripe_customer_id,
        });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should fetch user for admin', async () => {
      const emailDummy = 'test@mail.com';
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.ADMIN });
      UserRepositoryMock.getUserForAdmin.mockResolvedValueOnce(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ email: emailDummy });

      const response = await userService.getUserById(userDummy.id, {
        id: userDummy.id,
        stripe_customer_id: userDummy.stripe_customer_id,
      });

      expect(response).toEqual({ ...userDummy, email: emailDummy, activities: [] });
    });

    it('positive: if searching for user using email, user stripe ID should be fetched from stripe and be used to fetch user in DB', async () => {
      const dummyStripeId = 'cus_xxx';
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.ADMIN });
      UserRepositoryMock.getUserForAdmin.mockResolvedValueOnce(userDummy);
      StripeServiceMock.getStripeCustomerId.mockResolvedValueOnce(dummyStripeId);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ email: 'test@mail.com' });

      await userService.getUserById(userDummy.id, {
        email: 'test@email.com',
      });

      expect(UserRepositoryMock.getUserForAdmin).toHaveBeenCalledWith(undefined, dummyStripeId);
    });

    it('positive: if no matching user is found in Stripe when searching by email, null should be returned', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.ADMIN });
      UserRepositoryMock.getUserForAdmin.mockResolvedValueOnce(userDummy);
      StripeServiceMock.getStripeCustomerId.mockResolvedValueOnce(null);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ email: 'test@mail.com' });

      const response = await userService.getUserById(userDummy.id, {
        email: 'test@email.com',
      });

      expect(response).toBeNull();
    });
  });

  describe('updateMetadata', () => {
    it('positive: should call function to update user metadata', async () => {
      const userWithoutMetadata = { ...userDummy, metadata: undefined };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userWithoutMetadata);
      const profileImageDummy = 'www.image.com';
      const descriptionDummy = 'Random text here';

      await userService.updateMetadata(
        { profile_image: profileImageDummy, description: descriptionDummy },
        userDummy.id,
      );

      expect(UserRepositoryMock.orm.update).toHaveBeenCalledWith(
        userDummy.id,
        expect.objectContaining({
          metadata: { profile_image: profileImageDummy, description: descriptionDummy },
          updated_at: expect.toBeDateString(),
          has_received_inactivity_warning: false,
        }),
      );
    });
  });

  describe('saveAdminAccessRequest', () => {
    it('negative: should throw error if user is not admin', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.STANDARD });
      const accessReasonDummy = 'Check user activities';
      let exception: any;
      const errorMessage = `User with ID: ${userDummy.id} is not authorized to access this endpoint!`;
      try {
        await userService.saveAdminAccessRequest(userDummy.id, accessReasonDummy);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should save admin access request in database', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.ADMIN });
      const accessReasonDummy = 'Check user activities';

      await userService.saveAdminAccessRequest(userDummy.id, accessReasonDummy);

      expect(AdminAccessRequestRepositoryMock.create).toHaveBeenCalledWith(
        new AdminAccessRequest({ admin_user_id: userDummy.id, access_reason: accessReasonDummy }),
      );
    });
  });

  describe('updateLongTermGoals', () => {
    it('negative: if user is not found, error should be thrown', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const longTermGoalsDummy = ['Finish task x'];
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;
      try {
        await userService.updateLongTermGoals(userDummy.id, { goals: longTermGoalsDummy });
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: user long term goals should be updated in DB', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      const longTermGoalsDummy = ['Finish task x'];
      await userService.updateLongTermGoals(userDummy.id, { goals: longTermGoalsDummy });

      expect(UserRepositoryMock.update).toHaveBeenCalledWith(userDummy.id, {
        long_term_goals: longTermGoalsDummy,
        updated_at: expect.toBeDateString(),
        has_received_inactivity_warning: false,
      });
    });
  });

  describe('logVerboselyIfUserHasVerboseLoggingEnabled', () => {
    let loggerSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      // Clear cache before each test
      userService.clearVerboseLoggingCache(userDummy.id);
    });

    afterEach(() => {
      loggerSpy.mockRestore();
      // Clear cache after each test
      userService.clearVerboseLoggingCache(userDummy.id);
    });

    it('positive: should execute console.log when verbose logging is enabled', async () => {
      const logArgs = ['Test message:', { key: 'value' }];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, verbose_logging: true });

      await userService.logVerboselyIfUserHasVerboseLoggingEnabled(userDummy.id, logArgs);

      expect(loggerSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith(...logArgs);
    });

    it('positive: should not execute console.log when verbose logging is disabled', async () => {
      const logArgs = ['Test message:', { key: 'value' }];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, verbose_logging: false });

      await userService.logVerboselyIfUserHasVerboseLoggingEnabled(userDummy.id, logArgs);

      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('positive: should not execute console.log when user is not found', async () => {
      const logArgs = ['Test message:', { key: 'value' }];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);

      await userService.logVerboselyIfUserHasVerboseLoggingEnabled(userDummy.id, logArgs);

      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('positive: should not throw error when database query fails', async () => {
      const logArgs = ['Test message:', { key: 'value' }];
      UserRepositoryMock.orm.findOneBy.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        userService.logVerboselyIfUserHasVerboseLoggingEnabled(userDummy.id, logArgs),
      ).resolves.not.toThrow();

      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('positive: should cache verbose logging value and not call DB on second request', async () => {
      const logArgs = ['Test message:', { key: 'value' }];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, verbose_logging: true });

      // First call - should hit DB
      await userService.logVerboselyIfUserHasVerboseLoggingEnabled(userDummy.id, logArgs);
      expect(UserRepositoryMock.orm.findOneBy).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledTimes(1);

      // Second call - should use cache, no DB call
      await userService.logVerboselyIfUserHasVerboseLoggingEnabled(userDummy.id, logArgs);
      expect(UserRepositoryMock.orm.findOneBy).toHaveBeenCalledTimes(1); // Still 1, not 2
      expect(loggerSpy).toHaveBeenCalledTimes(2);
    });

    it('positive: should use cache after first call with different logArgs', async () => {
      const logArgs1 = ['First message:', { key: 'value1' }];
      const logArgs2 = ['Second message:', { key: 'value2' }];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, verbose_logging: true });

      await userService.logVerboselyIfUserHasVerboseLoggingEnabled(userDummy.id, logArgs1);
      expect(UserRepositoryMock.orm.findOneBy).toHaveBeenCalledTimes(1);

      await userService.logVerboselyIfUserHasVerboseLoggingEnabled(userDummy.id, logArgs2);
      expect(UserRepositoryMock.orm.findOneBy).toHaveBeenCalledTimes(1); // Still 1, cached
      expect(loggerSpy).toHaveBeenCalledWith(...logArgs1);
      expect(loggerSpy).toHaveBeenCalledWith(...logArgs2);
    });

    it('positive: should clear cache when clearVerboseLoggingCache is called', async () => {
      const logArgs = ['Test message:', { key: 'value' }];
      UserRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce({ ...userDummy, verbose_logging: true })
        .mockResolvedValueOnce({ ...userDummy, verbose_logging: false });

      // First call - caches true
      await userService.logVerboselyIfUserHasVerboseLoggingEnabled(userDummy.id, logArgs);
      expect(UserRepositoryMock.orm.findOneBy).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledTimes(1);

      // Clear cache
      userService.clearVerboseLoggingCache(userDummy.id);

      // Second call - should hit DB again and cache false
      await userService.logVerboselyIfUserHasVerboseLoggingEnabled(userDummy.id, logArgs);
      expect(UserRepositoryMock.orm.findOneBy).toHaveBeenCalledTimes(2);
      expect(loggerSpy).toHaveBeenCalledTimes(1); // Not called because verbose_logging is now false
    });
  });

  describe('isValidUrl', () => {
    it('negative: should return false for empty string', () => {
      const isUrl = userService.isValidURL('');

      expect(isUrl).toBeFalse();
    });

    it('negative: should return false for invalid URL', () => {
      const isUrl = userService.isValidURL('just-some-text');

      expect(isUrl).toBeFalse();
    });

    it('positive: should return true for valid URL without protocol', () => {
      const isUrl = userService.isValidURL('messagemedia.zoom.us');

      expect(isUrl).toBeTrue();
    });

    it('positive: should return true for valid URL with protocol', () => {
      const isUrl = userService.isValidURL('https://github.com');

      expect(isUrl).toBeTrue();
    });
  });

  describe('getSyncedExternalPlatforms', () => {
    it('negative: if user account does not exist, throw the NotFoundException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(null);
      const errorMessage = `User with id: ${userDummy.id} does not exist!`;
      let exception: any;
      try {
        await userService.getSyncedExternalPlatforms(userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should return the correct synced external platforms for a given user', async () => {
      const expectedResponse = {
        zoho: true,
        jira: false,
        clickup: false,
        trello: false,
        asana: false,
        monday: false,
        google: true,
        microsoft: false,
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      PlatformIntegrationsServiceMock.getUserSyncedPlatforms.mockResolvedValue(expectedResponse);
      const response = await userService.getSyncedExternalPlatforms(userDummy.id);
      expect(response).toEqual(expectedResponse);
    });
  });

  describe('checkIsUrlSafe', () => {
    it('negative: should throw error if user is not found', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const isUrlSafeDto = {
        url: 'https://example.com',
        tab_title: 'Example',
        meta_description: 'Example description',
        focus_mode: 'work',
        intention: 'research',
        language: 'English',
      };
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;
      try {
        await userService.checkIsUrlSafe(isUrlSafeDto, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should call OpenAI service with correct parameters including normalized DTO', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      const isUrlSafeDto = {
        url: 'https://example.com',
        tab_title: 'Example',
        meta_description: 'Example description',
        focus_mode: 'work',
        intention: 'research',
        language: 'English',
      };
      const expectedResponse = {
        allowed_probability: 0.8,
        reason: 'This URL is safe to use',
      };
      OpenAIServiceMock.checkIfUrlIsSafeToUse.mockResolvedValueOnce(expectedResponse);

      const result = await userService.checkIsUrlSafe(isUrlSafeDto, userDummy.id);

      expect(UserRepositoryMock.orm.findOne).toHaveBeenCalledWith({ where: { id: userDummy.id } });
      expect(OpenAIServiceMock.checkIfUrlIsSafeToUse).toHaveBeenCalledWith(
        expect.objectContaining({
          ...isUrlSafeDto,
          url: expect.any(String),
          justificationForThisUrl: undefined,
        }),
        userDummy.language,
        { jobDetails: null, typicalDistractions: null },
      );
      expect(result).toEqual(expectedResponse);
    });

    it('positive: should normalize DTO and call OpenAI service with correct parameters', async () => {
      const userWithContext = {
        ...userDummy,
        user_job_details: 'Software developer working on AI features',
        user_typical_distractions: 'YouTube videos and Reddit',
      };
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithContext);
      const isUrlSafeDto = {
        url: 'https://github.com',
        tab_title: 'GitHub',
        meta_description: 'GitHub description',
        focus_mode: 'work',
        intention: 'coding',
        language: 'English',
      };
      const expectedResponse = {
        allowed_probability: 0.9,
        reason: 'This URL is safe to use',
      };
      OpenAIServiceMock.checkIfUrlIsSafeToUse.mockResolvedValueOnce(expectedResponse);

      await userService.checkIsUrlSafe(isUrlSafeDto, userWithContext.id);

      expect(OpenAIServiceMock.checkIfUrlIsSafeToUse).toHaveBeenCalledWith(
        expect.objectContaining({
          ...isUrlSafeDto,
          url: expect.any(String),
          justificationForThisUrl: undefined,
        }),
        userWithContext.language,
        {
          jobDetails: userWithContext.user_job_details,
          typicalDistractions: userWithContext.user_typical_distractions,
        },
      );
    });

    it('positive: should normalize DTO when user entity fields are null', async () => {
      const userWithoutContext = {
        ...userDummy,
        user_job_details: null,
        user_typical_distractions: null,
      };
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithoutContext);
      const isUrlSafeDto = {
        url: 'https://example.com',
        tab_title: 'Example',
        meta_description: 'Example description',
        focus_mode: 'work',
        intention: 'research',
        language: 'English',
      };
      const expectedResponse = {
        allowed_probability: 0.8,
        reason: 'This URL is safe to use',
      };
      OpenAIServiceMock.checkIfUrlIsSafeToUse.mockResolvedValueOnce(expectedResponse);

      await userService.checkIsUrlSafe(isUrlSafeDto, userWithoutContext.id);

      expect(OpenAIServiceMock.checkIfUrlIsSafeToUse).toHaveBeenCalledWith(
        expect.objectContaining({
          ...isUrlSafeDto,
          url: expect.any(String),
          justificationForThisUrl: undefined,
        }),
        userWithoutContext.language,
        { jobDetails: null, typicalDistractions: null },
      );
    });
  });

  describe('checkIsAppSafe', () => {
    it('negative: should throw error if user is not found', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const isAppSafeDto = {
        focusMode: 'work',
        intention: 'coding project',
        appName: 'Visual Studio Code',
        language: 'English',
      };
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;
      try {
        await userService.checkIsAppSafe(isAppSafeDto, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should call OpenAI service with correct parameters including normalized DTO', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      const isAppSafeDto = {
        focusMode: 'work',
        intention: 'coding project',
        appName: 'Visual Studio Code',
        justificationForThisSpecificApp: 'I need it for programming',
        language: 'English',
      };
      const expectedResponse = {
        allowed_probability: 0.9,
        reason: 'This app is related to your focus mode intention',
      };
      OpenAIServiceMock.checkIfAppIsSafeToUse.mockResolvedValueOnce(expectedResponse);

      const result = await userService.checkIsAppSafe(isAppSafeDto, userDummy.id);

      expect(UserRepositoryMock.orm.findOne).toHaveBeenCalledWith({ where: { id: userDummy.id } });
      expect(OpenAIServiceMock.checkIfAppIsSafeToUse).toHaveBeenCalledWith(
        expect.objectContaining({
          ...isAppSafeDto,
          justificationForThisSpecificApp: 'I need it for programming',
        }),
        userDummy.language,
        { jobDetails: null, typicalDistractions: null },
      );
      expect(result).toEqual(expectedResponse);
    });

    it('positive: should normalize DTO and call OpenAI service with correct parameters', async () => {
      const userWithContext = {
        ...userDummy,
        user_job_details: 'Full-stack engineer at Focus Bear',
        user_typical_distractions: 'Short-form social media clips',
      };
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithContext);
      const isAppSafeDto = {
        focusMode: 'work',
        intention: 'coding project',
        appName: 'Visual Studio Code',
        language: 'English',
      };
      const expectedResponse = {
        allowed_probability: 0.9,
        reason: 'This app is related to your focus mode intention',
      };
      OpenAIServiceMock.checkIfAppIsSafeToUse.mockResolvedValueOnce(expectedResponse);

      await userService.checkIsAppSafe(isAppSafeDto, userWithContext.id);

      expect(OpenAIServiceMock.checkIfAppIsSafeToUse).toHaveBeenCalledWith(
        expect.objectContaining({
          ...isAppSafeDto,
          justificationForThisSpecificApp: undefined,
        }),
        userWithContext.language,
        {
          jobDetails: userWithContext.user_job_details,
          typicalDistractions: userWithContext.user_typical_distractions,
        },
      );
    });

    it('positive: should normalize DTO when user entity fields are null', async () => {
      const userWithoutContext = {
        ...userDummy,
        user_job_details: null,
        user_typical_distractions: null,
      };
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithoutContext);
      const isAppSafeDto = {
        focusMode: 'work',
        intention: 'coding project',
        appName: 'Visual Studio Code',
        language: 'English',
      };
      const expectedResponse = {
        allowed_probability: 0.9,
        reason: 'This app is related to your focus mode intention',
      };
      OpenAIServiceMock.checkIfAppIsSafeToUse.mockResolvedValueOnce(expectedResponse);

      await userService.checkIsAppSafe(isAppSafeDto, userWithoutContext.id);

      expect(OpenAIServiceMock.checkIfAppIsSafeToUse).toHaveBeenCalledWith(
        expect.objectContaining({
          ...isAppSafeDto,
          justificationForThisSpecificApp: undefined,
        }),
        userWithoutContext.language,
        { jobDetails: null, typicalDistractions: null },
      );
    });
  });

  describe('uninstallApplication', () => {
    it('positive: should send uninstall feedback and make the correct API calls', async () => {
      const stringifiedDummyUninstallApplicationQueryDtoWithMaskedEmail = JSON.stringify({
        ...dummyUninstallApplicationQueryDto,
        email: maskEmail(dummyUninstallApplicationQueryDto.email),
      });
      const expectedCliqBody = {
        channel: process.env.ZOHO_CLIQ_QUIT_UNINSTALL_CHANNEL,
        message: `*Uninstalling User feedback *\n\`\`\`${stringifiedDummyUninstallApplicationQueryDtoWithMaskedEmail}\`\`\``,
      };

      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue(auth0UserDummy);
      (axios.post as jest.Mock).mockResolvedValue({ status: 200 });

      await userService.uninstallApplication(dummyUninstallApplicationQueryDto, userDummy.id);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining(String(process.env.ZOHO_CLIQ_BACKEND_BOT_WEBHOOK || '')),
        expectedCliqBody,
      );
      expect(SendGridServiceMock.sendEmail).toHaveBeenCalledWith({
        to: [FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT],
        from: FOCUS_BEAR_EMAILS.SUPPORT,
        replyTo: auth0UserDummy.email,
        text: stringifiedDummyUninstallApplicationQueryDtoWithMaskedEmail,
        subject: EMAIL_SUBJECTS.USER_FEEDBACK_AND_APP_LOGS,
      });
    });

    it('negative: should not send email for internaltest email addresses', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue({
        ...auth0UserDummy,
        email: 'internaltest@company.com',
      });
      (axios.post as jest.Mock).mockResolvedValue({ status: 200 });

      await userService.uninstallApplication(dummyUninstallApplicationQueryDto, userDummy.id);

      expect(SendGridServiceMock.sendEmail).not.toHaveBeenCalled();
    });
  });
});
