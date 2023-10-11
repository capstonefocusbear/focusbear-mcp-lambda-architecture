import { BaseIntegrationService } from "./base.service";
import { BadRequestException, Injectable, UseGuards, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { getDataCenterUrl } from '../../../shared/utils/helpers';
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
import { createNewTags } from "cron-jobs/zoho/helpers";
import { ToDo } from "../../to-do/entities/to-do.entity";

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
      const url = `${
        getDataCenterUrl(mondayData.monday_location).api
      }/portal/${portalId}/projects/${projectId}/tasks/${taskId}/logs/`;
      const headers = { Authorization: `Bearer ${mondayData.monday_access_token}` };
      const [year, month, day] = timeEntry.date.split('-');
      const formData = new FormData();
      formData.append('date', `${month}-${day}-${year}`);
      formData.append('bill_status', timeEntry.bill_status);
      formData.append('hours', timeEntry.hours || '00:00');
      formData.append('notes', timeEntry.notes || '');
      const response = await this.httpService.post(url, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.log(error);
      throw new Error('Failed to add monday task time entry after trying to get new access token.');
    }
  }  
  async getTasks(userId: string, projectId: string): Promise<any> {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.MONDAY,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: mondayData } = platformIntegrationRecord;
      const query = `query {boards(ids: ${projectId}) {items {id name }}}`;
      const headers = { Authorization: `Bearer ${mondayData.monday_access_token}` };
      const response = await this.httpService.post(this.base_url, {query}, {
        headers,
      });
      return response.data ?? [];
    } catch (e) {
      throw new BadRequestException(e.response?.data);
    }
  }

  async getProjects(userId: string, portalId: any): Promise<Project[]> {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.MONDAY,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data } = platformIntegrationRecord;
    
    const headers = { Authorization: `Bearer ${data.monday_access_token}` };
    const query = `query { boards ( workspace_ids: ${portalId} ) {name state id permissions }}`;
    const response = await this.httpService.post(this.base_url, {query}, {
      headers,
    });

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
        Authorization: `Bearer ${mondayData.monday_access_token}`,
        'Content-Type': 'application/json' 
      };
      const query = 'query {workspaces{id name kind description state }}';

      const response = await this.httpService.post(this.base_url, {query}, {
        headers,
      });
      const data = response.data.data.workspaces
      return data;
    } catch (error) {
      console.log(error)
      throw error;
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
        project.portal_id = portal.id_string;
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
    const available_statuses = await this.getProjectStatuses(userId, projectId);
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
      return await this.syncedProjectsRepository.orm.save(newProject);
    } else {
      // if project has already been synced, update statuses
      const linkedProject = syncedProjects.find((syncedProject) => syncedProject.external_project_id === projectId);
      linkedProject.available_statuses = available_statuses;
      return await this.syncedProjectsRepository.orm.save(linkedProject);
    }
  }

  async syncProjectAndChildTasks(userId: string, portalId: string, projectId: string) {
    const project = await this.getProject(userId, portalId, projectId);
    const tasksFromProject = await this.getTasksOwnedByUser(userId, projectId);
    const [projectAsFocusModeTag] = createNewTags([project], userId, IntegrationPlatforms.MONDAY);
    const syncedProject = await this.upsertSyncedProjectRecord(userId, portalId, project.id);
    const tasksAsToDos = tasksFromProject.map((task) => {
      return new ToDo({
        user_id: userId,
        title: task.name,
        details: task.description,
        external_task_id: task.id_string,
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
    const headers = { Authorization: `Bearer ${mondayData.monday_access_token}` };
    const query = `query { boards ( workspace_ids: ${portalId} ids: ${projectId}) {name state id permissions}}`;
    const { data } = await this.httpService.post(this.base_url, { query}, {
      headers,
    });
    return data.data.boards[0];
  }

  async getAllUserTasks(userId: string) {
    const syncedProjects = await this.syncedProjectsRepository.orm.find({
      where: { user_id: userId, platform: IntegrationPlatforms.MONDAY },
    });
    const tasks = [];
    for await (const project of syncedProjects) {
      const projectTasks = await this.getTasksOwnedByUser(userId, project.external_portal_id);
      for (const task of projectTasks) {
        task.portal_id = project.external_portal_id;
        tasks.push(task);
      }
    }
    return tasks;
  }

  async getTasksOwnedByUser(userId: string, projectId: string) {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.MONDAY,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: mondayData } = platformIntegrationRecord;
      const headers = { Authorization: `Bearer ${mondayData.monday_access_token}` };
      const query = `query {boards (ids: ${projectId}) {items {id name state}}}`;
      const response = await this.httpService.post(this.base_url, { query }, {
        headers,
      });
      const tasks = response.data.data.boards[0].items ?? [];
      const tasksWithPortalIds = tasks.map((task) => {
        return { ...task, project_id: projectId };
      });
      return tasksWithPortalIds;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async getProjectStatuses(userId: string, projectId: string) {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.MONDAY,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: mondayData } = platformIntegrationRecord;
    const query = `query { boards (ids: ${parseInt(projectId)}) { groups { title id }}}`
    const headers = { Authorization: `Bearer ${mondayData.monday_access_token}` };
    const { data } = await this.httpService.post(this.base_url, {query}, {
      headers,
    });
    const availableStatuses = data?.data.boards[0]?.groups.map((details) => {
      return { label: details.title, status_id: details.id, should_complete_task: false };
    });
    return availableStatuses;
  }

  async updateTaskStatus(userId: string, taskId: string, statusId: string) {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.MONDAY,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: mondayData } = platformIntegrationRecord;
      const query = `mutation  { move_item_to_group ( item_id: ${taskId}, group_id: ${statusId}) { id }  }`
      const headers = { Authorization: `Bearer ${mondayData.monday_access_token}` };
      const response = await this.httpService.post(this.base_url, {query}, {
        headers,
      });
      return response.data;
    } catch (error) {
      console.log(error);
      throw new Error('Failed to update task status after trying to get new access token.');
    }
  }
}