import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { TaskTimeLog } from '../entities/tasks-time-logs.entity';

@Injectable()
export class TaskTimeLogsRepository extends BaseRepository<TaskTimeLog> {
  constructor(private readonly connection: Connection) {
    super(connection, TaskTimeLog);
  }
}
