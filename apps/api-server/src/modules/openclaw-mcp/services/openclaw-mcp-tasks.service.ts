import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { TaskCommentRepository } from '../../to-do/repositories/task-comment.repository';
import { GetToDosQueryDto } from '../../to-do/dto/get-to-dos-query.dto';
import { TaskComment } from '../../to-do/entities/task-comment.entity';
import { ToDo } from '../../to-do/entities/to-do.entity';
import { UpdateTaskStatusDto } from '../dto/update-task-status.dto';
import { AddTaskNoteDto } from '../dto/add-task-note.dto';
import { OpenclawScope } from '../domain/openclaw-scopes.enum';

@Injectable()
export class OpenclawMcpTasksService {
  constructor(
    private readonly toDoRepository: ToDoRepository,
    private readonly taskCommentRepository: TaskCommentRepository,
  ) {}

  async listTasks(userId: string, scopes: string[], query: GetToDosQueryDto): Promise<[ToDo[], number]> {
    this.requireScope(scopes, OpenclawScope.TASKS_READ);
    return this.toDoRepository.getUserToDos(userId, query);
  }

  async updateTaskStatus(
    userId: string,
    scopes: string[],
    taskId: string,
    dto: UpdateTaskStatusDto,
  ): Promise<ToDo> {
    this.requireScope(scopes, OpenclawScope.TASKS_WRITE);

    const task = await this.toDoRepository.orm.findOne({ where: { id: taskId, user_id: userId } });
    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    return this.toDoRepository.update(taskId, { status: dto.status });
  }

  async addNote(
    userId: string,
    scopes: string[],
    taskId: string,
    dto: AddTaskNoteDto,
  ): Promise<TaskComment> {
    this.requireScope(scopes, OpenclawScope.TASKS_WRITE);

    const task = await this.toDoRepository.orm.findOne({ where: { id: taskId, user_id: userId } });
    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
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

    return this.taskCommentRepository.orm.save(comment);
  }

  private requireScope(scopes: string[], required: OpenclawScope): void {
    if (!scopes.includes(required)) {
      throw new UnauthorizedException(`Token missing required scope: ${required}`);
    }
  }
}
