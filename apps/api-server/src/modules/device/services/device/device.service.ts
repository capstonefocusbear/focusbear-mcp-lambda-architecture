import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Auth0ManagementService } from '@app/auth0';
import {
  MAC_CLIENT_ID,
  MACOS_OPERATING_SYSTEM,
  WINDOWS_CLIENT_ID,
  WINDOWS_OPERATING_SYSTEM,
  MOBILE_CLIENT_ID,
  ANDROID_DEVICE_NAME,
  ANDROID_OPERATING_SYSTEM,
  IOS_OPERATING_SYSTEM,
  UNKNOWN_OPERATING_SYSTEM,
} from '@app/auth0/auth0.constants';
import { DeviceCredential } from 'auth0';
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
    private readonly auth0ManagementService: Auth0ManagementService,
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
      this.sentryService.instance().captureException(error, { level: 'error' });
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
      this.sentryService.instance().captureException(error, { level: 'error' });
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
    return this.deviceRepository.orm.save(device);
  }

  async getDevicesForAdmin(adminId: string, userId: string) {
    const adminUser = await this.userRepository.orm.findOneBy({ id: adminId });
    const isAdmin = adminUser.user_type === UserTypes.ADMIN;
    if (!isAdmin) {
      throw new UnauthorizedException(`User with ID: ${adminId} is not admin!`);
    }
    return this.deviceRepository.orm.find({ where: { user_id: userId } });
  }

  async syncDevicesFromAuth0(auth0_id: string) {
    // fetch credentials from auth0
    const credentials = await this.auth0ManagementService.getDeviceCredentials(auth0_id);
    return credentials?.length ? this.parseDeviceFromCredentials(credentials[0]) : '';
  }

  parseDeviceFromCredentials = ({ client_id, device_name }: DeviceCredential) => {
    switch (client_id) {
      case MAC_CLIENT_ID:
        return MACOS_OPERATING_SYSTEM;
      case WINDOWS_CLIENT_ID:
        return WINDOWS_OPERATING_SYSTEM;
      default: {
        if (MOBILE_CLIENT_ID.includes(client_id)) {
          return device_name === ANDROID_DEVICE_NAME ? ANDROID_OPERATING_SYSTEM : IOS_OPERATING_SYSTEM;
        }
        return UNKNOWN_OPERATING_SYSTEM;
      }
    }
  };
}
