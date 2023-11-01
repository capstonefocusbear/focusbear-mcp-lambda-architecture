/* eslint-disable no-await-in-loop */
import { Inject, forwardRef } from '@nestjs/common';
import axios from 'axios';
import { getDataCenterUrl, secondsToHHMM } from '../../../shared/utils/helpers';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { ZohoAuthService } from '../../auth/services/zoho-auth.service';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { Project } from '../domain/project.model';
import { Task } from '../domain/task.model';
import { Portal } from '../domain/portal.model';
import { BaseIntegrationService } from './base.service';
import { ExternalTaskStatus } from '../../to-do/domain/external-task-status.model';

const taskAdapter = ({ task, portalId, projectId }) => ({
  id: task.id_string,
  key: task.key,
  name: task.name,
  description: task.description,
  status: task.status.id,
  external_metadata: { ...task, portal_id: portalId, project_id: projectId },
});

const projectAdapter = ({ project, portalId }) => ({
  id: project.id,
  key: project.key,
  name: project.name,
  description: project.description,
  portal_id: portalId,
});

export class ZohoService extends BaseIntegrationService {
  constructor(
    protected readonly userRepository: UserRepository,
    protected readonly focusModeTagRepository: FocusModeTagRepository,
    protected readonly toDoRepository: ToDoRepository,
    @Inject(forwardRef(() => ZohoAuthService))
    protected readonly integrationAuthService: ZohoAuthService,
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
      IntegrationPlatforms.ZOHO,
    );
  }

  private httpService = axios;

  async getUser(userId: string): Promise<User> {
    return this.userRepository.orm.findOneBy({ id: userId });
  }

  protected async tryAddTimeEntry({ accessToken, portalId, projectId, taskId, timeEntry, userId }): Promise<any> {
    const { data } = await this.platformIntegrationsService.getPlatformIntegrationData(this.platform, userId);
    const url = `${getDataCenterUrl(data.location).api}/portal/${portalId}/projects/${projectId}/tasks/${taskId}/logs/`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const [year, month, day] = timeEntry.date.split('-');
    const formData = {
      date: `${month}-${day}-${year}`,
      bill_status: timeEntry.bill_status ?? 'Non Billable',
      hours: secondsToHHMM(timeEntry.seconds) || '00:00',
      notes: timeEntry.note || '',
    };

    const response = await this.httpService.post(url, formData, {
      headers: {
        ...headers,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  protected async tryGetTasks({ accessToken, userId, projectId, portalId }): Promise<Task[]> {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ZOHO,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data } = platformIntegrationRecord;
    const url = `${getDataCenterUrl(data.location).api}/portal/${portalId}/projects/${projectId}/tasks/`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const response = await this.httpService.get(url, {
      headers,
    });
    return response.data?.tasks.map((task) => taskAdapter({ task, portalId, projectId })) ?? [];
  }

  protected async tryGetProjects({ accessToken, userId, portalId }): Promise<Project[]> {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ZOHO,
      userId,
    );
    const { data: zohoData } = platformIntegrationRecord;
    const url = `${getDataCenterUrl(zohoData.location).api}/portal/${portalId}/projects/`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const response = await this.httpService.get(url, {
      headers,
    });

    return response.data.projects.map((project) => projectAdapter({ project, portalId }));
  }

  protected async tryGetPortals({ accessToken, userId }): Promise<Portal[]> {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ZOHO,
      userId,
    );
    const { data: zohoData } = platformIntegrationRecord;
    const url = `${getDataCenterUrl(zohoData.location).api}/portals/`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const response = await this.httpService.get(url, {
      headers,
    });
    return response.data?.portals.map((portal) => ({ id: portal.id }));
  }

  protected async tryGetProject({ accessToken, portalId, projectId, userId }): Promise<Project> {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ZOHO,
      userId,
    );
    const { data: zohoData } = platformIntegrationRecord;

    const url = `${getDataCenterUrl(zohoData.location).api}/portal/${portalId}/projects/${projectId}/`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const { data } = await this.httpService.get(url, {
      headers,
    });
    return projectAdapter({ project: data.projects[0], portalId });
  }

  protected async tryGetTasksOwnedByUser({ accessToken, userId, portalId, projectId }): Promise<Task[]> {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ZOHO,
      userId,
    );
    const { data: zohoData } = platformIntegrationRecord;
    const url = `${getDataCenterUrl(zohoData.location).api}/portal/${portalId}/mytasks/?owner=${zohoData.accountId}`;
    const headers = { Authorization: `Bearer ${accessToken}` };

    const response = await this.httpService.get(url, {
      headers,
    });
    const tasks = response.data?.tasks.map((task) => taskAdapter({ task, portalId, projectId })) ?? [];
    const tasksWithPortalIds = tasks.map((task) => {
      return { ...task, portal_id: portalId, project_id: projectId, id: task.id_string };
    });
    return tasksWithPortalIds;
  }

  protected async tryGetProjectStatuses({ accessToken, userId, projectId, portalId }): Promise<ExternalTaskStatus[]> {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ZOHO,
      userId,
    );
    const { data: zohoData } = platformIntegrationRecord;

    const url = `${getDataCenterUrl(zohoData.location).api}/portal/${portalId}/projects/${projectId}/tasklayouts`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const { data } = await this.httpService.get(url, {
      headers,
    });
    const availableStatuses = data?.status_details?.map((details) => {
      return { label: details.name, status_id: details.id, should_complete_task: false };
    });
    return availableStatuses;
  }

  protected async tryUpdateTaskStatus({ accessToken, userId, portalId, projectId, taskId, statusId }): Promise<any> {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ZOHO,
      userId,
    );
    const { data: zohoData } = platformIntegrationRecord;
    const url = `${getDataCenterUrl(zohoData.location).api}/portal/${portalId}/projects/${projectId}/tasks/${taskId}/`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const formData = {
      custom_status: statusId,
    };
    const response = await this.httpService.post(url, formData, {
      headers,
    });
    return response.data;
  }
}
