import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { BaseCRUDService } from '../../../../shared/services/base-crud.service';
import { CreateDeviceDto } from '../../dto/create-device.dto';
import { Device } from '../../entities/device.entity';
import { DeviceRepository } from '../../repositories/device.repository';

@Injectable()
export class DeviceService extends BaseCRUDService<DeviceRepository, Device> {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {
    super(deviceRepository);
  }

  async createDevice({ operating_system, metadata }: CreateDeviceDto, user_id: string): Promise<Device> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Creating device',
        data: {
          user_id,
          operating_system,
          metadata,
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
}
