import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { TaskReaction } from '../entities/task-reaction.entity';

@Injectable()
export class TaskReactionRepository extends BaseRepository<TaskReaction> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource, TaskReaction);
  }

  async getReactionsByTaskId(taskId: string): Promise<TaskReaction[]> {
    return this.orm.find({
      where: { task_id: taskId },
      order: { created_at: 'ASC' },
    });
  }

  async getReactionByTaskUserEmoji(taskId: string, userId: string, emoji: string): Promise<TaskReaction | null> {
    return this.orm.findOne({
      where: { task_id: taskId, user_id: userId, emoji },
    });
  }

  async deleteReactionByTaskUserEmoji(taskId: string, userId: string, emoji: string): Promise<void> {
    await this.orm.delete({ task_id: taskId, user_id: userId, emoji });
  }
}
