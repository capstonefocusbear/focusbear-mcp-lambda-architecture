/* eslint-disable no-await-in-loop */
import { BadRequestException, Injectable, UseGuards, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { IsNull, Not } from 'typeorm';
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
export class ClickupService implements BaseIntegrationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly focusModeTagRepository: FocusModeTagRepository,
    private readonly toDoRepository: ToDoRepository,
    private readonly platformIntegrationsService: PlatformIntegrationsService,
    private readonly syncedProjectsRepository: SyncedProjectsRepository,
  ) {}

  private httpService = axios;

  private readonly base_url = 'https://api.clickup.com/api/v2/';

  async getUser(userId: string): Promise<User> {
    return this.userRepository.orm.findOneBy({ id: userId });
  }

  async addTimeEntry(
    userId: string,
    portalId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    projectId: string,
    taskId: string,
    timeEntry: any,
  ): Promise<AxiosResponse<any>> {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.CLICK_UP,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: clickupData } = platformIntegrationRecord;
      const url = `${this.base_url}team/${portalId}/time_entries`;

      const headers = {
        'Content-Type': 'application/json',
        Authorization: clickupData.access_token,
      };
      const timestamp = new Date(timeEntry.date).getTime() / 1000;
      const data = {
        duration: timeEntry.seconds,
        tid: taskId,
        start: timestamp,
      };
      const response = await this.httpService.post(url, JSON.stringify(data), {
        headers,
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new UnauthorizedException('Auth Failed');
      } else {
        throw new Error('Failed to add Clickup task time entry after trying to get new access token.');
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTasks(userId: string, projectId: string, portalId: string): Promise<Task[]> {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.CLICK_UP,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: clickupData } = platformIntegrationRecord;
      const url = `${this.base_url}list/${projectId}/task`;
      const headers = { Authorization: `Bearer ${clickupData.access_token}` };

      const response = await this.httpService.get(url, {
        headers,
      });

      return response.data?.tasks ?? [];
    } catch (e) {
      throw new BadRequestException(e.response?.data);
    }
  }

  async getProjects(userId: string, portalId: string): Promise<Project[]> {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.CLICK_UP,
        userId,
      );
      if (!platformIntegrationRecord) {
        throw new UnauthorizedException(`User with ID: ${userId} has not authenticated with Clickup!`);
      }
      const { data: clickupData } = platformIntegrationRecord;
      const url = `${this.base_url}team/${portalId}/list`;
      const headers = { Authorization: `Bearer ${clickupData.access_token}` };
      const response = await this.httpService.get(url, {
        headers,
      });
      return response.data.lists;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new UnauthorizedException('Auth Failed');
      } else {
        throw new Error('Failed to add Clickup getProjects.');
      }
    }
  }

  async getPortals(userId: string): Promise<AxiosResponse<any>> {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.CLICK_UP,
        userId,
      );
      if (!platformIntegrationRecord) return;

      const { data: clickupData } = platformIntegrationRecord;
      const url = `${this.base_url}team`;
      const headers = {
        Authorization: `Bearer ${clickupData.access_token}`,
      };
      const response = await axios.get(url, {
        headers,
      });
      return response.data.teams;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new UnauthorizedException('Auth Failed');
      } else {
        throw new Error('Failed to add Clickup getPortals.');
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
        platform: IntegrationPlatforms.CLICK_UP,
      });
      return this.syncedProjectsRepository.orm.save(newProject);
    }
    // if project has already been synced, update statuses
    const linkedProject = syncedProjects.find((syncedProject) => syncedProject.external_project_id === projectId);
    linkedProject.available_statuses = available_statuses;
    return this.syncedProjectsRepository.orm.save(linkedProject);
  }

  async getClickupTasksToSync(clickupTasks: any[], userId: string) {
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
    const syncedClickupTasks = syncedTasks.filter((task) => task.external_task_metadata.platform === 'clickup');
    const syncedClickupTasksIds = syncedClickupTasks.map((task) => task.external_task_id);
    const tasksToSync = clickupTasks.filter((task) => !syncedClickupTasksIds.includes(task.id));
    return { tasksToSync, syncedClickupTasks };
  }

  async syncProjectAndChildTasks(userId: string, portalId: string, projectId: string) {
    const project = await this.getProject(userId, portalId, projectId);
    const tasksFromProject = await this.getTasksOwnedByUser(userId, portalId, projectId);
    const [projectAsFocusModeTag] = createNewTags([project], userId, IntegrationPlatforms.CLICK_UP);
    const syncedProject = await this.upsertSyncedProjectRecord(userId, portalId, project.id);
    const tasksAsToDos = tasksFromProject.map((task) => {
      return new ToDo({
        user_id: userId,
        title: task.name,
        details: task.description,
        status: task.status.status,
        external_task_id: task.id,
        external_task_metadata: { platform: IntegrationPlatforms.CLICK_UP, task_data: task },
        synced_project_id: syncedProject.id,
        tags: [...(projectAsFocusModeTag ? [projectAsFocusModeTag] : [])],
      });
    });
    // Save new projects and tasks
    await this.toDoRepository.orm.save(tasksAsToDos);
    await this.focusModeTagRepository.orm.save(projectAsFocusModeTag);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getProject(userId: string, portalId: string, projectId: string): Promise<Project> {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.CLICK_UP,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: clickupData } = platformIntegrationRecord;
    const url = `${this.base_url}list/${projectId}`;
    const headers = { Authorization: `Bearer ${clickupData.access_token}` };
    const response = await this.httpService.get(url, {
      headers,
    });
    return response.data;
  }

  async getAllUserTasks(userId: string): Promise<Task[]> {
    const syncedProjects = await this.syncedProjectsRepository.orm.find({
      where: { user_id: userId, platform: IntegrationPlatforms.CLICK_UP },
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
        IntegrationPlatforms.CLICK_UP,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: clickupData } = platformIntegrationRecord;
      const url = `${this.base_url}team/${portalId}/task`;
      const headers = { Authorization: `Bearer ${clickupData.access_token}` };
      const response = await this.httpService.get(url, {
        headers,
      });
      const tasks = response.data?.tasks ?? [];
      const tasksWithPortalIds = tasks.map((task) => {
        return { ...task, project_id: projectId, portal_id: portalId };
      });
      return tasksWithPortalIds;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new UnauthorizedException('Auth Failed');
      } else {
        throw new Error(`${error}Failed to add Clickup getTasksOwnedByUser.`);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getProjectStatuses(userId: string, projectId: string, portalId: string) {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.CLICK_UP,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: clickupData } = platformIntegrationRecord;
    const url = `${this.base_url}list/${projectId}`;
    const headers = { Authorization: `Bearer ${clickupData.access_token}` };
    const response = await this.httpService.get(url, {
      headers,
    });
    const availableStatuses = response.data?.statuses.map((details) => {
      return { label: details.status, status_id: details.status, should_complete_task: false };
    });
    return availableStatuses;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateTaskStatus(userId: string, portalId: string, projectId: string, taskId: string, statusId: string) {
    try {
      const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.CLICK_UP,
        userId,
      );
      if (!platformIntegrationRecord) return;
      const { data: clickupData } = platformIntegrationRecord;

      const url = `${this.base_url}task/${taskId}`;
      const headers = {
        Authorization: `Bearer ${clickupData.access_token}`,
      };
      const formData = {
        list_id: statusId,
      };
      const response = await this.httpService.put(url, formData, {
        headers,
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new UnauthorizedException('Auth Failed');
      } else {
        throw new Error('Failed to add Clickup task updateTaskStatus.');
      }
    }
  }
}
