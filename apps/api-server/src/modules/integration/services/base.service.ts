/* eslint-disable no-await-in-loop */
import { BadRequestException, Injectable, UseGuards, Inject, forwardRef, UnauthorizedException } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { Queue } from 'bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { BullWorkers, MAX_RETRY } from '../../../shared/utils/constants';
import { IBaseIntegrationService } from './base.service.interface';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { createNewTags } from '../../../../../../cron-jobs/integration-cron-job/helpers';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { SyncedProject } from '../../to-do/entities/synced-project.entity';
import { Project } from '../domain/project.model';
import { SyncedProjectDto } from '../../to-do/dto/synced-project.dto';
import { Task } from '../domain/task.model';
import { BaseIntegrationAuthService } from '../../auth/services/base-integration.auth.service';
import { Portal } from '../domain/portal.model';
import { ExternalTaskStatus } from '../../to-do/domain/external-task-status.model';
import { PlatformIntegration } from '../../platform-integrations/entities/platform-integration.entity';

@Injectable()
@UseGuards(IsAuth)
export abstract class BaseIntegrationService implements IBaseIntegrationService {
  constructor(
    protected readonly userRepository: UserRepository,
    protected readonly focusModeTagRepository: FocusModeTagRepository,
    protected readonly toDoRepository: ToDoRepository,
    @Inject(forwardRef(() => BaseIntegrationAuthService))
    protected readonly integrationAuthService: BaseIntegrationAuthService,
    protected readonly platformIntegrationsService: PlatformIntegrationsService,
    protected readonly syncedProjectsRepository: SyncedProjectsRepository,
    protected readonly platform: IntegrationPlatforms,
    protected readonly syncTasksQueue: Queue,
    @InjectSentry() protected readonly sentryService: SentryService,
  ) {}

  async getUser(userId: string): Promise<User> {
    return this.userRepository.orm.findOneBy({ id: userId });
  }

  async addTimeEntry(
    userId: string,
    portalId: string,
    projectId: string,
    taskId: string,
    timeEntry: any,
  ): Promise<AxiosResponse<any>> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Adding time entry in base service',
      data: {
        userId,
        portalId,
        projectId,
        taskId,
        timeEntry,
        platform: this.platform,
      },
    });
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const integrationRecord = await this.getPlatformIntegrationRecord(this.platform, userId);
        if (!integrationRecord) return;
        return await this.tryAddTimeEntry({ integrationRecord, portalId, projectId, taskId, timeEntry, userId });
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.integrationAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          this.sentryService.instance().captureException(error, { level: 'error' });
          throw error;
        }
      }
    }
    throw new Error(`Failed to add ${this.platform} task time entry after trying to get new access token.`);
  }

  protected async getPlatformIntegrationRecord(platform, userId): Promise<PlatformIntegration | null> {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      platform,
      userId,
    );

    return platformIntegrationRecord?.data;
  }

  protected abstract tryAddTimeEntry({
    integrationRecord,
    portalId,
    projectId,
    taskId,
    timeEntry,
    userId,
  }): Promise<any>;

  async getTasks(userId: string, portalId: string, projectId: string): Promise<Task[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting tasks in base service',
        data: {
          userId,
          portalId,
          projectId,
          platform: this.platform,
        },
      });
      const integrationRecord = await this.getPlatformIntegrationRecord(this.platform, userId);
      if (!integrationRecord) return;
      return await this.tryGetTasks({ integrationRecord, userId, projectId, portalId });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw new BadRequestException(error.response?.data);
    }
  }

  protected abstract tryGetTasks({ integrationRecord, userId, projectId, portalId }): Promise<Task[]>;

  async getProjects(userId: string, portalId: string): Promise<Project[]> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Getting projects in base service',
      data: {
        userId,
        portalId,
        platform: this.platform,
      },
    });
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const integrationRecord = await this.getPlatformIntegrationRecord(this.platform, userId);
        if (!integrationRecord) return;
        return await this.tryGetProjects({ integrationRecord, userId, portalId });
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.integrationAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          this.sentryService.instance().captureException(error, { level: 'error' });
          throw error;
        }
      }
    }
    throw Error(`Failed to ${this.platform} get projects after trying to get new access token.`);
  }

  protected abstract tryGetProjects({ integrationRecord, userId, portalId }): Promise<Project[]>;

  async getPortals(userId: string): Promise<Portal[]> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Getting portals in base service',
      data: {
        userId,
        platform: this.platform,
      },
    });
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const integrationRecord = await this.getPlatformIntegrationRecord(this.platform, userId);
        if (!integrationRecord) {
          throw new UnauthorizedException(`User with ID: ${userId} is not authorized to access portals`);
        }

        return await this.tryGetPortals({ integrationRecord, userId });
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.integrationAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          this.sentryService.instance().captureException(error, { level: 'error' });
          throw error;
        }
      }
    }
    throw new Error(`Failed to ${this.platform} get portals after trying to get new access token.`);
  }

  protected abstract tryGetPortals({ integrationRecord, userId }): Promise<Portal[]>;

  async getAllProjects(userId: string): Promise<Project[]> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Getting all projects for user in base service',
      data: {
        userId,
        platform: this.platform,
      },
    });
    const portals: any = await this.getPortals(userId);
    let projectsResponse = [];
    if (!portals) return projectsResponse;
    for (const portal of portals) {
      // eslint-disable-next-line no-await-in-loop
      const projects = await this.getProjects(userId, portal.id);
      // eslint-disable-next-line no-continue
      if (!projects?.length) continue;
      projects.forEach((project) => {
        // eslint-disable-next-line no-param-reassign
        project.portal_id = portal.id;
      });
      projectsResponse = [...projectsResponse, ...projects];
    }
    return projectsResponse;
  }

  async getAllUserProjects(userId: string): Promise<SyncedProjectDto[]> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Getting all user projects in base service for /:platform/user-projects endpoint',
      data: {
        userId,
        platform: this.platform,
      },
    });
    try {
      const portals: any = await this.getPortals(userId);
      const userSyncedProjects = await this.syncedProjectsRepository.orm.find({ where: { user_id: userId } });
      const userSyncedProjectsExternalIds = userSyncedProjects.map(
        (syncedProject) => syncedProject.external_project_id,
      );
      const projectsResponse = [];
      if (!portals) return projectsResponse;
      for (const portal of portals) {
        // eslint-disable-next-line no-await-in-loop
        const projects = await this.getProjects(userId, portal.id);
        // eslint-disable-next-line no-continue
        if (!projects?.length) continue;
        projects.forEach((project) => {
          const isSynced = userSyncedProjectsExternalIds.includes(project.id);
          let externalStatuses = [];
          let haveTasksBeenSynced = false;
          if (isSynced) {
            const linkedSyncedProject = userSyncedProjects.find(
              (syncedProject) => syncedProject.external_project_id === project.id,
            );
            externalStatuses = linkedSyncedProject.available_statuses;
            haveTasksBeenSynced = linkedSyncedProject.have_tasks_been_synced;
          }
          const projectData = {
            name: project.name,
            project_id: project.id,
            portal_id: portal.id,
            is_synced: isSynced,
            have_tasks_been_synced: haveTasksBeenSynced,
            external_statuses: externalStatuses,
          };
          projectsResponse.push(projectData);
        });
      }
      return projectsResponse;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async upsertSyncedProjectRecord(userId: string, portalId: string, projectId: string) {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Upserting synced project record in base service',
      data: {
        userId,
        portalId,
        projectId,
        platform: this.platform,
      },
    });
    try {
      const available_statuses = await this.getProjectStatuses(userId, projectId, portalId);
      const syncedProjects = await this.syncedProjectsRepository.orm.find({ where: { user_id: userId } });
      const syncedProjectsExternalIds = syncedProjects.map((project) => project.external_project_id);
      const hasProjectBeenSynced = syncedProjectsExternalIds.includes(projectId);
      if (!hasProjectBeenSynced) {
        const newProject = new SyncedProject({
          user_id: userId,
          external_project_id: projectId,
          external_portal_id: portalId,
          available_statuses,
          platform: this.platform,
        });
        return await this.syncedProjectsRepository.orm.save(newProject);
      }
      // if project has already been synced, update statuses
      const linkedProject = syncedProjects.find((syncedProject) => syncedProject.external_project_id === projectId);
      linkedProject.available_statuses = available_statuses;
      return await this.syncedProjectsRepository.orm.save(linkedProject);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async manuallySyncTasks(userId: string) {
    await this.syncTasksQueue.add(BullWorkers.MANUALLY_SYNC_PLATFORM_TASKS, { userId, platform: this.platform });
  }

  async syncProjectAndChildTasks(
    userId: string,
    portalId: string,
    projectId: string,
    platform: IntegrationPlatforms,
    only_assigned: boolean,
  ) {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Syncing user project from external platform',
      data: {
        userId,
        portalId,
        projectId,
        platform: this.platform,
      },
    });
    try {
      const project = await this.getProject(userId, portalId, projectId);
      const [projectAsFocusModeTag] = createNewTags([project], userId, this.platform);
      await this.upsertSyncedProjectRecord(userId, portalId, project.id);
      await this.focusModeTagRepository.orm.save(projectAsFocusModeTag);
      await this.syncTasksQueue.add(BullWorkers.SYNC_PROJECT_TASKS, {
        userId,
        portalId,
        projectId,
        projectAsFocusModeTag,
        platform,
        only_assigned,
      });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getProject(userId: string, portalId: string, projectId: string): Promise<Project> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Fetching project in base service',
      data: {
        userId,
        portalId,
        projectId,
        platform: this.platform,
      },
    });
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const integrationRecord = await this.getPlatformIntegrationRecord(this.platform, userId);
        if (!integrationRecord) return;
        return await this.tryGetProject({ integrationRecord, portalId, projectId, userId });
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.integrationAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          this.sentryService.instance().captureException(error, { level: 'error' });
          throw error;
        }
      }
    }
    throw new Error(`Failed to get project owned by user with ID: ${userId} after trying to get new access token.`);
  }

  protected abstract tryGetProject({ integrationRecord, portalId, projectId, userId }): Promise<Project>;

  async getAllUserTasks(userId: string): Promise<Task[]> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Fetching all user tasks from synced projects for specific platform',
      data: {
        userId,
        platform: this.platform,
      },
    });
    try {
      const syncedProjects = await this.syncedProjectsRepository.orm.find({
        where: { user_id: userId, platform: this.platform },
      });
      const tasks = [];
      for await (const project of syncedProjects) {
        const projectTasks = await this.getTasks(userId, project.external_portal_id, project.external_project_id);
        for (const task of projectTasks) {
          task.portal_id = project.external_portal_id;
          tasks.push(task);
        }
      }
      return tasks;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getTasksOwnedByUser(userId: string, portalId: string, projectId: string): Promise<Task[]> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Fetching tasks',
      data: {
        userId,
        portalId,
        projectId,
        platform: this.platform,
      },
    });
    const integrationRecord = await this.getPlatformIntegrationRecord(this.platform, userId);
    if (!integrationRecord) return;
    const tasksOwnedByUser = await this.tryGetTasksOwnedByUser({ integrationRecord, portalId, projectId });
    const allTasks = await this.getTasks(userId, portalId, projectId);
    const tasksOwnedByUserIds = tasksOwnedByUser.map((task) => task.id);
    return allTasks.filter((task) => {
      return tasksOwnedByUserIds.includes(task.id);
    });
  }

  protected abstract tryGetTasksOwnedByUser({ integrationRecord, portalId, projectId }): Promise<Task[]>;

  async getProjectStatuses(userId: string, projectId: string, portalId: string) {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Fetching project statuses',
      data: {
        userId,
        portalId,
        projectId,
        platform: this.platform,
      },
    });
    const integrationRecord = await this.getPlatformIntegrationRecord(this.platform, userId);
    if (!integrationRecord) return;
    const statuses = await this.tryGetProjectStatuses({ integrationRecord, userId, projectId, portalId });
    return statuses;
  }

  protected abstract tryGetProjectStatuses({
    integrationRecord,
    userId,
    projectId,
    portalId,
  }): Promise<ExternalTaskStatus[]>;

  async updateTaskStatus(userId: string, portalId: string, projectId: string, taskId: string, statusId: string) {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Updating task statuses',
      data: {
        userId,
        portalId,
        projectId,
        taskId,
        statusId,
        platform: this.platform,
      },
    });
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const integrationRecord = await this.getPlatformIntegrationRecord(this.platform, userId);
        if (!integrationRecord) return;
        return await this.tryUpdateTaskStatus({ integrationRecord, userId, portalId, projectId, taskId, statusId });
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.integrationAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          throw error;
        }
      }
    }
    throw new Error('Failed to update task status after trying to get new access token.');
  }

  protected abstract tryUpdateTaskStatus({
    integrationRecord,
    userId,
    portalId,
    projectId,
    taskId,
    statusId,
  }): Promise<any>;
}
