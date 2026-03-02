/* eslint-disable no-console */
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { In } from 'typeorm';
import { OpenAIService } from '@app/openai';
import { InjectSentry, SentryService } from '@app/observability';
import { BraindumpTaskDto } from '@app/openai/dto/braindump-task-response.dto';
import { ToDoRepository } from '../repositories/to-do.repository';
import { TaskCommentRepository } from '../repositories/task-comment.repository';
import { TaskReactionRepository } from '../repositories/task-reaction.repository';
import { TaskCommentReactionRepository } from '../repositories/task-comment-reaction.repository';
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
import { UserRepository } from '../../user/repositories/user.repository';
import { UserTypes } from '../../user/domain/user-types.enum';
import { AdminTaskResponseDto } from '../dto/admin-task-response.dto';
import { ProjectRepository } from '../../project/repositories/project.repository';

@Injectable()
export class ToDoService {
  constructor(
    private readonly platformIntegrationsRepository: PlatformIntegrationRepository,
    private readonly toDoRepository: ToDoRepository,
    private readonly taskCommentRepository: TaskCommentRepository,
    private readonly taskReactionRepository: TaskReactionRepository,
    private readonly taskCommentReactionRepository: TaskCommentReactionRepository,
    private readonly taskTimeLogsRepository: TaskTimeLogsRepository,
    @InjectQueue(BullQueues.TIME_LOGS) private timeLogsQueue: Queue,
    private readonly syncedProjectsRepository: SyncedProjectsRepository,
    private readonly integrationFactory: IntegrationFactory,
    private readonly openAIService: OpenAIService,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly userRepository: UserRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  /**
   * Filters out invalid subtask entries from legacy data
   * @param subtasks - Array of subtasks that may contain invalid entries
   * @returns Array of valid subtasks only
   */
  private filterValidSubtasks(subtasks: any): any[] {
    if (!Array.isArray(subtasks)) {
      return [];
    }

    return subtasks.filter(
      (item) =>
        item &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        'name' in item &&
        'is_completed' in item &&
        typeof item.name === 'string' &&
        item.name.trim().length > 0 &&
        typeof item.is_completed === 'boolean',
    );
  }

  async validateUpdatingToDo(userId: string, upsertToDo: CreateToDoDto) {
    const existingToDo = await this.toDoRepository.orm.findOne({ where: { id: upsertToDo.id } });
    if (existingToDo) {
      if (existingToDo.user_id !== userId) {
        // Log potential IDOR attack attempt
        this.sentryService
          .instance()
          .captureMessage(
            `SECURITY: Unauthorized todo update attempt - User ${userId} tried to update todo ${existingToDo.id} owned by ${existingToDo.user_id}`,
            'warning',
          );
        throw new UnauthorizedException(
          `User with ID: ${userId} is not allowed to edit todo with ID: ${existingToDo.id}!`,
        );
      }
      return existingToDo;
    }
    // If todo doesn't exist, that's fine - it will be created as a new todo with the authenticated user's ID
    return null;
  }

  async upsertToDo(userId: string, updatedToDo: CreateToDoDto) {
    let toDoFromDB: ToDo = null;
    if (updatedToDo.id) {
      toDoFromDB = await this.validateUpdatingToDo(userId, updatedToDo);
    }
    if (updatedToDo.custom_status_id && updatedToDo.project_id) {
      const project = await this.projectRepository.getProjectById(updatedToDo.project_id);
      if (!project) {
        throw new BadRequestException(`Project with id ${updatedToDo.project_id} not found`);
      }
      const validStatus = project.custom_statuses?.some((s) => s.id === updatedToDo.custom_status_id);
      if (!validStatus) {
        throw new BadRequestException(
          `Invalid custom_status_id: ${updatedToDo.custom_status_id} does not exist in the project's custom statuses`,
        );
      }
    }

    const DEFAULT_STATUSES: string[] = [ToDoStatus.NOT_STARTED, ToDoStatus.IN_PROGRESS, ToDoStatus.COMPLETED];
    const tags = updatedToDo?.tags?.map((tag) => new FocusModeTag({ ...tag, user_id: userId }));
    if (DEFAULT_STATUSES.includes(updatedToDo.status)) {
      const newToDo = new ToDo({ ...updatedToDo, user_id: userId, updated_at: new Date().toISOString(), tags });
      return this.toDoRepository.orm.save(newToDo);
    }
    let status: ToDoStatus = ToDoStatus.NOT_STARTED;
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

  async getToDos(user_id: string, getToDosQueryDto: GetToDosQueryDto) {
    const {
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
      sort_mode,
      include_comments,
      include_reactions,
    } = getToDosQueryDto;
    const [toDos, total] = await this.toDoRepository.getUserToDos(user_id, {
      take,
      skip,
      status,
      order,
      eisenhower_quadrant,
      perspiration_gte,
      perspiration_lte,
      synced_project_id,
      sort_mode,
    });

    // Clean up legacy data: filter out empty arrays and invalid subtask entries
    const cleanedToDos = toDos.map((todo) => ({
      ...todo,
      subtasks: this.filterValidSubtasks(todo.subtasks),
    }));

    let updateToDos: ToDoResponse[];
    if (should_use_cache) {
      updateToDos = await this.addCachedStatusesToToDos(cleanedToDos, user_id);
    } else {
      updateToDos = await this.addProjectStatusesToToDos(cleanedToDos, user_id);
    }

    if (include_comments || include_reactions) {
      updateToDos = await this.enrichToDosWithCommentsAndReactions(updateToDos, {
        include_comments,
        include_reactions,
      });
    }

    return new PaginationDto(
      updateToDos,
      new PaginationMetaDto({ paginationOptionsDto: { page, order, skip, take }, itemCount: total }),
    );
  }

  private async enrichToDosWithCommentsAndReactions(
    toDos: ToDoResponse[],
    options: { include_comments?: boolean; include_reactions?: boolean },
  ): Promise<ToDoResponse[]> {
    const taskIds = toDos.map((todo) => todo.id).filter(Boolean);
    if (!taskIds.length) return toDos;

    const [comments, taskReactions] = await Promise.all([
      options.include_comments ? this.taskCommentRepository.getCommentsByTaskIds(taskIds) : Promise.resolve([]),
      options.include_reactions ? this.taskReactionRepository.getReactionsByTaskIds(taskIds) : Promise.resolve([]),
    ]);

    // Fetch comment reactions if comments were loaded
    const commentIds = comments.map((c) => c.id);
    const commentReactions = options.include_comments
      ? await this.taskCommentReactionRepository.getReactionsByCommentIds(commentIds)
      : [];

    // Group comment reactions by comment_id
    const commentReactionsByCommentId = new Map<string, typeof commentReactions>();
    for (const reaction of commentReactions) {
      const existing = commentReactionsByCommentId.get(reaction.comment_id) ?? [];
      existing.push(reaction);
      commentReactionsByCommentId.set(reaction.comment_id, existing);
    }

    // Group comments by task_id, attaching their reactions
    const commentsByTaskId = new Map<string, any[]>();
    for (const comment of comments) {
      const commentWithReactions = {
        id: comment.id,
        task_id: comment.task_id,
        user_id: comment.user_id,
        content: comment.content,
        user: comment.user ? { id: comment.user.id, username: (comment.user as any).username } : undefined,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        reactions: commentReactionsByCommentId.get(comment.id) ?? [],
      };
      const existing = commentsByTaskId.get(comment.task_id) ?? [];
      existing.push(commentWithReactions);
      commentsByTaskId.set(comment.task_id, existing);
    }

    // Group task reactions by task_id
    const reactionsByTaskId = new Map<string, typeof taskReactions>();
    for (const reaction of taskReactions) {
      const existing = reactionsByTaskId.get(reaction.task_id) ?? [];
      existing.push(reaction);
      reactionsByTaskId.set(reaction.task_id, existing);
    }

    return toDos.map((todo) => ({
      ...todo,
      ...(options.include_comments ? { comments: commentsByTaskId.get(todo.id) ?? [] } : {}),
      ...(options.include_reactions ? { reactions: reactionsByTaskId.get(todo.id) ?? [] } : {}),
    }));
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
    // CRITICAL SECURITY CHECK: Verify ownership before deletion to prevent IDOR attacks
    const existingToDo = await this.toDoRepository.orm.findOne({ where: { id: toDoId } });

    if (existingToDo && existingToDo.user_id !== user_id) {
      // Verify that the todo belongs to the authenticated user
      // Log potential IDOR attack attempt
      this.sentryService
        .instance()
        .captureMessage(
          `SECURITY: Unauthorized todo deletion attempt - User ${user_id} tried to delete todo ${toDoId} owned by ${existingToDo.user_id}`,
          'warning',
        );
      throw new UnauthorizedException(`User with ID: ${user_id} is not allowed to delete todo with ID: ${toDoId}!`);
    }

    // Use explicit where clause with both user_id and id to ensure only the owner can delete
    // This is a defense-in-depth measure - even if the above check is bypassed, the database query will fail
    const deleteResult = await this.toDoRepository.orm.delete({ user_id, id: toDoId });

    // Log successful deletion for audit trail
    if (deleteResult?.affected > 0) {
      this.sentryService.instance().addBreadcrumb({
        category: 'todo',
        message: `User ${user_id} deleted todo ${toDoId}`,
        level: 'info',
      });
    }
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

      const todos = await this.toDoRepository.searchUserToDos(searchToDosDto, user_id);

      // Clean up legacy data
      return todos.map((todo) => ({
        ...todo,
        subtasks: this.filterValidSubtasks(todo.subtasks),
      }));
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

      const todos = await this.toDoRepository.getUserRecentToDos(recentToDoDto, user_id);

      // Clean up legacy data
      return todos.map((todo) => ({
        ...todo,
        subtasks: this.filterValidSubtasks(todo.subtasks),
      }));
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

  /**
   * Retrieves tasks for a specific user. Used by the admin dashboard to display
   * user task data for debugging and support purposes.
   * Includes TOP priority columns (outcome, perspiration_level) for task prioritization context.
   */
  async getTasksForAdminDashboard(adminId: string, userId: string): Promise<AdminTaskResponseDto[]> {
    const adminUser = await this.userRepository.orm.findOneBy({ id: adminId });
    if (!adminUser) {
      throw new NotFoundException(`User with ID: ${adminId} not found!`);
    }
    const isAdmin = adminUser.user_type === UserTypes.ADMIN;
    if (!isAdmin) {
      throw new UnauthorizedException(`User with ID: ${adminId} is not admin!`);
    }
    const tasks = await this.toDoRepository.orm.find({
      where: { user_id: userId },
      select: [
        'id',
        'title',
        'status',
        'due_date',
        'eisenhower_quadrant',
        'duration',
        'outcome',
        'perspiration_level',
        'created_at',
        'updated_at',
      ],
      order: { updated_at: 'DESC' },
    });
    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      due_date: task.due_date,
      eisenhower_quadrant: task.eisenhower_quadrant,
      duration: task.duration,
      outcome: task.outcome,
      perspiration_level: task.perspiration_level,
      created_at: task.created_at,
      updated_at: task.updated_at,
    }));
  }

  async getToDosByIds(userId: string, ids: string[]): Promise<ToDo[]> {
    if (!ids.length) {
      return [];
    }

    const todos = await this.toDoRepository.orm.find({
      where: { user_id: userId, id: In(ids) },
      select: ['id', 'title', 'status', 'due_date', 'duration', 'icon', 'subtasks'],
    });

    return todos.map((todo) => ({
      ...todo,
      subtasks: this.filterValidSubtasks(todo.subtasks),
    }));
  }
}
