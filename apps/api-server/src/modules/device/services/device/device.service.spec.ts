import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { randomUUID } from 'crypto';
import { DeviceDummy, userDummy } from '../../../../../test/dummies';
import { DeviceRepositoryMock, SentryServiceMock, UserServiceMock } from '../../../../../test/mocks';
import { OperatingSystem } from '../../domain/operating-system.enum';
import { CreateDeviceDto } from '../../dto/create-device.dto';
import { Device } from '../../entities/device.entity';
import { DeviceRepository } from '../../repositories/device.repository';
import { DeviceService } from './device.service';
import { UserService } from '../../../user/services/user/user.service';

describe('DeviceService', () => {
  let deviceService: DeviceService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DeviceService,
        DeviceRepository,
        UserService,
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
});
