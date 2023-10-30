import { BadRequestException, Injectable, UseGuards, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { IsNull, Not } from 'typeorm';
import { hhmmToSeconds, secondsTohhmm } from 'apps/api-server/src/shared/utils/helpers';
import { BaseIntegrationService } from './base.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { SyncedProject } from '../../to-do/entities/synced-project.entity';
import { Project } from '../domain/project.model';
import { UserProject } from '../dto/user-project.dto';
import { createNewTags } from '../../../../../../cron-jobs/integration-cron-job/helpers';
import { ToDo } from '../../to-do/entities/to-do.entity';
import { Task } from '../domain/task.model';

@Injectable()
@UseGuards(IsAuth)
export class MondayService implements BaseIntegrationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly focusModeTagRepository: FocusModeTagRepository,
    private readonly toDoRepository: ToDoRepository,
    private readonly platformIntegrationsService: PlatformIntegrationsService,
    private readonly syncedProjectsRepository: SyncedProjectsRepository,
  ) {}

  private httpService = axios;

  private readonly base_url = 'https://api.monday.com/v2';

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
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.MONDAY,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: mondayData } = platformIntegrationRecord;
      const headers = {
        Authorization: mondayData.access_token,
        'Content-Type': 'application/json',
      };

      const columns = await this.findOrCreateWorklogColumn({ headers, projectId });
      const id = await this.appendWorklogToColumn({ headers, projectId, taskId, columns, timeEntry });
      return id;
    } catch (error) {
      throw new Error('Failed to add monday task time entry after trying to get new access token.');
    }
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
    const worklog = columns.find((one: any) => one.title === 'Worklog');
    const total = columns.find((one: any) => one.title === 'Total');
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTasks(userId: string, projectId: string, portalId: string): Promise<Task[]> {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.MONDAY,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: mondayData } = platformIntegrationRecord;
      const query = `query {boards(ids: ${projectId}) {items {id name }}}`;
      const headers = { Authorization: `Bearer ${mondayData.access_token}` };
      const response = await this.httpService.post(
        this.base_url,
        { query },
        {
          headers,
        },
      );
      return response.data ?? [];
    } catch (e) {
      throw new BadRequestException(e.response?.data);
    }
  }

  async getProjects(userId: string, portalId: string): Promise<Project[]> {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.MONDAY,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data } = platformIntegrationRecord;

    const headers = { Authorization: `Bearer ${data.access_token}` };
    const query = `query { boards ( workspace_ids: ${portalId} ) {name state id permissions }}`;
    const response = await this.httpService.post(
      this.base_url,
      { query },
      {
        headers,
      },
    );

    return response.data.data.boards;
  }

  async getPortals(userId: string): Promise<AxiosResponse<any>> {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.MONDAY,
        userId,
      );
      if (!platformIntegrationRecord) {
        throw new UnauthorizedException(`User with ID: ${userId} has not authenticated with Monday!`);
      }
      const { data: mondayData } = platformIntegrationRecord;
      const headers = {
        Authorization: `Bearer ${mondayData.access_token}`,
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
      const data = response.data.data.workspaces;
      return data;
    } catch (error) {
      throw new UnauthorizedException(`User with ID: ${userId} has not authenticated with Monday!`);
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

  async getAllUserProjects(userId: string): Promise<UserProject[]> {
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
        platform: IntegrationPlatforms.MONDAY,
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
    const [projectAsFocusModeTag] = createNewTags([project], userId, IntegrationPlatforms.MONDAY);
    const syncedProject = await this.upsertSyncedProjectRecord(userId, portalId, project.id);
    const tasksAsToDos = tasksFromProject.map((task) => {
      return new ToDo({
        user_id: userId,
        title: task.name,
        status: task.status,
        details: task.description,
        external_task_id: task.id,
        external_task_metadata: { platform: IntegrationPlatforms.MONDAY, task_data: task },
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
      IntegrationPlatforms.MONDAY,
      userId,
    );

    if (!platformIntegrationRecord) return;
    const { data: mondayData } = platformIntegrationRecord;
    const headers = { Authorization: `Bearer ${mondayData.access_token}` };
    const query = `query { boards ( workspace_ids: ${portalId} ids: ${projectId}) {name state id permissions}}`;
    const response = await this.httpService.post(
      this.base_url,
      { query },
      {
        headers,
      },
    );
    return response.data.data.boards[0];
  }

  async getAllUserTasks(userId: string): Promise<Task[]> {
    const syncedProjects = await this.syncedProjectsRepository.orm.find({
      where: { user_id: userId, platform: IntegrationPlatforms.MONDAY },
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
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.MONDAY,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: mondayData } = platformIntegrationRecord;
      const sections = await this.getProjectStatuses(userId, projectId, portalId);
      const tasks = Promise.all(
        sections.map(async (section) => {
          const headers = { Authorization: `Bearer ${mondayData.access_token}` };
          const query = `query {boards (ids: ${projectId}) {items {id name state}}}`;
          const response = await this.httpService.post(
            this.base_url,
            { query },
            {
              headers,
            },
          );
          const datas = response.data.data.boards[0].items ?? [];
          const tasksWithStatus = datas?.map((data) => {
            return { ...data, project_id: projectId, portal_id: portalId, status: section.status_id };
          });
          return tasksWithStatus;
        }),
      );

      const flattenedTasks = (await tasks).flat();
      return flattenedTasks;
    } catch (error) {
      throw new Error('Failed to getTasksOwneByUser');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getProjectStatuses(userId: string, projectId: string, portalId: string) {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.MONDAY,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: mondayData } = platformIntegrationRecord;
    const query = `query { boards (ids: ${parseInt(projectId, 10)}) { groups { title id }}}`;
    const headers = { Authorization: `Bearer ${mondayData.access_token}` };
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateTaskStatus(userId: string, portalId: string, projectId: string, taskId: string, statusId: string) {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.MONDAY,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: mondayData } = platformIntegrationRecord;
      const query = `mutation  { move_item_to_group ( item_id: ${taskId}, group_id: ${statusId}) { id }  }`;
      const headers = { Authorization: `Bearer ${mondayData.access_token}` };
      const response = await this.httpService.post(
        this.base_url,
        { query },
        {
          headers,
        },
      );
      return response.data.data;
    } catch (error) {
      throw new Error('Failed to update task status after trying to get new access token.');
    }
  }

  async getMondayTasksToSync(mondayTasks: any[], userId: string) {
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
    const syncedMondayTasks = syncedTasks.filter((task) => task.external_task_metadata.platform === 'monday');
    const syncedMondayTasksIds = syncedMondayTasks.map((task) => task.external_task_id);
    const tasksToSync = mondayTasks.filter((task) => !syncedMondayTasksIds.includes(task.id));
    return { tasksToSync, syncedMondayTasks };
  }
}
