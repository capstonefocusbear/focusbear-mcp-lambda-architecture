import { Module } from '@nestjs/common';
import { DeviceController } from './controllers/device/device.controller';
import { DeviceRepository } from './repositories/device.repository';
import { DeviceService } from './services/device/device.service';

@Module({
  providers: [DeviceRepository, DeviceService],
  exports: [DeviceService],
  controllers: [DeviceController],
})
export class DeviceModule {}
