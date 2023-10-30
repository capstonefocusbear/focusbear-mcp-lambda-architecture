/* eslint-disable no-await-in-loop */
import { BadRequestException, Injectable, UseGuards, Inject, forwardRef, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
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
import { JiraAuthService } from '../../auth/services/jira-auth.service';
import { Task } from '../domain/task.model';

@Injectable()
@UseGuards(IsAuth)
export class JiraService implements BaseIntegrationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly focusModeTagRepository: FocusModeTagRepository,
    private readonly toDoRepository: ToDoRepository,
    @Inject(forwardRef(() => JiraAuthService))
    private readonly jiraAuthService: JiraAuthService,
    private readonly platformIntegrationsService: PlatformIntegrationsService,
    private readonly syncedProjectsRepository: SyncedProjectsRepository,
  ) {}

  private httpService = axios;

  private readonly base_url = 'https://api.atlassian.com/ex/jira/';

  async getUser(userId: string): Promise<User> {
    return this.userRepository.orm.findOneBy({ id: userId });
  }

  async addTimeEntry(
    userId: string,
    portalId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    projectId: string,
    taskId: string,
    timeEntry: any,
  ): Promise<AxiosResponse<any>> {
    const MAX_RETRY = 2;
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
          IntegrationPlatforms.JIRA,
          userId,
        );
        if (!platformIntegrationRecord) return;
        const { data: jiraData } = platformIntegrationRecord;
        const url = `${this.base_url}${portalId}/rest/api/3/issue/${taskId}/worklog`;
        const headers = { Authorization: `Bearer ${jiraData.access_token}` };

        const data = {
          version: 1,
          type: 'doc',
          timeSpentSeconds: timeEntry.seconds,
          content: [
            {
              content: [
                {
                  text: timeEntry.note,
                  type: 'text',
                },
              ],
              type: 'paragraph',
            },
          ],
        };

        const response = await this.httpService.post(url, data, {
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });
        return response.data;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.jiraAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          throw error;
        }
      }
    }
    throw new Error('Failed to add Jira task time entry after trying to get new access token.');
  }

  async getTasks(userId: string, projectId: string, portalId: string): Promise<Task[]> {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.JIRA,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: jiraData } = platformIntegrationRecord;
      const url = `${this.base_url}${portalId}/rest/api/3/search`;
      const headers = { Authorization: `Bearer ${jiraData.access_token}` };
      const params = {
        jql: `project=${projectId}`,
        fields: 'creator, status, project, priority, summary',
      };

      const response = await this.httpService.get(url, {
        headers,
        params,
      });

      return response.data?.issues ?? [];
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
          IntegrationPlatforms.JIRA,
          userId,
        );
        if (!platformIntegrationRecord) {
          throw new UnauthorizedException(`User with ID: ${userId} has not authenticated with Jira!`);
        }
        const { data: jiraData } = platformIntegrationRecord;
        const url = `${this.base_url}${portalId}/rest/api/3/project`;
        const headers = { Authorization: `Bearer ${jiraData.access_token}` };
        const response = await this.httpService.get(url, {
          headers,
        });
        return response.data;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.jiraAuthService.handleUnauthorizedError(userId, retryCount);
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
          IntegrationPlatforms.JIRA,
          userId,
        );
        if (!platformIntegrationRecord) return;
        const { data: jiraData } = platformIntegrationRecord;
        const url = 'https://api.atlassian.com/oauth/token/accessible-resources';
        const headers = {
          Authorization: `Bearer ${jiraData.access_token}`,
          Accept: 'appication/json',
        };
        const response = await axios.get(url, { headers });
        return response.data;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.jiraAuthService.handleUnauthorizedError(userId, retryCount);
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
    const portals: any = await this.getPortals(userId);
    const userSyncedProjects = await this.syncedProjectsRepository.orm.find({ where: { user_id: userId } });
    const userSyncedProjectsExternalIds = userSyncedProjects.map((syncedProject) => syncedProject.external_project_id);
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
        if (isSynced) {
          const linkedSyncedProject = userSyncedProjects.find(
            (syncedProject) => syncedProject.external_project_id === project.id,
          );
          externalStatuses = linkedSyncedProject.available_statuses;
        }
        const projectData = {
          name: project.name,
          project_id: project.id,
          portal_id: portal.id,
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
    const syncedProjectsExternalIds = syncedProjects.map((project) => project.external_project_id);
    const hasProjectBeenSynced = syncedProjectsExternalIds.includes(projectId);
    if (!hasProjectBeenSynced) {
      const newProject = new SyncedProject({
        user_id: userId,
        external_project_id: projectId,
        external_portal_id: portalId,
        available_statuses,
        platform: IntegrationPlatforms.JIRA,
      });
      return this.syncedProjectsRepository.orm.save(newProject);
    }
    // if project has already been synced, update statuses
    const linkedProject = syncedProjects.find((syncedProject) => syncedProject.external_project_id === projectId);
    linkedProject.available_statuses = available_statuses;
    return this.syncedProjectsRepository.orm.save(linkedProject);
  }

  async syncProjectAndChildTasks(userId: string, portalId: string, projectId: string) {
    const project = await this.getProject(userId, portalId, projectId);
    const tasksFromProject = await this.getTasksOwnedByUser(userId, portalId, projectId);
    const [projectAsFocusModeTag] = createNewTags([project], userId, IntegrationPlatforms.JIRA);
    const syncedProject = await this.upsertSyncedProjectRecord(userId, portalId, project.id);
    const tasksAsToDos = tasksFromProject.map((task) => {
      return new ToDo({
        user_id: userId,
        title: task.fields.summary,
        details: task.fields.description?.type,
        status: task.fields.status.id,
        external_task_id: task.id,
        external_task_metadata: { platform: IntegrationPlatforms.JIRA, task_data: task },
        synced_project_id: syncedProject.id,
        tags: [...(projectAsFocusModeTag ? [projectAsFocusModeTag] : [])],
      });
    });
    // Save new projects and tasks
    await this.toDoRepository.orm.save(tasksAsToDos);
    await this.focusModeTagRepository.orm.save(projectAsFocusModeTag);
  }

  async getProject(userId: string, portalId: string, projectId: string): Promise<Project> {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.JIRA,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: jiraData } = platformIntegrationRecord;
    const url = `${this.base_url}${portalId}/rest/api/3/project/${projectId}`;
    const headers = { Authorization: `Bearer ${jiraData.access_token}` };
    const response = await this.httpService.get(url, {
      headers,
    });
    return response.data;
  }

  async getAllUserTasks(userId: string): Promise<Task[]> {
    const syncedProjects = await this.syncedProjectsRepository.orm.find({
      where: { user_id: userId, platform: IntegrationPlatforms.JIRA },
    });
    const tasks = [];
    for await (const project of syncedProjects) {
      const projectTasks = await this.getTasksOwnedByUser(userId, project.external_portal_id, project.id);
      for (const task of projectTasks) {
        task.portal_id = project.external_portal_id;
        tasks.push(task);
      }
    }
    return tasks;
  }

  async getTasksOwnedByUser(userId: string, portalId: string, projectId: string): Promise<any[]> {
    const MAX_RETRY = 2;
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
          IntegrationPlatforms.JIRA,
          userId,
        );
        if (!platformIntegrationRecord) return;
        const { data: jiraData } = platformIntegrationRecord;
        const url = `${this.base_url}${portalId}/rest/api/3/search?jql=project=${projectId}&accountId=${jiraData.user_id}`;
        const headers = { Authorization: `Bearer ${jiraData.access_token}` };
        const response = await this.httpService.get(url, {
          headers,
        });
        const tasks = response.data?.issues ?? [];
        const tasksWithPortalIds = tasks.map((task) => {
          return { ...task, project_id: projectId, portal_id: portalId };
        });
        return tasksWithPortalIds;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.jiraAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          throw error;
        }
      }
    }
  }

  async getProjectStatuses(userId: string, projectId: string, portalId: string) {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.JIRA,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: jiraData } = platformIntegrationRecord;
    const url = `${this.base_url}${portalId}/rest/api/3/project/${projectId}/statuses`;
    const headers = { Authorization: `Bearer ${jiraData.access_token}` };
    const { data } = await this.httpService.get(url, {
      headers,
    });

    const statuses = data[0].statuses ?? [];
    const availableStatuses = statuses.map((status: any) => {
      return {
        label: status.name,
        status_id: status.id,
        should_complete_task: false,
      };
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
          IntegrationPlatforms.JIRA,
          userId,
        );
        if (!platformIntegrationRecord) return;
        const { data: jiraData } = platformIntegrationRecord;

        const url = `${this.base_url}${portalId}/rest/api/3/issue/${taskId}/transitions`;
        const headers = { Authorization: `Bearer ${jiraData.access_token}` };

        const { transitions } = (await this.httpService.get(url, { headers })).data;
        const transition = transitions.find((item: any) => item.to.id === statusId);

        const formData = {
          transition: {
            id: transition.id,
          },
        };
        const response = await this.httpService.post(url, formData, {
          headers,
        });
        return response.data;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.jiraAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          throw error;
        }
      }
    }
    throw new Error('Failed to update task status after trying to get new access token.');
  }
}
