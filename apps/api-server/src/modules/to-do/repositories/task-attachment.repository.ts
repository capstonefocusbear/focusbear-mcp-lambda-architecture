import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { TaskAttachment } from '../entities/task-attachment.entity';

@Injectable()
export class TaskAttachmentRepository extends BaseRepository<TaskAttachment> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource, TaskAttachment);
  }

  async getAttachmentsByTaskId(taskId: string): Promise<TaskAttachment[]> {
    return this.orm.find({
      where: { task_id: taskId },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  async getAttachmentById(attachmentId: string): Promise<TaskAttachment | null> {
    return this.orm.findOne({
      where: { id: attachmentId },
      relations: ['user'],
    });
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.orm.delete(attachmentId);
  }
}
