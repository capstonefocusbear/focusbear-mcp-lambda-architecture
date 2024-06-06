import { Module, forwardRef } from '@nestjs/common';
import { Auth0Module } from '@app/auth0';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DeviceController } from './controllers/device/device.controller';
import { DeviceRepository } from './repositories/device.repository';
import { DeviceService } from './services/device/device.service';
import { UserModule } from '../user/user.module';

@Module({
  providers: [DeviceRepository, DeviceService],
  exports: [DeviceService, DeviceRepository],
  imports: [
    forwardRef(() => UserModule),
    Auth0Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('auth0'),
    }),
  ],
  controllers: [DeviceController],
})
export class DeviceModule {}
