import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsyncTask } from './entities/async-task.entity';
import { AsyncTaskController } from './controllers/async-task.controller';
import { AsyncTaskService } from './services/async-task.service';
import { AsyncTaskRepository } from './repositories/async-task.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AsyncTask])],
  providers: [AsyncTaskService, AsyncTaskRepository],
  controllers: [AsyncTaskController],
  exports: [AsyncTaskService, AsyncTaskRepository],
})
export class AsyncTaskModule {}
