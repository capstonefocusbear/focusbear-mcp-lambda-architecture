import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityTemplateService } from './services/activity-template.service';
import { ActivityTemplateRepository } from './repository/activity-template.repository';
import { ActivityTemplateParserService } from './services/activity-template-parser.service';
import { ActivityTemplate } from './entity/activity-template.entity';
import { ActivityTemplateEmbedding } from './entity/activity-template-embedding.entity';
import { ActivityLibraryController } from './controllers/activity-library.controller';
import { ActivityLibraryService } from './services/activity-library.service';
import { UserModule } from '../user/user.module';
import { ActivityModule } from '../activity/activity.module';
import { ActivityTemplateTagRepository } from './repository/activity-template-tag.repository';
import { ActivityTemplateEmbeddingRepository } from './repository/activity-template-embedding.repository';
import { ActivityTemplateGoalEmbeddingService } from './services/activity-template-goal-embedding.service';
import { ActivityTemplateRetrieverService } from './services/activity-template-retriever.service';
import { ActivityTemplateEmbeddingSyncService } from './services/activity-template-embedding-sync.service';
import { RoutineSuggestionGeneratorService } from './services/routine-suggestion-generator.service';
import { OpenAIModule } from '../../../../../libs/openai/src';
import { HabitLibraryRequest } from './entity/habit-library-request.entity';
import { HabitLibraryRequestRepository } from './repository/habit-library-request.repository';

@Module({
  providers: [
    ActivityTemplateService,
    ActivityTemplateRepository,
    ActivityTemplateParserService,
    ActivityLibraryService,
    ActivityTemplateTagRepository,
    ActivityTemplateEmbeddingRepository,
    ActivityTemplateGoalEmbeddingService,
    ActivityTemplateRetrieverService,
    ActivityTemplateEmbeddingSyncService,
    RoutineSuggestionGeneratorService,
    HabitLibraryRequestRepository,
  ],
  exports: [
    ActivityTemplateParserService,
    ActivityTemplateService,
    ActivityTemplateRepository,
    ActivityLibraryService,
    ActivityTemplateEmbeddingRepository,
    ActivityTemplateGoalEmbeddingService,
    ActivityTemplateRetrieverService,
    ActivityTemplateEmbeddingSyncService,
    RoutineSuggestionGeneratorService,
    HabitLibraryRequestRepository,
  ],
  controllers: [ActivityLibraryController],
  imports: [
    TypeOrmModule.forFeature([ActivityTemplate, ActivityTemplateEmbedding, HabitLibraryRequest]),
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
