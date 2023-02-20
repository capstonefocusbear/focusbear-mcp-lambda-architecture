import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import {
  ActivitySequenceDummy,
  deserializedActivitiesDummy,
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
} from '../../../../../test/mocks';
import { ActivityParserService } from '../../../activity/services/activity-parser/activity-parser.service';
import { UserRepository } from '../../repositories/user.repository';
import { UserSettingsService } from './user-settings.service';
import { StripeService } from '../../../../../../../libs/stripe/src';
import { Auth0ManagementService } from '../../../../../../../libs/auth0/src';
import { RevenueCatService } from '../../../../../../../libs/revenue-cat/src';
import { User } from '../../entities/user.entity';
import { CompletedActivitySequenceService } from '../../../activity/services/completed-activity-sequence/completed-activity-sequence.service';
import { ActivitySequenceRepository } from '../../../activity/repositories/activity-sequence.repository';
import { UserDailyStatsService } from '../user-daily-stats/user-daily-stats.service';

describe('UserSettingsService', () => {
  let userSettingsService: UserSettingsService;

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
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
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
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(null);
      const errorMessage = `User with id: ${user_id} does not exists!`;
      let exception: any;

      try {
        await userSettingsService.updateSettings({ user_id }, serializedActivityDummy, false);
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
        break_after_minutes,
        has_edited_settings: true,
        current_activity_id: undefined,
        current_activity_sequence_id: undefined,
        current_completing_sequence_log_id: undefined,
        cutoff_time_for_non_high_priority_activities: null,
      });
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      ActivityParserServiceMock.deserialize.mockResolvedValue(deserializedActivitiesDummy);
      UserRepositoryMock.getUserSettings.mockResolvedValue(userSettingsDummy);

      await userSettingsService.updateSettings({ user_id: userDummy.id }, userSettingsDummy, true);

      expect(UserRepositoryMock.consistentlyUpdateUserSettings).toBeCalledWith(
        updatedUser,
        deserializedActivitiesDummy,
      );
    });
  });

  describe('clearUserActivities', () => {
    it('positive: should remove all default activities for user and call activityParserService.deserialize only with non-default activities (case where user only has default activities)', async () => {
      const serializedActivities = { morning_activities: [], break_activities: [], evening_activities: [] };
      UserRepositoryMock.getUserSettings.mockResolvedValue({ break_after_minutes: 20, ...userSettingsDBResponseDummy });
      ActivityParserServiceMock.serialize.mockReturnValueOnce(serializedActivityDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);

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

      await userSettingsService.clearUserActivities(userDummy.id);

      expect(ActivityParserServiceMock.deserialize).toBeCalledWith(serializedActivities, userDummy.id);
    });
  });

  describe('updateUserTimezone', () => {
    it('negative: should throw error for invalid timezone', async () => {
      const responseMessage = 'the zone "America/New_Yor" is not supported';
      let exception: any;
      try {
        await userSettingsService.updateUserTimezone(userDummy.id, 'America/New_Yor');
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toMatch(responseMessage);
    });

    it('positive: should user timezone in UTC offset format receiving IANA timezone format', async () => {
      await userSettingsService.updateUserTimezone(userDummy.id, 'America/New_York');

      expect(UserRepositoryMock.update).toBeCalledWith(userDummy.id, { timezone: 'UTC-05:00' });
    });

    it('positive: should user timezone in UTC offset format receiving UTC offset zone format', async () => {
      await userSettingsService.updateUserTimezone(userDummy.id, 'UTC-2');

      expect(UserRepositoryMock.update).toBeCalledWith(userDummy.id, { timezone: 'UTC-02:00' });
    });
  });

  describe('updateUserIfCurrentActivityDeleted', () => {
    it('positive: if current activity is deleted, user current activity should be updated (case where current activity is last activity in sequence)', async () => {
      const deletedActivityId = randomUUID();
      const userWithCurrentActivity: User = {
        ...userDummy,
        current_activity_id: deletedActivityId,
        completing_sequence_log: UncompletedSequenceLogDummy,
      };
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...ActivitySequenceDummy,
        sequenceActivityIds: [randomUUID(), deletedActivityId],
      });

      const res = await userSettingsService.updateUserIfCurrentActivityDeleted(
        userSettingsDummy,
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
        current_activity_id: deletedActivityId,
        completing_sequence_log: UncompletedSequenceLogDummy,
      };
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...ActivitySequenceDummy,
        sequenceActivityIds: [randomUUID(), deletedActivityId, lastActivityId],
      });

      const res = await userSettingsService.updateUserIfCurrentActivityDeleted(
        userSettingsDummy,
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
  });
});
