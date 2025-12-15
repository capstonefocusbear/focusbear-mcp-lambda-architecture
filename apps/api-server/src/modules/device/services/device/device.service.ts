import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
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
  WEB_CLIENT_ID,
} from '@app/auth0/auth0.constants';
import { BaseCRUDService } from '../../../../shared/services/base-crud.service';
import { OperatingSystem } from '../../../../shared/domain/operating-system.enum';
import { CreateDeviceDto } from '../../dto/create-device.dto';
import { Device } from '../../entities/device.entity';
import { DeviceRepository } from '../../repositories/device.repository';
import { UserService } from '../../../user/services/user/user.service';
import { UserRepository } from '../../../user/repositories/user.repository';
import { UserTypes } from '../../../user/domain/user-types.enum';
import { Auth0ClientDto } from '../../../user/dto/auth0-client.dto';
import { SearchDeviceQueryDto } from '../../dto/search-device-query.dto';

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

  async createOrUpdateDevice({ operating_system, metadata }: CreateDeviceDto, user_id: string): Promise<Device> {
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
      const existingDevice = await this.deviceRepository.orm.findOne({
        where: { user_id, operating_system },
        order: { created_at: 'DESC' },
      });

      if (existingDevice) {
        Object.assign(existingDevice, { metadata });
        return await this.deviceRepository.orm.save(existingDevice);
      }
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

  async getDevicesByUserId(userId: string) {
    return this.deviceRepository.orm.find({ where: { user_id: userId } });
  }

  parseDeviceFromAuth0Client = (auth0ClientDto: Auth0ClientDto | null | undefined, userAgent?: string) => {
    if (!auth0ClientDto?.client_id) {
      return OperatingSystem.Unknown;
    }

    const { client_id, name } = auth0ClientDto;

    if (!client_id) return OperatingSystem.Unknown;

    switch (client_id) {
      case MAC_CLIENT_ID:
        return MACOS_OPERATING_SYSTEM;
      case WINDOWS_CLIENT_ID:
        return WINDOWS_OPERATING_SYSTEM;
      case WEB_CLIENT_ID:
        return OperatingSystem.Web;
      default: {
        if (MOBILE_CLIENT_ID.includes(client_id)) {
          return name === ANDROID_DEVICE_NAME ? ANDROID_OPERATING_SYSTEM : IOS_OPERATING_SYSTEM;
        }
        // For unknown client IDs, try to detect from User-Agent first
        if (userAgent) {
          return this.detectOSFromUserAgent(userAgent);
        }
        // If no user agent, return Unknown
        return OperatingSystem.Unknown;
      }
    }
  };

  private detectOSFromUserAgent(userAgent: string): OperatingSystem {
    const ua = userAgent.toLowerCase();

    if (ua.includes('mac os x') || ua.includes('macintosh')) {
      return OperatingSystem.MacOS;
    }
    if (ua.includes('windows')) {
      return OperatingSystem.Windows;
    }
    if (ua.includes('android')) {
      return OperatingSystem.Android;
    }
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
      return OperatingSystem.iOS;
    }

    // If OS can't be determined from User-Agent, return Unknown
    return OperatingSystem.Unknown;
  }

  async searchUserDevice(searchDeviceQueryDto: SearchDeviceQueryDto, userId: string) {
    const user = await this.userRepository.orm.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with id: ${userId} does not exist!`);
    }
    const { device_id, is_leader, app_version, operating_system } = searchDeviceQueryDto;
    return this.deviceRepository.orm.findOne({
      where: { id: device_id, user_id: userId, is_leader, app_version, operating_system },
    });
  }
}
