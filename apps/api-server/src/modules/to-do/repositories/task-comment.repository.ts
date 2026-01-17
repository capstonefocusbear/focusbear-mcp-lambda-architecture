import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { TaskComment } from '../entities/task-comment.entity';

@Injectable()
export class TaskCommentRepository extends BaseRepository<TaskComment> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource, TaskComment);
  }

  async getCommentsByTaskId(taskId: string): Promise<TaskComment[]> {
    return this.orm.find({
      where: { task_id: taskId },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  async getCommentById(commentId: string): Promise<TaskComment | null> {
    return this.orm.findOne({
      where: { id: commentId },
      relations: ['user'],
    });
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.orm.delete(commentId);
  }
}
