import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule, InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AsyncTask } from './entities/async-task.entity';
import { AsyncTaskController } from './controllers/async-task.controller';
import { AsyncTaskService } from './services/async-task.service';
import { AsyncTaskRepository } from './repositories/async-task.repository';
import { AsyncTaskExpirationConsumer } from './consumers/async-task-expiration.consumer';
import { BullQueues, BullWorkers } from '../../shared/utils/constants';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AsyncTask]),
    BullModule.registerQueue({
      name: BullQueues.ASYNC_TASK_EXPIRATION,
    }),
  ],
  providers: [AsyncTaskService, AsyncTaskRepository, AsyncTaskExpirationConsumer],
  controllers: [AsyncTaskController],
  exports: [AsyncTaskService, AsyncTaskRepository],
})
export class AsyncTaskModule implements OnModuleInit {
  constructor(
    @InjectQueue(BullQueues.ASYNC_TASK_EXPIRATION)
    private readonly expirationQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Set up recurring job to check for expired tasks
    const intervalSeconds = this.configService.get('asyncTask.expirationCheckIntervalSeconds');

    await this.expirationQueue.add(
      BullWorkers.CHECK_EXPIRED_TASKS,
      {},
      {
        repeat: {
          every: intervalSeconds * 1000, // Convert to milliseconds
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}
