import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { TaskReactionRepository } from '../repositories/task-reaction.repository';
import { ToDoRepository } from '../repositories/to-do.repository';
import { ProjectMemberRepository } from '../../project/repositories/project-member.repository';
import { ProjectMemberInvitationStatus } from '../../project/domain/project-member-invitation-status.enum';
import { TaskReaction } from '../entities/task-reaction.entity';
import { CreateTaskReactionDto } from '../dto/create-task-reaction.dto';
import { TaskReactionResponseDto } from '../dto/task-reaction-response.dto';

@Injectable()
export class TaskReactionService {
  constructor(
    private readonly taskReactionRepository: TaskReactionRepository,
    private readonly toDoRepository: ToDoRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
  ) {}

  async createReaction(userId: string, taskId: string, dto: CreateTaskReactionDto): Promise<TaskReactionResponseDto> {
    const task = await this.toDoRepository.orm.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    const hasAccess = await this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    const existingReaction = await this.taskReactionRepository.getReactionByTaskUserEmoji(taskId, userId, dto.emoji);

    if (existingReaction) {
      throw new ConflictException('You have already reacted with this emoji');
    }

    const reaction = new TaskReaction(
      {
        task_id: taskId,
        user_id: userId,
        emoji: dto.emoji,
      },
      { generateId: true },
    );

    let savedReaction: TaskReaction;
    try {
      savedReaction = await this.taskReactionRepository.orm.save(reaction);
    } catch (error) {
      if (this.isDuplicateTaskReactionError(error)) {
        throw new ConflictException('You have already reacted with this emoji');
      }
      throw error;
    }

    return this.mapReactionToResponse(savedReaction);
  }

  async getReactionsByTaskId(userId: string, taskId: string): Promise<TaskReactionResponseDto[]> {
    const task = await this.toDoRepository.orm.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    const hasAccess = await this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    const reactions = await this.taskReactionRepository.getReactionsByTaskId(taskId);

    return reactions.map((reaction) => this.mapReactionToResponse(reaction));
  }

  async deleteReaction(userId: string, taskId: string, emoji: string): Promise<void> {
    const task = await this.toDoRepository.orm.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    const hasAccess = await this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    const deleteResult = await this.taskReactionRepository.deleteReactionByTaskUserEmoji(taskId, userId, emoji);
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

  private mapReactionToResponse(reaction: TaskReaction): TaskReactionResponseDto {
    return {
      id: reaction.id,
      task_id: reaction.task_id,
      user_id: reaction.user_id,
      emoji: reaction.emoji,
      created_at: reaction.created_at,
      updated_at: reaction.updated_at,
    };
  }

  private isDuplicateTaskReactionError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as { code?: string; constraint?: string } | undefined;
    return driverError?.code === '23505' && driverError.constraint === 'UQ_task_user_emoji';
  }
}
