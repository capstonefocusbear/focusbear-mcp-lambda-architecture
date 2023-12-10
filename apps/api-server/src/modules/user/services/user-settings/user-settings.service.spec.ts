import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { Settings } from 'luxon';
import { RevenueCatService } from '@app/revenue-cat';
import { Auth0ManagementService } from '@app/auth0';
import { StripeService } from '@app/stripe';
import { PusherBeamsService } from '@app/pusher-beams';
import { PusherService } from '@app/pusher';
import { I18nService } from 'nestjs-i18n';
import { mockDeep } from 'jest-mock-extended';
import {
  ActivitySequenceDummy,
  deserializedActivitiesDummy,
  logQuantityQuestionsDummy,
  serializedActivityDummy,
  serializedActivityDummyWithDefaultActivities,
  UncompletedSequenceLogDummy,
  userDummy,
  userSettingsDBResponseDummy,
  userSettingsDummy,
} from '../../../../../test/dummies';
import {
  ActivityParserServiceMock,
  UserRepositoryMock,
  Auth0ManagementServiceMock,
  RevenueCatServiceMock,
  StripeServiceMock,
  SentryServiceMock,
  CompletedActivitySequenceServiceMock,
  ActivitySequenceRepositoryMock,
  UserDailyStatsServiceMock,
  ActivitySequenceServiceMock,
  UserServiceMock,
  PusherBeamsServiceMock,
  PusherServiceMock,
} from '../../../../../test/mocks';
import { ActivityParserService } from '../../../activity/services/activity-parser/activity-parser.service';
import { UserRepository } from '../../repositories/user.repository';
import { UserSettingsService } from './user-settings.service';
import { User } from '../../entities/user.entity';
import { CompletedActivitySequenceService } from '../../../activity/services/completed-activity-sequence/completed-activity-sequence.service';
import { ActivitySequenceRepository } from '../../../activity/repositories/activity-sequence.repository';
import { UserDailyStatsService } from '../user-daily-stats/user-daily-stats.service';
import { HelperCommonService } from '../../../helper/services/helper-common/helper-common.service';
import { ActivitySequenceService } from '../../../activity/services/activity-sequence/activity-sequence.service';
import { DaysOfWeek } from '../../../activity/domain/days-of-week.enum';
import { UserService } from '../user/user.service';
import { LanguageOptions } from '../../domain/language-options.enum';

describe('UserSettingsService', () => {
  let userSettingsService: UserSettingsService;
  const i18nServiceMock = mockDeep<I18nService>();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserRepository,
        UserSettingsService,
        ActivityParserService,
        Auth0ManagementService,
        CompletedActivitySequenceService,
        ActivitySequenceRepository,
        RevenueCatService,
        StripeService,
        ConfigService,
        UserDailyStatsService,
        HelperCommonService,
        ActivitySequenceService,
        UserService,
        PusherService,
        PusherBeamsService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: I18nService,
          useValue: i18nServiceMock,
        },
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(ActivityParserService)
      .useValue(ActivityParserServiceMock)
      .overrideProvider(RevenueCatService)
      .useValue(RevenueCatServiceMock)
      .overrideProvider(Auth0ManagementService)
      .useValue(Auth0ManagementServiceMock)
      .overrideProvider(StripeService)
      .useValue(StripeServiceMock)
      .overrideProvider(CompletedActivitySequenceService)
      .useValue(CompletedActivitySequenceServiceMock)
      .overrideProvider(ActivitySequenceRepository)
      .useValue(ActivitySequenceRepositoryMock)
      .overrideProvider(UserDailyStatsService)
      .useValue(UserDailyStatsServiceMock)
      .overrideProvider(ActivitySequenceService)
      .useValue(ActivitySequenceServiceMock)
      .overrideProvider(UserService)
      .useValue(UserServiceMock)
      .overrideProvider(PusherBeamsService)
      .useValue(PusherBeamsServiceMock)
      .overrideProvider(PusherService)
      .useValue(PusherServiceMock)
      .compile();

    userSettingsService = moduleRef.get<UserSettingsService>(UserSettingsService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(userSettingsService).toBeDefined();
  });

  describe('getSettings', () => {
    const user_id = randomUUID();

    it('negative: if user user does not exist in DB, throw the NotFoundException', async () => {
      UserRepositoryMock.getUserSettings.mockResolvedValueOnce(null);
      const errorMessage = `User with id: ${user_id} does not exists!`;
      let exception: any;

      try {
        await userSettingsService.getSettings({ user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should return serialized user settings data', async () => {
      UserRepositoryMock.getUserSettings.mockResolvedValueOnce(userSettingsDBResponseDummy);
      ActivityParserServiceMock.serialize.mockResolvedValueOnce(serializedActivityDummy);

      const result = await userSettingsService.getSettings({ user_id });

      expect(result).toMatchSnapshot();
    });

    it("positive: if cutoff_time_for_non_high_priority_activities is not null it should be returned along with rest of user's settings", async () => {
      UserRepositoryMock.getUserSettings.mockResolvedValueOnce({
        ...userSettingsDBResponseDummy,
        cutoff_time_for_non_high_priority_activities: '20:30',
      });
      ActivityParserServiceMock.serialize.mockResolvedValueOnce(serializedActivityDummy);

      const result = await userSettingsService.getSettings({ user_id });

      expect(result).toHaveProperty('cutoff_time_for_non_high_priority_activities');
    });
  });

  describe('updateSettings', () => {
    it('negative: if user user does not exist in DB, throw NotFoundException', async () => {
      const user_id = randomUUID();
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: false, user: null });
      const errorMessage = `User with id: ${user_id} does not exists!`;
      let exception: any;

      try {
        await userSettingsService.updateSettings({ user_id }, userSettingsDummy, false, { is_onboarding: false });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: consistentlyUpdateUserSettings should be called', async () => {
      const { startup_time, shutdown_time, break_after_minutes } = userSettingsDummy;
      const updatedUser = new User({
        id: userDummy.id,
        startup_time,
        shutdown_time,
        utc_shutdown_time: shutdown_time,
        utc_startup_time: startup_time,
        break_after_minutes,
        has_edited_settings: true,
        current_activity_id: undefined,
        current_activity_sequence_id: undefined,
        current_completing_sequence_log_id: undefined,
        cutoff_time_for_non_high_priority_activities: null,
      });
      ActivityParserServiceMock.deserialize.mockResolvedValue({
        deserializedActivities: deserializedActivitiesDummy,
        logQuantityQuestions: logQuantityQuestionsDummy,
      });
      UserRepositoryMock.getUserSettings.mockResolvedValue(userSettingsDummy);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true, user: userDummy });

      await userSettingsService.updateSettings({ user_id: userDummy.id }, userSettingsDummy, true, {
        is_onboarding: false,
      });

      expect(UserRepositoryMock.consistentlyUpdateUserSettings).toBeCalledWith(
        {
          ...updatedUser,
          last_time_user_settings_modified: expect.toBeDateString(),
          has_received_inactivity_warning: false,
          updated_at: expect.toBeDateString(),
        },
        deserializedActivitiesDummy,
        logQuantityQuestionsDummy,
      );
    });

    it('positive: if sleep_time is sent Relax activity should be added to evening routine', async () => {
      ActivityParserServiceMock.deserialize.mockResolvedValue({
        deserializedActivities: deserializedActivitiesDummy,
        logQuantityQuestions: [],
      });
      UserRepositoryMock.getUserSettings.mockResolvedValue(userSettingsDummy);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true, user: userDummy });

      await userSettingsService.updateSettings(
        { user_id: userDummy.id },
        {
          ...userSettingsDummy,
          morning_activities: [],
          evening_activities: [],
          break_activities: [],
          sleep_time: '21:00',
        },
        true,
        { is_onboarding: true },
      );

      expect(ActivityParserServiceMock.deserialize).toBeCalledWith(
        {
          morning_activities: [],
          evening_activities: [
            { duration_seconds: 1800, name: 'Relax', show_saved_distracting_websites: true, id: expect.toBeString() },
          ],
          break_activities: [],
        },
        userDummy.id,
      );
    });
  });

  describe('clearUserActivities', () => {
    it('positive: should remove all default activities for user and call activityParserService.deserialize only with non-default activities (case where user only has default activities)', async () => {
      const serializedActivities = { morning_activities: [], break_activities: [], evening_activities: [] };
      UserRepositoryMock.getUserSettings.mockResolvedValue({ break_after_minutes: 20, ...userSettingsDBResponseDummy });
      ActivityParserServiceMock.serialize.mockReturnValueOnce(serializedActivityDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      ActivityParserServiceMock.deserialize.mockResolvedValueOnce({
        deserializedActivities: deserializedActivitiesDummy,
        logQuantityQuestions: [],
      });
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({
        isVerboseLoggingAllowed: false,
        user: userDummy,
      });

      await userSettingsService.clearUserActivities(userDummy.id);

      expect(ActivityParserServiceMock.deserialize).toBeCalledWith(serializedActivities, userDummy.id);
    });

    it('positive: should remove default activities for user and call activityParserService.deserialize only with non-default activities (case where user has default and non-default activities)', async () => {
      const serializedActivities = {
        morning_activities: [
          {
            id: '3b57f802-23b0-47e2-a188-b07001db8e1f',
            duration_seconds: 180,
            video_urls: ['https://www.youtube.com/watch?v=BWk_hqFGxfE'],
            name: 'Deep breathing',
            log_quantity: false,
            is_default: false,
          },
        ],
        break_activities: [
          {
            duration_seconds: 40,
            id: '6b57f802-23b0-47e2-a188-b07001db8e1f',
            log_quantity: false,
            name: "Dance like no-one's watching",
            video_urls: [],
            is_default: false,
          },
        ],
        evening_activities: [],
      };
      UserRepositoryMock.getUserSettings.mockResolvedValue({ break_after_minutes: 20, ...userSettingsDBResponseDummy });
      ActivityParserServiceMock.serialize.mockReturnValueOnce(serializedActivityDummyWithDefaultActivities);
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      ActivityParserServiceMock.deserialize.mockResolvedValueOnce({
        deserializedActivities: deserializedActivitiesDummy,
        logQuantityQuestions: [],
      });
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({
        isVerboseLoggingAllowed: false,
        user: userDummy,
      });

      await userSettingsService.clearUserActivities(userDummy.id);

      expect(ActivityParserServiceMock.deserialize).toBeCalledWith(serializedActivities, userDummy.id);
    });
  });

  describe('updateUserTimezoneAndLanguage', () => {
    it('negative: should throw error for invalid timezone', async () => {
      const responseMessage = 'the zone "America/New_Yor" is not supported';
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true });
      let exception: any;
      try {
        await userSettingsService.updateUserTimezoneAndLanguage(userDummy.id, { timezone: 'America/New_Yor' });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toMatch(responseMessage);
    });

    it('positive: should user timezone in UTC offset format receiving IANA timezone format', async () => {
      // mock date to be 2023-01-15
      Settings.now = () => 1678813200000;
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true });
      await userSettingsService.updateUserTimezoneAndLanguage(userDummy.id, { timezone: 'America/New_York' });

      // NY time zone alternates between -4 and -5 hours UTC based on daylight savings time
      expect(UserRepositoryMock.update).toBeCalledWith(userDummy.id, { timezone: 'UTC-04:00' });
      Settings.now = () => new Date().valueOf();
    });

    it('positive: should update user timezone in UTC offset format receiving negative UTC offset zone format', async () => {
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true });
      await userSettingsService.updateUserTimezoneAndLanguage(userDummy.id, { timezone: 'UTC-2' });

      expect(UserRepositoryMock.update).toBeCalledWith(userDummy.id, { timezone: 'UTC-02:00' });
    });

    it('positive: should update user timezone in UTC offset format receiving positive UTC offset zone format', async () => {
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true });
      await userSettingsService.updateUserTimezoneAndLanguage(userDummy.id, { timezone: 'UTC+2' });

      expect(UserRepositoryMock.update).toBeCalledWith(userDummy.id, { timezone: 'UTC+02:00' });
    });

    it('positive: if only language is passed in timezone should not be updated', async () => {
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true });
      await userSettingsService.updateUserTimezoneAndLanguage(userDummy.id, { language: LanguageOptions.SPANISH });

      expect(UserRepositoryMock.update).toBeCalledWith(userDummy.id, { language: 'es' });
    });
  });

  describe('updateUserIfCurrentActivityDeleted', () => {
    it('positive: if current activity is deleted, user current activity should be updated (case where current activity is last activity in sequence)', async () => {
      const deletedActivityId = randomUUID();
      const userWithCurrentActivity: User = {
        ...userDummy,
        current_activity_id: deletedActivityId,
        completing_sequence_log: UncompletedSequenceLogDummy,
        current_completing_sequence_log_id: UncompletedSequenceLogDummy.id,
      };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...ActivitySequenceDummy,
        sequenceActivityIds: [randomUUID(), deletedActivityId],
        activities: [
          { id: randomUUID(), days_of_week: [DaysOfWeek.ALL] },
          { id: deletedActivityId, days_of_week: [DaysOfWeek.ALL] },
        ],
      });
      ActivitySequenceServiceMock.sortActivityIdsByExecutionSequence.mockReturnValueOnce([]);
      ActivitySequenceServiceMock.filterActivitiesForCurrentDay.mockReturnValueOnce([
        { id: randomUUID(), days_of_week: [DaysOfWeek.ALL] },
        { id: deletedActivityId, days_of_week: [DaysOfWeek.ALL] },
      ]);

      const res = await userSettingsService.updateUserIfCurrentActivityDeleted(
        {
          ...userSettingsDummy,
          morning_activities: [...userSettingsDummy.morning_activities],
        },
        userWithCurrentActivity,
      );

      expect(res).toStrictEqual({
        current_completing_sequence_log_id: null,
        current_activity_id: null,
        current_activity_sequence_id: null,
      });
      expect(CompletedActivitySequenceServiceMock.completeActivitySequence).toBeCalledWith(
        userWithCurrentActivity.completing_sequence_log.id,
        userWithCurrentActivity.id,
      );
    });

    it('positive: if current activity is deleted, user current activity should be updated (case where current activity is not last activity in sequence)', async () => {
      const deletedActivityId = randomUUID();
      const lastActivityId = randomUUID();
      const userWithCurrentActivity: User = {
        ...userDummy,
        cutoff_time_for_non_high_priority_activities: null,
        current_activity_id: deletedActivityId,
        completing_sequence_log: UncompletedSequenceLogDummy,
        current_completing_sequence_log_id: UncompletedSequenceLogDummy.id,
      };

      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...ActivitySequenceDummy,
        sequenceActivityIds: [randomUUID(), deletedActivityId, lastActivityId],
        activities: [
          { id: randomUUID(), days_of_week: [DaysOfWeek.ALL] },
          { id: deletedActivityId, days_of_week: [DaysOfWeek.ALL] },
          { id: lastActivityId, days_of_week: [DaysOfWeek.ALL] },
        ],
      });
      ActivitySequenceServiceMock.sortActivityIdsByExecutionSequence.mockReturnValueOnce([lastActivityId]);
      ActivitySequenceServiceMock.filterActivitiesForCurrentDay.mockReturnValueOnce([
        { id: randomUUID(), days_of_week: [DaysOfWeek.ALL] },
        { id: deletedActivityId, days_of_week: [DaysOfWeek.ALL] },
        { id: lastActivityId, days_of_week: [DaysOfWeek.ALL] },
      ]);

      const res = await userSettingsService.updateUserIfCurrentActivityDeleted(
        {
          ...userSettingsDummy,
          morning_activities: [
            ...userSettingsDummy.morning_activities,
            { id: lastActivityId, days_of_week: [DaysOfWeek.ALL], name: 'Test 2' },
          ],
        },
        userWithCurrentActivity,
      );

      expect(res).toStrictEqual({
        current_completing_sequence_log_id: userWithCurrentActivity.completing_sequence_log.id,
        current_activity_id: lastActivityId,
        current_activity_sequence_id: ActivitySequenceDummy.id,
      });
    });

    it('positive: if user does not have current activity, user properties should remain unchanged', async () => {
      const userWithoutCurrentActivity: User = {
        ...userDummy,
        current_activity_id: null,
        completing_sequence_log: UncompletedSequenceLogDummy,
        current_activity_sequence_id: null,
      };

      const res = await userSettingsService.updateUserIfCurrentActivityDeleted(
        userSettingsDummy,
        userWithoutCurrentActivity,
      );

      expect(res).toStrictEqual({
        current_completing_sequence_log_id: userWithoutCurrentActivity.completing_sequence_log.id,
        current_activity_id: null,
        current_activity_sequence_id: null,
      });
    });

    it('positive: if current activity was not deleted, user properties should remain unchanged', async () => {
      const userWithCurrentActivity: User = {
        ...userDummy,
        current_activity_id: userSettingsDummy.morning_activities[0].id,
        completing_sequence_log: UncompletedSequenceLogDummy,
        current_activity_sequence_id: userSettingsDummy.morning_activities[0].activity_sequence_id,
      };

      const res = await userSettingsService.updateUserIfCurrentActivityDeleted(
        userSettingsDummy,
        userWithCurrentActivity,
      );

      expect(res).toStrictEqual({
        current_completing_sequence_log_id: userWithCurrentActivity.completing_sequence_log.id,
        current_activity_id: userSettingsDummy.morning_activities[0].id,
        current_activity_sequence_id: userSettingsDummy.morning_activities[0].activity_sequence_id,
      });
    });

    it('positive: if one of user sequences is empty, no error should occur', async () => {
      const userWithCurrentActivity: User = {
        ...userDummy,
        current_activity_id: userSettingsDummy.morning_activities[0].id,
        completing_sequence_log: UncompletedSequenceLogDummy,
        current_activity_sequence_id: userSettingsDummy.morning_activities[0].activity_sequence_id,
      };

      const res = await userSettingsService.updateUserIfCurrentActivityDeleted(
        { ...userSettingsDummy, break_activities: [] },
        userWithCurrentActivity,
      );

      expect(res).toStrictEqual({
        current_completing_sequence_log_id: userWithCurrentActivity.completing_sequence_log.id,
        current_activity_id: userSettingsDummy.morning_activities[0].id,
        current_activity_sequence_id: userSettingsDummy.morning_activities[0].activity_sequence_id,
      });
    });
  });

  describe('calculateRelaxActivityDuration', () => {
    it('Positive: should calculate the correct time difference between sleep and shutdown time', () => {
      const sleepTime = '23:00';
      const shutdownTime = '20:00';
      const eveningActivities = [
        { duration_seconds: 3600, id: randomUUID(), name: 'Name One' }, // 1 hour
        { duration_seconds: 1800, id: randomUUID(), name: 'Name Two' }, // 30 minutes
      ];
      const result = userSettingsService.calculateRelaxActivityDuration(sleepTime, shutdownTime, eveningActivities);

      expect(result).toBe(5400); // 1.5 hours of relax time
    });

    it('Positive: should handle time difference with no activities', () => {
      const sleepTime = '22:00';
      const shutdownTime = '20:00';
      const eveningActivities = [];
      const result = userSettingsService.calculateRelaxActivityDuration(sleepTime, shutdownTime, eveningActivities);

      expect(result).toBe(7200); // 2 hours of relax time
    });

    it('Positive: should handle time difference where activity time is equal to difference', () => {
      const sleepTime = '22:00';
      const shutdownTime = '20:00';
      const eveningActivities = [{ duration_seconds: 7200, id: randomUUID(), name: 'Name One' }]; // 2 hours
      const result = userSettingsService.calculateRelaxActivityDuration(sleepTime, shutdownTime, eveningActivities);

      expect(Object.is(result, 0)).toBe(true); // no relax time
    });
  });

  describe('validateCutoffTime', () => {
    it('positive: invalid hh:mm format time should return false', () => {
      const response = userSettingsService.validateCutoffTime('7:30');

      expect(response).toBeFalse();
    });

    it('positive: valid hh:mm format time should return true', () => {
      const response = userSettingsService.validateCutoffTime('20:30');

      expect(response).toBeTrue();
    });
  });

  describe('addActivityToRoutine', () => {
    it("positive: should save incoming activity to user's settings", async () => {
      const activityDataDummy = {
        name: 'New Activity',
        duration: 200,
        days_of_week: [DaysOfWeek.ALL],
        allowed_urls: [],
        allowed_apps: [],
      };
      UserRepositoryMock.getUserSettings.mockResolvedValueOnce({
        ...userSettingsDBResponseDummy,
        cutoff_time_for_non_high_priority_activities: '20:30',
      });
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValue({
        isVerboseLoggingAllowed: false,
        user: userDummy,
      });
      ActivityParserServiceMock.serialize.mockReturnValueOnce(serializedActivityDummy);
      ActivityParserServiceMock.deserialize.mockResolvedValue({
        deserializedActivities: deserializedActivitiesDummy,
        logQuantityQuestions: [],
      });
      UserRepositoryMock.getUserSettings.mockResolvedValue(userSettingsDummy);

      await userSettingsService.addActivityToRoutine(userDummy.id, activityDataDummy);

      expect(UserRepositoryMock.consistentlyUpdateUserSettings).toBeCalled();
    });
  });
});
