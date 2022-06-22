import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDeviceDto } from '../../dto/create-device.dto';
import { Device } from '../../entities/device.entity';
import { DeviceRepository } from '../../repositories/device.repository';

@Injectable()
export class DeviceService {
  constructor(private readonly deviceRepository: DeviceRepository) {}

  async createDevice({ operating_system, metadata }: CreateDeviceDto, user_id: string): Promise<Device> {
    const newDevice = new Device({ operating_system, user_id, metadata });
    const createdDevice = await this.deviceRepository.create(newDevice);
    return createdDevice;
  }

  async markAsLeader(id: string, user_id: string): Promise<Device> {
    const device = await this.deviceRepository.orm.findOne({ id, user_id });
    const notFoundMessage = `Device with id: ${id} does not exist for the User with id: ${user_id}!`;
    if (!device) throw new NotFoundException(notFoundMessage);
    await this.deviceRepository.orm.update({ user_id }, { is_leader: false });
    device.is_leader = true;
    return this.deviceRepository.orm.save(device);
  }
}
