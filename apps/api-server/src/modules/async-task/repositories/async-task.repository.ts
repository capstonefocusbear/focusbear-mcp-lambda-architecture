import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { AsyncTask } from '../entities/async-task.entity';
import { AsyncTaskStatus } from '../domain/async-task-status.enum';

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
}
