import { Module, forwardRef } from '@nestjs/common';
import { DeviceController } from './controllers/device/device.controller';
import { DeviceRepository } from './repositories/device.repository';
import { DeviceService } from './services/device/device.service';
import { UserModule } from '../user/user.module';

@Module({
  providers: [DeviceRepository, DeviceService],
  exports: [DeviceService],
  imports: [forwardRef(() => UserModule)],
  controllers: [DeviceController],
})
export class DeviceModule {}
