/* eslint-disable no-await-in-loop */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import { BaseCRUDService } from '../../../shared/services/base-crud.service';
import { AsyncTask } from '../entities/async-task.entity';
import { AsyncTaskRepository } from '../repositories/async-task.repository';
import { CreateAsyncTaskDto } from '../dto/create-async-task.dto';
import { UpdateAsyncTaskStatusDto } from '../dto/update-async-task-status.dto';
import { AsyncTaskStatus } from '../domain/async-task-status.enum';

@Injectable()
export class AsyncTaskService extends BaseCRUDService<AsyncTaskRepository, AsyncTask> {
  constructor(
    private readonly asyncTaskRepository: AsyncTaskRepository,
    @InjectSentry() private readonly sentryService: SentryService,
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
        },
      });

      const asyncTask = new AsyncTask({
        status: AsyncTaskStatus.PENDING,
        metadata: createDto.metadata,
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

  async updateTaskStatus(id: string, updateDto: UpdateAsyncTaskStatusDto): Promise<AsyncTask> {
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

      const updatedTask = await this.asyncTaskRepository.update(id, {
        status: updateDto.status,
        metadata: updateDto.metadata || existingTask.metadata,
        updated_at: new Date().toISOString(),
      });

      return updatedTask;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateStatusWithMetadata(
    asyncTaskId: string | undefined,
    status: AsyncTaskStatus,
    baseMetadata: Record<string, any>,
    additionalMetadata: Record<string, any> = {},
  ): Promise<void> {
    if (!asyncTaskId) return;

    try {
      await this.updateTaskStatus(asyncTaskId, {
        status,
        metadata: {
          ...baseMetadata,
          ...additionalMetadata,
        },
      });
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        level: 'warning',
        tags: { context: `async-task-${status.toLowerCase()}-update` },
      });
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
}
