import { Module, forwardRef } from '@nestjs/common';
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

@Module({
  providers: [
    ActivitySequenceRepository,
    ActivityParserService,
    CompletedActivityService,
    CompletedActivityRepository,
    ActivityRepository,
    CompletedActivitySequenceRepository,
    CompletedActivitySequenceService,
  ],
  exports: [ActivityParserService, ActivitySequenceRepository],
  controllers: [CompletedActivityController, CompletedActivitySequenceController],
  imports: [DeviceModule, forwardRef(() => UserModule)],
})
export class ActivityModule {}
