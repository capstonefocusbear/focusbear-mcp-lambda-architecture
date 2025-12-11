import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { IPusherOptions, PusherModule } from '@app/pusher';
import { R2Module } from '@app/r2';
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
import { RoutineSuggestionsAsyncService } from './services/routine-suggestions-async.service';
import { RoutineSuggestionsConsumer } from './consumers/routine-suggestions.consumer';
import { AsyncTaskModule } from '../async-task/async-task.module';
import { BullQueues } from '../../shared/utils/constants';
import { HabitCreationAsyncService } from './services/habit-creation-async.service';
import { HabitImportAsyncService } from './services/habit-import-async.service';
import { HabitImportExtractionService } from './services/habit-import-extraction.service';
import { HabitImportConsumer } from './consumers/habit-import.consumer';

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
    RoutineSuggestionsAsyncService,
    HabitCreationAsyncService,
    RoutineSuggestionsConsumer,
    HabitImportAsyncService,
    HabitImportExtractionService,
    HabitImportConsumer,
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
    RoutineSuggestionsAsyncService,
    HabitCreationAsyncService,
    HabitImportAsyncService,
    HabitImportExtractionService,
  ],
  controllers: [ActivityLibraryController],
  imports: [
    TypeOrmModule.forFeature([ActivityTemplate, ActivityTemplateEmbedding, HabitLibraryRequest]),
    forwardRef(() => UserModule),
    ActivityModule,
    AsyncTaskModule,
    BullModule.registerQueue({
      name: BullQueues.ROUTINE_SUGGESTIONS,
    }),
    BullModule.registerQueue({
      name: BullQueues.HABIT_IMPORT,
    }),
    PusherModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IPusherOptions => configService.get('pusher'),
    }),
    OpenAIModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('openai'),
    }),
    R2Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('r2'),
    }),
  ],
})
export class ActivityTemplateModule {}
