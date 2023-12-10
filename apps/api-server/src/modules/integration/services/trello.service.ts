/* eslint-disable no-await-in-loop */
import { Injectable, UseGuards, Inject, forwardRef } from '@nestjs/common';
import axios from 'axios';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { hhmmToSeconds, secondsTohhmm } from '../../../shared/utils/helpers';
import { FIELD_NAME_TOTAL, FIELD_NAME_WORKLOG } from '../../../shared/utils/constants';
import { BaseIntegrationService } from './base.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { Project } from '../domain/project.model';
import { Task } from '../domain/task.model';
import { Portal } from '../domain/portal.model';
import { TrelloAuthService } from '../../auth/services/trello-auth.service';
import { ExternalTaskStatus } from '../../to-do/domain/external-task-status.model';

const taskAdapter = ({ task, projectId, portalId }) => {
  const { id, name, desc, idList } = task;
  return {
    id,
    name,
    key: '',
    description: desc,
    external_status: idList,
    external_metadata: { ...task, project_id: projectId, portal_id: portalId },
  };
};

const projectAdapter = (project) => {
  const { id, name, desc } = project;
  return {
    id,
    name,
    key: '',
    description: desc,
  };
};

@Injectable()
@UseGuards(IsAuth)
export class TrelloService extends BaseIntegrationService {
  constructor(
    protected readonly userRepository: UserRepository,
    protected readonly focusModeTagRepository: FocusModeTagRepository,
    protected readonly toDoRepository: ToDoRepository,
    @Inject(forwardRef(() => TrelloAuthService))
    protected readonly integrationAuthService: TrelloAuthService,
    protected readonly platformIntegrationsService: PlatformIntegrationsService,
    protected readonly syncedProjectsRepository: SyncedProjectsRepository,
    @InjectQueue('sync-tasks') public syncTasksQueue: Queue,
  ) {
    super(
      userRepository,
      focusModeTagRepository,
      toDoRepository,
      integrationAuthService,
      platformIntegrationsService,
      syncedProjectsRepository,
      IntegrationPlatforms.TRELLO,
      syncTasksQueue,
    );
  }

  private httpService = axios;

  private readonly base_url = 'https://api.trello.com/1/';

  protected async tryAddTimeEntry({ integrationRecord, projectId, taskId, timeEntry }): Promise<any> {
    const headers = {
      Accept: 'application/json',
    };
    const params = {
      key: integrationRecord.client_id,
      token: integrationRecord.access_token,
    };

    const { worklog, total } = await this.findWorklogCustomField({ headers, params, projectId });
    await this.createOrAppendToWorklogToField({ headers, params, projectId, taskId, timeEntry, worklog, total });
  }

  private async findWorklogCustomField({ headers, params, projectId }) {
    const url = `${this.base_url}boards/${projectId}/customFields`;
    const customFields = (
      await this.httpService.get(url, {
        headers,
        params,
      })
    ).data;

    const worklog = customFields.find((field) => field.name === FIELD_NAME_WORKLOG);
    const total = customFields.find((field) => field.name === FIELD_NAME_TOTAL);

    return { worklog, total };
  }

  private async createOrAppendToWorklogToField({ headers, params, projectId, taskId, timeEntry, worklog, total }) {
    let existingWorklog = worklog;
    let existingTotal = total;
    let worklogValue = '';
    let totalValue = '';
    if (!worklog || !total) {
      existingWorklog = await this.createCustomField({ headers, params, projectId, name: FIELD_NAME_WORKLOG });
      existingTotal = await this.createCustomField({ headers, params, projectId, name: FIELD_NAME_TOTAL });
    } else {
      const values = await this.getCustomFieldValues({ headers, params, taskId });
      worklogValue = values.find((one) => one.idCustomField === worklog.id).value.text;
      totalValue = values.find((one) => one.idCustomField === total.id).value.text;
    }
    worklogValue = this.getUpdatedWorklog(worklogValue, timeEntry);
    totalValue = this.getUpdatedTotal(totalValue, timeEntry);

    await this.updateCustomFields({
      headers,
      params,
      taskId,
      worklog: {
        id: existingWorklog.id,
        value: worklogValue,
      },
      total: {
        id: existingTotal.id,
        value: totalValue,
      },
    });
  }

  private async updateCustomFields({ headers, params, taskId, worklog, total }) {
    const updateUrl = `${this.base_url}cards/${taskId}/customFields`;
    const body = {
      customFieldItems: [
        {
          idCustomField: worklog.id,
          value: {
            text: worklog.value,
          },
        },
        {
          idCustomField: total.id,
          value: {
            text: total.value,
          },
        },
      ],
    };

    await this.httpService.put(updateUrl, body, {
      headers,
      params,
    });
  }

  private async createCustomField({ headers, params, projectId, name }) {
    const body = {
      idModel: projectId,
      modelType: 'board',
      name,
      type: 'text',
      pos: 'top',
      display_cardFront: true,
    };
    const url = `${this.base_url}customFields`;
    return (
      await this.httpService.post(url, body, {
        headers,
        params,
      })
    ).data;
  }

  private async getCustomFieldValues({ headers, params, taskId }) {
    const url = `${this.base_url}cards/${taskId}/customFieldItems`;
    return (
      await this.httpService.get(url, {
        headers,
        params,
      })
    ).data;
  }

  private getUpdatedWorklog(current, timeEntry) {
    return `${current}${!current ? '' : ' '}${timeEntry.note ?? ''}: ${secondsTohhmm(timeEntry.seconds)}`;
  }

  private getUpdatedTotal(current, timeEntry) {
    if (current === '') {
      return secondsTohhmm(timeEntry.seconds);
    }

    return secondsTohhmm(hhmmToSeconds(current) + timeEntry.seconds);
  }

  protected async tryGetTasks({ integrationRecord, projectId, portalId }): Promise<Task[]> {
    const url = `${this.base_url}boards/${projectId}/cards`;
    const params = {
      key: integrationRecord.client_id,
      token: integrationRecord.access_token,
    };

    const response = await this.httpService.get(url, {
      params,
    });
    return (response.data ?? []).map((task) => taskAdapter({ task, projectId, portalId }));
  }

  protected async tryGetProjects({ integrationRecord, portalId }): Promise<Project[]> {
    const url = `${this.base_url}organizations/${portalId}/boards`;
    const params = {
      key: integrationRecord.client_id,
      token: integrationRecord.access_token,
    };
    const response = await this.httpService.get(url, {
      params,
    });
    return (response.data ?? []).map((board) => projectAdapter(board));
  }

  protected async tryGetPortals({ integrationRecord }): Promise<Portal[]> {
    const url = `${this.base_url}members/me/organizations`;
    const params = {
      key: integrationRecord.client_id,
      token: integrationRecord.access_token,
    };
    const response = await axios.get(url, {
      params,
    });
    return response.data;
  }

  protected async tryGetProject({ integrationRecord, projectId }): Promise<Project> {
    const url = `${this.base_url}boards/${projectId}`;
    const params = {
      key: integrationRecord.client_id,
      token: integrationRecord.access_token,
    };
    const response = await this.httpService.get(url, {
      params,
    });

    return projectAdapter(response.data);
  }

  protected async tryGetTasksOwnedByUser({ integrationRecord, projectId, portalId }): Promise<Task[]> {
    const tasks = await this.tryGetTasks({ integrationRecord, projectId, portalId });
    return tasks;
  }

  protected async tryGetProjectStatuses({ integrationRecord, projectId }): Promise<ExternalTaskStatus[]> {
    const url = `${this.base_url}boards/${projectId}/lists`;
    const params = {
      key: integrationRecord.client_id,
      token: integrationRecord.access_token,
    };
    const { data } = await this.httpService.get(url, {
      params,
    });
    const availableStatuses = data?.map((details) => {
      return { label: details.name, status_id: details.id, should_complete_task: false };
    });
    return availableStatuses;
  }

  protected async tryUpdateTaskStatus({ integrationRecord, taskId, statusId }): Promise<any> {
    const url = `${this.base_url}cards/${taskId}`;
    const params = {
      key: integrationRecord.client_id,
      token: integrationRecord.access_token,
      idList: statusId,
    };
    const response = await this.httpService.put(url, null, {
      params,
    });
    return response.data;
  }
}
