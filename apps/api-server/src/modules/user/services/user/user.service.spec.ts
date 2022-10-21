import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configsArray } from '../../../../config/index';
import { StripeService } from '../../../../../../../libs/stripe/src';
import { auth0UserDummy, userDummy } from '../../../../../test/dummies ';
import { Auth0ManagementService } from '../../../../../../../libs/auth0/src';
import {
  Auth0ManagementServiceMock,
  RevenueCatServiceMock,
  StripeServiceMock,
  UserRepositoryMock,
  UserSettingsServiceMock,
} from '../../../../../test/mocks';
import { SyncUserAccountDto } from '../../dto/sync-user-account.dto';
import { UserRepository } from '../../repositories/user.repository';
import { UserService } from './user.service';
import { RevenueCatService } from '../../../../../../../libs/revenue-cat/src';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { CurrentActivityProps } from '../../../activity/domain/current-activity-props.model';

describe('UserService', () => {
  let userService: UserService;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ load: configsArray })],
      providers: [
        UserRepository,
        UserService,
        UserSettingsService,
        Auth0ManagementService,
        RevenueCatService,
        StripeService,
        ConfigService,
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
      .compile();
    userService = moduleRef.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
  });

  describe('syncUserAccount', () => {
    const syncAccountDto: SyncUserAccountDto = {
      auth0_id: 'dcidejd348ryhjeckwx3',
      email: 'some@gmail.com',
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
      Auth0ManagementServiceMock.getUser.mockResolvedValueOnce(undefined);
      const errorMessage = 'User does not exit in Auth0!';
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

    it('positive: if user exist in Auth0 but is new for the DB, trial access should be granted and defsult settings assigned', async () => {
      Auth0ManagementServiceMock.getUser.mockResolvedValueOnce(auth0UserDummy);
      UserRepositoryMock.upsert.mockResolvedValueOnce(userDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(null);
      StripeServiceMock.registerNewCustomer.mockResolvedValue({ id: randomUUID() });
      RevenueCatServiceMock.getOrCreateSubscriber.mockResolvedValue(emptySubscriber);

      await userService.syncUserAccount(syncAccountDto);

      expect(StripeServiceMock.registerNewCustomer).toBeCalledWith(userDummy.email);
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

      await userService.getUserDetails(id);

      expect(UserRepositoryMock.getUserDetails).toBeCalledWith(id);
    });

    it('negative: if user account does not exist, throw the NotFoundException', async () => {
      UserRepositoryMock.getUserDetails.mockResolvedValueOnce(null);
      const errorMessage = `User with id: ${id} does not exit!`;
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
    it('negative: if there is no user throw NotFoundExcaption', async () => {
      const user_id = randomUUID();
      UserRepositoryMock.getUserCurrentActivityProps.mockResolvedValue(null);
      let exception: any;

      try {
        await userService.getUserCurrentActivityProps(user_id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with id: ${user_id} does not exit!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should return instance of CurrentActivityProps', async () => {
      UserRepositoryMock.getUserCurrentActivityProps.mockResolvedValue(userDummy);

      const result = await userService.getUserCurrentActivityProps(userDummy.id);

      expect(result).toBeInstanceOf(CurrentActivityProps);
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
      UserRepositoryMock.orm.findOne.mockResolvedValue(null);
      let exception: any;

      try {
        await userService.updateUserLocalDeviceSettings(user_id, localSettings);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with id: ${user_id} does not exit!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: user should be saved with updated settings', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);

      await userService.updateUserLocalDeviceSettings(userDummy.id, localSettings);

      expect(UserRepositoryMock.orm.update).toBeCalledWith(userDummy.id, { local_device_settings: localSettings });
    });
  });

  describe('getUserLocalDeviceSettings', () => {
    it('negative: if there is no user throw NotFoundExcaption', async () => {
      const user_id = randomUUID();
      UserRepositoryMock.orm.findOne.mockResolvedValue(null);
      let exception: any;

      try {
        await userService.getUserLocalDeviceSettings(user_id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with id: ${user_id} does not exit!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: if user exists but settings field is empty return null settings ', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);

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
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);

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

  describe('markUserSettingsAsEdited', () => {
    it('positive: UserRepositoryMock.orm.update should be called with updated local device settings', async () => {
      const updatedSettings = {
        MacOS: '...',
        Windows: '...',
        Android: '...',
        iOS: '...',
        Web: { hasEditedSettings: true },
      };
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      await userService.markUserSettingsAsEdited(userDummy.id);

      expect(UserRepositoryMock.orm.update).toBeCalledWith(userDummy.id, {
        local_device_settings: updatedSettings,
      });
    });
  });

  describe('getUsers', () => {
    it('positive: getList query should be called', async () => {
      const search = 'edclkedc';

      await userService.getUsers({ search });

      expect(UserRepositoryMock.getUsersList).toBeCalledWith({ search });
    });
  });
});
