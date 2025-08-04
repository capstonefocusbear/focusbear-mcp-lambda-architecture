/* eslint-disable no-console */
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { In } from 'typeorm';
import { OpenAIService } from '@app/openai';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { BraindumpTaskDto } from '@app/openai/dto/braindump-task-response.dto';
import { ToDoRepository } from '../repositories/to-do.repository';
import { CreateToDoDto } from '../dto/create-to-do.dto';
import { ToDo } from '../entities/to-do.entity';
import { GetToDosQueryDto } from '../dto/get-to-dos-query.dto';
import { FocusModeTag } from '../../focus-mode/entities/focus-mode-tags';
import { ToDoTimeLogDto } from '../dto/to-do-time-log.dto.ts';
import { TaskTimeLog } from '../entities/tasks-time-logs.entity';
import { TaskTimeLogsRepository } from '../repositories/task-time-logs.repository';
import { SyncedProjectsRepository } from '../repositories/synced-projects.repository';
import { ToDoResponse } from '../dto/to-do-response.dto';
import { ToDoStatus } from '../domain/to-do-status.enum';
import { GenerateSubtasksDto } from '../dto/generate-subtasks.dto';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { IntegrationFactory } from '../../integration/services/IntegrationFactory';
import { PlatformIntegrationRepository } from '../../platform-integrations/repositories/platform-integration.repository';
import { Task } from '../../integration/domain/task.model';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { SearchToDosDto } from '../dto/search-to-do.dto';
import { RecentToDoDto } from '../dto/recent-to-do.dto';
import { ConvertBrainDump } from '../dto/convert-brain-dump.dto';
import { PaginationDto } from '../../../shared/pagination/index.dto';
import { PaginationMetaDto } from '../../../shared/pagination/pagination-meta.dto';

@Injectable()
export class ToDoService {
  constructor(
    private readonly platformIntegrationsRepository: PlatformIntegrationRepository,
    private readonly toDoRepository: ToDoRepository,
    private readonly taskTimeLogsRepository: TaskTimeLogsRepository,
    @InjectQueue(BullQueues.TIME_LOGS) private timeLogsQueue: Queue,
    private readonly syncedProjectsRepository: SyncedProjectsRepository,
    private readonly integrationFactory: IntegrationFactory,
    private readonly openAIService: OpenAIService,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async validateUpdatingToDo(userId: string, upsertToDo: CreateToDoDto) {
    const existingToDo = await this.toDoRepository.orm.findOne({ where: { id: upsertToDo.id } });
    if (existingToDo) {
      if (existingToDo.user_id !== userId) {
        throw new UnauthorizedException(
          `User with ID: ${userId} is not allowed to edit todo with ID: ${existingToDo.id}!`,
        );
      }
      return existingToDo;
    }
  }

  async upsertToDo(userId: string, updatedToDo: CreateToDoDto) {
    let toDoFromDB: ToDo = null;
    if (updatedToDo.id) {
      toDoFromDB = await this.validateUpdatingToDo(userId, updatedToDo);
    }
    const DEFAULT_STATUSES: string[] = [ToDoStatus.NOT_STARTED, ToDoStatus.IN_PROGRESS, ToDoStatus.COMPLETED];
    const tags = updatedToDo?.tags?.map((tag) => new FocusModeTag({ ...tag, user_id: userId }));
    if (DEFAULT_STATUSES.includes(updatedToDo.status)) {
      const newToDo = new ToDo({ ...updatedToDo, user_id: userId, updated_at: new Date().toISOString(), tags });
      return this.toDoRepository.orm.save(newToDo);
    }
    let status: ToDoStatus = ToDoStatus.NOT_STARTED;
    // External status is used, check whether status should mark task as completed
    if (toDoFromDB?.synced_project_id) {
      const external_status = await this.syncedProjectsRepository.orm.findOneBy({
        id: toDoFromDB?.synced_project_id,
      });
      const selectedStatus = external_status?.available_statuses?.find(
        (externalStatus) => externalStatus.status_id === updatedToDo.status,
      );
      status = selectedStatus?.should_complete_task ? ToDoStatus.COMPLETED : (selectedStatus.label as ToDoStatus);
    }

    const newToDo = new ToDo({
      ...updatedToDo,
      user_id: userId,
      updated_at: new Date().toISOString(),
      tags,
      status,
    });
    return this.toDoRepository.orm.save(newToDo);
  }

  async getToDos(
    user_id: string,
    {
      page,
      order,
      skip,
      take,
      status,
      eisenhower_quadrant,
      should_use_cache,
      perspiration_gte,
      perspiration_lte,
      synced_project_id,
    }: GetToDosQueryDto,
  ) {
    const [toDos, total] = await this.toDoRepository.getUserToDos(user_id, {
      take,
      skip,
      status,
      order,
      eisenhower_quadrant,
      perspiration_gte,
      perspiration_lte,
      synced_project_id,
    });
    let updateToDos: ToDoResponse[];
    if (should_use_cache) {
      updateToDos = await this.addCachedStatusesToToDos(toDos, user_id);
    } else {
      updateToDos = await this.addProjectStatusesToToDos(toDos, user_id);
    }
    return new PaginationDto(
      updateToDos,
      new PaginationMetaDto({ paginationOptionsDto: { page, order, skip, take }, itemCount: total }),
    );
  }

  async addCachedStatusesToToDos(toDos: ToDo[], userId: string) {
    const toDosWithAvailableStatuses = await Promise.all(
      toDos.map(async (toDo) => {
        if (toDo?.external_task_metadata) {
          const toDoProjectId = toDo.external_task_metadata.task_data?.project_id;
          const syncedProject = await this.syncedProjectsRepository.orm.findOne({
            where: { user_id: userId, external_project_id: toDoProjectId },
          });
          const availableStatuses = syncedProject?.available_statuses;
          const externalStatusLabel = toDo.external_task_metadata?.task_data?.status?.name;
          const externalStatusId = toDo.external_task_metadata?.task_data?.status?.id;
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

  async getAllUserTasks(userId: string): Promise<Task[]> {
    const records = await this.platformIntegrationsRepository.orm.find({
      where: { user_id: userId },
      select: ['platform'],
    });

    const platforms = records.map(({ platform }) => platform);

    const tasksDeck = Promise.all(
      platforms.map((platform: IntegrationPlatforms) => {
        const service = this.integrationFactory.get(platform);
        return service.getAllUserTasks(userId).catch(() => []);
      }),
    );

    return (await tasksDeck).flat();
  }

  async addProjectStatusesToToDos(toDos: ToDo[], userId: string): Promise<ToDoResponse[]> {
    const userTasks = await this.getAllUserTasks(userId);
    const findTask = (taskId: string, tasks: Task[]) => {
      return tasks.find((task) => task.id === taskId);
    };
    const updatedToDos = [];
    const toDosWithAvailableStatuses = await Promise.all(
      toDos.map(async (toDo) => {
        if (toDo?.external_task_metadata) {
          const toDoProjectId = toDo.external_task_metadata.task_data?.project_id;
          const syncedProject = await this.syncedProjectsRepository.orm.findOne({
            where: { user_id: userId, external_project_id: toDoProjectId },
          });
          const linkedTask = findTask(toDo.external_task_id, userTasks);
          // handle not finding task (could have been deleted since last sync)
          if (!linkedTask) {
            return;
          }
          const availableStatuses = syncedProject?.available_statuses;
          const externalStatusId = linkedTask?.external_status;
          const currentExternalStatus = availableStatuses.find((status) => status.status_id === externalStatusId);
          const toDoCopy = { ...toDo };
          const toDoToSave = new ToDo({
            ...toDo,
            external_task_metadata: {
              ...toDo.external_task_metadata,
              task_data: findTask(toDo.external_task_id, userTasks),
            },
          });
          updatedToDos.push(toDoToSave);
          // Remove to do external metadata to clean up response data
          delete toDoCopy?.external_task_metadata;
          return {
            ...toDoCopy,
            current_external_status: currentExternalStatus,
            external_statuses: availableStatuses,
          };
        }
        return toDo;
      }),
    );
    // Update to dos external metadata with newly fetched data
    await this.toDoRepository.orm.save(updatedToDos);
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
        if (!selectedStatus) {
          throw new BadRequestException(
            `Error while updating task external status. No external status found with ID: ${task.status} for task with ID: ${task.id}`,
          );
        }
        if (selectedStatus?.should_complete_task) {
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
    const tasksFromExternalPlatforms = existingToDos.filter((toDo) => !!toDo.external_task_metadata);
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

    if (tasksFromExternalPlatforms.length) {
      await this.timeLogsQueue.add(BullWorkers.SAVE_TASK_TIME_LOG, {
        userId,
        toDoTimeLogs,
        toDos: tasksFromExternalPlatforms,
      });
    }
    return timeLogs;
  }

  async generateSubtasks({ task, language }: GenerateSubtasksDto) {
    return this.openAIService.createSubtasks({ task, language });
  }

  async searchToDos(searchToDosDto: SearchToDosDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Search ToDos',
        data: {
          ...searchToDosDto,
          user_id,
        },
      });

      return await this.toDoRepository.searchUserToDos(searchToDosDto, user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getRecentToDos(recentToDoDto: RecentToDoDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Get Recent ToDos',
        data: {
          ...recentToDoDto,
          user_id,
        },
      });

      return await this.toDoRepository.getUserRecentToDos(recentToDoDto, user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async createToDosFromBrainDump(convertBrainDump: ConvertBrainDump): Promise<BraindumpTaskDto[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Create To Dos from brain dump',
        data: {
          ...convertBrainDump,
        },
      });
      return await this.openAIService.convertBrainDumpToTasks(convertBrainDump.contents);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
