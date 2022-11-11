import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import {
  deserializedActivitiesDummy,
  emptyDeserializedActivitiesDummy,
  localDeviceSettingsDummy,
  serializedActivityDummy,
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
  UserServiceMock,
} from '../../../../../test/mocks';
import { ActivityParserService } from '../../../activity/services/activity-parser/activity-parser.service';
import { UserRepository } from '../../repositories/user.repository';
import { UserService } from '../user/user.service';
import { UserSettingsService } from './user-settings.service';
import { StripeService } from '../../../../../../../libs/stripe/src';
import { Auth0ManagementService } from '../../../../../../../libs/auth0/src';
import { RevenueCatService } from '../../../../../../../libs/revenue-cat/src';
import { User } from '../../entities/user.entity';

describe('UserSettingsService', () => {
  let userSettingsService: UserSettingsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserRepository,
        UserSettingsService,
        ActivityParserService,
        UserService,
        Auth0ManagementService,
        RevenueCatService,
        StripeService,
        ConfigService,
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
      .overrideProvider(UserService)
      .useValue(UserServiceMock)
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
      UserServiceMock.getUserLocalDeviceSettings.mockResolvedValueOnce(localDeviceSettingsDummy);
      ActivityParserServiceMock.serialize.mockResolvedValueOnce(serializedActivityDummy);

      const result = await userSettingsService.getSettings({ user_id });

      expect(result).toMatchSnapshot();
    });
  });

  describe('updateSettings', () => {
    it('negative: if user user does not exist in DB, throw NotFoundException', async () => {
      const user_id = randomUUID();
      UserRepositoryMock.orm.findOne.mockResolvedValue(null);
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
      const updatedUser = new User({ id: userDummy.id, startup_time, shutdown_time, break_after_minutes });
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      ActivityParserServiceMock.deserialize.mockResolvedValue(deserializedActivitiesDummy);
      UserRepositoryMock.getUserSettings.mockResolvedValue(userSettingsDummy);
      UserServiceMock.getUserLocalDeviceSettings.mockResolvedValue(localDeviceSettingsDummy);

      await userSettingsService.updateSettings({ user_id: userDummy.id }, userSettingsDummy, true);

      expect(UserRepositoryMock.consistentlyUpdateUserSettings).toBeCalledWith(
        updatedUser,
        deserializedActivitiesDummy,
      );
      expect(UserServiceMock.markUserSettingsAsEdited).toBeCalledWith(userDummy.id);
    });
  });

  describe('clearUserActivities', () => {
    it('positive: should update settings with empty activity arrays for ROUTINE_AND_BREAK format', async () => {
      const { startup_time, shutdown_time } = userSettingsDummy;
      const updatedUser = new User({ id: userDummy.id, startup_time, shutdown_time, break_after_minutes: 20 });
      UserRepositoryMock.getUserSettings.mockResolvedValue({ ...userSettingsDBResponseDummy, break_after_minutes: 20 });
      ActivityParserServiceMock.serialize.mockResolvedValue(serializedActivityDummy);
      UserServiceMock.getUserLocalDeviceSettings
        .mockReturnValueOnce(localDeviceSettingsDummy)
        .mockReturnValue(localDeviceSettingsDummy);
      ActivityParserServiceMock.deserialize.mockResolvedValue(emptyDeserializedActivitiesDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);

      await userSettingsService.clearUserActivities(userDummy.id);

      expect(UserRepositoryMock.consistentlyUpdateUserSettings).toBeCalledWith(
        updatedUser,
        emptyDeserializedActivitiesDummy,
      );
    });
  });
});
