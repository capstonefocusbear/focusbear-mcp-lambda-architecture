import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { ConfigService } from '@nestjs/config';
import { BaseCRUDService } from '../../../shared/services/base-crud.service';
import { AsyncTask } from '../entities/async-task.entity';
import { AsyncTaskRepository } from '../repositories/async-task.repository';
import { CreateAsyncTaskDto } from '../dto/create-async-task.dto';
import { UpdateAsyncTaskStatusDto } from '../dto/update-async-task-status.dto';
import { AsyncTaskStatus } from '../domain/async-task-status.enum';
import { LessThan } from 'typeorm';
import * as dayjs from 'dayjs';

@Injectable()
export class AsyncTaskService extends BaseCRUDService<
  AsyncTaskRepository,
  AsyncTask
> {
  constructor(
    private readonly asyncTaskRepository: AsyncTaskRepository,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly configService: ConfigService,
  ) {
    super(asyncTaskRepository);
  }

  async createAsyncTask(createDto: CreateAsyncTaskDto): Promise<AsyncTask> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Creating new async task',
        data: {
          metadata: createDto.metadata,
          timeoutSeconds: createDto.timeoutSeconds,
        },
      });

      // Get timeout configuration
      const timeoutSeconds = this.getTimeoutForTask(
        createDto.metadata?.taskType,
        createDto.timeoutSeconds,
      );

      const asyncTask = new AsyncTask({
        status: AsyncTaskStatus.PENDING,
        metadata: createDto.metadata,
        expires_at: dayjs().add(timeoutSeconds, 'seconds').toISOString(),
      });

      return await this.asyncTaskRepository.create(asyncTask);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async findTaskById(id: string): Promise<AsyncTask> {
    try {
      const task = await this.asyncTaskRepository.findById(id);
      if (!task) {
        throw new NotFoundException(`Async task with ID: ${id} not found`);
      }
      return task;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateTaskStatus(
    id: string,
    updateDto: UpdateAsyncTaskStatusDto,
  ): Promise<AsyncTask> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating async task status',
        data: {
          taskId: id,
          newStatus: updateDto.status,
        },
      });

      const existingTask = await this.findTaskById(id);

      const updateData: Partial<AsyncTask> = {
        status: updateDto.status,
        metadata: updateDto.metadata || existingTask.metadata,
      };

      // Clear expiration when task is completed or failed
      if (
        updateDto.status === AsyncTaskStatus.COMPLETED ||
        updateDto.status === AsyncTaskStatus.FAILED
      ) {
        updateData.expires_at = null;
      }

      // Update expiration when task moves to processing
      if (
        updateDto.status === AsyncTaskStatus.PROCESSING &&
        existingTask.status === AsyncTaskStatus.PENDING
      ) {
        const timeoutSeconds = this.getTimeoutForTask(
          existingTask.metadata?.taskType,
        );
        updateData.expires_at = dayjs()
          .add(timeoutSeconds, 'seconds')
          .toISOString();
      }

      const updatedTask = await this.asyncTaskRepository.update(id, updateData);

      return updatedTask;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async findTasksByStatus(status: AsyncTaskStatus): Promise<AsyncTask[]> {
    try {
      return await this.asyncTaskRepository.findByStatus(status);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async findExpiredTasks(): Promise<AsyncTask[]> {
    try {
      return await this.asyncTaskRepository.find({
        where: [
          {
            status: AsyncTaskStatus.PENDING,
            expires_at: LessThan(dayjs().toISOString()),
          },
          {
            status: AsyncTaskStatus.PROCESSING,
            expires_at: LessThan(dayjs().toISOString()),
          },
        ],
      });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async markExpiredTasksAsFailed(): Promise<number> {
    try {
      const expiredTasks = await this.findExpiredTasks();

      if (expiredTasks.length === 0) {
        return 0;
      }

      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'info',
        message: 'Marking expired tasks as failed',
        data: {
          count: expiredTasks.length,
          taskIds: expiredTasks.map((t) => t.id),
        },
      });

      for (const task of expiredTasks) {
        await this.updateTaskStatus(task.id, {
          status: AsyncTaskStatus.FAILED,
          metadata: {
            ...task.metadata,
            failureReason: 'Task expired',
            expiredAt: dayjs().toISOString(),
          },
        });
      }

      return expiredTasks.length;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private getTimeoutForTask(
    taskType?: string,
    explicitTimeout?: number,
  ): number {
    const asyncTaskConfig = this.configService.get('asyncTask');
    const defaultTimeout = asyncTaskConfig.defaultTimeoutSeconds;
    const maxTimeout = asyncTaskConfig.maxTimeoutSeconds;
    const taskTypeTimeouts = asyncTaskConfig.taskTypeTimeouts;

    // Use explicit timeout if provided
    if (explicitTimeout) {
      return Math.min(explicitTimeout, maxTimeout);
    }

    // Use task-specific timeout if available
    if (taskType && taskTypeTimeouts[taskType]) {
      return taskTypeTimeouts[taskType];
    }

    // Fall back to default timeout
    return defaultTimeout;
  }
}
