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
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { SyncedProjectsRepository } from '../repositories/synced-projects.repository';
import { ToDoResponse } from '../dto/to-do-response.dto';
import { ZohoService } from '../../zoho/services/zoho.service';
import { ToDoStatus } from '../domain/to-do-status.enum';

@Injectable()
export class ToDoService {
  constructor(
    private readonly toDoRepository: ToDoRepository,
    private readonly taskTimeLogsRepository: TaskTimeLogsRepository,
    @InjectQueue('time-logs') private timeLogsQueue: Queue,
    private readonly syncedProjectsRepository: SyncedProjectsRepository,
    private readonly zohoService: ZohoService,
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

  async getToDos(
    user_id: string,
    { page_num, status, eisenhower_quadrant }: GetToDosQueryDto,
  ): Promise<ToDoResponse[]> {
    const toDos = await this.toDoRepository.getUserToDos(user_id, { page_num, status, eisenhower_quadrant });
    return this.addProjectStatusesToToDos(toDos, user_id);
  }

  async addProjectStatusesToToDos(toDos: ToDo[], userId: string): Promise<ToDoResponse[]> {
    const userZohoTasks = await this.zohoService.getAllUserTasks(userId);
    const findTask = (taskId: string, zohoTasks: any[]) => {
      return zohoTasks.find((task) => task.id_string === taskId);
    };
    const toDosWithAvailableStatuses = await Promise.all(
      toDos.map(async (toDo) => {
        if (toDo?.external_task_metadata) {
          const toDoProjectId = toDo.external_task_metadata.task_data?.project?.id_string;
          const syncedProject = await this.syncedProjectsRepository.orm.findOne({
            where: { user_id: userId, external_project_id: toDoProjectId },
          });
          const linkedTask = findTask(toDo.external_task_id, userZohoTasks);
          const availableStatuses = syncedProject.available_statuses;
          const externalStatusLabel = linkedTask?.status?.name;
          const externalStatusId = linkedTask?.status?.id;
          const externalStatus = { label: externalStatusLabel, id: externalStatusId };
          const toDoCopy = { ...toDo };
          // Remove to do external metadata to clean up response data
          delete toDoCopy?.external_task_metadata;
          return {
            ...toDoCopy,
            current_external_status: externalStatus,
            external_statuses: availableStatuses,
          };
        }
        return toDo;
      }),
    );
    return toDosWithAvailableStatuses;
  }

  async deleteToDo(user_id: string, toDoId: string) {
    await this.toDoRepository.orm.delete({ user_id, id: toDoId });
  }

  async updateTasksStatuses(tasks: ToDoTimeLogDto[]) {
    const DEFAULT_STATUSES: string[] = [ToDoStatus.NOT_STARTED, ToDoStatus.IN_PROGRESS, ToDoStatus.COMPLETED];
    for await (const task of tasks) {
      // Check if task uses a default status
      if (DEFAULT_STATUSES.includes(task.status)) {
        await this.toDoRepository.update(task.id, { status: task.status });
      } else {
        // External status is used, check whether status should mark task as completed
        const toDo = await this.toDoRepository.orm.findOneBy({ id: task.id });
        const { available_statuses } = await this.syncedProjectsRepository.orm.findOneBy({
          id: toDo.synced_project_id,
        });
        const selectedStatus = available_statuses.find((externalStatus) => externalStatus.status_id === task.status);
        if (selectedStatus.should_complete_task) {
          await this.toDoRepository.update(task.id, { status: ToDoStatus.COMPLETED });
        }
      }
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
          note: toDo.note,
        }),
    );
    await this.updateTasksStatuses(toDosToUpdate);
    await this.taskTimeLogsRepository.orm.save(timeLogs);

    const toDosFromZoho = existingToDos.filter(
      (toDo) => toDo.external_task_metadata?.platform === IntegrationPlatforms.ZOHO,
    );

    if (toDosFromZoho.length) {
      await this.timeLogsQueue.add('save-task-time-log', {
        userId,
        toDoTimeLogs,
        toDos: toDosFromZoho,
      });
    }
    return timeLogs;
  }
}
