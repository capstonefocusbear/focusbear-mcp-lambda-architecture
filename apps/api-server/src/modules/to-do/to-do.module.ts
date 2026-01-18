import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OpenAIModule } from '@app/openai';
import { R2Module } from '@app/r2';
import { UserModule } from '../user/user.module';
import { TodoController } from './controllers/to-do.controller';
import { TaskCommentController } from './controllers/task-comment.controller';
import { TaskAttachmentController } from './controllers/task-attachment.controller';
import { ToDoService } from './services/to-do.service';
import { TaskCommentService } from './services/task-comment.service';
import { TaskAttachmentService } from './services/task-attachment.service';
import { ToDoRepository } from './repositories/to-do.repository';
import { TaskCommentRepository } from './repositories/task-comment.repository';
import { TaskAttachmentRepository } from './repositories/task-attachment.repository';
import { TaskTimeLogsRepository } from './repositories/task-time-logs.repository';
import { TimeLogsConsumer } from './consumers/time-logs.consumer';
import { TodoImageConsumer } from './consumers/todo-image.consumer';
import { TodoAudioConsumer } from './consumers/todo-audio.consumer';
import { SyncedProjectsRepository } from './repositories/synced-projects.repository';
import { SyncedProjectsController } from './controllers/synced-projects.controller';
import { SyncedProjectsService } from './services/synced-projects.service';
import { IntegrationModule } from '../integration/integration.module';
import { FocusModeModule } from '../focus-mode/focus-mode.module';
import { PlatformIntegrationRepository } from '../platform-integrations/repositories/platform-integration.repository';
import { AsyncTaskModule } from '../async-task/async-task.module';
import { BullQueues } from '../../shared/utils/constants';

@Module({
  providers: [
    ToDoService,
    TaskCommentService,
    TaskAttachmentService,
    PlatformIntegrationRepository,
    ToDoRepository,
    TaskCommentRepository,
    TaskAttachmentRepository,
    TaskTimeLogsRepository,
    TimeLogsConsumer,
    TodoImageConsumer,
    TodoAudioConsumer,
    SyncedProjectsRepository,
    SyncedProjectsService,
  ],
  exports: [
    ToDoRepository,
    ToDoService,
    TaskCommentRepository,
    TaskCommentService,
    TaskAttachmentRepository,
    TaskAttachmentService,
    SyncedProjectsRepository,
    SyncedProjectsService,
  ],
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => IntegrationModule),
    R2Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('r2'),
    }),
    AsyncTaskModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => config.get('bull'),
    }),
    BullModule.registerQueue({
      name: BullQueues.TIME_LOGS,
    }),
    BullModule.registerQueue({
      name: BullQueues.USAGE_IMAGE,
    }),
    BullModule.registerQueue({
      name: BullQueues.TODO_AUDIO,
    }),
    BullModule.registerQueue({
      name: BullQueues.TODO_IMAGE,
    }),
    OpenAIModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('openai'),
    }),
    forwardRef(() => FocusModeModule),
  ],
  controllers: [TodoController, TaskCommentController, TaskAttachmentController, SyncedProjectsController],
})
export class ToDoModule {}
