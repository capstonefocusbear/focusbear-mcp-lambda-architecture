import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityTemplateService } from './services/activity-template.service';
import { ActivityTemplateRepository } from './repository/activity-template.repository';
import { ActivityTemplateParserService } from './services/activity-template-parser.service';
import { ActivityTemplate } from './entity/activity-template.entity';

@Module({
  providers: [ActivityTemplateService, ActivityTemplateRepository, ActivityTemplateParserService],
  exports: [ActivityTemplateParserService, ActivityTemplateService],
  controllers: [],
  imports: [TypeOrmModule.forFeature([ActivityTemplate])],
})
export class ActivityTemplateModule {}
