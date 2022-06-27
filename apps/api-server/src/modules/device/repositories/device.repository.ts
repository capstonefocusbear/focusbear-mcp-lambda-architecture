import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Device } from '../entities/device.entity';

@Injectable()
export class DeviceRepository extends BaseRepository<Device> {
  constructor(private readonly connection: Connection) {
    super(connection, Device);
  }
}
