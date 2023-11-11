import { Inject, forwardRef } from '@nestjs/common';
import axios from 'axios';
import { hhmmToSeconds, secondsTohhmm } from '../../../shared/utils/helpers';
import { FIELD_NAME_TOTAL, FIELD_NAME_WORKLOG } from '../../../shared/utils/constants';
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
import { MondayAuthService } from '../../auth/services/monday-auth.service';
import { ExternalTaskStatus } from '../../to-do/domain/external-task-status.model';

const taskAdapter = ({ task, projectId, portalId }) => {
  const { id, name, group } = task;
  return {
    id,
    name,
    key: '',
    description: '',
    external_status: group.id,
    external_metadata: { ...task, project_id: projectId, portal_id: portalId },
  };
};

const projectAdapter = (project) => {
  const { id, name } = project;
  return {
    id,
    name,
    key: '',
    description: '',
  };
};

export class MondayService extends BaseIntegrationService {
  constructor(
    protected readonly userRepository: UserRepository,
    protected readonly focusModeTagRepository: FocusModeTagRepository,
    protected readonly toDoRepository: ToDoRepository,
    @Inject(forwardRef(() => MondayAuthService))
    protected readonly integrationAuthService: MondayAuthService,
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
      IntegrationPlatforms.MONDAY,
    );
  }

  private httpService = axios;

  private readonly base_url = 'https://api.monday.com/v2';

  protected async tryAddTimeEntry({ integrationRecord, projectId, taskId, timeEntry }): Promise<any> {
    const headers = {
      Authorization: `Bearer ${integrationRecord.access_token}`,
      'Content-Type': 'application/json',
    };

    const columns = await this.findOrCreateWorklogColumn({ headers, projectId });
    const id = await this.appendWorklogToColumn({ headers, projectId, taskId, columns, timeEntry });
    return id;
  }

  private async appendWorklogToColumn({ headers, projectId, taskId, columns, timeEntry }) {
    const itemQuery = `query {
      items (ids: ${taskId}) {
        column_values {
          id
          value
        }
      }
    }`;
    const { worklog, total } = columns;
    const { column_values: columnValues } = (
      await this.httpService.post(this.base_url, { query: itemQuery }, { headers })
    ).data.data.items[0];
    const { value: worklogValue } = columnValues.find((one) => one.id === worklog.id);
    const { value: totalValue } = columnValues.find((one) => one.id === total.id);
    const updatedWorklogValue = this.getUpdatedWorklog(JSON.parse(worklogValue)?.text, timeEntry);
    const updatedTotalValue = this.getUpdatedTotal(JSON.parse(totalValue)?.text, timeEntry);
    const query = `
      mutation {
        change_worklog: change_simple_column_value (board_id: ${projectId}, item_id: ${taskId}, column_id: ${worklog.id}, value: "${updatedWorklogValue}") {
          id
        },
        change_total: change_simple_column_value (board_id: ${projectId}, item_id: ${taskId}, column_id: ${total.id}, value: "${updatedTotalValue}") {
          id
        }
      }
    `;

    const response = await this.httpService.post(this.base_url, { query }, { headers });
    return response.data.data;
  }

  private getUpdatedWorklog(current, timeEntry) {
    return `${current ?? ''}${!current ? '' : ' '}${timeEntry.note ?? ''}: ${secondsTohhmm(timeEntry.seconds)}`;
  }

  private getUpdatedTotal(current, timeEntry) {
    if (!current) {
      return secondsTohhmm(timeEntry.seconds);
    }

    return secondsTohhmm(hhmmToSeconds(current) + timeEntry.seconds);
  }

  private async findOrCreateWorklogColumn({ headers, projectId }) {
    const columnsQuery = `query {
      boards (ids: ${projectId}) {
        columns {
          id
          title
        }
      }
    }`;
    const { columns } = (await this.httpService.post(this.base_url, { query: columnsQuery }, { headers })).data.data
      .boards[0];
    const worklog = columns.find((one: any) => one.title === FIELD_NAME_WORKLOG);
    const total = columns.find((one: any) => one.title === FIELD_NAME_TOTAL);
    if (worklog && total) {
      return { worklog, total };
    }

    const addColumnQuery = `mutation {
      create_worklog: create_column(
        board_id: ${projectId}
        title: "Worklog"
        column_type: long_text
      ) {
        id,
        title
      }
      create_total: create_column(
        board_id: ${projectId}
        title: "Total"
        column_type: long_text
      ) {
        id,
        title
      }
    }`;

    const { create_worklog, create_total } = (
      await this.httpService.post(this.base_url, { query: addColumnQuery }, { headers })
    ).data.data;
    return { worklog: create_worklog, total: create_total };
  }

  protected async tryGetTasks({ integrationRecord, projectId, portalId }): Promise<Task[]> {
    const query = `query { boards(ids: ${projectId}) {items { id name group { id } }}}`;
    const headers = { Authorization: `Bearer ${integrationRecord.access_token}` };
    const response = await this.httpService.post(
      this.base_url,
      { query },
      {
        headers,
      },
    );
    return (response.data.data.boards[0]?.items ?? []).map((task) => taskAdapter({ task, projectId, portalId }));
  }

  protected async tryGetProjects({ integrationRecord, portalId }): Promise<Project[]> {
    const headers = { Authorization: `Bearer ${integrationRecord.access_token}` };
    const query = `query { boards ( workspace_ids: ${portalId} ) {name state id permissions }}`;
    const response = await this.httpService.post(
      this.base_url,
      { query },
      {
        headers,
      },
    );
    return response.data.data.boards.map((board) => projectAdapter(board));
  }

  protected async tryGetPortals({ integrationRecord }): Promise<Portal[]> {
    const headers = {
      Authorization: `Bearer ${integrationRecord.access_token}`,
      'Content-Type': 'application/json',
    };
    const query = 'query {workspaces{id name kind description state }}';

    const response = await this.httpService.post(
      this.base_url,
      { query },
      {
        headers,
      },
    );
    return response.data.data.workspaces.map((w) => ({ id: w.id }));
  }

  protected async tryGetProject({ integrationRecord, portalId, projectId }): Promise<Project> {
    const headers = { Authorization: `Bearer ${integrationRecord.access_token}` };
    const query = `query { boards ( workspace_ids: ${portalId} ids: ${projectId}) {name state id permissions}}`;
    const response = await this.httpService.post(
      this.base_url,
      { query },
      {
        headers,
      },
    );
    return projectAdapter(response.data.data.boards[0]);
  }

  protected async tryGetTasksOwnedByUser({ integrationRecord, projectId, portalId }): Promise<Task[]> {
    const tasks = this.tryGetTasks({ integrationRecord, projectId, portalId });
    return tasks;
  }

  protected async tryGetProjectStatuses({ integrationRecord, projectId }): Promise<ExternalTaskStatus[]> {
    const query = `query { boards (ids: ${parseInt(projectId, 10)}) { groups { title id }}}`;
    const headers = { Authorization: `Bearer ${integrationRecord.access_token}` };
    const response = await this.httpService.post(
      this.base_url,
      { query },
      {
        headers,
      },
    );
    const availableStatuses = response.data?.data.boards[0]?.groups.map((details) => {
      return { label: details.title, status_id: details.id, should_complete_task: false };
    });
    return availableStatuses;
  }

  protected async tryUpdateTaskStatus({ integrationRecord, taskId, statusId }): Promise<any> {
    const query = `mutation  { move_item_to_group ( item_id: ${taskId}, group_id: ${statusId}) { id }  }`;
    const headers = { Authorization: `Bearer ${integrationRecord.access_token}` };
    const response = await this.httpService.post(
      this.base_url,
      { query },
      {
        headers,
      },
    );
    return response.data.data;
  }
}
