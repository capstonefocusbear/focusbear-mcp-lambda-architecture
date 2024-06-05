import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { randomUUID } from 'crypto';
import { DeviceDummy, userDummy } from '../../../../../test/dummies';
import {
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
import { Auth0ManagementService, Auth0Module } from '@app/auth0';

describe('DeviceService', () => {
  let deviceService: DeviceService;
  let auth0ManagementService: Auth0ManagementService;

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
      .overrideProvider(DeviceRepository)
      .useValue(DeviceRepositoryMock)
      .overrideProvider(UserService)
      .useValue(UserServiceMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .compile();

    deviceService = moduleRef.get<DeviceService>(DeviceService);
    auth0ManagementService = moduleRef.get<Auth0ManagementService>(Auth0ManagementService);
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

  describe("syncDevicesFromAuth0", () => {
    it('if the user logged in via Mac, it should correctly identify the MacOS', async () => {
      const auth0_id = 'google-oauth2|100067461214713541778';

      const os = await deviceService.syncDevicesFromAuth0(auth0_id);

      expect(os).toEqual('MacOS');
    });

    it('if the user logged in via iOS, it should correctly identify the iOS', async () => {
      const auth0_id = 'auth0|65ba88de9e3dda5e3660c1e5';

      const os = await deviceService.syncDevicesFromAuth0(auth0_id);

      expect(os).toEqual('iOS');
    });

    it('if the user logged in via Android, it should correctly identify the Android', async () => {
      const auth0_id = 'auth0|6645e9c0980de0bad72157fd';

      const os = await deviceService.syncDevicesFromAuth0(auth0_id);

      expect(os).toEqual('Android');
    });

    it('if the user logged in via Windows, it should correctly identify the Windows', async () => {
      const auth0_id = 'auth0|662e0a89a78d71cf0c5ede27';

      const os = await deviceService.syncDevicesFromAuth0(auth0_id);

      expect(os).toEqual('Windows');
    });
  });
});
