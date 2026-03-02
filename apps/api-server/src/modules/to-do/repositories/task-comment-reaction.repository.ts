import { Injectable } from '@nestjs/common';
import { DataSource, DeleteResult, In } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { TaskCommentReaction } from '../entities/task-comment-reaction.entity';

@Injectable()
export class TaskCommentReactionRepository extends BaseRepository<TaskCommentReaction> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource, TaskCommentReaction);
  }

  async getReactionsByCommentId(commentId: string): Promise<TaskCommentReaction[]> {
    return this.orm.find({
      where: { comment_id: commentId },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  async getReactionsByCommentIds(commentIds: string[]): Promise<TaskCommentReaction[]> {
    if (!commentIds.length) return [];
    return this.orm.find({
      where: { comment_id: In(commentIds) },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  async getReactionByCommentUserEmoji(
    commentId: string,
    userId: string,
    emoji: string,
  ): Promise<TaskCommentReaction | null> {
    return this.orm.findOne({
      where: { comment_id: commentId, user_id: userId, emoji },
    });
  }

  async deleteReaction(reactionId: string): Promise<DeleteResult> {
    return this.orm.delete(reactionId);
  }
}
