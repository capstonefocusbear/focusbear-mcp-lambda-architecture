import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TaskCommentRepository } from '../repositories/task-comment.repository';
import { ToDoRepository } from '../repositories/to-do.repository';
import { TaskComment } from '../entities/task-comment.entity';
import { CreateTaskCommentDto } from '../dto/create-task-comment.dto';
import { UpdateTaskCommentDto } from '../dto/update-task-comment.dto';
import { TaskCommentResponseDto } from '../dto/task-comment-response.dto';

@Injectable()
export class TaskCommentService {
  constructor(
    private readonly taskCommentRepository: TaskCommentRepository,
    private readonly toDoRepository: ToDoRepository,
  ) {}

  async createComment(userId: string, taskId: string, dto: CreateTaskCommentDto): Promise<TaskCommentResponseDto> {
    const task = await this.toDoRepository.orm.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    const hasAccess = await this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    const comment = new TaskComment(
      {
        task_id: taskId,
        user_id: userId,
        content: dto.content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { generateId: true },
    );

    const savedComment = await this.taskCommentRepository.orm.save(comment);
    const commentWithUser = await this.taskCommentRepository.getCommentById(savedComment.id);

    return this.mapCommentToResponse(commentWithUser);
  }

  async getCommentsByTaskId(userId: string, taskId: string): Promise<TaskCommentResponseDto[]> {
    const task = await this.toDoRepository.orm.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    const hasAccess = await this.userHasAccessToTask(userId, task);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this task');
    }

    const comments = await this.taskCommentRepository.getCommentsByTaskId(taskId);
    return comments.map((comment) => this.mapCommentToResponse(comment));
  }

  async updateComment(
    userId: string,
    taskId: string,
    commentId: string,
    dto: UpdateTaskCommentDto,
  ): Promise<TaskCommentResponseDto> {
    const comment = await this.taskCommentRepository.getCommentById(commentId);

    if (!comment || comment.task_id !== taskId) {
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }

    if (comment.user_id !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updatedComment = await this.taskCommentRepository.update(commentId, {
      content: dto.content,
      updated_at: new Date().toISOString(),
    });

    return this.mapCommentToResponse(updatedComment);
  }

  async deleteComment(userId: string, taskId: string, commentId: string): Promise<void> {
    const comment = await this.taskCommentRepository.getCommentById(commentId);

    if (!comment || comment.task_id !== taskId) {
      throw new NotFoundException(`Comment with id ${commentId} not found`);
    }

    if (comment.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.taskCommentRepository.deleteComment(commentId);
  }

  private async userHasAccessToTask(
    userId: string,
    task: { user_id?: string; assignee_id?: string },
  ): Promise<boolean> {
    return task.user_id === userId || task.assignee_id === userId;
  }

  private mapCommentToResponse(comment: TaskComment): TaskCommentResponseDto {
    return {
      id: comment.id,
      task_id: comment.task_id,
      user_id: comment.user_id,
      content: comment.content,
      user: comment.user
        ? {
            id: comment.user.id,
          }
        : undefined,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
    };
  }
}
