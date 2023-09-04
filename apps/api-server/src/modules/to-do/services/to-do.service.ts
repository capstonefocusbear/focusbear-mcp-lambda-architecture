/* eslint-disable no-console */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ToDoRepository } from '../repositories/to-do.repository';
import { CreateToDoDto } from '../dto/create-to-do.dto';
import { ToDo } from '../entities/to-do.entity';
import { GetToDosQueryDto } from '../dto/get-to-dos-query.dto';
import { FocusModeTag } from '../../focus-mode/entities/focus-mode-tags';
import { ToDoTimeLogDto } from '../dto/to-do-time-log.dto.ts';
import { TaskTimeLog } from '../entities/tasks-time-logs.entity';
import { TaskTimeLogsRepository } from '../repositories/task-time-logs.repository';

@Injectable()
export class ToDoService {
  constructor(
    private readonly toDoRepository: ToDoRepository,
    private readonly taskTimeLogsRepository: TaskTimeLogsRepository,
    @InjectQueue('time-logs') private timeLogsQueue: Queue,
  ) {}

  async validateUpdatingToDo(userId: string, upsertToDo: CreateToDoDto) {
    const existingToDo = await this.toDoRepository.orm.findOne({ where: { id: upsertToDo.id } });
    if (existingToDo) {
      if (existingToDo.user_id !== userId) {
        throw new UnauthorizedException(
          `User with ID: ${userId} is not allowed to edit todo with ID: ${existingToDo.id}!`,
        );
      }
    }
  }

  async upsertToDo(user_id: string, upsertToDo: CreateToDoDto) {
    if (upsertToDo.id) {
      await this.validateUpdatingToDo(user_id, upsertToDo);
    }
    const tags = upsertToDo?.tags.map((tag) => new FocusModeTag({ ...tag, user_id }));
    const newToDo = new ToDo({ ...upsertToDo, user_id, updated_at: new Date().toISOString(), tags });
    return this.toDoRepository.orm.save(newToDo);
  }

  async getToDos(user_id: string, { page_num, status, eisenhower_quadrant }: GetToDosQueryDto) {
    return this.toDoRepository.getUserToDos(user_id, { page_num, status, eisenhower_quadrant });
  }

  async deleteToDo(user_id: string, toDoId: string) {
    await this.toDoRepository.orm.delete({ user_id, id: toDoId });
  }

  async updateTasksStatuses(tasks: ToDoTimeLogDto[]) {
    for await (const task of tasks) {
      await this.toDoRepository.update(task.todo_id, { status: task.completion_status });
    }
  }

  async logToDosTime(toDoTimeLogs: ToDoTimeLogDto[], userId: string, completedFocusBlockId: string) {
    const toDoIds = toDoTimeLogs.map((toDo) => toDo.todo_id);
    const toDos = await this.toDoRepository.orm.find({
      where: { id: In(toDoIds), user_id: userId },
      select: ['id', 'external_task_id', 'external_task_metadata', 'status', 'title'],
    });
    const toDosFromExternalPlatform = toDos.filter((toDo) => !!toDo.external_task_id);
    const timeLogs = toDoTimeLogs.map(
      (toDo) =>
        new TaskTimeLog({
          user_id: userId,
          task_id: toDo.todo_id,
          duration_logged_seconds: toDo.duration_logged_seconds,
          completed_focus_block_id: completedFocusBlockId,
        }),
    );
    await this.updateTasksStatuses(toDoTimeLogs);
    await this.taskTimeLogsRepository.orm.save(timeLogs);
    if (toDosFromExternalPlatform.length) {
      await this.timeLogsQueue.add('save-task-time-log', {
        userId,
        toDoTimeLogs,
        toDos: toDosFromExternalPlatform,
      });
    }
    return timeLogs;
  }
}
