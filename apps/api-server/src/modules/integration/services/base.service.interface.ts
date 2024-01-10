import { AxiosResponse } from 'axios';
import { User } from '../../user/entities/user.entity';
import { Portal } from '../domain/portal.model';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

export interface IBaseIntegrationService {
  getUser(userId: string): Promise<User>;

  addTimeEntry(
    userId: string,
    portalId: string,
    projectId: string,
    taskId: string,
    timeEntry: any,
  ): Promise<AxiosResponse<any>>;

  getTasks(userId: string, projectId: string, portalId: string): Promise<any>;

  getProjects(userId: string, portalId: string): Promise<any[]>;

  getPortals(userId: string): Promise<Portal[]>;

  getAllProjects(userId: string): Promise<any[]>;

  getAllUserProjects(userId: string): Promise<any[]>;

  upsertSyncedProjectRecord(userId: string, portalId: string, projectId: string);

  syncProjectAndChildTasks(
    userId: string,
    portalId: string,
    projectId: string,
    platform: IntegrationPlatforms,
    only_assigned: boolean,
  );

  getProject(userId: string, portalId: string, projectId: string);

  getAllUserTasks(userId: string);

  getTasksOwnedByUser(userId: string, portalId: string, projectId: string);

  getProjectStatuses(userId: string, projectId: string, portalId: string);

  updateTaskStatus(userId: string, portalId: string, projectId: string, taskId: string, statusId: string);
}
