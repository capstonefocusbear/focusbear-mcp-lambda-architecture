/* eslint-disable no-await-in-loop */
import { BadRequestException, Injectable, UseGuards, Inject, forwardRef, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { IsNull, Not } from 'typeorm';
import { BaseIntegrationService } from './base.service';
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
import { ToDo } from '../../to-do/entities/to-do.entity';
import { AsanaAuthService } from '../../auth/services/asana-auth.service';
import { Task } from '../domain/task.model';

const projectAdapter = (project) => ({
  id: project.gid,
  ...project,
});

const taskAdapter = (task) => ({
  id: task.gid,
  ...task,
});

@Injectable()
@UseGuards(IsAuth)
export class AsanaService implements BaseIntegrationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly focusModeTagRepository: FocusModeTagRepository,
    private readonly toDoRepository: ToDoRepository,
    @Inject(forwardRef(() => AsanaAuthService))
    private readonly asanaAuthService: AsanaAuthService,
    private readonly platformIntegrationsService: PlatformIntegrationsService,
    private readonly syncedProjectsRepository: SyncedProjectsRepository,
  ) {}

  private httpService = axios;

  private readonly base_url = 'https://app.asana.com/api/1.0/';

  async getUser(userId: string): Promise<User> {
    return this.userRepository.orm.findOneBy({ id: userId });
  }

  async addTimeEntry(
    userId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    portalId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    projectId: string,
    taskId: string,
    timeEntry: any,
  ): Promise<AxiosResponse<any>> {
    try {
      const MAX_RETRY = 2;
      let retryCount = 0;

      while (retryCount < MAX_RETRY) {
        try {
          const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
            IntegrationPlatforms.ASANA,
            userId,
          );
          if (!platformIntegrationRecord) return;
          const { data: asanaData } = platformIntegrationRecord;
          const url = `${this.base_url}tasks/${taskId}/time_tracking_entries`;
          const headers = { Authorization: `Bearer ${asanaData.access_token}` };
          const timeminutes = timeEntry.seconds / 60;

          const formData = {
            data: {
              duration_minutes: timeminutes,
            },
          };

          const response = await this.httpService.post(url, formData, {
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
          });
          return response.data?.data;
        } catch (error) {
          if (error.response && error.response.status === 401) {
            retryCount = await this.asanaAuthService.handleUnauthorizedError(userId, retryCount);
          } else {
            throw error;
          }
        }
      }
      throw new Error('Failed to add Asana task time entry after trying to get new access token.');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new UnauthorizedException('Auth Failed');
      } else {
        throw new Error(`Failed to add Trello task time entry after trying to get new access token. ${error}`);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTasks(userId: string, projectId: string, portalId: string): Promise<Task[]> {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.ASANA,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: asanaData } = platformIntegrationRecord;
      const url = `${this.base_url}projects/${projectId}/tasks`;
      const headers = { Authorization: `Bearer ${asanaData.access_token}` };
      const fields = 'name,completed,due_on,actual_time_minutes';
      const params = {
        opt_fields: fields,
      };

      const response = await this.httpService.get(url, {
        headers,
        params,
      });
      return response.data?.data ?? [];
    } catch (e) {
      throw new BadRequestException(e.response?.data);
    }
  }

  async getProjects(userId: string, portalId: string): Promise<Project[]> {
    const MAX_RETRY = 2;
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
          IntegrationPlatforms.ASANA,
          userId,
        );
        if (!platformIntegrationRecord) {
          throw new UnauthorizedException(`User with ID: ${userId} has not authenticated with Asana!`);
        }
        const { data: asanaData } = platformIntegrationRecord;
        const url = `${this.base_url}projects?workspace=${portalId}`;
        const headers = { Authorization: `Bearer ${asanaData.access_token}` };
        const response = await this.httpService.get(url, {
          headers,
        });
        return response.data?.data.map((project) => projectAdapter(project));
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.asanaAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          throw error;
        }
      }
    }
  }

  async getPortals(userId: string): Promise<AxiosResponse<any>> {
    const MAX_RETRY = 2;
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
          IntegrationPlatforms.ASANA,
          userId,
        );
        if (!platformIntegrationRecord) return;

        const { data: asanaData } = platformIntegrationRecord;
        const url = `${this.base_url}workspaces`;
        const headers = {
          Authorization: `Bearer ${asanaData.access_token}`,
        };
        const response = await axios.get(url, { headers });
        return response.data?.data;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.asanaAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          throw error;
        }
      }
    }
  }

  async getAllProjects(userId: string): Promise<Project[]> {
    const portals: any = await this.getPortals(userId);
    let projectsResponse = [];
    if (!portals) return projectsResponse;
    for (const portal of portals) {
      // eslint-disable-next-line no-await-in-loop
      const projects = await this.getProjects(userId, portal.gid);
      // eslint-disable-next-line no-continue
      if (!projects?.length) continue;
      projects.forEach((project) => {
        // eslint-disable-next-line no-param-reassign
        project.portal_id = portal.gid;
      });
      projectsResponse = [...projectsResponse, ...projects];
    }
    return projectsResponse;
  }

  async getAllUserProjects(userId: string): Promise<SyncedProjectDto[]> {
    const portals: any = await this.getPortals(userId);
    const userSyncedProjects = await this.syncedProjectsRepository.orm.find({ where: { user_id: userId } });
    const userSyncedProjectsExternalIds = userSyncedProjects.map((syncedProject) => syncedProject.external_project_id);
    const projectsResponse = [];
    if (!portals) return projectsResponse;
    for (const portal of portals) {
      // eslint-disable-next-line no-await-in-loop
      const projects = await this.getProjects(userId, portal.gid);
      // eslint-disable-next-line no-continue
      if (!projects?.length) continue;
      projects.forEach((project) => {
        const isSynced = userSyncedProjectsExternalIds.includes(project.id);
        let externalStatuses = [];
        if (isSynced) {
          const linkedSyncedProject = userSyncedProjects.find(
            (syncedProject) => syncedProject.external_project_id === project.id,
          );
          externalStatuses = linkedSyncedProject.available_statuses;
        }
        const projectData = {
          name: project.name,
          project_id: project.id,
          portal_id: portal.gid,
          is_synced: isSynced,
          external_statuses: externalStatuses,
        };
        projectsResponse.push(projectData);
      });
    }
    return projectsResponse;
  }

  async upsertSyncedProjectRecord(userId: string, portalId: string, projectId: string) {
    const available_statuses = await this.getProjectStatuses(userId, projectId, portalId);
    const syncedProjects = await this.syncedProjectsRepository.orm.find({ where: { user_id: userId } });
    const syncedProjectsExternalIds = syncedProjects?.map((project) => project.external_project_id);
    const hasProjectBeenSynced = syncedProjectsExternalIds.includes(projectId);
    if (!hasProjectBeenSynced) {
      const newProject = new SyncedProject({
        user_id: userId,
        external_project_id: projectId,
        external_portal_id: portalId,
        available_statuses,
        platform: IntegrationPlatforms.ASANA,
      });
      return this.syncedProjectsRepository.orm.save(newProject);
    }
    // if project has already been synced, update statuses
    const linkedProject = syncedProjects.find((syncedProject) => syncedProject.external_project_id === projectId);
    linkedProject.available_statuses = available_statuses;
    return this.syncedProjectsRepository.orm.save(linkedProject);
  }

  async getAsanaTasksToSync(asanaTasks: any[], userId: string) {
    const syncedTasks = await this.toDoRepository.orm.find({
      where: { user_id: userId, external_task_id: Not(IsNull()) },
      select: [
        'id',
        'external_task_id',
        'external_task_metadata',
        'status',
        'title',
        'eisenhower_quadrant',
        'status',
        'due_date',
        'details',
        'focus_type',
        'updated_at',
        'created_at',
      ],
    });
    const syncedAsanaTasks = syncedTasks.filter((task) => task.external_task_metadata.platform === 'asana');
    const syncedAsanaTasksIds = syncedAsanaTasks.map((task) => task.external_task_id);
    const tasksToSync = asanaTasks.filter((task) => !syncedAsanaTasksIds.includes(task.id));
    return { tasksToSync, syncedAsanaTasks };
  }

  async syncProjectAndChildTasks(userId: string, portalId: string, projectId: string) {
    const project = await this.getProject(userId, portalId, projectId);
    const tasksFromProject = await this.getTasksOwnedByUser(userId, portalId, projectId);
    const [projectAsFocusModeTag] = createNewTags([project], userId, IntegrationPlatforms.ASANA);
    const syncedProject = await this.upsertSyncedProjectRecord(userId, portalId, projectId);
    const tasksAsToDos = tasksFromProject?.map((task) => {
      return new ToDo({
        user_id: userId,
        title: task.name,
        status: task.status,
        details: task.description,
        external_task_id: task.gid,
        external_task_metadata: { platform: IntegrationPlatforms.ASANA, task_data: task },
        synced_project_id: syncedProject.id,
        tags: [...(projectAsFocusModeTag ? [projectAsFocusModeTag] : [])],
      });
    });
    // Save new projects and tasks
    await this.toDoRepository.orm.save(tasksAsToDos);
    await this.focusModeTagRepository.orm.save(projectAsFocusModeTag);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getProject(userId: string, portalId: string, projectId: string): Promise<Task> {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ASANA,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: asanaData } = platformIntegrationRecord;
    const url = `${this.base_url}projects/${projectId}`;
    const headers = { Authorization: `Bearer ${asanaData.access_token}` };
    const response = await this.httpService.get(url, {
      headers,
    });
    return projectAdapter(response.data?.data);
  }

  async getAllUserTasks(userId: string): Promise<Task[]> {
    const syncedProjects = await this.syncedProjectsRepository.orm.find({
      where: { user_id: userId, platform: IntegrationPlatforms.ASANA },
    });
    const tasks = [];
    for await (const project of syncedProjects) {
      const projectTasks = await this.getTasksOwnedByUser(userId, project.external_portal_id, project.id);
      const pts = projectTasks.map((task) => taskAdapter(task));
      for (const task of pts) {
        task.portal_id = project.external_portal_id;
        tasks.push(task);
      }
    }
    return tasks;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTasksOwnedByUser(userId: string, portalId: string, projectId: string): Promise<any[]> {
    const MAX_RETRY = 2;
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
          IntegrationPlatforms.ASANA,
          userId,
        );
        if (!platformIntegrationRecord) return;
        const { data: asanaData } = platformIntegrationRecord;
        const sections = await this.getProjectStatuses(userId, projectId, portalId);

        const tasks = Promise.all(
          sections.map(async (section) => {
            const url = `https://app.asana.com/api/1.0/sections/${section.status_id}/tasks`;

            const headers = { Authorization: `Bearer ${asanaData.access_token}` };
            const response = await this.httpService.get(url, {
              headers,
            });
            const datas = response.data?.data ?? [];
            const tasksWithStatus = datas?.map((data) => {
              return { ...data, project_id: projectId, portal_id: portalId, status: section.status_id, id: data.gid };
            });
            return tasksWithStatus;
          }),
        );

        const flattenedTasks = (await tasks).flat();
        return flattenedTasks;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.asanaAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          throw error;
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getProjectStatuses(userId: string, projectId: string, portalId: string) {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ASANA,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: asanaData } = platformIntegrationRecord;
    const url = `${this.base_url}projects/${projectId}/sections`;
    const headers = { Authorization: `Bearer ${asanaData.access_token}` };
    const { data } = await this.httpService.get(url, {
      headers,
    });
    const availableStatuses = data.data?.map((details) => {
      return { label: details.name, status_id: details.gid, should_complete_task: false };
    });
    return availableStatuses;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateTaskStatus(userId: string, portalId: string, projectId: string, taskId: string, statusId: string) {
    const MAX_RETRY = 2;
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
          IntegrationPlatforms.ASANA,
          userId,
        );
        if (!platformIntegrationRecord) return;
        const { data: asanaData } = platformIntegrationRecord;

        const url = `${this.base_url}sections/${statusId}/addTask`;
        const headers = { Authorization: `Bearer ${asanaData.access_token}` };
        const formData = {
          data: {
            task: taskId,
          },
        };
        const response = await this.httpService.post(url, formData, {
          headers,
        });
        return response.data?.data;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.asanaAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          throw error;
        }
      }
    }
    throw new Error('Failed to update task status after trying to get new access token.');
  }
}
