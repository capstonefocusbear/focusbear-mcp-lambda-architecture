/* eslint-disable no-console */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { In } from 'typeorm';
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
    const tags = upsertToDo?.tags?.map((tag) => new FocusModeTag({ ...tag, user_id }));
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
      await this.toDoRepository.update(task.id, { status: task.status });
    }
  }

  async logToDosTime(toDoTimeLogs: ToDoTimeLogDto[], userId: string, completedFocusBlockId: string) {
    if (!toDoTimeLogs?.length) return;
    const toDoIds = toDoTimeLogs.map((toDo) => toDo.id);
    const existingToDos = await this.toDoRepository.orm.find({
      where: { user_id: userId, id: In(toDoIds) },
      select: ['id', 'external_task_id', 'external_task_metadata', 'status', 'title'],
    });
    const existingToDoIds = existingToDos.map((toDo) => toDo.id);
    // filter out to dos that don't belong to user
    const toDosToUpdate = toDoTimeLogs.filter((toDoTimeLog) => existingToDoIds.includes(toDoTimeLog.id));
    const timeLogs = toDosToUpdate.map(
      (toDo) =>
        new TaskTimeLog({
          user_id: userId,
          task_id: toDo.id,
          duration_logged_seconds: toDo.duration,
          completed_focus_block_id: completedFocusBlockId,
        }),
    );
    await this.updateTasksStatuses(toDosToUpdate);
    await this.taskTimeLogsRepository.orm.save(timeLogs);

    // TODO: Finish Zoho integration - update task statuses and log their times
    //
    // const toDosFromExternalPlatform = existingToDos.filter((toDo) => !!toDo.external_task_id);
    // if (toDosFromExternalPlatform.length) {
    //   await this.timeLogsQueue.add('save-task-time-log', {
    //     userId,
    //     toDoTimeLogs,
    //     toDos: toDosFromExternalPlatform,
    //   });
    // }
    return timeLogs;
  }
}
