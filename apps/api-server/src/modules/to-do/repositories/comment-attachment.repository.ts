import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { CommentAttachment } from '../entities/comment-attachment.entity';

@Injectable()
export class CommentAttachmentRepository extends BaseRepository<CommentAttachment> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource, CommentAttachment);
  }

  async getAttachmentsByCommentId(commentId: string): Promise<CommentAttachment[]> {
    return this.orm.find({
      where: { comment_id: commentId },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  async getAttachmentById(attachmentId: string): Promise<CommentAttachment | null> {
    return this.orm.findOne({
      where: { id: attachmentId },
      relations: ['user'],
    });
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.orm.delete(attachmentId);
  }
}
