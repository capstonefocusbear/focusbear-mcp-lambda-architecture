/* eslint-disable no-await-in-loop */
import axios from 'axios';
import { In, IsNull, Not } from 'typeorm';
import { getDataCenterUrl } from '../../apps/api-server/src/shared/utils/helpers';
import { FocusModeTag } from '../../apps/api-server/src/modules/focus-mode/entities/focus-mode-tags';
import { ToDo } from '../../apps/api-server/src/modules/to-do/entities/to-do.entity';
import { CronJobDataSource } from '../data-source';
import { createNewToDos, getTasksToDelete } from './helpers';
import { PlatformIntegration } from '../../apps/api-server/src/modules/platform-integrations/entities/platform-integration.entity';
import { IntegrationPlatforms } from '../../apps/api-server/src/modules/platform-integrations/domain/integration-platforms.enum';
import { SyncedProject } from '../../apps/api-server/src/modules/to-do/entities/synced-project.entity';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

async function getPlatformIntegrationData(platform: IntegrationPlatforms, userId: string) {
  const platformRecord = await CronJobDataSource.manager.findOne(PlatformIntegration, {
    where: { user_id: userId, platform },
  });
  if (!platformRecord) return null;
  return platformRecord;
}

async function getUserSyncedZohoProjects(userId: string) {
  return CronJobDataSource.manager.find(SyncedProject, {
    where: { user_id: userId, platform: IntegrationPlatforms.ZOHO },
  });
}

async function getZohoData(userId: string) {
  const platformIntegrationRecord = await getPlatformIntegrationData(IntegrationPlatforms.ZOHO, userId);
  if (!platformIntegrationRecord) return null;
  const { data } = platformIntegrationRecord;
  return data;
}

async function updatePlatformIntegration(
  userId: string,
  platform: IntegrationPlatforms,
  data: any,
  userExternalId?: string,
) {
  const existingRecord = await getPlatformIntegrationData(platform, userId);
  if (existingRecord) {
    const platformIntegration = new PlatformIntegration({
      ...existingRecord,
      data: { ...existingRecord.data, ...data },
    });
    await CronJobDataSource.manager.save(PlatformIntegration, platformIntegration);
    return;
  }
  const platformIntegration = new PlatformIntegration({
    user_id: userId,
    platform,
    ...(userExternalId && { external_user_id: userExternalId }),
    data,
  });
  await CronJobDataSource.manager.save(PlatformIntegration, platformIntegration);
}

async function refreshToken(userId: string) {
  const zohoData = await getZohoData(userId);
  if (!zohoData) return;
  const url = `${zohoData.account_server}/oauth/v2/token?client_id=${process.env.ZOHO_CLIENT_ID}&grant_type=refresh_token&client_secret=${process.env.ZOHO_CLIENT_SECRET}&refresh_token=${zohoData.refresh_token}`;
  const { data } = await axios.post(url);
  await updatePlatformIntegration(userId, IntegrationPlatforms.ZOHO, { access_token: data?.access_token || '' });
  return data;
}

async function handleUnauthorizedError(userId: string, retryCount: number): Promise<number> {
  if (retryCount === 0) {
    await refreshToken(userId);
    return 1;
  }
  throw new Error('Unauthorized after retry');
}

async function getPortals(userId: string) {
  const MAX_RETRY = 2;
  let retryCount = 0;

  while (retryCount < MAX_RETRY) {
    try {
      const zohoData = await getZohoData(userId);
      if (!zohoData) return;
      const url = `${getDataCenterUrl(zohoData.location).api}/portals/`;
      const headers = { Authorization: `Bearer ${zohoData.access_token}` };
      const response = await axios.get(url, {
        headers,
      });
      return response.data?.portals;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        retryCount = await handleUnauthorizedError(userId, retryCount);
      } else {
        throw error;
      }
    }
  }
}

async function getTasksOwnedByUser(userId: string, portalId: string) {
  const zohoData = await getZohoData(userId);
  if (!zohoData) return;
  const url = `${getDataCenterUrl(zohoData.location).api}/portal/${portalId}/mytasks/?owner=${zohoData.accountId}`;
  const headers = { Authorization: `Bearer ${zohoData.access_token}` };
  const response = await axios.get(url, {
    headers,
  });
  return response.data?.tasks ?? [];
}

async function getAllUserZohoTasks(userId: string) {
  const portals = await getPortals(userId);
  let allUserTasks = [];
  for await (const portal of portals) {
    const userTasksFromPortal = await getTasksOwnedByUser(userId, portal.id);
    const tasks = [];
    for (const task of userTasksFromPortal) {
      task.portal_id = portal.id;
      tasks.push(task);
    }
    allUserTasks = [...allUserTasks, ...tasks];
  }
  return allUserTasks;
}

async function getZohoTasksToSync(zohoTasks: any[], userId: string) {
  const syncedTasks = await CronJobDataSource.manager.find(ToDo, {
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

async function getTagsLinkedToProject(userId: string, externalProjectIds: string[]) {
  return CronJobDataSource.manager.find(FocusModeTag, {
    where: { user_id: userId, external_project_id: In(externalProjectIds) },
  });
}

async function getProjectStatuses(userId: string, portalId: string, projectId: string) {
  const zohoData = await getZohoData(userId);
  if (!zohoData) return;
  const url = `${getDataCenterUrl(zohoData.location).api}/portal/${portalId}/projects/${projectId}/tasklayouts`;
  const headers = { Authorization: `Bearer ${zohoData.access_token}` };
  const { data } = await axios.get(url, {
    headers,
  });
  const availableStatuses = data?.status_details?.map((details) => {
    return { label: details.name, status_id: details.id };
  });
  return availableStatuses;
}

async function updateSyncedProjectsStatuses(userId: string, syncedProjects: SyncedProject[]) {
  for await (const syncedProject of syncedProjects) {
    const { external_portal_id, external_project_id } = syncedProject;
    const availableStatuses = await getProjectStatuses(userId, external_portal_id, external_project_id);
    const updatedSyncedProject = new SyncedProject({ ...syncedProject, available_statuses: availableStatuses });
    await CronJobDataSource.manager.save(SyncedProject, updatedSyncedProject);
  }
}

async function syncUserTasks(userId: string) {
  const userSyncedZohoProjects = await getUserSyncedZohoProjects(userId);
  await updateSyncedProjectsStatuses(userId, userSyncedZohoProjects);
  const externalProjectIds = userSyncedZohoProjects.map((syncedProject) => syncedProject.external_project_id);
  const allUserZohoTasks = await getAllUserZohoTasks(userId);
  const tasksFromSyncedProjects = allUserZohoTasks.filter((task) => {
    const isTaskFromSyncedProject = externalProjectIds.includes(task?.project?.id_string);
    if (isTaskFromSyncedProject) return true;
    return false;
  });
  const externalIdToIdMap = userSyncedZohoProjects.reduce((map, project) => {
    const newMap = { ...map };
    newMap[project.external_project_id] = project.id;
    return newMap;
  }, {});
  const { tasksToSync, syncedZohoTasks } = await getZohoTasksToSync(tasksFromSyncedProjects, userId);
  const tasksToRemoveIds = getTasksToDelete(tasksFromSyncedProjects, syncedZohoTasks);
  const tags = await getTagsLinkedToProject(userId, externalProjectIds);
  const newZohoToDos = createNewToDos(tasksToSync, userId, tags, IntegrationPlatforms.ZOHO, externalIdToIdMap);
  // Save new tasks
  const savedToDos = await CronJobDataSource.manager.save(ToDo, newZohoToDos);
  // Delete removed tasks
  await CronJobDataSource.manager.delete(ToDo, { id: In(tasksToRemoveIds) });
  return {
    tasksSaved: savedToDos.length,
    tasksRemoved: tasksToRemoveIds.length,
  };
}

async function getUsersToSyncWithZoho() {
  const zohoIntegrationRecords = await CronJobDataSource.manager.find(PlatformIntegration, {
    where: { platform: IntegrationPlatforms.ZOHO },
  });
  const recordsWithAccessAndRefreshTokens = zohoIntegrationRecords.filter(
    (integration) => integration.data.access_token && integration.data.refresh_token,
  );
  const idsOfUsersToSync = recordsWithAccessAndRefreshTokens.map((integrationRecord) => integrationRecord.user_id);
  return idsOfUsersToSync;
}

(async () => {
  try {
    await CronJobDataSource.initialize();
    const usersToSync = await getUsersToSyncWithZoho();
    const syncUserPromises = usersToSync.map((userId) => syncUserTasks(userId));
    await Promise.all(syncUserPromises);
    process.exit();
  } catch (error) {
    console.error('Error in integration cron-job: ', error, error?.response);
  }
})();
