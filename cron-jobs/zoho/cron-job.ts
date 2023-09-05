/* eslint-disable no-await-in-loop */
import axios, { AxiosResponse } from 'axios';
import { In, IsNull, Not } from 'typeorm';
import { User } from '../../apps/api-server/src/modules/user/entities/user.entity';
import { ZohoProject } from '../../apps/api-server/src/modules/zoho/domain/zoho-project.model';
import { getDataCenterUrl } from '../../apps/api-server/src/shared/utils/helpers';
import { FocusModeTag } from '../../apps/api-server/src/modules/focus-mode/entities/focus-mode-tags';
import { ToDo } from '../../apps/api-server/src/modules/to-do/entities/to-do.entity';
import { ProjectManagementPlatforms } from '../../apps/api-server/src/modules/zoho/domain/project-management-platforms.enum';
import { CronJobDataSource } from '../data-source';
import { createNewTags, createNewToDos, getZohoProjectsToDelete, getZohoTasksToDelete } from './helpers';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

async function getUser(userId: string): Promise<User> {
  return CronJobDataSource.manager.findOneBy(User, { id: userId });
}

async function refreshToken(userId: string) {
  const user = await getUser(userId);
  const url = `${user.zoho_account_server}/oauth/v2/token?client_id=${process.env.ZOHO_CLIENT_ID}&grant_type=refresh_token&client_secret=${process.env.ZOHO_CLIENT_SECRET}&refresh_token=${user.zoho_refresh_token}`;
  const { data } = await axios.post(url);
  await CronJobDataSource.manager.update(User, userId, { zoho_access_token: data?.access_token || '' });
  return data;
}

async function getProjects(userId: string, portalId: any): Promise<ZohoProject[]> {
  const user = await getUser(userId);
  const url = `${getDataCenterUrl(user.zoho_location).api}/portal/${portalId}/projects/`;
  const headers = { Authorization: `Bearer ${user.zoho_access_token}` };
  const response = await axios.get(url, {
    headers,
  });
  return response.data.projects;
}

async function getPortals(userId: string): Promise<AxiosResponse<any>> {
  const user = await getUser(userId);
  const url = `${getDataCenterUrl(user.zoho_location).api}/portals/`;
  const headers = { Authorization: `Bearer ${user.zoho_access_token}` };
  const response = await axios.get(url, {
    headers,
  });
  return response.data;
}

async function getTasksOwnedByUser(userId: string, portalId: string) {
  const user = await getUser(userId);
  const url = `${getDataCenterUrl(user.zoho_location).api}/portal/${portalId}/mytasks/?owner=${user.zoho_user_id}`;
  const headers = { Authorization: `Bearer ${user.zoho_access_token}` };
  const response = await axios.get(url, {
    headers,
  });
  return response.data?.tasks ?? [];
}

async function getAllProjectsAndTasks(userId: string): Promise<{ zohoTasks: any[]; zohoProjects: ZohoProject[] }> {
  const MAX_RETRY = 2;
  let retryCount = 0;

  while (retryCount < MAX_RETRY) {
    try {
      const portals: any = await getPortals(userId);
      const zohoTasks = [];
      const zohoProjects = [];
      if (!portals.portals) return { zohoProjects, zohoTasks };

      for (const portal of portals.portals) {
        const projects = await getProjects(userId, portal.id);
        zohoProjects.push(...projects);
        const tasks = await getTasksOwnedByUser(userId, portal.id);
        zohoTasks.push(...tasks);
      }

      return { zohoProjects, zohoTasks };
    } catch (error) {
      // Get new access token for user if current token expired
      if (error.response && error.response.status === 401) {
        if (retryCount === 0) {
          await refreshToken(userId);
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

async function getZohoProjectsToSync(zohoProjects: ZohoProject[], userId: string) {
  const syncedProjects = await CronJobDataSource.manager.find(FocusModeTag, {
    where: { user_id: userId, external_project_id: Not(IsNull()) },
  });
  const syncedZohoProjects = syncedProjects.filter((project) => project.external_project_metadata.platform === 'zoho');
  const syncedZohoProjectIds = syncedZohoProjects.map((project) => project.external_project_id);
  const projectsToSync = zohoProjects.filter((project) => !syncedZohoProjectIds.includes(project.id_string));
  return { projectsToSync, syncedZohoProjects };
}

async function getZohoTasksToSync(zohoTasks: any[], userId: string) {
  const syncedTasks = await CronJobDataSource.manager.find(ToDo, {
    where: { user_id: userId, external_task_id: Not(IsNull()) },
  });
  const syncedZohoTasks = syncedTasks.filter((task) => task.external_task_metadata.platform === 'zoho');
  const syncedZohoTasksIds = syncedZohoTasks.map((task) => task.external_task_id);
  const tasksToSync = zohoTasks.filter((task) => !syncedZohoTasksIds.includes(task.id_string));
  return { tasksToSync, syncedZohoTasks };
}

async function syncUserProjectsAndTasks(userId: string) {
  const { zohoTasks, zohoProjects } = await getAllProjectsAndTasks(userId);
  const { projectsToSync, syncedZohoProjects } = await getZohoProjectsToSync(zohoProjects, userId);
  const { tasksToSync, syncedZohoTasks } = await getZohoTasksToSync(zohoTasks, userId);
  const tasksToRemoveIds = getZohoTasksToDelete(zohoTasks, syncedZohoTasks);
  const projectsToRemoveIds = getZohoProjectsToDelete(zohoProjects, syncedZohoProjects);
  const newZohoTags = createNewTags(projectsToSync, userId, ProjectManagementPlatforms.ZOHO);
  const newZohoToDos = createNewToDos(tasksToSync, userId, newZohoTags, ProjectManagementPlatforms.ZOHO);
  // Save new projects and tasks
  const savedToDos = await CronJobDataSource.manager.save(ToDo, newZohoToDos);
  const savedTags = await CronJobDataSource.manager.save(FocusModeTag, newZohoTags);
  // Delete removed projects and tasks
  await CronJobDataSource.manager.delete(ToDo, { id: In(tasksToRemoveIds) });
  await CronJobDataSource.manager.delete(FocusModeTag, { id: In(projectsToRemoveIds) });
  return {
    projectsSaved: savedTags.length,
    projectsRemoved: projectsToRemoveIds.length,
    tasksSaved: savedToDos.length,
    tasksRemoved: tasksToRemoveIds.length,
  };
}

async function getUsersToSyncWithZoho() {
  const users = await CronJobDataSource.manager.find(User, {
    where: { zoho_access_token: Not(IsNull()), zoho_refresh_token: Not(IsNull()) },
  });
  return users;
}

(async () => {
  try {
    await CronJobDataSource.initialize();
    const usersToSync = await getUsersToSyncWithZoho();
    const syncUserPromises = usersToSync.map((user) => syncUserProjectsAndTasks(user.id));
    await Promise.all(syncUserPromises);
    process.exit();
  } catch (error) {
    console.error('Error in Zoho cron-job: ', error, error?.response);
  }
})();
