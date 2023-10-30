import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import axios from 'axios';
import { savedAsanaTaskDummy, asanaTaskDummy } from '../../../../test/dummies/integration.dummies';
import { userDummy } from '../../../../test/dummies';
import { PlatformIntegrationsServiceMock, SentryServiceMock, AsanaAuthServiceMock } from '../../../../test/mocks';
import {
  FocusModeTagRepositoryMock,
  SyncedProjectsRepositoryMock,
  ToDoRepositoryMock,
  UserRepositoryMock,
} from '../../../../test/mocks/repositories.mock';
import { AsanaService } from './asana.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { AsanaAuthService } from '../../auth/services/asana-auth.service';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('asanaService', () => {
  let asanaService: AsanaService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AsanaService,
        UserRepository,
        FocusModeTagRepository,
        ToDoRepository,
        AsanaAuthService,
        PlatformIntegrationsService,
        SyncedProjectsRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(FocusModeTagRepository)
      .useValue(FocusModeTagRepositoryMock)
      .overrideProvider(ToDoRepository)
      .useValue(ToDoRepositoryMock)
      .overrideProvider(AsanaAuthService)
      .useValue(AsanaAuthServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .overrideProvider(SyncedProjectsRepository)
      .useValue(SyncedProjectsRepositoryMock)
      .compile();
    asanaService = moduleRef.get<AsanaService>(AsanaService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('positive: should be defined', () => {
    expect(asanaService).toBeDefined();
  });

  describe('getUser', () => {
    it('positive: user should be fetched from DB', async () => {
      ToDoRepositoryMock.orm.find.mockResolvedValueOnce([savedAsanaTaskDummy]);

      await asanaService.getUser(userDummy.id);

      expect(UserRepositoryMock.orm.findOneBy).toBeCalledWith({ id: userDummy.id });
    });
  });

  describe('getAsanaTasksToSync', () => {
    it('positive: returns tasks already saved and ones that need to be synced', async () => {
      ToDoRepositoryMock.orm.find.mockResolvedValueOnce([savedAsanaTaskDummy]);

      const result = await asanaService.getAsanaTasksToSync([asanaTaskDummy], userDummy.id);

      expect(result.tasksToSync.length).toBe(0);
      expect(result.syncedAsanaTasks.length).toBe(1);
    });
  });

  describe('updateTaskStatus', () => {
    const portalId = 'test-portal-id';
    const projectId = 'test-project-id';
    const taskId = 'test-task-id';
    const statusId = 'test-status-id';

    it('positive: should update the task status successfully', async () => {
      const asanaData = {
        access_token: 'test-access-token',
      };

      const response = {
        data: {
          data: {
            id: 'test-task-id',
            status: 'completed',
          },
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: asanaData,
      });

      mockedAxios.post.mockResolvedValue(response);

      const result = await asanaService.updateTaskStatus(userDummy.id, portalId, projectId, taskId, statusId);

      expect(result).toEqual(response.data.data);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ASANA,
        userDummy.id,
      );
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `https://app.asana.com/api/1.0/sections/${statusId}/addTask`,
        {
          data: {
            task: taskId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${asanaData.access_token}`,
          },
        },
      );
    });
  });

  describe('getTasksOwnedByUser', () => {
    const portalId = 'test-portal-id';
    const projectId = 'test-project-id';

    it('positive: should return tasks owned by the user', async () => {
      const asanaData = {
        access_token: 'test-access-token',
        accountId: 'test-account-id',
      };

      const response = {
        data: {
          data: [
            { id: 'task-1', name: 'Task 1' },
            { id: 'task-2', name: 'Task 2' },
          ],
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: asanaData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await asanaService.getTasksOwnedByUser(userDummy.id, portalId, projectId);

      expect(result).toEqual([
        { id: 'task-1', name: 'Task 1', project_id: projectId },
        { id: 'task-2', name: 'Task 2', project_id: projectId },
      ]);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ASANA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `https://app.asana.com/api/1.0/workspaces/${portalId}/tasks/search?assignee.any=${asanaData.accountId}&project=${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${asanaData.access_token}`,
          },
        },
      );
    });

    it('positive: should handle unauthorized error and retry if response status is 401', async () => {
      const retryCount = 1;
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(null);
      AsanaAuthServiceMock.handleUnauthorizedError.mockResolvedValue(retryCount);

      const result = await asanaService.getTasksOwnedByUser(userDummy.id, portalId, projectId);

      expect(result).toBeUndefined();
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ASANA,
        userDummy.id,
      );
    });

    it('negative: should throw an error if maximum retry count is reached', async () => {
      const retryCount = 2;
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(null);
      AsanaAuthServiceMock.handleUnauthorizedError.mockResolvedValue(retryCount);

      const result = await asanaService.getTasksOwnedByUser(userDummy.id, portalId, projectId);

      expect(result).toBeUndefined();
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ASANA,
        userDummy.id,
      );
    });
  });

  describe('getPortals', () => {
    it('positive: should return portals owned by the user', async () => {
      const asanaData = {
        access_token: 'test-access-token',
      };

      const response = {
        data: {
          data: [
            { id: 'portal-1', name: 'Portal 1' },
            { id: 'portal-2', name: 'Portal 2' },
          ],
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: asanaData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await asanaService.getPortals(userDummy.id);

      expect(result).toEqual(response.data?.data);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ASANA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith('https://app.asana.com/api/1.0/workspaces', {
        headers: {
          Authorization: `Bearer ${asanaData.access_token}`,
        },
      });
    });
  });

  describe('getTasks', () => {
    const projectId = 'test-project-id';
    const portalId = 'test-portal-id';

    it('positive: should return tasks for a given project', async () => {
      const asanaData = {
        access_token: 'test-access-token',
      };

      const response = {
        data: {
          data: [
            { id: 'task-1', name: 'Task 1', completed: false, due_on: null, actual_time_minutes: null },
            { id: 'task-2', name: 'Task 2', completed: true, due_on: '2023-10-30', actual_time_minutes: 120 },
          ],
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: asanaData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await asanaService.getTasks(userDummy.id, projectId, portalId);

      expect(result).toEqual(response.data?.data ?? []);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ASANA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://app.asana.com/api/1.0/projects/${projectId}/tasks`, {
        headers: {
          Authorization: `Bearer ${asanaData.access_token}`,
        },
        params: {
          opt_fields: 'name,completed,due_on,actual_time_minutes',
        },
      });
    });
  });

  describe('getProjects', () => {
    const portalId = 'test-portal-id';

    it('positive: should return projects for a given user and portal', async () => {
      const asanaData = {
        access_token: 'test-access-token',
      };

      const response = {
        data: {
          data: [
            { id: 'project-1', name: 'Project 1' },
            { id: 'project-2', name: 'Project 2' },
          ],
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: asanaData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await asanaService.getProjects(userDummy.id, portalId);

      expect(result).toEqual(response.data?.data ?? []);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ASANA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://app.asana.com/api/1.0/projects?workspace=${portalId}`, {
        headers: {
          Authorization: `Bearer ${asanaData.access_token}`,
        },
      });
    });
  });

  describe('getProject', () => {
    const portalId = 'test-portal-id';
    const projectId = 'test-project-id';

    it('positive: should return a project for a given user, portal, and project ID', async () => {
      const asanaData = {
        access_token: 'test-access-token',
      };

      const response = {
        data: {
          data: {
            id: projectId,
            name: 'Test Project',
            // Additional project properties...
          },
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: asanaData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await asanaService.getProject(userDummy.id, portalId, projectId);

      expect(result).toEqual(response.data?.data);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ASANA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://app.asana.com/api/1.0/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${asanaData.access_token}`,
        },
      });
    });

    it('negative: should return undefined if platform integration record is not found', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(null);
      const result = await asanaService.getProject(userDummy.id, portalId, projectId);

      expect(result).toBeUndefined();
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ASANA,
        userDummy.id,
      );
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('addTimeEntry', () => {
    const portalId = 'test-portal-id';
    const projectId = 'test-project-id';
    const taskId = 'test-task-id';
    const timeEntry = {
      hours: '2:30',
    };

    it('positive: should add a time entry for a given user, portal, project, task, and time entry data', async () => {
      const asanaData = {
        access_token: 'test-access-token',
      };
      const response = {
        data: {
          data: {
            id: 'time-entry-id',
            duration_minutes: 150,
            // Additional time entry properties...
          },
        },
      };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: asanaData,
      });

      mockedAxios.post.mockResolvedValue(response);

      const result = await asanaService.addTimeEntry(userDummy.id, portalId, projectId, taskId, timeEntry);

      expect(result).toEqual(response.data?.data);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ASANA,
        userDummy.id,
      );
    });
  });
});
