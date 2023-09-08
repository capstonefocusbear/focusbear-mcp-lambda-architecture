/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
import { BadRequestException, Injectable, UseGuards, Inject, forwardRef } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { In, IsNull, Not } from 'typeorm';
import { getDataCenterUrl } from '../../../shared/utils/helpers';
import { CreateTaskTimeLog } from '../dto/create-task-timelog.dto';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ZohoProject } from '../domain/zoho-project.model';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { ZohoAuthService } from '../../auth/services/zoho-auth.service';
import { ProjectManagementPlatforms } from '../domain/project-management-platforms.enum';
import {
  createNewTags,
  createNewToDos,
  getZohoProjectsToDelete,
  getZohoTasksToDelete,
} from '../../../../../../cron-jobs/zoho/helpers';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

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
  ) {}

  private httpService = axios;

  async getUser(userId: string): Promise<User> {
    return this.userRepository.orm.findOneBy({ id: userId });
  }

  async getTaskTimeLogs(userId: string, portalId, projectId: string, taskId: string): Promise<AxiosResponse<any>> {
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
      const response = await this.httpService.get(url, {
        headers,
      });
      return response.data;
    } catch (e) {
      throw new BadRequestException(e.response?.data);
    }
  }

  async addTaskTimeLog(
    userId: string,
    portalId: string,
    projectId: string,
    task: CreateTaskTimeLog,
  ): Promise<AxiosResponse<any>> {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.ZOHO,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: zohoData } = platformIntegrationRecord;
      const url = `${getDataCenterUrl(zohoData.zoho_location).api}/portal/${portalId}/projects/${projectId}/tasks/${
        task.name ? `?name=${task.name}` : ''
      }`;
      const headers = { Authorization: `Bearer ${zohoData.zoho_access_token}` };
      const tasks: any = await this.httpService.post(
        url,
        {},
        {
          headers,
        },
      );
      if (tasks?.tasks?.length > 0) {
        const tasksId = tasks.tasks[0].id_string;
        const logsUrl = `${
          getDataCenterUrl(zohoData.zoho_location).api
        }/portal/${portalId}/projects/${projectId}/tasks/${tasksId}/logs/`;
        const logsHeaders = { Authorization: `Bearer ${zohoData.zoho_access_token}` };
        const [year, month, day] = task.date.split('-');
        const formData = new FormData();
        formData.append('date', `${month}-${day}-${year}`);
        formData.append('bill_status', task.bill_status);
        formData.append('hours', task.hours || '00:00');
        formData.append('notes', task.notes || '');
        const response = await this.httpService.post(logsUrl, formData, {
          headers: {
            ...logsHeaders,
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      }

      return tasks.data;
    } catch (e) {
      throw new BadRequestException(e.response?.data);
    }
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
        IntegrationPlatforms.ZOHO,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: zohoData } = platformIntegrationRecord;
      const url = `${
        getDataCenterUrl(zohoData.location).api
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
    } catch (e) {
      throw new BadRequestException(e.response?.data);
    }
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
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ZOHO,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: zohoData } = platformIntegrationRecord;
    const url = `${getDataCenterUrl(zohoData.zoho_location).api}/portals/`;
    const headers = { Authorization: `Bearer ${zohoData.zoho_access_token}` };
    const response = await this.httpService.get(url, {
      headers,
    });
    return response.data?.portals;
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

  async getAllProjectsAndTasks(userId: string): Promise<{ zohoTasks: any[]; zohoProjects: ZohoProject[] }> {
    const MAX_RETRY = 2;
    let retryCount = 0;

    while (retryCount < MAX_RETRY) {
      try {
        const portals: any = await this.getPortals(userId);
        const zohoTasks = [];
        const zohoProjects = [];
        if (!portals) return { zohoProjects, zohoTasks };

        for (const portal of portals) {
          const projects = await this.getProjects(userId, portal.id);
          zohoProjects.push(...projects);
          const tasks = await this.getTasksOwnedByUser(userId, portal.id);
          zohoTasks.push(...tasks);
        }

        return { zohoProjects, zohoTasks };
      } catch (error) {
        // Get new access token for user if current token expired
        if (error.response && error.response.status === 401) {
          if (retryCount === 0) {
            await this.zohoAuthService.refreshToken(userId);
            retryCount++;
          } else {
            // Retry already attempted, don't retry again
            throw error;
          }
        } else {
          throw error; // Throw other errors
        }
      }
    }
  }

  async getZohoProjectsToSync(zohoProjects: ZohoProject[], userId: string) {
    const syncedProjects = await this.focusModeTagRepository.orm.find({
      where: { user_id: userId, external_project_id: Not(IsNull()) },
    });
    const syncedZohoProjects = syncedProjects.filter(
      (project) => project.external_project_metadata.platform === 'zoho',
    );
    const syncedZohoProjectIds = syncedZohoProjects.map((project) => project.external_project_id);
    const projectsToSync = zohoProjects.filter((project) => !syncedZohoProjectIds.includes(project.id_string));
    return { projectsToSync, syncedZohoProjects };
  }

  async getZohoTasksToSync(zohoTasks: any[], userId: string) {
    // TODO: Get only tasks belonging to user
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

  async syncUserProjectsAndTasks(userId: string) {
    const { zohoTasks, zohoProjects } = await this.getAllProjectsAndTasks(userId);
    const { projectsToSync, syncedZohoProjects } = await this.getZohoProjectsToSync(zohoProjects, userId);
    const { tasksToSync, syncedZohoTasks } = await this.getZohoTasksToSync(zohoTasks, userId);
    const tasksToRemoveIds = getZohoTasksToDelete(zohoTasks, syncedZohoTasks);
    const projectsToRemoveIds = getZohoProjectsToDelete(zohoProjects, syncedZohoProjects);
    const newZohoTags = createNewTags(projectsToSync, userId, ProjectManagementPlatforms.ZOHO);
    const newZohoToDos = createNewToDos(tasksToSync, userId, newZohoTags, ProjectManagementPlatforms.ZOHO);
    // Save new projects and tasks
    const savedToDos = await this.toDoRepository.orm.save(newZohoToDos);
    const savedTags = await this.focusModeTagRepository.orm.save(newZohoTags);
    // Delete removed projects and tasks
    await this.toDoRepository.orm.delete({ id: In(tasksToRemoveIds) });
    await this.focusModeTagRepository.orm.delete({ id: In(projectsToRemoveIds) });
    return {
      projectsSaved: savedTags.length,
      projectsRemoved: projectsToRemoveIds.length,
      tasksSaved: savedToDos.length,
      tasksRemoved: tasksToRemoveIds.length,
    };
  }

  async getTasksOwnedByUser(userId: string, portalId: string) {
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
  }
}
