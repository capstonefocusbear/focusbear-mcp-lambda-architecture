import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { FastifyReply } from 'fastify';
import { RevenueCatService } from '@app/revenue-cat';
import { Auth0ManagementService } from '@app/auth0';
import { OpenAIService } from '@app/openai';
import { StripeService } from '@app/stripe';
import { getQueueToken } from '@nestjs/bull';
import { configsArray } from '../../../../config/index';
import {
  ActivityDummy,
  QueueMock,
  auth0UserDummy,
  dummyAuth0Client,
  focusModeTemplateDBResponseDummy,
  userDummy,
} from '../../../../../test/dummies';
import {
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
import { UserDailyStatsService } from '../user-daily-stats/user-daily-stats.service';
import { CompletedActivitySequenceRepository } from '../../../activity/repositories/completed-activity-sequence.repository';
import { AdminAccessRequestRepository } from '../../repositories/admin-access-requests.repository';
import { UserTypes } from '../../domain/user-types.enum';
import { UsersOrderByOptions } from '../../domain/find-users-sort-by-options.enum';
import { CompletedActivityService } from '../../../activity/services/completed-activity/completed-activity.service';
import { UserProgressUpdateTypes } from '../../domain/user-progress-update-types.enum';
import { BullQueues } from '../../../../shared/utils/constants';
import { AdminAccessRequest } from '../../entities/admin-access-requests.entity';
import { PlatformIntegrationsService } from '../../../platform-integrations/services/platform-integrations.service';
import { DeviceService } from '../../../device/services/device/device.service';
import { DeviceRepository } from '../../../device/repositories/device.repository';

// Mock axios and set the type
jest.mock('axios');

describe('UserService', () => {
  let userService: UserService;

  beforeEach(async () => {
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
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: getQueueToken(BullQueues.REVENUE_CAT_STATUS),
          useValue: QueueMock,
        },
      ],
    })
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
      .compile();
    userService = moduleRef.get<UserService>(UserService);

    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
  });

  describe('syncUserAccount', () => {
    const syncAccountDto: SyncUserAccountDto = {
      auth0_id: 'dcidejd348ryhjeckwx3',
      email: 'some@email.com',
      auth0_client: dummyAuth0Client[0],
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
      const stripeCustomerId = randomUUID();
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(auth0UserDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserRepositoryMock.create.mockResolvedValueOnce(userDummy);
      DeviceRepositoryMock.orm.find.mockResolvedValue([]);
      DeviceServiceMock.parseDeviceFromAuth0Client.mockResolvedValue(dummyAuth0Client[0]);
      StripeServiceMock.registerNewCustomer.mockResolvedValue({ id: stripeCustomerId });
      RevenueCatServiceMock.getOrCreateSubscriber.mockResolvedValue(emptySubscriber);

      await userService.syncUserAccount(syncAccountDto);

      expect(UserRepositoryMock.create).toBeCalledWith(
        expect.objectContaining({
          auth0_id: syncAccountDto.auth0_id,
          stripe_customer_id: stripeCustomerId,
        }),
      );
      expect(StripeServiceMock.registerNewCustomer).toBeCalledWith(auth0UserDummy.email, auth0UserDummy.auth0_client);
      expect(RevenueCatServiceMock.grantTrialAccess).toBeCalledWith(userDummy.id);
      expect(UserSettingsServiceMock.updateSettings).toBeCalled();
      expect(RevenueCatServiceMock.getOrCreateSubscriber).toBeCalledWith(userDummy.id);
      expect(RevenueCatServiceMock.checkSubscriptionStatus).toBeCalledWith(emptySubscriber.subscriber);
    });
  });

  describe('getUserDetails', () => {
    const id = randomUUID();

    it('positive: getUserDetails should be called', async () => {
      UserRepositoryMock.getUserDetails.mockResolvedValueOnce(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ email: auth0UserDummy.email });
      PlatformIntegrationsServiceMock.getUserSyncedPlatforms({
        zoho: true,
        jira: false,
      });

      await userService.getUserDetails(id);

      expect(UserRepositoryMock.getUserDetails).toBeCalledWith(id);
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

  describe('getUserCurrentActivityProps', () => {
    beforeEach(() => {
      jest.clearAllMocks();
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

      expect(UserRepositoryMock.getUserCurrentActivityProps).toBeCalledTimes(2);
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

      expect(UserRepositoryMock.orm.update).toBeCalledWith(userDummy.id, {
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

      expect(UserDailyStatsServiceMock.updateUserOnboardingProgress).toBeCalledWith(
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

      expect(UserRepositoryMock.getUsersList).toBeCalledWith({ search });
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

      expect(UserRepositoryMock.orm.update).toBeCalledTimes(0);
    });

    it('positive: if user already has signed_up_via_focus_mode value, no update should occur', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, signed_up_via_focus_mode: randomUUID() });

      await userService.updateUserSignUpField(
        { focus_mode_template_id: focusModeTemplateDBResponseDummy.id },
        userDummy.id,
      );

      expect(UserRepositoryMock.orm.update).toBeCalledTimes(0);
    });

    it("positive: user's signed_up_via_habit_pack property should be updated with incoming pack id", async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(routineHabitPackDBResponseDummy);

      await userService.updateUserSignUpField({ pack_id: routineHabitPackDBResponseDummy.id }, userDummy.id);

      expect(UserRepositoryMock.orm.update).toBeCalledWith(userDummy.id, {
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

      expect(UserRepositoryMock.orm.update).toBeCalledWith(userDummy.id, {
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

      expect(UserRepositoryMock.orm.find).toBeCalledWith({
        order: { created_at: { direction: 'DESC' } },
        take: 100,
        skip: 0,
      });
    });

    it('positive: if field to order by is passed to function, users should be fetched in descending order ordered by field passed as argument', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.ADMIN });
      UserRepositoryMock.orm.find.mockResolvedValueOnce([userDummy]);

      await userService.getListOfUsers(userDummy.id, 100, 0, UsersOrderByOptions.LAST_COMPLETED_ROUTINE);

      expect(Auth0ManagementServiceMock.getAuth0User).toBeCalledWith(userDummy.auth0_id);
      expect(UserRepositoryMock.orm.find).toBeCalledWith({
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

      expect(UserDailyStatsServiceMock.updateUserOnboardingProgress).toBeCalledWith(
        userDummy.id,
        UserProgressUpdateTypes.CHAT_WITH_FOCUS_BEAR,
      );
    });
  });

  describe('updateUsername', () => {
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

      await userService.updateUsername(userDummy.id, { username });

      expect(UserRepositoryMock.update).toBeCalledWith(userDummy.id, {
        username,
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

      expect(CompletedFocusBlockRepositoryMock.getLogsByUserInTimeRange).toBeCalledWith(userDummy.id, {
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

      expect(CompletedActivityRepositoryMock.getWeekSummary).toBeCalledWith(userDummy.id);
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

      expect(UserRepositoryMock.getUserForAdmin).toBeCalledWith(undefined, dummyStripeId);
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
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      const profileImageDummy = { url: 'www.image.com', file_path: '/folder/sub-folder' };
      const descriptionDummy = 'Random text here';

      await userService.updateMetadata(
        { profile_image: profileImageDummy, description: descriptionDummy },
        userDummy.id,
      );

      expect(UserRepositoryMock.orm.update).toBeCalledWith(userDummy.id, {
        metadata: { profile_image: profileImageDummy, description: descriptionDummy },
        updated_at: expect.toBeDateString(),
        has_received_inactivity_warning: false,
      });
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

      expect(AdminAccessRequestRepositoryMock.create).toBeCalledWith(
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

      expect(UserRepositoryMock.update).toBeCalledWith(userDummy.id, {
        long_term_goals: longTermGoalsDummy,
        updated_at: expect.toBeDateString(),
        has_received_inactivity_warning: false,
      });
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
});
