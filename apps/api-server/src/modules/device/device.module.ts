import { Module } from '@nestjs/common';
import { DeviceRepository } from './repositories/device.repository';
import { DeviceService } from './services/device/device.service';

@Module({
  providers: [DeviceRepository, DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
