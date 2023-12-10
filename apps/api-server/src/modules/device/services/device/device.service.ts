import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { BaseCRUDService } from '../../../../shared/services/base-crud.service';
import { OperatingSystem } from '../../domain/operating-system.enum';
import { CreateDeviceDto } from '../../dto/create-device.dto';
import { Device } from '../../entities/device.entity';
import { DeviceRepository } from '../../repositories/device.repository';
import { UserService } from '../../../user/services/user/user.service';
import { UserRepository } from '../../../user/repositories/user.repository';
import { UserTypes } from '../../../user/domain/user-types.enum';

@Injectable()
export class DeviceService extends BaseCRUDService<DeviceRepository, Device> {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly userService: UserService,
    private readonly userRepository: UserRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {
    super(deviceRepository);
  }

  async createDevice({ operating_system, metadata }: CreateDeviceDto, user_id: string): Promise<Device> {
    try {
      const { isVerboseLoggingAllowed } = await this.userService.isVerboseLoggingAllowed(user_id);
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Creating device',
        data: {
          user_id,
          ...(isVerboseLoggingAllowed && { operating_system, metadata }),
        },
      });
      const newDevice = new Device({ operating_system, user_id, metadata });
      const createdDevice = await this.deviceRepository.create(newDevice);
      return createdDevice;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async markAsLeader(id: string, user_id: string): Promise<Device> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Marking device as leader',
      });
      const device = await this.deviceRepository.orm.findOne({ where: { id, user_id } });
      const notFoundMessage = `Device with id: ${id} does not exist for the User with id: ${user_id}!`;
      if (!device) throw new NotFoundException(notFoundMessage);
      await this.deviceRepository.orm.update({ user_id }, { is_leader: false });
      device.is_leader = true;
      return await this.deviceRepository.orm.save(device);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async getUserInstalledDevices(user_id: string) {
    const userDevices = await this.deviceRepository.orm.find({
      where: {
        user_id,
      },
    });
    const desktopDevices = userDevices.filter((device) => {
      const isMacApp = device.operating_system === OperatingSystem.MacOS;
      const isWindowsApp = device.operating_system === OperatingSystem.Windows;
      return isMacApp || isWindowsApp;
    });
    const mobileDevices = userDevices.filter((device) => {
      const isIOSApp = device.operating_system === OperatingSystem.iOS;
      const isAndroidApp = device.operating_system === OperatingSystem.Android;
      return isIOSApp || isAndroidApp;
    });
    const hasInstalledDesktopApp = desktopDevices.length > 0;
    const hasInstalledMobileApp = mobileDevices.length > 0;
    return { hasInstalledDesktopApp, hasInstalledMobileApp };
  }

  async updateDeviceAppVersion(deviceId: string, appVersion: string) {
    if (!deviceId || !appVersion) return;
    const device = await this.deviceRepository.orm.findOneBy({ id: deviceId });
    device.app_version = appVersion;
    await this.deviceRepository.orm.save(device);
  }

  async getDevicesForAdmin(adminId: string, userId: string) {
    const adminUser = await this.userRepository.orm.findOneBy({ id: adminId });
    const isAdmin = adminUser.user_type === UserTypes.ADMIN;
    if (!isAdmin) {
      throw new UnauthorizedException(`User with ID: ${adminId} is not admin!`);
    }
    return this.deviceRepository.orm.find({ where: { user_id: userId } });
  }
}
