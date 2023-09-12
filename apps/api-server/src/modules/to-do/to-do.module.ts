import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from '../user/user.module';
import { TodoController } from './controllers/to-do.controller';
import { ToDoService } from './services/to-do.service';
import { ToDoRepository } from './repositories/to-do.repository';
import { TaskTimeLogsRepository } from './repositories/task-time-logs.repository';
import { TimeLogsConsumer } from './consumers/time-logs.consumer';
import { ZohoModule } from '../zoho/zoho.module';
import { SyncedProjectsRepository } from './repositories/synced-projects.repository';

@Module({
  providers: [ToDoService, ToDoRepository, TaskTimeLogsRepository, TimeLogsConsumer, SyncedProjectsRepository],
  exports: [ToDoRepository, ToDoService, SyncedProjectsRepository],
  imports: [
    forwardRef(() => ZohoModule),
    forwardRef(() => UserModule),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => config.get('bull'),
    }),
    BullModule.registerQueue({
      name: 'time-logs',
    }),
  ],
  controllers: [TodoController],
})
export class ToDoModule {}
