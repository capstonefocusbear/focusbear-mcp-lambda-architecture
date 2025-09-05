import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { randomUUID } from 'crypto';
import {
  ANDROID_DEVICE_NAME,
  ANDROID_OPERATING_SYSTEM,
  IOS_OPERATING_SYSTEM,
  MACOS_OPERATING_SYSTEM,
  MAC_CLIENT_ID,
  MOBILE_CLIENT_ID,
  WINDOWS_CLIENT_ID,
  WINDOWS_OPERATING_SYSTEM,
  WEB_CLIENT_ID,
} from '@app/auth0/auth0.constants';
import { Auth0ManagementService, Auth0Module } from '../../../../../../../libs/auth0/src';
import { DeviceDummy, dummyAuth0Client, userDummy } from '../../../../../test/dummies';
import {
  Auth0ManagementServiceMock,
  DeviceRepositoryMock,
  SentryServiceMock,
  UserRepositoryMock,
  UserServiceMock,
} from '../../../../../test/mocks';
import { OperatingSystem } from '../../../../shared/domain/operating-system.enum';
import { CreateDeviceDto } from '../../dto/create-device.dto';
import { Device } from '../../entities/device.entity';
import { DeviceRepository } from '../../repositories/device.repository';
import { DeviceService } from './device.service';
import { UserService } from '../../../user/services/user/user.service';
import { UserRepository } from '../../../user/repositories/user.repository';
import { UserTypes } from '../../../user/domain/user-types.enum';
import { Auth0ClientDto } from '../../../user/dto/auth0-client.dto';

describe('DeviceService', () => {
  let deviceService: DeviceService;

  const findIosClient = (clients: Auth0ClientDto[], mobileClientIds: string[], androidDeviceName: string) => {
    return clients.find((f) => mobileClientIds.some((s) => s === f.client_id) && f.name !== androidDeviceName);
  };

  const findAndroidClient = (clients: Auth0ClientDto[], mobileClientIds: string[], androidDeviceName: string) => {
    return clients.find((f) => mobileClientIds.some((s) => s === f.client_id) && f.name === androidDeviceName);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        Auth0Module.forRoot({
          clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
          clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
          domain: process.env.AUTH0_DOMAIN,
          connection: process.env.AUTH0_CONNECTION || 'Username-Password-Authentication',
          identifier: process.env.AUTH0_IDENTIFIER,
          actionSecret: process.env.AUTH0_ACTION_SECRET,
        }),
      ],
      providers: [
        DeviceService,
        DeviceRepository,
        UserService,
        UserRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(UserService)
      .useValue(UserServiceMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(Auth0ManagementService)
      .useValue(Auth0ManagementServiceMock)
      .overrideProvider(DeviceRepository)
      .useValue(DeviceRepositoryMock)
      .compile();

    deviceService = moduleRef.get<DeviceService>(DeviceService);
  });

  it('should be defined', () => {
    expect(deviceService).toBeDefined();
  });

  describe('createOrUpdateDevice', () => {
    const createDeviceDto: CreateDeviceDto = {
      operating_system: OperatingSystem.Android,
      metadata: {},
    };
    const user_id = randomUUID();

    it('positive: new item should be created', async () => {
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: false });
      DeviceRepositoryMock.orm.findOne.mockResolvedValue(null);

      await deviceService.createOrUpdateDevice(createDeviceDto, user_id);

      expect(DeviceRepositoryMock.create).toHaveBeenCalledWith(new Device({ ...createDeviceDto, user_id }));
    });

    it('positive: existing item should be updated', async () => {
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: false });
      DeviceRepositoryMock.orm.findOne.mockResolvedValue(DeviceDummy);

      await deviceService.createOrUpdateDevice(createDeviceDto, user_id);

      expect(DeviceRepositoryMock.orm.save).toHaveBeenCalledWith(DeviceDummy);
    });
  });

  describe('markAsLeader', () => {
    const id = randomUUID();
    const user_id = randomUUID();

    it('negative: should throw NotFoundException if device does not exist', async () => {
      DeviceRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `Device with id: ${id} does not exist for the User with id: ${user_id}!`;
      let exception: any;

      try {
        await deviceService.markAsLeader(id, user_id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: all ather user devices should be updated with is_leader: false', async () => {
      DeviceRepositoryMock.orm.findOne.mockResolvedValueOnce(DeviceDummy);

      await deviceService.markAsLeader(id, user_id);

      expect(DeviceRepositoryMock.orm.update).toHaveBeenCalledWith({ user_id }, { is_leader: false });
    });

    it('positive: should save the target Device with is_leader: true', async () => {
      DeviceRepositoryMock.orm.findOne.mockResolvedValueOnce(DeviceDummy);
      DeviceRepositoryMock.orm.update.mockResolvedValueOnce(null);

      await deviceService.markAsLeader(id, user_id);

      expect(DeviceRepositoryMock.orm.save).toHaveBeenCalledWith({ ...DeviceDummy, is_leader: true });
    });
  });

  describe('getUserInstalledDevices', () => {
    const desktopDeviceDummy = new Device({
      user_id: userDummy.id,
      operating_system: OperatingSystem.MacOS,
      is_leader: true,
    });
    const mobileDeviceDummy = new Device({
      user_id: userDummy.id,
      operating_system: OperatingSystem.Android,
      is_leader: true,
    });
    it('positive: should return true for each platform type if user has used app on platform', async () => {
      DeviceRepositoryMock.orm.find.mockResolvedValueOnce([desktopDeviceDummy, mobileDeviceDummy]);

      const response = await deviceService.getUserInstalledDevices(userDummy.id);

      expect(response.hasInstalledDesktopApp).toBeTrue();
      expect(response.hasInstalledMobileApp).toBeTrue();
    });

    it('positive: should return false for each platform type if user has NOT used app on platform', async () => {
      DeviceRepositoryMock.orm.find.mockResolvedValueOnce([]);

      const response = await deviceService.getUserInstalledDevices(userDummy.id);

      expect(response.hasInstalledDesktopApp).toBeFalse();
      expect(response.hasInstalledMobileApp).toBeFalse();
    });
  });

  describe('updateDeviceAppVersion', () => {
    it('positive: device app version should be saved', async () => {
      const desktopDeviceDummy = new Device({
        id: randomUUID(),
        user_id: userDummy.id,
        operating_system: OperatingSystem.MacOS,
        is_leader: true,
      });
      DeviceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(desktopDeviceDummy);

      await deviceService.updateDeviceAppVersion(desktopDeviceDummy.id, '1.0.2');

      expect(DeviceRepositoryMock.orm.save).toBeCalledWith({ ...desktopDeviceDummy, app_version: '1.0.2' });
    });
  });

  describe('getDevicesForAdmin', () => {
    it("negative: unauthorized exception should be thrown if standard user tries to access other users' devices", async () => {
      const userId = randomUUID();
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.STANDARD });
      const errorMessage = `User with ID: ${userDummy.id} is not admin!`;
      let exception;
      try {
        await deviceService.getDevicesForAdmin(userDummy.id, userId);
      } catch (error) {
        exception = error;
      }

      expect(exception.message).toEqual(errorMessage);
      expect(exception).toBeInstanceOf(UnauthorizedException);
    });

    it('positive: should fetch devices for admin', async () => {
      const userId = randomUUID();
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.ADMIN });

      await deviceService.getDevicesForAdmin(userDummy.id, userId);

      expect(DeviceRepositoryMock.orm.find).toBeCalledWith({ where: { user_id: userId } });
    });
  });

  describe('parseDeviceFromAuth0Client', () => {
    it('if the user logged in via Mac, it should correctly identify the MacOS', async () => {
      const mac = dummyAuth0Client.find((client) => client.client_id === MAC_CLIENT_ID);
      const response = await deviceService.parseDeviceFromAuth0Client(mac);
      expect(response).toEqual(MACOS_OPERATING_SYSTEM);
    });

    it('if the user logged in via iOS, it should correctly identify the iOS', async () => {
      const ios = findIosClient(dummyAuth0Client, MOBILE_CLIENT_ID, ANDROID_DEVICE_NAME);
      const response = await deviceService.parseDeviceFromAuth0Client(ios);
      expect(response).toEqual(IOS_OPERATING_SYSTEM);
    });

    it('if the user logged in via Android, it should correctly identify the Android', async () => {
      const android = findAndroidClient(dummyAuth0Client, MOBILE_CLIENT_ID, ANDROID_DEVICE_NAME);
      const response = await deviceService.parseDeviceFromAuth0Client(android);
      expect(response).toEqual(ANDROID_OPERATING_SYSTEM);
    });

    it('if the user logged in via Windows, it should correctly identify the Windows', async () => {
      const windows = dummyAuth0Client.find((client) => client.client_id === WINDOWS_CLIENT_ID);
      const response = await deviceService.parseDeviceFromAuth0Client(windows);
      expect(response).toEqual(WINDOWS_OPERATING_SYSTEM);
    });

    it('if the user logged in via Web, it should correctly identify the Web', async () => {
      const web = { client_id: WEB_CLIENT_ID, name: 'Web Browser' };
      const response = await deviceService.parseDeviceFromAuth0Client(web);
      expect(response).toEqual(OperatingSystem.Web);
    });

    it('if auth0 client is null, it should correctly identify the string empty', async () => {
      const response = deviceService.parseDeviceFromAuth0Client(null);
      expect(response).toEqual(OperatingSystem.Unknown);
    });

    it('if unknown client ID is provided without user agent, it should return Unknown', async () => {
      const unknown = { client_id: 'unknown-client-id', name: 'Unknown Client' };
      const response = await deviceService.parseDeviceFromAuth0Client(unknown);
      expect(response).toEqual(OperatingSystem.Unknown);
    });

    it('if unknown client ID with User-Agent is provided, it should detect from User-Agent', async () => {
      const unknown = { client_id: 'unknown-client-id', name: 'Unknown Client' };
      const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      const response = await deviceService.parseDeviceFromAuth0Client(unknown, userAgent);
      expect(response).toEqual(OperatingSystem.MacOS);
    });
  });

  describe('searchUserDevice', () => {
    it('negative: if user account does not exist, throw the NotFoundException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(null);
      const errorMessage = `User with id: ${userDummy.id} does not exist!`;
      let exception: any;
      try {
        await deviceService.searchUserDevice({ device_id: DeviceDummy.id }, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should return the user’s device when both user and device exist', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      DeviceRepositoryMock.orm.findOne.mockResolvedValue(DeviceDummy);

      const response = await deviceService.searchUserDevice({ device_id: DeviceDummy.id }, userDummy.id);

      expect(DeviceRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: { id: DeviceDummy.id, user_id: userDummy.id },
      });
      expect(response).toEqual(DeviceDummy);
    });
  });
});
