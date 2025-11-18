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
  dummyTutorials,
  logQuantityQuestionsDummy,
  serializedActivityDummy,
  UncompletedSequenceLogDummy,
  userDummy,
  userSettingsDBResponseDummy,
  userSettingsDummy,
  dummyUserCutoffTimeActivities,
  dummyFreeTimeActivity,
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
  CustomRoutineRepositoryMock,
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
import { LanguageOptions } from '../../../../shared/domain/language-options.enum';
import { ActivityPriority } from '../../../activity/domain/activity-priority.enum';
import { ONE_HOUR_SECONDS } from '../../../../shared/utils/constants';
import { CustomRoutineRepository } from '../../repositories/custom-routine.repository';

describe('UserSettingsService', () => {
  let userSettingsService: UserSettingsService;
  const i18nServiceMock = mockDeep<I18nService>();

  beforeAll(async () => {
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
        CustomRoutineRepository,
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
      .overrideProvider(CustomRoutineRepository)
      .useValue(CustomRoutineRepositoryMock)
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

      const serializedResult = JSON.parse(JSON.stringify(result));
      expect(serializedResult).toMatchSnapshot();
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

    it('negative: If any of the morning or break activities have a cutoff time for an activity, throw BadRequestException', async () => {
      const errorMessage = 'Morning and break activities cannot have a cutoff_time_for_doing_activity';
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true, user: userDummy });
      ActivityParserServiceMock.deserialize.mockResolvedValue({
        deserializedActivities: deserializedActivitiesDummy,
        logQuantityQuestions: logQuantityQuestionsDummy,
        tutorials: dummyTutorials,
      });
      let exception: any;

      try {
        await userSettingsService.updateSettings(
          { user_id: userDummy.id },
          { ...userSettingsDummy, ...dummyUserCutoffTimeActivities.BREAK_WITH_CUTOFF },
          true,
          {
            is_onboarding: false,
          },
        );
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: If any evening activity has a cutoff time before the cutoff time for non-high priority activities, throw BadRequestException', async () => {
      const errorMessage =
        'Evening activities cutoff time should be after cutoff_time_for_non_high_priority_activities';
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true, user: userDummy });
      ActivityParserServiceMock.deserialize.mockResolvedValue({
        deserializedActivities: deserializedActivitiesDummy,
        logQuantityQuestions: logQuantityQuestionsDummy,
        tutorials: dummyTutorials,
      });
      let exception: any;

      try {
        await userSettingsService.updateSettings(
          { user_id: userDummy.id },
          {
            ...userSettingsDummy,
            cutoff_time_for_non_high_priority_activities: '21:00',
            ...dummyUserCutoffTimeActivities.EVENING_WITH_CUTOFF,
          },
          true,
          {
            is_onboarding: false,
          },
        );
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should clear current activity pointers when the activity is removed and no current sequence exists', async () => {
      const removedActivityId = randomUUID();
      const userWithCurrentActivity = new User(
        {
          ...userDummy,
          current_activity_id: removedActivityId,
          current_activity_sequence_id: null,
          current_completing_sequence_log_id: null,
        },
        { generateId: false },
      );

      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({
        isVerboseLoggingAllowed: true,
        user: userWithCurrentActivity,
      });
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      ActivityParserServiceMock.deserialize.mockResolvedValue({
        deserializedActivities: deserializedActivitiesDummy,
        logQuantityQuestions: logQuantityQuestionsDummy,
        tutorials: dummyTutorials,
      });
      UserRepositoryMock.getUserSettings.mockResolvedValue(userSettingsDummy);

      await userSettingsService.updateSettings({ user_id: userDummy.id }, userSettingsDummy, true, {
        is_onboarding: false,
      });

      expect(UserRepositoryMock.orm.update).toHaveBeenCalledWith(
        userDummy.id,
        expect.objectContaining({
          current_activity_id: null,
          current_activity_sequence_id: null,
          current_completing_sequence_log_id: null,
        }),
      );
    });

    it('positive: should clear verbose logging cache when verbose_logging setting is provided', async () => {
      ActivityParserServiceMock.deserialize.mockResolvedValue({
        deserializedActivities: deserializedActivitiesDummy,
        logQuantityQuestions: logQuantityQuestionsDummy,
        tutorials: dummyTutorials,
      });
      UserRepositoryMock.getUserSettings.mockResolvedValue(userSettingsDummy);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true, user: userDummy });

      await userSettingsService.updateSettings(
        { user_id: userDummy.id },
        { ...userSettingsDummy, verbose_logging: true },
        true,
        { is_onboarding: false },
      );

      expect(UserServiceMock.clearVerboseLoggingCache).toHaveBeenCalledWith(userDummy.id);
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
        tutorials: dummyTutorials,
      });
      UserRepositoryMock.getUserSettings.mockResolvedValue(userSettingsDummy);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true, user: userDummy });

      await userSettingsService.updateSettings({ user_id: userDummy.id }, userSettingsDummy, true, {
        is_onboarding: false,
      });

      expect(UserRepositoryMock.consistentlyUpdateUserSettings).toHaveBeenCalledWith(
        {
          ...updatedUser,
          last_time_user_settings_modified: expect.toBeDateString(),
          has_received_inactivity_warning: false,
          updated_at: expect.toBeDateString(),
        },
        deserializedActivitiesDummy,
        logQuantityQuestionsDummy,
        dummyTutorials,
        [],
      );
    });

    it('positive: if cutoff_time_for_non_high_priority_activities is sent "Free Time - no distraction blocking" activity should be added to evening routine', async () => {
      i18nServiceMock.t.mockReturnValue('Free Time - no distraction blocking');
      ActivityParserServiceMock.deserialize.mockResolvedValue({
        deserializedActivities: deserializedActivitiesDummy,
        logQuantityQuestions: [],
        tutorials: [],
      });
      UserRepositoryMock.getUserSettings.mockResolvedValue({
        ...userSettingsDummy,
        is_relax_activity_generated: false,
      });
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true, user: userDummy });

      await userSettingsService.updateSettings(
        { user_id: userDummy.id },
        {
          ...userSettingsDummy,
          morning_activities: [],
          evening_activities: [dummyFreeTimeActivity],
          break_activities: [],
          cutoff_time_for_non_high_priority_activities: '21:00',
        },
        true,
        { is_onboarding: true },
      );

      expect(ActivityParserServiceMock.deserialize).toHaveBeenCalledWith(
        {
          morning_activities: [],
          evening_activities: [
            {
              duration_seconds: ONE_HOUR_SECONDS * 0.5,
              name: 'Free Time - no distraction blocking',
              show_saved_distracting_websites: true,
              id: expect.any(String),
            },
          ],
          break_activities: [],
        },
        userDummy.id,
      );
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
      expect(UserRepositoryMock.update).toHaveBeenCalledWith(userDummy.id, { timezone: 'UTC-04:00' });
      Settings.now = () => new Date().valueOf();
    });

    it('positive: should update user timezone in UTC offset format receiving negative UTC offset zone format', async () => {
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true });
      await userSettingsService.updateUserTimezoneAndLanguage(userDummy.id, { timezone: 'UTC-2' });

      expect(UserRepositoryMock.update).toHaveBeenCalledWith(userDummy.id, { timezone: 'UTC-02:00' });
    });

    it('positive: should update user timezone in UTC offset format receiving positive UTC offset zone format', async () => {
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true });
      await userSettingsService.updateUserTimezoneAndLanguage(userDummy.id, { timezone: 'UTC+2' });

      expect(UserRepositoryMock.update).toHaveBeenCalledWith(userDummy.id, { timezone: 'UTC+02:00' });
    });

    it('positive: if only language is passed in timezone should not be updated', async () => {
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true });
      await userSettingsService.updateUserTimezoneAndLanguage(userDummy.id, { language: LanguageOptions.SPANISH });

      expect(UserRepositoryMock.update).toHaveBeenCalledWith(userDummy.id, { language: 'es' });
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
      expect(CompletedActivitySequenceServiceMock.completeActivitySequence).toHaveBeenCalledWith(
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
    it('Positive: should calculate the correct time difference between cutoff and shutdown time', () => {
      const cutoffTime = '23:00';
      const shutdownTime = '20:00';
      const eveningActivities = [
        { duration_seconds: ONE_HOUR_SECONDS, id: randomUUID(), name: 'Name One' }, // 1 hour
        { duration_seconds: ONE_HOUR_SECONDS * 0.5, id: randomUUID(), name: 'Name Two' }, // 30 minutes
      ];
      const result = userSettingsService.calculateRelaxActivityDuration(cutoffTime, shutdownTime, eveningActivities);

      expect(result).toBe(ONE_HOUR_SECONDS * 3);
    });

    it('Positive: should handle time difference with no activities', () => {
      const cutoffTime = '22:00';
      const shutdownTime = '20:00';
      const eveningActivities = [];
      const result = userSettingsService.calculateRelaxActivityDuration(cutoffTime, shutdownTime, eveningActivities);

      expect(result).toBe(ONE_HOUR_SECONDS * 2);
    });

    it('Positive: should handle time difference where activity time is equal to difference', () => {
      const cutoffTime = '22:00';
      const shutdownTime = '20:00';
      const eveningActivities = [
        { duration_seconds: ONE_HOUR_SECONDS * 2, id: randomUUID(), name: 'Name One', priority: ActivityPriority.HIGH },
      ]; // 2 hours
      const result = userSettingsService.calculateRelaxActivityDuration(cutoffTime, shutdownTime, eveningActivities);

      expect(Object.is(result, 0)).toBe(true); // no relax time
    });

    it('Positive: should calculate the correct time difference between cutoff and shutdown time', () => {
      const cutoffTime = '23:00';
      const shutdownTime = '20:00';
      const eveningActivities = [
        { duration_seconds: ONE_HOUR_SECONDS, id: randomUUID(), name: 'Name One' },
        {
          duration_seconds: ONE_HOUR_SECONDS * 0.5,
          id: randomUUID(),
          name: 'Name Two',
          priority: ActivityPriority.HIGH,
        },
      ];
      const result = userSettingsService.calculateRelaxActivityDuration(cutoffTime, shutdownTime, eveningActivities);

      expect(result).toBe(ONE_HOUR_SECONDS * 2.5);
    });
  });

  describe('validateCutoffTime', () => {
    it('positive: invalid hh:mm format time should return false', () => {
      const response = userSettingsService.validateCutoffTime('7:30');

      expect(response).toBeNull();
    });

    it('positive: valid hh:mm format time should return true', () => {
      const response = userSettingsService.validateCutoffTime('20:30');

      expect(response).toBe('20:30');
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
        cutoff_time_for_non_high_priority_activities: '21:30',
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
        tutorials: [],
      });
      UserRepositoryMock.getUserSettings.mockResolvedValue(userSettingsDummy);

      await userSettingsService.addActivityToRoutine(userDummy.id, activityDataDummy);

      expect(UserRepositoryMock.consistentlyUpdateUserSettings).toHaveBeenCalled();
    });
  });

  describe('calculateUserUTCRoutineTimes', () => {
    it('should correctly calculate UTC times for Melbourne (UTC+10)', () => {
      // Melbourne user setting morning routine at 7:00 AM local time
      // Should be 21:00 UTC (previous day)
      const result = userSettingsService.calculateUserUTCRoutineTimes('07:00', '21:00', 'UTC+10:00');

      expect(result.utc_startup_time).toBe('21:00');
      expect(result.utc_shutdown_time).toBe('11:00');
    });

    it('should handle timezone format without :00 suffix', () => {
      const result = userSettingsService.calculateUserUTCRoutineTimes('07:00', '21:00', 'UTC+10');

      expect(result.utc_startup_time).toBe('21:00');
      expect(result.utc_shutdown_time).toBe('11:00');
    });

    it('should correctly calculate UTC times for New York (UTC-5)', () => {
      // New York user setting morning routine at 7:00 AM local time
      // Should be 12:00 UTC
      const result = userSettingsService.calculateUserUTCRoutineTimes('07:00', '22:00', 'UTC-5');

      expect(result.utc_startup_time).toBe('12:00');
      expect(result.utc_shutdown_time).toBe('03:00');
    });

    it('should handle UTC timezone', () => {
      const result = userSettingsService.calculateUserUTCRoutineTimes('07:00', '22:00', 'UTC');

      expect(result.utc_startup_time).toBe('07:00');
      expect(result.utc_shutdown_time).toBe('22:00');
    });

    it('should handle timezone with half-hour offset', () => {
      // India (UTC+5:30)
      const result = userSettingsService.calculateUserUTCRoutineTimes('07:00', '22:00', 'UTC+5:30');

      expect(result.utc_startup_time).toBe('01:30');
      expect(result.utc_shutdown_time).toBe('16:30');
    });

    it('should handle identical times by applying defaults when both are 00:00', () => {
      const result = userSettingsService.calculateUserUTCRoutineTimes('00:00', '00:00', 'Australia/Sydney');

      expect(result.utc_startup_time).not.toEqual(result.utc_shutdown_time);
    });

    it('should throw error for non-midnight identical times', () => {
      expect(() => {
        userSettingsService.calculateUserUTCRoutineTimes('10:00', '10:00', 'Australia/Sydney');
      }).toThrow(BadRequestException);

      expect(() => {
        userSettingsService.calculateUserUTCRoutineTimes('15:30', '15:30', 'UTC');
      }).toThrow(BadRequestException);
    });

    it('should correctly handle AEST timezone conversion with realistic times', () => {
      const result = userSettingsService.calculateUserUTCRoutineTimes('06:00', '22:00', 'Australia/Sydney');

      expect(result.utc_startup_time).toBeDefined();
      expect(result.utc_shutdown_time).toBeDefined();
      expect(result.utc_startup_time).not.toEqual(result.utc_shutdown_time);
    });

    it('should log warning for identical times via Sentry', () => {
      const mockUserId = randomUUID();

      userSettingsService.calculateUserUTCRoutineTimes('00:00', '00:00', 'Australia/Sydney', mockUserId);

      expect(SentryServiceMock.instance().addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Service',
          level: 'warning',
          message: 'Identical startup/shutdown times detected',
        }),
      );
    });
  });

  describe('mergeById', () => {
    type TestItem = { id?: string; name?: string; extra?: string };

    it('returns incoming when existing is empty and assigns uuid for items without id', () => {
      const incoming: TestItem[] = [{ name: 'A' }, { id: '1', name: 'B' }];
      const result = userSettingsService.mergeById<TestItem>([], incoming);
      expect(result).toHaveLength(2);
      const [first, second] = result;
      expect(first.id).toBeDefined();
      expect(typeof first.id).toBe('string');
      expect(second.id).toBe('1');
    });

    it('returns existing when incoming is empty (copy, not same reference)', () => {
      const existing: TestItem[] = [{ id: '1', name: 'A' }];
      const result = userSettingsService.mergeById<TestItem>(existing, []);
      expect(result).toEqual(existing);
      expect(result).not.toBe(existing);
    });

    it('appends unique incoming items by id', () => {
      const existing: TestItem[] = [{ id: '1', name: 'A' }];
      const incoming: TestItem[] = [{ id: '2', name: 'B' }];
      const result = userSettingsService.mergeById<TestItem>(existing, incoming);
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.id)).toEqual(['1', '2']);
    });

    it('skips duplicates when incoming has same id and same name', () => {
      const existing: TestItem[] = [{ id: '1', name: 'A' }];
      const incoming: TestItem[] = [{ id: '1', name: 'A' }];
      const result = userSettingsService.mergeById<TestItem>(existing, incoming);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(existing[0]);
    });

    it('treats same id but different name as distinct, generating a new uuid', () => {
      const existing: TestItem[] = [{ id: '1', name: 'A' }];
      const incoming: TestItem[] = [{ id: '1', name: 'B' }];
      const result = userSettingsService.mergeById<TestItem>(existing, incoming);
      expect(result).toHaveLength(2);
      const [ex, inc] = result;
      expect(ex.id).toBe('1');
      expect(inc.name).toBe('B');
      expect(inc.id).toBeDefined();
      expect(inc.id).not.toBe('1');
    });

    it('skips duplicate when incoming has same id but unknown name', () => {
      const existing: TestItem[] = [{ id: '1', name: 'A' }];
      const incoming: TestItem[] = [{ id: '1' }];
      const result = userSettingsService.mergeById<TestItem>(existing, incoming);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(existing[0]);
    });

    it('preserves order: existing first, then unique incoming in order', () => {
      const existing: TestItem[] = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ];
      const incoming: TestItem[] = [{ id: '2', name: 'B' }, { id: '3', name: 'C' }, { name: 'D' }];
      const result = userSettingsService.mergeById<TestItem>(existing, incoming);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
      expect(result[2].id).toBe('3');
      expect(result[3].id).toBeDefined();
    });
  });

  describe('hasCutoffTimeBeenReached', () => {
    beforeEach(() => {
      // Reset Luxon's current time
      Settings.now = () => new Date().valueOf();
    });

    it('should correctly check cutoff time for Melbourne timezone', () => {
      // Mock current time to be 3:00 PM Melbourne time (5:00 AM UTC)
      const melbourneTime = new Date('2025-08-12T05:00:00Z');
      Settings.now = () => melbourneTime.valueOf();

      // Cutoff at 2:00 PM (should have been reached)
      const reached = userSettingsService.hasCutoffTimeBeenReached('14:00', 'UTC+10:00');
      expect(reached).toBe(true);

      // Cutoff at 4:00 PM (should not have been reached)
      const notReached = userSettingsService.hasCutoffTimeBeenReached('16:00', 'UTC+10:00');
      expect(notReached).toBe(false);
    });

    it('should handle timezone format without :00 suffix', () => {
      const melbourneTime = new Date('2025-08-12T05:00:00Z');
      Settings.now = () => melbourneTime.valueOf();

      const reached = userSettingsService.hasCutoffTimeBeenReached('14:00', 'UTC+10');
      expect(reached).toBe(true);
    });

    it('should return false when no cutoff time is provided', () => {
      const result = userSettingsService.hasCutoffTimeBeenReached('', 'UTC+10');
      expect(result).toBe(false);
    });
  });
});
