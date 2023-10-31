/* eslint-disable no-await-in-loop */
import { Inject, forwardRef } from '@nestjs/common';
import axios from 'axios';
import { BaseIntegrationService } from './base.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { Project } from '../domain/project.model';
import { Task } from '../domain/task.model';
import { Portal } from '../domain/portal.model';
import { ClickupAuthService } from '../../auth/services/clickup-auth.service';
import { ExternalTaskStatus } from '../../to-do/domain/external-task-status.model';

export class ClickupService extends BaseIntegrationService {
  constructor(
    protected readonly userRepository: UserRepository,
    protected readonly focusModeTagRepository: FocusModeTagRepository,
    protected readonly toDoRepository: ToDoRepository,
    @Inject(forwardRef(() => ClickupAuthService))
    protected readonly integrationAuthService: ClickupAuthService,
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
      IntegrationPlatforms.CLICK_UP,
    );
  }

  private httpService = axios;

  private readonly base_url = 'https://api.clickup.com/api/v2/';

  async getUser(userId: string): Promise<User> {
    return this.userRepository.orm.findOneBy({ id: userId });
  }

  protected async tryAddTimeEntry({ accessToken, portalId, taskId, timeEntry }): Promise<any> {
    const url = `${this.base_url}team/${portalId}/time_entries`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: accessToken,
    };
    const timestamp = new Date(timeEntry.date).getTime() / 1000;
    const data = {
      duration: timeEntry.seconds * 1000,
      tid: taskId,
      start: timestamp,
    };
    const response = await this.httpService.post(url, JSON.stringify(data), {
      headers,
    });
    return response.data;
  }

  protected async tryGetTasks({ accessToken, projectId, portalId }): Promise<Task[]> {
    const url = `${this.base_url}list/${projectId}/task`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: accessToken,
    };

    const response = await this.httpService.get(url, {
      headers,
    });

    return (response.data?.tasks ?? []).map((task) => {
      const { id, name, status } = task;
      return {
        id,
        name,
        key: name,
        description: '',
        status: status.status,
        external_metadata: { ...task, portal_id: portalId, project_id: projectId },
      } as Task;
    });
  }

  protected async tryGetProjects({ accessToken, portalId }): Promise<Project[]> {
    const url = `${this.base_url}team/${portalId}/list`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const response = await this.httpService.get(url, {
      headers,
    });

    return (response.data?.lists ?? []).map((list) => {
      const { id, name } = list;
      return {
        id,
        name,
        key: name,
        description: '',
        portal_id: portalId,
      } as Project;
    });
  }

  protected async tryGetProject({ accessToken, portalId, projectId }): Promise<Project> {
    const url = `${this.base_url}list/${projectId}`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const response = await this.httpService.get(url, {
      headers,
    });
    const { id, name } = response.data;
    return { id, name, key: name, description: '', portal_id: portalId };
  }

  protected async tryGetPortals({ accessToken }): Promise<Portal[]> {
    const url = `${this.base_url}team`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };
    const response = await axios.get(url, {
      headers,
    });
    return response.data.teams.map((team) => ({
      id: team.id,
    }));
  }

  protected async tryGetTasksOwnedByUser({ accessToken, projectId, portalId }): Promise<Task[]> {
    const tasks = await this.tryGetTasks({ accessToken, projectId, portalId });
    return tasks;
  }

  protected async tryGetProjectStatuses({ accessToken, projectId }): Promise<ExternalTaskStatus[]> {
    const url = `${this.base_url}list/${projectId}`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const response = await this.httpService.get(url, {
      headers,
    });
    const availableStatuses = response.data?.statuses.map((details) => {
      return { label: details.status, status_id: details.status, should_complete_task: false };
    });

    return availableStatuses;
  }

  protected async tryUpdateTaskStatus({ accessToken, taskId, statusId }): Promise<any> {
    const url = `${this.base_url}task/${taskId}`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };
    const formData = {
      list_id: statusId,
    };
    const response = await this.httpService.put(url, formData, {
      headers,
    });
    return response.data;
  }
}
