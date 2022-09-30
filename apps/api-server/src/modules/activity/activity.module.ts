import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configsArray } from '../../config';
import { DeviceModule } from '../device/device.module';
import { UserModule } from '../user/user.module';
import { CompletedActivitySequenceController } from './controllers/completed-activity-sequence.controller';
import { CompletedActivityController } from './controllers/completed-activity.controller';
import { ActivitySequenceRepository } from './repositories/activity-sequence.repository';
import { ActivityRepository } from './repositories/activity.repository';
import { CompletedActivitySequenceRepository } from './repositories/completed-activity-sequence.repository';
import { CompletedActivityRepository } from './repositories/completed-activity.repository';
import { ActivityParserService } from './services/activity-parser/activity-parser.service';
import { CompletedActivitySequenceService } from './services/completed-activity-sequence/completed-activity-sequence.service';
import { CompletedActivityService } from './services/completed-activity/completed-activity.service';
import { IPusherOptions, PusherModule } from '../../../../../libs/pusher/src';
import { CompletedFocusBlockRepository } from '../focus-mode/repositories/completed-focus-block.repository';

@Module({
  providers: [
    ActivitySequenceRepository,
    ActivityParserService,
    CompletedActivityService,
    CompletedActivityRepository,
    ActivityRepository,
    CompletedActivitySequenceRepository,
    CompletedActivitySequenceService,
    CompletedFocusBlockRepository,
  ],
  exports: [ActivityParserService, ActivitySequenceRepository],
  controllers: [CompletedActivityController, CompletedActivitySequenceController],
  imports: [
    DeviceModule,
    forwardRef(() => UserModule),
    ConfigModule.forRoot({ load: configsArray }),
    PusherModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IPusherOptions => configService.get('pusher'),
    }),
  ],
})
export class ActivityModule {}
