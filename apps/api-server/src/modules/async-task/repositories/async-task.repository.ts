import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { AsyncTask } from '../entities/async-task.entity';
import { AsyncTaskStatus } from '../domain/async-task-status.enum';

const PENDING_TASK_DEDUP_MAX_AGE_MINUTES = 5;

@Injectable()
export class AsyncTaskRepository extends BaseRepository<AsyncTask> {
  constructor(private readonly connection: Connection) {
    super(connection, AsyncTask);
  }

  async findByStatus(status: AsyncTaskStatus): Promise<AsyncTask[]> {
    return this.orm.createQueryBuilder('async_task').where('async_task.status = :status', { status }).getMany();
  }

  async updateStatus(id: string, status: AsyncTaskStatus): Promise<AsyncTask> {
    await this.orm
      .createQueryBuilder()
      .update(AsyncTask)
      .set({ status })
      .where('id = :id', { id })
      .andWhere('status != :status', { status: AsyncTaskStatus.COMPLETED })
      .execute();
    return this.orm.findOneBy({ id });
  }

  async findById(id: string): Promise<AsyncTask> {
    return this.orm.findOneBy({ id });
  }

  async findLatestActiveByRequestHash(
    taskType: string,
    userId: string,
    requestHash: string,
  ): Promise<AsyncTask | null> {
    if (!taskType || !userId || !requestHash) {
      return null;
    }

    return this.orm
      .createQueryBuilder('async_task')
      .where(
        `(
          async_task.status = :processingStatus
          OR (
            async_task.status = :pendingStatus
            AND async_task.updated_at >= NOW() - INTERVAL '${PENDING_TASK_DEDUP_MAX_AGE_MINUTES} minutes'
          )
        )`,
        {
          processingStatus: AsyncTaskStatus.PROCESSING,
          pendingStatus: AsyncTaskStatus.PENDING,
        },
      )
      .andWhere("async_task.metadata ->> 'taskType' = :taskType", { taskType })
      .andWhere("async_task.metadata ->> 'userId' = :userId", { userId })
      .andWhere("async_task.metadata ->> 'requestHash' = :requestHash", { requestHash })
      .orderBy('async_task.created_at', 'DESC')
      .getOne();
  }
}
