import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from '../user/user.module';
import { FocusModeController } from './controllers/focus-mode/focus-mode.controller';
import { CompletedFocusBlockRepository } from './repositories/completed-focus-block.repository';
import { FocusModeRepository } from './repositories/focus-mode.repository';
import { FocusModeManagerService } from './services/focus-mode-manager/focus-mode-manager.service';
import { FocusModeService } from './services/focus-mode/focus-mode.service';
import { IPusherOptions, PusherModule } from '../../../../../libs/pusher/src';

@Module({
  providers: [FocusModeService, FocusModeRepository, CompletedFocusBlockRepository, FocusModeManagerService],
  imports: [
    UserModule,
    PusherModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IPusherOptions => configService.get('pusher'),
    }),
  ],
  controllers: [FocusModeController],
})
export class FocusModeModule {}
