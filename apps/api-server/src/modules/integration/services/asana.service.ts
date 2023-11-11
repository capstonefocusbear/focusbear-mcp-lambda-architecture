/* eslint-disable no-await-in-loop */
import { Injectable, UseGuards, Inject, forwardRef } from '@nestjs/common';
import axios from 'axios';
import { BaseIntegrationService } from './base.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { Project } from '../domain/project.model';
import { AsanaAuthService } from '../../auth/services/asana-auth.service';
import { Task } from '../domain/task.model';
import { Portal } from '../domain/portal.model';
import { ExternalTaskStatus } from '../../to-do/domain/external-task-status.model';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

const projectAdapter = (project) => {
  const { gid, name, notes } = project;
  return {
    id: gid,
    name,
    key: '',
    description: notes,
  };
};

const taskAdapter = ({ task, projectId, portalId }) => {
  const { gid, name, notes, memberships } = task;
  return {
    id: gid,
    name,
    description: notes,
    key: '',
    external_status: memberships[0].section.gid,
    external_metadata: { ...task, id: gid, project_id: projectId, portal_id: portalId },
  };
};

@Injectable()
@UseGuards(IsAuth)
export class AsanaService extends BaseIntegrationService {
  constructor(
    protected readonly userRepository: UserRepository,
    protected readonly focusModeTagRepository: FocusModeTagRepository,
    protected readonly toDoRepository: ToDoRepository,
    @Inject(forwardRef(() => AsanaAuthService))
    protected readonly asanaAuthService: AsanaAuthService,
    protected readonly platformIntegrationsService: PlatformIntegrationsService,
    protected readonly syncedProjectsRepository: SyncedProjectsRepository,
  ) {
    super(
      userRepository,
      focusModeTagRepository,
      toDoRepository,
      asanaAuthService,
      platformIntegrationsService,
      syncedProjectsRepository,
      IntegrationPlatforms.ASANA,
    );
  }

  private httpService = axios;

  private readonly base_url = 'https://app.asana.com/api/1.0/';

  protected async tryAddTimeEntry({ integrationRecord, taskId, timeEntry }): Promise<any> {
    const url = `${this.base_url}tasks/${taskId}/time_tracking_entries`;
    const headers = { Authorization: `Bearer ${integrationRecord.access_token}` };
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
  }

  protected async tryGetTasks({ integrationRecord, projectId, portalId }): Promise<Task[]> {
    const url = `${this.base_url}projects/${projectId}/tasks`;
    const headers = { Authorization: `Bearer ${integrationRecord.access_token}` };
    const fields = 'name,notes,memberships.section';
    const params = {
      opt_fields: fields,
    };

    const response = await this.httpService.get(url, {
      headers,
      params,
    });
    return (response.data?.data ?? []).map((task) => taskAdapter({ task, projectId, portalId }));
  }

  protected async tryGetProjects({ integrationRecord, portalId }): Promise<Project[]> {
    const url = `${this.base_url}projects`;
    const headers = { Authorization: `Bearer ${integrationRecord.access_token}` };
    const params = {
      workspace: portalId,
      opt_fields: 'name,notes',
    };
    const response = await this.httpService.get(url, {
      headers,
      params,
    });
    return response.data?.data.map((project) => projectAdapter(project));
  }

  protected async tryGetPortals({ integrationRecord }): Promise<Portal[]> {
    const url = `${this.base_url}workspaces`;
    const headers = {
      Authorization: `Bearer ${integrationRecord.access_token}`,
    };
    const response = await axios.get(url, { headers });
    return (response.data?.data ?? []).map((workspace) => ({ id: workspace.gid }));
  }

  protected async tryGetProject({ integrationRecord, projectId }): Promise<Project> {
    const url = `${this.base_url}projects/${projectId}`;
    const headers = { Authorization: `Bearer ${integrationRecord.access_token}` };
    const response = await this.httpService.get(url, {
      headers,
    });
    return projectAdapter(response.data?.data);
  }

  protected async tryGetTasksOwnedByUser({ integrationRecord, portalId, projectId }): Promise<Task[]> {
    const tasks = await this.tryGetTasks({ integrationRecord, projectId, portalId });
    return tasks;
  }

  protected async tryGetProjectStatuses({ integrationRecord, projectId }): Promise<ExternalTaskStatus[]> {
    const url = `${this.base_url}projects/${projectId}/sections`;
    const headers = { Authorization: `Bearer ${integrationRecord.access_token}` };
    const { data } = await this.httpService.get(url, {
      headers,
    });
    const availableStatuses = data.data?.map((details) => {
      return { label: details.name, status_id: details.gid, should_complete_task: false };
    });
    return availableStatuses;
  }

  protected async tryUpdateTaskStatus({ integrationRecord, taskId, statusId }): Promise<any> {
    const url = `${this.base_url}sections/${statusId}/addTask`;
    const headers = { Authorization: `Bearer ${integrationRecord.access_token}` };
    const formData = {
      data: {
        task: taskId,
      },
    };
    const response = await this.httpService.post(url, formData, {
      headers,
    });
    return response.data?.data;
  }
}
