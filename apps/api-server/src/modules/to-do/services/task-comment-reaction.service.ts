import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { TaskCommentReactionRepository } from '../repositories/task-comment-reaction.repository';
import { TaskCommentRepository } from '../repositories/task-comment.repository';
import { ToDoRepository } from '../repositories/to-do.repository';
import { ProjectMemberRepository } from '../../project/repositories/project-member.repository';
import { ProjectMemberInvitationStatus } from '../../project/domain/project-member-invitation-status.enum';
import { TaskCommentReaction } from '../entities/task-comment-reaction.entity';
import { CreateTaskCommentReactionDto } from '../dto/create-task-comment-reaction.dto';
import { TaskCommentReactionResponseDto } from '../dto/task-comment-reaction-response.dto';
import { PostgresErrorCode } from '@api-server/shared/utils/constants';

const UNIQUE_COMMENT_USER_EMOJI_CONSTRAINT = 'UQ_task_comment_reactions_comment_user_emoji';

@Injectable()
export class TaskCommentReactionService {
  constructor(
    private readonly reactionRepository: TaskCommentReactionRepository,
    private readonly taskCommentRepository: TaskCommentRepository,
    private readonly toDoRepository: ToDoRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
  ) {}

  async addReaction(
    userId: string,
    taskId: string,
    commentId: string,
    dto: CreateTaskCommentReactionDto,
  ): Promise<TaskCommentReactionResponseDto> {
    const comment = await this.taskCommentRepository.getCommentById(commentId);

    if (!comment || comment.task_id !== taskId) {
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }

    const task = await this.toDoRepository.orm.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    const hasAccess = await this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    // Check if user already reacted with this emoji
    const existingReaction = await this.reactionRepository.getReactionByCommentUserEmoji(
      commentId,
      userId,
      dto.emoji,
    );

    if (existingReaction) {
      throw new ConflictException('You have already reacted with this emoji');
    }

    const reaction = new TaskCommentReaction(
      {
        comment_id: commentId,
        user_id: userId,
        emoji: dto.emoji,
      },
      { generateId: true },
    );

    try {
      const savedReaction = await this.reactionRepository.orm.save(reaction);
      const reactionWithUser = await this.reactionRepository.orm.findOne({
        where: { id: savedReaction.id },
        relations: ['user'],
      });

      if (!reactionWithUser) {
        return this.mapReactionToResponse(savedReaction);
      }

      return this.mapReactionToResponse(reactionWithUser);
    } catch (err) {
      if (this.isDuplicateReactionError(err)) {
        throw new ConflictException('You have already reacted with this emoji');
      }
      throw err;
    }
  }

  async getReactionsByCommentId(
    userId: string,
    taskId: string,
    commentId: string,
  ): Promise<TaskCommentReactionResponseDto[]> {
    const comment = await this.taskCommentRepository.getCommentById(commentId);

    if (!comment || comment.task_id !== taskId) {
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }

    const task = await this.toDoRepository.orm.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    const hasAccess = await this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    const reactions = await this.reactionRepository.getReactionsByCommentId(commentId);
    return reactions.map((reaction) => this.mapReactionToResponse(reaction));
  }

  async deleteReaction(userId: string, taskId: string, commentId: string, emoji: string): Promise<void> {
    const comment = await this.taskCommentRepository.getCommentById(commentId);

    if (!comment || comment.task_id !== taskId) {
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }

    const task = await this.toDoRepository.orm.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    const hasAccess = await this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    const reaction = await this.reactionRepository.getReactionByCommentUserEmoji(commentId, userId, emoji);

    if (!reaction) {
      throw new NotFoundException(`Reaction not found`);
    }

    const deleteResult = await this.reactionRepository.deleteReaction(reaction.id);
    if (!deleteResult.affected) {
      throw new NotFoundException('Reaction not found');
    }
  }

  private async userHasAccessToTask(
    userId: string,
    task: { user_id?: string; assignee_id?: string; project_id?: string },
  ): Promise<boolean> {
    if (task.user_id === userId || task.assignee_id === userId) {
      return true;
    }

    if (task.project_id) {
      const member = await this.projectMemberRepository.getMemberByProjectAndUser(task.project_id, userId);
      return member?.invitation_status === ProjectMemberInvitationStatus.ACCEPTED;
    }

    return false;
  }

  private isDuplicateReactionError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as { code?: string; constraint?: string } | undefined;
    return (
      driverError?.code === PostgresErrorCode.UNIQUE_VIOLATION &&
      driverError.constraint === UNIQUE_COMMENT_USER_EMOJI_CONSTRAINT
    );
  }

  private mapReactionToResponse(reaction: TaskCommentReaction): TaskCommentReactionResponseDto {
    return {
      id: reaction.id,
      comment_id: reaction.comment_id,
      user_id: reaction.user_id,
      emoji: reaction.emoji,
      user: reaction.user
        ? {
            id: reaction.user.id,
            username: reaction.user.username,
          }
        : undefined,
      created_at: reaction.created_at,
      updated_at: reaction.updated_at,
    };
  }
}
