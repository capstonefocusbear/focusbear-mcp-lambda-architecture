import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { randomUUID } from 'crypto';
import { Auth0ManagementService, Auth0Module } from '../../../../../../../libs/auth0/src';
import { DeviceDummy, dummyDeviceCredentials, userDummy } from '../../../../../test/dummies';
import {
  Auth0ManagementServiceMock,
  DeviceRepositoryMock,
  SentryServiceMock,
  UserRepositoryMock,
  UserServiceMock,
} from '../../../../../test/mocks';
import { OperatingSystem } from '../../domain/operating-system.enum';
import { CreateDeviceDto } from '../../dto/create-device.dto';
import { Device } from '../../entities/device.entity';
import { DeviceRepository } from '../../repositories/device.repository';
import { DeviceService } from './device.service';
import { UserService } from '../../../user/services/user/user.service';
import { UserRepository } from '../../../user/repositories/user.repository';
import { UserTypes } from '../../../user/domain/user-types.enum';

describe('DeviceService', () => {
  let deviceService: DeviceService;

  beforeEach(async () => {
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

  describe('createDevice', () => {
    const createDeviceDto: CreateDeviceDto = {
      operating_system: OperatingSystem.Android,
      metadata: {},
    };
    const user_id = randomUUID();

    it('positive: new item should be created', async () => {
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: false });
      await deviceService.createDevice(createDeviceDto, user_id);

      expect(DeviceRepositoryMock.create).toBeCalledWith(new Device({ ...createDeviceDto, user_id }));
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

      expect(DeviceRepositoryMock.orm.update).toBeCalledWith({ user_id }, { is_leader: false });
    });

    it('positive: should save the target Device with is_leader: true', async () => {
      DeviceRepositoryMock.orm.findOne.mockResolvedValueOnce(DeviceDummy);
      DeviceRepositoryMock.orm.update.mockResolvedValueOnce(null);

      await deviceService.markAsLeader(id, user_id);

      expect(DeviceRepositoryMock.orm.save).toBeCalledWith({ ...DeviceDummy, is_leader: true });
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

  describe('syncDevicesFromAuth0', () => {
    it('if the user logged in via Mac, it should correctly identify the MacOS', async () => {
      const [mac] = dummyDeviceCredentials;
      Auth0ManagementServiceMock.getDeviceCredentials.mockResolvedValue(dummyDeviceCredentials);
      const response = await deviceService.syncDevicesFromAuth0(mac.user_id);
      expect(response).toEqual(deviceService.parseDeviceFromCredentials(mac));
    });

    it('if the user logged in via iOS, it should correctly identify the iOS', async () => {
      const ios = dummyDeviceCredentials.pop();
      Auth0ManagementServiceMock.getDeviceCredentials.mockResolvedValue([ios, ...dummyDeviceCredentials]);
      const response = await deviceService.syncDevicesFromAuth0(ios.user_id);
      expect(response).toEqual(deviceService.parseDeviceFromCredentials(ios));
    });

    it('if the user logged in via Android, it should correctly identify the Android', async () => {
      const android = dummyDeviceCredentials[2];
      Auth0ManagementServiceMock.getDeviceCredentials.mockResolvedValue([android, ...dummyDeviceCredentials]);
      const response = await deviceService.syncDevicesFromAuth0(android.user_id);
      expect(response).toEqual(deviceService.parseDeviceFromCredentials(android));
    });

    it('if the user logged in via Windows, it should correctly identify the Windows', async () => {
      const windows = dummyDeviceCredentials[1];
      dummyDeviceCredentials.unshift(windows);
      Auth0ManagementServiceMock.getDeviceCredentials.mockResolvedValue(dummyDeviceCredentials);
      const response = await deviceService.syncDevicesFromAuth0(windows.user_id);
      expect(response).toEqual(deviceService.parseDeviceFromCredentials(windows));
    });
  });
});
