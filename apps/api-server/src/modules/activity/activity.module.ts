import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { IPusherOptions, PusherModule } from '@app/pusher';
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
import { CompletedFocusBlockRepository } from '../focus-mode/repositories/completed-focus-block.repository';
import { ActivityService } from './services/activity-service/activity.service';
import { ActivityController } from './controllers/activity.controller';
import { ActivityImageConsumer } from './consumers/activity-image.consumer';
import { HelperModule } from '../helper/helper.module';
import { ActivitySequenceService } from './services/activity-sequence/activity-sequence.service';
import { LogQuantityAnswersRepository } from './repositories/log-quantity-answers.repository';
import { LogQuantityQuestionsRepository } from './repositories/log-quantity-questions.repository';

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
    ActivityService,
    ActivityImageConsumer,
    ActivitySequenceService,
    LogQuantityAnswersRepository,
    LogQuantityQuestionsRepository,
  ],
  exports: [
    ActivityParserService,
    ActivitySequenceRepository,
    CompletedFocusBlockRepository,
    CompletedActivityRepository,
    CompletedActivitySequenceService,
    CompletedActivitySequenceRepository,
    ActivitySequenceService,
    ActivityRepository,
    CompletedActivityService,
  ],
  controllers: [CompletedActivityController, CompletedActivitySequenceController, ActivityController],
  imports: [
    DeviceModule,
    forwardRef(() => UserModule),
    ConfigModule.forRoot({ load: configsArray }),
    PusherModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IPusherOptions => configService.get('pusher'),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => config.get('bull'),
    }),
    BullModule.registerQueue({
      name: 'activity-image',
    }),
    HelperModule,
  ],
})
export class ActivityModule {}
