/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
import { BadRequestException, Injectable, UseGuards, Inject, forwardRef, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { IsNull, Not } from 'typeorm';
import { getDataCenterUrl } from '../../../shared/utils/helpers';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ZohoProject } from '../domain/zoho-project.model';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { ZohoAuthService } from '../../auth/services/zoho-auth.service';
import { createNewTags } from '../../../../../../cron-jobs/zoho/helpers';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { SyncedProject } from '../../to-do/entities/synced-project.entity';
import { SyncedProjectDto } from '../../to-do/dto/synced-project.dto';
import { ToDo } from '../../to-do/entities/to-do.entity';

@Injectable()
@UseGuards(IsAuth)
export class ZohoService {
  private readonly baseUrl = 'https://projectsapi.zoho.com.location/restapi';

  constructor(
    private readonly userRepository: UserRepository,
    private readonly focusModeTagRepository: FocusModeTagRepository,
    private readonly toDoRepository: ToDoRepository,
    @Inject(forwardRef(() => ZohoAuthService))
    private readonly zohoAuthService: ZohoAuthService,
    private readonly platformIntegrationsService: PlatformIntegrationsService,
    private readonly syncedProjectsRepository: SyncedProjectsRepository,
  ) {}

  private httpService = axios;

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
    const MAX_RETRY = 2;
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
          IntegrationPlatforms.ZOHO,
          userId,
        );
        if (!platformIntegrationRecord) return;
        const { data: zohoData } = platformIntegrationRecord;
        const url = `${
          getDataCenterUrl(zohoData.zoho_location).api
        }/portal/${portalId}/projects/${projectId}/tasks/${taskId}/logs/`;
        const headers = { Authorization: `Bearer ${zohoData.zoho_access_token}` };
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
        if (error.response && error.response.status === 401) {
          retryCount = await this.zohoAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          throw error;
        }
      }
    }
    throw new Error('Failed to add Zoho task time entry after trying to get new access token.');
  }

  async getTasks(userId: string, portalId: string, projectId: string): Promise<any> {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.ZOHO,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: zohoData } = platformIntegrationRecord;
      const url = `${getDataCenterUrl(zohoData.zoho_location).api}/portal/${portalId}/projects/${projectId}/tasks/`;
      const headers = { Authorization: `Bearer ${zohoData.zoho_access_token}` };
      const response = await this.httpService.get(url, {
        headers,
      });
      return response.data?.tasks ?? [];
    } catch (e) {
      throw new BadRequestException(e.response?.data);
    }
  }

  async getProjects(userId: string, portalId: any): Promise<ZohoProject[]> {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ZOHO,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: zohoData } = platformIntegrationRecord;
    const url = `${getDataCenterUrl(zohoData.zoho_location).api}/portal/${portalId}/projects/`;
    const headers = { Authorization: `Bearer ${zohoData.zoho_access_token}` };
    const response = await this.httpService.get(url, {
      headers,
    });
    return response.data.projects;
  }

  async getPortals(userId: string): Promise<AxiosResponse<any>> {
    const MAX_RETRY = 2;
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
          IntegrationPlatforms.ZOHO,
          userId,
        );
        if (!platformIntegrationRecord) {
          throw new UnauthorizedException(`User with ID: ${userId} has not authenticated with Zoho!`);
        }
        const { data: zohoData } = platformIntegrationRecord;
        const url = `${getDataCenterUrl(zohoData.zoho_location).api}/portals/`;
        const headers = { Authorization: `Bearer ${zohoData.zoho_access_token}` };
        const response = await this.httpService.get(url, {
          headers,
        });
        return response.data?.portals;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.zohoAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          throw error;
        }
      }
    }
  }

  async getAllProjects(userId: string): Promise<ZohoProject[]> {
    const portals: any = await this.getPortals(userId);
    let projectsResponse = [];
    if (!portals) return projectsResponse;
    for (const portal of portals) {
      // eslint-disable-next-line no-await-in-loop
      const projects = await this.getProjects(userId, portal.id);
      // eslint-disable-next-line no-continue
      if (!projects.length) continue;
      projects.forEach((project) => {
        // eslint-disable-next-line no-param-reassign
        project.portal_id = portal.id_string;
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
      if (!projects.length) continue;
      projects.forEach((project) => {
        const isSynced = userSyncedProjectsExternalIds.includes(project.id_string);
        let externalStatuses = [];
        if (isSynced) {
          const linkedSyncedProject = userSyncedProjects.find(
            (syncedProject) => syncedProject.external_project_id === project.id_string,
          );
          externalStatuses = linkedSyncedProject.available_statuses;
        }
        const projectData = {
          name: project.name,
          project_id: project.id_string,
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
    const available_statuses = await this.getProjectStatuses(userId, portalId, projectId);
    const syncedProjects = await this.syncedProjectsRepository.orm.find({ where: { user_id: userId } });
    const syncedProjectsExternalIds = syncedProjects.map((project) => project.external_project_id);
    const hasProjectBeenSynced = syncedProjectsExternalIds.includes(projectId);
    if (!hasProjectBeenSynced) {
      const newProject = new SyncedProject({
        user_id: userId,
        external_project_id: projectId,
        external_portal_id: portalId,
        available_statuses,
        platform: IntegrationPlatforms.ZOHO,
      });
      return this.syncedProjectsRepository.orm.save(newProject);
    }
    // if project has already been synced, update statuses
    const linkedProject = syncedProjects.find((syncedProject) => syncedProject.external_project_id === projectId);
    linkedProject.available_statuses = available_statuses;
    return this.syncedProjectsRepository.orm.save(linkedProject);
  }

  async getZohoTasksToSync(zohoTasks: any[], userId: string) {
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
    const syncedZohoTasks = syncedTasks.filter((task) => task.external_task_metadata.platform === 'zoho');
    const syncedZohoTasksIds = syncedZohoTasks.map((task) => task.external_task_id);
    const tasksToSync = zohoTasks.filter((task) => !syncedZohoTasksIds.includes(task.id_string));
    return { tasksToSync, syncedZohoTasks };
  }

  async syncProjectAndChildTasks(userId: string, portalId: string, projectId: string) {
    const project = await this.getProject(userId, portalId, projectId);
    const allUserTasks = await this.getTasksOwnedByUser(userId, portalId);
    const tasksFromProject = allUserTasks.filter((task) => task?.project?.id_string === projectId);
    const [projectAsFocusModeTag] = createNewTags([project], userId, IntegrationPlatforms.ZOHO);
    const syncedProject = await this.upsertSyncedProjectRecord(userId, portalId, project.id_string);
    const tasksAsToDos = tasksFromProject.map((task) => {
      return new ToDo({
        user_id: userId,
        title: task.name,
        details: task.description,
        external_task_id: task.id_string,
        external_task_metadata: { platform: IntegrationPlatforms.ZOHO, task_data: task },
        synced_project_id: syncedProject.id,
        tags: [...(projectAsFocusModeTag ? [projectAsFocusModeTag] : [])],
      });
    });
    // Save new projects and tasks
    await this.toDoRepository.orm.save(tasksAsToDos);
    await this.focusModeTagRepository.orm.save(projectAsFocusModeTag);
  }

  async getProject(userId: string, portalId: string, projectId: string) {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ZOHO,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: zohoData } = platformIntegrationRecord;
    const url = `${getDataCenterUrl(zohoData.zoho_location).api}/portal/${portalId}/projects/${projectId}/`;
    const headers = { Authorization: `Bearer ${zohoData.zoho_access_token}` };
    const { data } = await this.httpService.get(url, {
      headers,
    });
    return data.projects[0];
  }

  async getAllUserTasks(userId: string) {
    const syncedProjects = await this.syncedProjectsRepository.orm.find({
      where: { user_id: userId, platform: IntegrationPlatforms.ZOHO },
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

  async getTasksOwnedByUser(userId: string, portalId: string) {
    const MAX_RETRY = 2;
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
          IntegrationPlatforms.ZOHO,
          userId,
        );
        if (!platformIntegrationRecord) return;
        const { data: zohoData } = platformIntegrationRecord;
        const url = `${getDataCenterUrl(zohoData.zoho_location).api}/portal/${portalId}/mytasks/?owner=${
          zohoData.zoho_user_id
        }`;
        const headers = { Authorization: `Bearer ${zohoData.zoho_access_token}` };
        const response = await this.httpService.get(url, {
          headers,
        });
        const tasks = response.data?.tasks ?? [];
        const tasksWithPortalIds = tasks.map((task) => {
          return { ...task, portal_id: portalId };
        });
        return tasksWithPortalIds;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.zohoAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          throw error;
        }
      }
    }
  }

  async getProjectStatuses(userId: string, portalId: string, projectId: string) {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ZOHO,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: zohoData } = platformIntegrationRecord;
    const url = `${getDataCenterUrl(zohoData.zoho_location).api}/portal/${portalId}/projects/${projectId}/tasklayouts`;
    const headers = { Authorization: `Bearer ${zohoData.zoho_access_token}` };
    const { data } = await this.httpService.get(url, {
      headers,
    });
    const availableStatuses = data?.status_details?.map((details) => {
      return { label: details.name, status_id: details.id, should_complete_task: false };
    });
    return availableStatuses;
  }

  async updateTaskStatus(userId: string, portalId: string, projectId: string, taskId: string, statusId: string) {
    const MAX_RETRY = 2;
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
          IntegrationPlatforms.ZOHO,
          userId,
        );
        if (!platformIntegrationRecord) return;
        const { data: zohoData } = platformIntegrationRecord;
        const url = `${
          getDataCenterUrl(zohoData.zoho_location).api
        }/portal/${portalId}/projects/${projectId}/tasks/${taskId}/`;
        const headers = { Authorization: `Bearer ${zohoData.zoho_access_token}` };
        const formData = new FormData();
        formData.append('custom_status', statusId);
        const response = await this.httpService.post(url, formData, {
          headers,
        });
        return response.data;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          retryCount = await this.zohoAuthService.handleUnauthorizedError(userId, retryCount);
        } else {
          throw error;
        }
      }
    }
    throw new Error('Failed to update task status after trying to get new access token.');
  }
}
