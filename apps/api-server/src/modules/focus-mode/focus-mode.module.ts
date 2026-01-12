import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IPusherBeamsOptions, PusherBeamsModule } from '@app/pusher-beams';
import { IPusherOptions, PusherModule } from '@app/pusher';
import { UserModule } from '../user/user.module';
import { FocusModeController } from './controllers/focus-mode/focus-mode.controller';
import { CompletedFocusBlockRepository } from './repositories/completed-focus-block.repository';
import { FocusModeRepository } from './repositories/focus-mode.repository';
import { BlockingScheduleRepository } from './repositories/blocking-schedule.repository';
import { FocusModeManagerService } from './services/focus-mode-manager/focus-mode-manager.service';
import { FocusModeService } from './services/focus-mode/focus-mode.service';
import { BlockingScheduleService } from './services/blocking-schedule/blocking-schedule.service';
import { FocusModeTemplatesModule } from '../focus-mode-template/focus-mode-templates.module';
import { FocusModeTagRepository } from './repositories/focus-mode-tags.repository';
import { CompletedFocusBlockService } from './services/completed-focus-blocks/completed-focus-blocks.service';
import { CompletedFocusBlocksController } from './controllers/completed-focus-blocks/completed-focus-blocks.controller';
import { BlockingScheduleController } from './controllers/blocking-schedule/blocking-schedule.controller';
import { ToDoModule } from '../to-do/to-do.module';
import { CompletedActivitySequenceRepository } from '../activity/repositories/completed-activity-sequence.repository';

@Module({
  providers: [
    FocusModeService,
    FocusModeRepository,
    BlockingScheduleRepository,
    CompletedFocusBlockRepository,
    CompletedActivitySequenceRepository,
    FocusModeManagerService,
    BlockingScheduleService,
    FocusModeTagRepository,
    CompletedFocusBlockService,
  ],
  exports: [
    FocusModeRepository,
    FocusModeTagRepository,
    FocusModeService,
    BlockingScheduleService,
    CompletedFocusBlockRepository,
  ],
  imports: [
    forwardRef(() => UserModule),
    PusherModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IPusherOptions => configService.get('pusher'),
    }),
    PusherBeamsModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IPusherBeamsOptions => configService.get('pusher-beams'),
    }),
    forwardRef(() => FocusModeTemplatesModule),
    ToDoModule,
  ],
  controllers: [FocusModeController, CompletedFocusBlocksController, BlockingScheduleController],
})
export class FocusModeModule {}
