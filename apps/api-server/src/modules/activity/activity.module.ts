import { Module } from '@nestjs/common';
import { ActivitySequenceRepository } from './repositories/activity-sequence.repository';
import { ActivityParserService } from './services/activity-parser/activity-parser.service';

@Module({
  providers: [ActivitySequenceRepository, ActivityParserService],
  exports: [ActivityParserService, ActivitySequenceRepository],
})
export class ActivityModule {}
