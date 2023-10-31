/* eslint-disable no-await-in-loop */
import { Inject, forwardRef } from '@nestjs/common';
import axios from 'axios';
import { BaseIntegrationService } from './base.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { Project } from '../domain/project.model';
import { Task } from '../domain/task.model';
import { Portal } from '../domain/portal.model';
import { ExternalTaskStatus } from '../../to-do/domain/external-task-status.model';
import { JiraAuthService } from '../../auth/services/jira-auth.service';

export class JiraService extends BaseIntegrationService {
  constructor(
    protected readonly userRepository: UserRepository,
    protected readonly focusModeTagRepository: FocusModeTagRepository,
    protected readonly toDoRepository: ToDoRepository,
    @Inject(forwardRef(() => JiraAuthService))
    protected readonly integrationAuthService: JiraAuthService,
    protected readonly platformIntegrationsService: PlatformIntegrationsService,
    protected readonly syncedProjectsRepository: SyncedProjectsRepository,
  ) {
    super(
      userRepository,
      focusModeTagRepository,
      toDoRepository,
      integrationAuthService,
      platformIntegrationsService,
      syncedProjectsRepository,
      IntegrationPlatforms.JIRA,
    );
  }

  private httpService = axios;

  private readonly base_url = 'https://api.atlassian.com/ex/jira/';

  protected async tryAddTimeEntry({ accessToken, portalId, taskId, timeEntry }): Promise<any> {
    const url = `${this.base_url}${portalId}/rest/api/3/issue/${taskId}/worklog`;
    const headers = { Authorization: `Bearer ${accessToken}` };

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
  }

  protected async tryGetTasks({ accessToken, projectId, portalId }): Promise<Task[]> {
    const url = `${this.base_url}${portalId}/rest/api/3/search`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const params = {
      jql: `project=${projectId}`,
      fields: 'status, description, summary',
    };

    const response = await this.httpService.get(url, {
      headers,
      params,
    });

    const issues = response.data?.issues ?? [];
    return issues.map((issue) => {
      const { id, key, fields } = issue;
      const { summary, status, description } = fields;
      return {
        id,
        name: summary,
        key,
        description: description?.type ?? '',
        project_id: projectId,
        portal_id: portalId,
        status: status.id,
        external_metadata: { ...issue, portal_id: portalId, project_id: projectId },
      } as Task;
    });
  }

  protected async tryGetProjects({ accessToken, portalId }): Promise<Project[]> {
    const url = `${this.base_url}${portalId}/rest/api/3/project`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const response = await this.httpService.get(url, {
      headers,
    });

    const projects = response.data ?? [];
    return projects.map((project) => {
      const { id, key, name } = project;
      return {
        id,
        key,
        name,
        description: '',
        portal_id: portalId,
      } as Project;
    });
  }

  protected async tryGetPortals({ accessToken }): Promise<Portal[]> {
    const url = 'https://api.atlassian.com/oauth/token/accessible-resources';
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'appication/json',
    };
    const response = await this.httpService.get(url, { headers });

    const portals = response.data ?? [];
    return portals.map((portal) => ({ id: portal.id }));
  }

  protected async tryGetProject({ accessToken, portalId, projectId }): Promise<Project> {
    const url = `${this.base_url}${portalId}/rest/api/3/project/${projectId}`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const response = await this.httpService.get(url, {
      headers,
    });

    const project = response.data;
    if (!project) {
      return null;
    }
    const { id, key, name } = project;

    return {
      id,
      key,
      name,
      description: '',
      portal_id: portalId,
    } as Project;
  }

  protected async tryGetTasksOwnedByUser({ accessToken, portalId, projectId }): Promise<Task[]> {
    const tasks = await this.tryGetTasks({ accessToken, portalId, projectId });
    return tasks;
  }

  protected async tryGetProjectStatuses({ accessToken, projectId, portalId }): Promise<ExternalTaskStatus[]> {
    const url = `${this.base_url}${portalId}/rest/api/3/project/${projectId}/statuses`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const { data } = await this.httpService.get(url, {
      headers,
    });

    const statuses = data[0].statuses ?? [];
    const availableStatuses = statuses.map((status: any) => {
      return {
        label: status.name,
        status_id: status.id,
        should_complete_task: false,
      } as ExternalTaskStatus;
    });
    return availableStatuses;
  }

  protected async tryUpdateTaskStatus({ accessToken, portalId, taskId, statusId }): Promise<any> {
    const url = `${this.base_url}${portalId}/rest/api/3/issue/${taskId}/transitions`;
    const headers = { Authorization: `Bearer ${accessToken}` };

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
  }
}
