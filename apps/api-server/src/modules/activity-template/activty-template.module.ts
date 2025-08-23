import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityTemplateService } from './services/activity-template.service';
import { ActivityTemplateRepository } from './repository/activity-template.repository';
import { ActivityTemplateParserService } from './services/activity-template-parser.service';
import { ActivityTemplate } from './entity/activity-template.entity';
import { ActivityLibraryController } from './controllers/activity-library.controller';
import { ActivityLibraryService } from './services/activity-library.service';
import { UserModule } from '../user/user.module';
import { ActivityModule } from '../activity/activity.module';
import { ActivityTemplateTagRepository } from './repository/activity-template-tag.repository';
import { OpenAIModule } from '../../../../../libs/openai/src';

@Module({
  providers: [
    ActivityTemplateService,
    ActivityTemplateRepository,
    ActivityTemplateParserService,
    ActivityLibraryService,
    ActivityTemplateTagRepository,
  ],
  exports: [ActivityTemplateParserService, ActivityTemplateService, ActivityTemplateRepository, ActivityLibraryService],
  controllers: [ActivityLibraryController],
  imports: [
    TypeOrmModule.forFeature([ActivityTemplate]),
    forwardRef(() => UserModule),
    ActivityModule,
    OpenAIModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('openai'),
    }),
  ],
})
export class ActivityTemplateModule {}
