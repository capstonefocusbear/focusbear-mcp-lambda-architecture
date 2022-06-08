import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { createBaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Device } from '../entities/device.entity';

@Injectable()
export class DeviceRepository extends createBaseRepository<Device>(Device) {
  constructor(private readonly connection: Connection) {
    super(connection);
  }
}
