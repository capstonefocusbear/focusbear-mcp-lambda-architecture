import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { savedClickupTaskDummy, clickupTaskDummy } from '../../../../test/dummies/integration.dummies';
import { userDummy } from '../../../../test/dummies';
import { PlatformIntegrationsServiceMock, SentryServiceMock, ClickupAuthServiceMock } from '../../../../test/mocks';
import {
  FocusModeTagRepositoryMock,
  SyncedProjectsRepositoryMock,
  ToDoRepositoryMock,
  UserRepositoryMock,
} from '../../../../test/mocks/repositories.mock';
import { ClickupService } from './clickup.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { ClickupAuthService } from '../../auth/services/clickup-auth.service';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('clickupService', () => {
  let clickupService: ClickupService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClickupService,
        UserRepository,
        FocusModeTagRepository,
        ToDoRepository,
        ClickupAuthService,
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
      .overrideProvider(ClickupAuthService)
      .useValue(ClickupAuthServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .overrideProvider(SyncedProjectsRepository)
      .useValue(SyncedProjectsRepositoryMock)
      .compile();
    clickupService = moduleRef.get<ClickupService>(ClickupService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('positive: should be defined', () => {
    expect(clickupService).toBeDefined();
  });

  describe('getUser', () => {
    it('positive: user should be fetched from DB', async () => {
      ToDoRepositoryMock.orm.find.mockResolvedValueOnce([savedClickupTaskDummy]);

      await clickupService.getUser(userDummy.id);

      expect(UserRepositoryMock.orm.findOneBy).toBeCalledWith({ id: userDummy.id });
    });
  });

  describe('getClickupTasksToSync', () => {
    it('positive: returns tasks already saved and ones that need to be synced', async () => {
      ToDoRepositoryMock.orm.find.mockResolvedValueOnce([savedClickupTaskDummy]);

      const result = await clickupService.getClickupTasksToSync([clickupTaskDummy], userDummy.id);

      expect(result.tasksToSync.length).toBe(0);
      expect(result.syncedClickupTasks.length).toBe(1);
    });
  });

  describe('updateTaskStatus', () => {
    const portalId = 'test-portal-id';
    const projectId = 'test-project-id';
    const taskId = 'test-task-id';
    const statusId = 'test-status-id';

    it('positive: should update task status successfully', async () => {
      const clickupData = {
        access_token: 'test-access-token',
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: clickupData,
      });

      mockedAxios.put.mockResolvedValue({
        data: 'Task updated successfully',
      });

      const result = await clickupService.updateTaskStatus(userDummy.id, portalId, projectId, taskId, statusId);

      expect(result).toEqual('Task updated successfully');
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.CLICK_UP,
        userDummy.id,
      );
      expect(mockedAxios.put).toHaveBeenCalledWith(
        `https://api.clickup.com/api/v2/task/${taskId}`,
        { list_id: statusId },
        { headers: { Authorization: `Bearer ${clickupData.access_token}` } },
      );
    });

    it('negative: should throw an UnauthorizedException if the response status is 401', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
        },
      });

      mockedAxios.put.mockRejectedValue({
        response: {
          status: 401,
        },
      });

      const result = await clickupService.updateTaskStatus(userDummy.id, portalId, projectId, taskId, statusId);

      expect(result).rejects.toThrowError('Auth Failed');
    });

    it('negative: should throw an error if the request fails', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
        },
      });

      mockedAxios.put.mockRejectedValue(new Error('Request failed'));

      const result = clickupService.updateTaskStatus(userDummy.id, portalId, projectId, taskId, statusId);
      expect(result).rejects.toThrowError('Failed to add Clickup task updateTaskStatus.');
    });
  });

  describe('getTasksOwnedByUser', () => {
    const portalId = 'test-portal-id';
    const projectId = 'test-project-id';

    it('positive: should return tasks owned by the user with project IDs', async () => {
      const clickupData = {
        access_token: 'test-access-token',
      };

      const response = {
        data: {
          tasks: [
            { id: 'task1', name: 'Task 1' },
            { id: 'task2', name: 'Task 2' },
          ],
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: clickupData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await clickupService.getTasksOwnedByUser(userDummy.id, portalId, projectId);

      expect(result).toEqual([
        { id: 'task1', name: 'Task 1', project_Id: projectId },
        { id: 'task2', name: 'Task 2', project_Id: projectId },
      ]);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.CLICK_UP,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://api.clickup.com/api/v2/team/${portalId}/task`, {
        headers: { Authorization: `Bearer ${clickupData.access_token}` },
      });
    });

    it('negative: should throw an UnauthorizedException if the response status is 401', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
        },
      });

      mockedAxios.get.mockRejectedValue({
        response: {
          status: 401,
        },
      });

      await expect(() => clickupService.getTasksOwnedByUser(userDummy.id, portalId, projectId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('negative: should throw an error if an unexpected error occurs', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
        },
      });

      mockedAxios.get.mockRejectedValue(new Error('Unexpected error'));

      await expect(() => clickupService.getTasksOwnedByUser(userDummy.id, portalId, projectId)).rejects.toThrow(Error);
    });
  });

  describe('getPortals', () => {
    it('positive: should return the list of portals', async () => {
      const clickupData = {
        access_token: 'test-access-token',
      };

      const response = {
        data: {
          teams: [
            { id: 'portal1', name: 'Portal 1' },
            { id: 'portal2', name: 'Portal 2' },
          ],
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: clickupData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await clickupService.getPortals(userDummy.id);

      expect(result).toEqual(response.data.teams);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.CLICK_UP,
        userDummy.id,
      );
      expect(axios.get).toHaveBeenCalledWith('https://api.clickup.com/api/v2/team', {
        headers: { Authorization: `Bearer ${clickupData.access_token}` },
      });
    });

    it('negative: should throw an UnauthorizedException if the response status is 401', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
        },
      });

      mockedAxios.get.mockRejectedValue({
        response: {
          status: 401,
        },
      });

      await expect(() => clickupService.getPortals(userDummy.id)).rejects.toThrow(UnauthorizedException);
    });

    it('negative: should throw an error if an unexpected error occurs', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
        },
      });

      mockedAxios.get.mockRejectedValue(new Error('Some error'));

      await expect(() => clickupService.getPortals(userDummy.id)).rejects.toThrow(Error);
    });
  });

  describe('getTasks', () => {
    const projectId = 'test-project-id';
    const portalId = 'test-portal-id';

    it('positive: should return the list of tasks for the specified project', async () => {
      const clickupData = {
        access_token: 'test-access-token',
      };

      const response = {
        data: {
          tasks: [
            { id: 'task1', name: 'Task 1' },
            { id: 'task2', name: 'Task 2' },
          ],
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: clickupData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await clickupService.getTasks(userDummy.id, projectId, portalId);

      expect(result).toEqual(response.data.tasks);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.CLICK_UP,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://api.clickup.com/api/v2/folder/${projectId}/task`, {
        headers: { Authorization: `Bearer ${clickupData.access_token}` },
      });
    });

    it('negative: should throw a BadRequestException if an error occurs', async () => {
      const error = new Error('Test error');

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockRejectedValue(error);

      await expect(() => clickupService.getTasks(userDummy.id, projectId, portalId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getProjects', () => {
    const portalId = 'test-portal-id';

    it('positive: should return the list of projects for the specified portal', async () => {
      const clickupData = {
        access_token: 'test-access-token',
      };

      const response = {
        data: {
          folders: [
            { id: 'project1', name: 'Project 1' },
            { id: 'project2', name: 'Project 2' },
          ],
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: clickupData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await clickupService.getProjects(userDummy.id, portalId);

      expect(result).toEqual(response.data.folders);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.CLICK_UP,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://api.clickup.com/api/v2/team/${portalId}/folder`, {
        headers: { Authorization: `Bearer ${clickupData.access_token}` },
      });
    });

    it('negative: should throw an UnauthorizedException if the platform integration record is not found', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
        },
      });

      mockedAxios.get.mockRejectedValue({
        response: {
          status: 401,
        },
      });

      await expect(() => clickupService.getProjects(userDummy.id, portalId)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw a BadRequestException if an error occurs', async () => {
      const error = new Error('Test error');

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockRejectedValue(error);

      await expect(() => clickupService.getProjects(userDummy.id, portalId)).rejects.toThrow(Error);
    });
  });

  describe('getProject', () => {
    const portalId = 'test-portal-id';
    const projectId = 'test-project-id';

    it('positive: should return the project data for the specified project', async () => {
      const clickupData = {
        access_token: 'test-access-token',
      };

      const response = {
        data: {
          id: projectId,
          name: 'Test Project',
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: clickupData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await clickupService.getProject(userDummy.id, portalId, projectId);

      expect(result).toEqual(response.data);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.CLICK_UP,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://api.clickup.com/api/v2/folder/${projectId}`, {
        headers: { Authorization: `Bearer ${clickupData.access_token}` },
      });
    });

    it('negative: should return undefined if the platform integration record is not found', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(null);

      const result = await clickupService.getProject(userDummy.id, portalId, projectId);

      expect(result).toBeUndefined();
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.CLICK_UP,
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

    it('positive: should add a new time entry to the specified task', async () => {
      const clickupData = {
        access_token: 'test-access-token',
      };

      const response = {
        data: {
          duration_minutes: 150,
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: clickupData,
      });

      mockedAxios.post.mockResolvedValue(response);

      const result = await clickupService.addTimeEntry(userDummy.id, portalId, projectId, taskId, timeEntry);

      expect(result).toEqual(response.data);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.CLICK_UP,
        userDummy.id,
      );
    });

    it('negative: should throw an UnauthorizedException if the platform integration record is not found', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(null);

      const result = await clickupService.addTimeEntry(userDummy.id, portalId, projectId, taskId, timeEntry);

      expect(result).toBeUndefined();
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.CLICK_UP,
        userDummy.id,
      );
    });

    it('negative: should throw an Error if the API request fails', async () => {
      const clickupData = {
        access_token: 'test-access-token',
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: clickupData,
      });

      mockedAxios.post.mockRejectedValue(new Error('API request failed'));

      const result = clickupService.addTimeEntry(userDummy.id, portalId, projectId, taskId, timeEntry);

      await expect(result).rejects.toThrow(Error);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.CLICK_UP,
        userDummy.id,
      );
    });
  });
});
