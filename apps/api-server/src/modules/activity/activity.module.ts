import { Module, forwardRef } from '@nestjs/common';
import { DeviceModule } from '../device/device.module';
import { UserModule } from '../user/user.module';
import { ComplitedActivityController } from './controllers/complited-activity.controller';
import { ActivitySequenceRepository } from './repositories/activity-sequence.repository';
import { ComplitedActivityRepository } from './repositories/complited-activity.repository';
import { ActivityParserService } from './services/activity-parser/activity-parser.service';
import { ComplitedActivityService } from './services/complited-activity/complited-activity.service';

@Module({
  providers: [ActivitySequenceRepository, ActivityParserService, ComplitedActivityService, ComplitedActivityRepository],
  exports: [ActivityParserService, ActivitySequenceRepository],
  controllers: [ComplitedActivityController],
  imports: [DeviceModule, forwardRef(() => UserModule)],
})
export class ActivityModule {}
