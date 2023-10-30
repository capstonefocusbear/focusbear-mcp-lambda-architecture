/* eslint-disable no-await-in-loop */
import { BadRequestException, Injectable, UseGuards, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { IsNull, Not } from 'typeorm';
import { hhmmToSeconds, secondsTohhmm } from 'apps/api-server/src/shared/utils/helpers';
import { FIELD_NAME_TOTAL, FIELD_NAME_WORKLOG } from 'apps/api-server/src/shared/utils/constants';
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
import { Task } from '../domain/task.model';

@Injectable()
@UseGuards(IsAuth)
export class TrelloService implements BaseIntegrationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly focusModeTagRepository: FocusModeTagRepository,
    private readonly toDoRepository: ToDoRepository,
    private readonly platformIntegrationsService: PlatformIntegrationsService,
    private readonly syncedProjectsRepository: SyncedProjectsRepository,
  ) {}

  private httpService = axios;

  private readonly base_url = 'https://api.trello.com/1/';

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
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.TRELLO,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: trelloData } = platformIntegrationRecord;
      const headers = {
        Accept: 'application/json',
      };
      const params = {
        key: trelloData.client_id,
        token: trelloData.access_token,
      };

      const { worklog, total } = await this.findWorklogCustomField({ headers, params, projectId });
      await this.createOrAppendToWorklogToField({ headers, params, projectId, taskId, timeEntry, worklog, total });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new UnauthorizedException('Auth Failed');
      } else {
        throw new Error(`Failed to add Trello task time entry after trying to get new access token. ${error}`);
      }
    }
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTasks(userId: string, projectId: string, portalId: string): Promise<Task> {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.TRELLO,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: trelloData } = platformIntegrationRecord;
      const url = `${this.base_url}boards/${projectId}/cards`;
      const params = {
        key: trelloData.client_id,
        token: trelloData.access_token,
      };

      const response = await this.httpService.get(url, {
        params,
      });

      return response.data.map ?? [];
    } catch (e) {
      throw new BadRequestException(e.response?.data);
    }
  }

  async getProjects(userId: string, portalId: string): Promise<Project[]> {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.TRELLO,
        userId,
      );
      if (!platformIntegrationRecord) {
        throw new UnauthorizedException(`User with ID: ${userId} has not authenticated with Trello!`);
      }
      const { data: trelloData } = platformIntegrationRecord;
      const url = `${this.base_url}organizations/${portalId}/boards`;
      const params = {
        key: trelloData.client_id,
        token: trelloData.access_token,
      };
      const response = await this.httpService.get(url, {
        params,
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new UnauthorizedException('Auth Failed');
      } else {
        throw new Error('Failed to getProjects after trying to get new access token.');
      }
    }
  }

  async getPortals(userId: string): Promise<AxiosResponse<any>> {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.TRELLO,
        userId,
      );
      if (!platformIntegrationRecord) return;

      const { data: trelloData } = platformIntegrationRecord;
      const url = `${this.base_url}members/me/organizations`;
      const params = {
        key: trelloData.client_id,
        token: trelloData.access_token,
      };
      const response = await axios.get(url, {
        params,
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new UnauthorizedException('Auth Failed');
      } else {
        throw new Error('Failed to get portals.');
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
    const available_statuses = await this.getProjectStatuses(userId, projectId);
    const syncedProjects = await this.syncedProjectsRepository.orm.find({ where: { user_id: userId } });
    const syncedProjectsExternalIds = syncedProjects?.map((project) => project.external_project_id);
    const hasProjectBeenSynced = syncedProjectsExternalIds.includes(projectId);
    if (!hasProjectBeenSynced) {
      const newProject = new SyncedProject({
        user_id: userId,
        external_project_id: projectId,
        external_portal_id: portalId,
        available_statuses,
        platform: IntegrationPlatforms.TRELLO,
      });
      return this.syncedProjectsRepository.orm.save(newProject);
    }
    // if project has already been synced, update statuses
    const linkedProject = syncedProjects.find((syncedProject) => syncedProject.external_project_id === projectId);
    linkedProject.available_statuses = available_statuses;
    return this.syncedProjectsRepository.orm.save(linkedProject);
  }

  async getTrelloTasksToSync(trelloTasks: any[], userId: string) {
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
    const syncedTrelloTasks = syncedTasks.filter((task) => task.external_task_metadata.platform === 'trello');
    const syncedTrelloTasksIds = syncedTrelloTasks.map((task) => task.external_task_id);
    const tasksToSync = trelloTasks.filter((task) => !syncedTrelloTasksIds.includes(task.id));
    return { tasksToSync, syncedTrelloTasks };
  }

  async syncProjectAndChildTasks(userId: string, portalId: string, projectId: string) {
    const project = await this.getProject(userId, portalId, projectId);
    const tasksFromProject = await this.getTasksOwnedByUser(userId, portalId, projectId);
    const [projectAsFocusModeTag] = createNewTags([project], userId, IntegrationPlatforms.TRELLO);
    const syncedProject = await this.upsertSyncedProjectRecord(userId, portalId, projectId);
    const tasksAsToDos = tasksFromProject.map((task) => {
      return new ToDo({
        user_id: userId,
        title: task.name,
        status: task.idList,
        details: task.description,
        external_task_id: task.id,
        external_task_metadata: { platform: IntegrationPlatforms.TRELLO, task_data: task },
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
      IntegrationPlatforms.TRELLO,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: trelloData } = platformIntegrationRecord;
    const url = `${this.base_url}boards/${projectId}`;
    const params = {
      key: trelloData.client_id,
      token: trelloData.access_token,
    };
    const response = await this.httpService.get(url, {
      params,
    });
    return { ...response.data, portal_id: portalId };
  }

  async getAllUserTasks(userId: string): Promise<Task[]> {
    const syncedProjects = await this.syncedProjectsRepository.orm.find({
      where: { user_id: userId, platform: IntegrationPlatforms.TRELLO },
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTasksOwnedByUser(userId: string, portalId: string, projectId: string): Promise<any[]> {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.TRELLO,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: trelloData } = platformIntegrationRecord;
      const url = `${this.base_url}boards/${projectId}/cards`;
      const params = {
        key: trelloData.client_id,
        token: trelloData.access_token,
      };
      const response = await this.httpService.get(url, {
        params,
      });
      const tasks = response.data ?? [];
      const tasksWithPortalIds = tasks.map((task) => {
        return { ...task, portal_id: portalId, project_id: projectId };
      });
      return tasksWithPortalIds;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new UnauthorizedException('Auth Failed');
      } else {
        throw new Error(`${error} Failed to getTasksOwnedByUser after trying to get new access token.`);
      }
    }
  }

  async getProjectStatuses(userId: string, projectId: string) {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.TRELLO,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: trelloData } = platformIntegrationRecord;
    const url = `${this.base_url}boards/${projectId}/lists`;
    const params = {
      key: trelloData.client_id,
      token: trelloData.access_token,
    };
    const { data } = await this.httpService.get(url, {
      params,
    });
    const availableStatuses = data?.map((details) => {
      return { label: details.name, status_id: details.id, should_complete_task: false };
    });
    return availableStatuses;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateTaskStatus(userId: string, portalId: string, projectId: string, taskId: string, statusId: string) {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.TRELLO,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: trelloData } = platformIntegrationRecord;

      const url = `${this.base_url}cards/${taskId}/idList`;
      const params = {
        key: trelloData.client_id,
        token: trelloData.access_token,
        value: statusId,
      };
      const response = await this.httpService.post(url, null, {
        params,
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new UnauthorizedException('Auth Failed');
      } else {
        throw new Error('Failed to update Trello task status after trying to get new access token.');
      }
    }
  }
}
