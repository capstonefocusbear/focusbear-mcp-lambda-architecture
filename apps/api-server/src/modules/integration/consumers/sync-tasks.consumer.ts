import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { In, IsNull, Not } from 'typeorm';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { FocusModeTag } from '../../focus-mode/entities/focus-mode-tags';
import { ToDo } from '../../to-do/entities/to-do.entity';
import { SyncedProjectsService } from '../../to-do/services/synced-projects.service';
import { IntegrationFactory } from '../services/IntegrationFactory';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { Task } from '../domain/task.model';
import { SyncedProject } from '../../to-do/entities/synced-project.entity';

@Processor('sync-tasks')
export class SyncTasksConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly toDoRepository: ToDoRepository,
    private readonly syncedProjectsService: SyncedProjectsService,
    private readonly syncedProjectsRepository: SyncedProjectsRepository,
    private readonly integrationFactory: IntegrationFactory,
  ) {}

  @Process('sync-project-tasks')
  async readOperationJob(
    job: Job<{
      userId: string;
      portalId: string;
      projectId: string;
      projectAsFocusModeTag: FocusModeTag;
      platform: IntegrationPlatforms;
    }>,
  ) {
    const {
      data: { userId, portalId, projectId, projectAsFocusModeTag, platform },
    } = job;
    try {
      const service = this.integrationFactory.get(platform);
      const tasksFromProject = await service.getTasksOwnedByUser(userId, portalId, projectId);
      const syncedProjectRecord = await this.syncedProjectsService.getSyncedProject(projectId);
      const tasksAsToDos = tasksFromProject.map((task) => {
        return new ToDo({
          user_id: userId,
          title: task.name,
          details: task.description,
          external_task_id: task.id,
          external_task_metadata: { platform, task_data: task.external_metadata },
          synced_project_id: syncedProjectRecord.id,
          tags: [...(projectAsFocusModeTag ? [projectAsFocusModeTag] : [])],
        });
      });
      await Promise.all([
        this.toDoRepository.orm.save(tasksAsToDos),
        this.syncedProjectsService.markSyncedProjectTasksAsSynced(syncedProjectRecord.id),
      ]);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      console.error('Error in sync-project-tasks queued job: ', JSON.stringify(error));
    }
  }

  @Process('manually-sync-platform-tasks')
  async manuallySyncPlatformTasks(
    job: Job<{
      userId: string;
      platform: IntegrationPlatforms;
    }>,
  ) {
    const {
      data: { userId, platform },
    } = job;
    try {
      const syncedProjects = await this.syncedProjectsRepository.orm.find({
        where: { user_id: userId, platform },
      });
      // Get all user local tasks saved from external platforms
      const allUserExternalTasks = await this.toDoRepository.orm.find({
        where: { user_id: userId, external_task_id: Not(IsNull()) },
        select: ['id', 'external_task_id', 'external_task_metadata'],
      });
      const allTasksFromPlatform = await this.getTasksFromSyncedProjects(userId, platform);
      for await (const syncedProject of syncedProjects) {
        // Filter out tasks not belonging to this project
        const tasksFromProject = allTasksFromPlatform.filter(
          (externalTask) => externalTask.external_metadata.project_id === syncedProject.external_project_id,
        );
        // Get local tasks that are from this project only
        const syncedTasksFromProject = allUserExternalTasks.filter(({ external_task_metadata }) => {
          return (
            external_task_metadata?.platform === platform &&
            external_task_metadata?.task_data?.project_id === syncedProject.external_project_id
          );
        });
        await Promise.all([
          this.deleteRemovedTasks(userId, tasksFromProject, syncedTasksFromProject),
          this.saveNewTasks(userId, syncedProjects, syncedTasksFromProject, tasksFromProject, platform),
        ]);
      }
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      console.error('Error in manually-sync-platform-tasks queued job: ', error);
    }
  }

  async getTasksFromSyncedProjects(userId: string, platform: IntegrationPlatforms) {
    const service = this.integrationFactory.get(platform);
    const tasks = await service.getAllUserTasks(userId);
    return tasks;
  }

  async deleteRemovedTasks(userId: string, tasksFromProject: Task[], syncedTasksFromProject: ToDo[]) {
    const idsOfTasksToDelete = this.getTasksToDelete(tasksFromProject, syncedTasksFromProject);
    await this.toDoRepository.orm.delete({ user_id: userId, id: In(idsOfTasksToDelete) });
  }

  async saveNewTasks(
    userId: string,
    syncedProjects: SyncedProject[],
    syncedTasksFromProject: ToDo[],
    tasksFromProject: Task[],
    platform: IntegrationPlatforms,
  ) {
    const syncedTasksFromProjectIds = syncedTasksFromProject.map((task) => task.external_task_id);
    // Get tasks that are from same project but not synced yet
    const tasksToSync = tasksFromProject.filter((task) => !syncedTasksFromProjectIds.includes(task.id));
    const projectsExternalIdToLocalIdMap = this.getSyncedProjectsIdMap(syncedProjects);
    const newTasksFromProject = tasksToSync.map((newExternalTask) => {
      return this.createNewToDo(newExternalTask, userId, projectsExternalIdToLocalIdMap, platform);
    });
    await this.toDoRepository.orm.save(newTasksFromProject);
  }

  createNewToDo(task: Task, userId: string, projectExternalIdToLocalIdMap: any, platform: IntegrationPlatforms) {
    return new ToDo({
      user_id: userId,
      title: task.name,
      details: task.description,
      external_task_id: task.id,
      external_task_metadata: { platform, task_data: task.external_metadata },
      synced_project_id: projectExternalIdToLocalIdMap[task.external_metadata.project_id],
      tags: [],
    });
  }

  getTasksToDelete(tasksCurrentlyInProject: Task[], alreadySyncedTasksFromProject: ToDo[]) {
    const tasksIds = tasksCurrentlyInProject.map((task) => task.id);
    return alreadySyncedTasksFromProject
      .map((syncedTask) => {
        if (!tasksIds.includes(syncedTask.external_task_id)) {
          return syncedTask.id;
        }
        return null;
      })
      .filter((taskId) => taskId);
  }

  getSyncedProjectsIdMap(syncedProjects: SyncedProject[]) {
    const projectsExternalIdToLocalIdMap: any = syncedProjects.reduce((map, project) => {
      const newMap = { ...map };
      newMap[project.external_project_id] = project.id;
      return newMap;
    }, {});
    return projectsExternalIdToLocalIdMap;
  }
}
