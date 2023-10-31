import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { BadRequestException } from '@nestjs/common';
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

    it('negative: should throw an error if the response status is 401', async () => {
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

      const result = clickupService.updateTaskStatus(userDummy.id, portalId, projectId, taskId, statusId);

      expect(result).rejects.toThrowError('Failed to update task status after trying to get new access token.');
    });

    it('negative: should throw an error if the request fails', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
        },
      });

      mockedAxios.put.mockRejectedValue(new Error('Request failed'));

      const result = clickupService.updateTaskStatus(userDummy.id, portalId, projectId, taskId, statusId);
      expect(result).rejects.toThrowError('Request failed');
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
          tasks: [clickupTaskDummy],
        },
      };
      const resultTask = {
        id: clickupTaskDummy.id,
        name: clickupTaskDummy.name,
        key: clickupTaskDummy.name,
        description: '',
        status: clickupTaskDummy.status.status,
        external_metadata: { ...clickupTaskDummy, portal_id: portalId, project_id: projectId },
      };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: clickupData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await clickupService.getTasksOwnedByUser(userDummy.id, portalId, projectId);

      expect(result).toEqual([resultTask]);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.CLICK_UP,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://api.clickup.com/api/v2/list/${projectId}/task`, {
        headers: {
          Authorization: clickupData.access_token,
          'Content-Type': 'application/json',
        },
      });
    });

    it('negative: should throw an exception if the response status is 401', async () => {
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
        `Failed to ${IntegrationPlatforms.CLICK_UP} get task owned by user after trying to get new access token.`,
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

      expect(result).toEqual([{ id: 'portal1' }, { id: 'portal2' }]);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.CLICK_UP,
        userDummy.id,
      );
      expect(axios.get).toHaveBeenCalledWith('https://api.clickup.com/api/v2/team', {
        headers: { Authorization: `Bearer ${clickupData.access_token}` },
      });
    });

    it('negative: should throw an error if the response status is 401', async () => {
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

      await expect(() => clickupService.getPortals(userDummy.id)).rejects.toThrow(Error);
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
          lists: [
            { id: 'project1', name: 'Project 1' },
            { id: 'project2', name: 'Project 2' },
          ],
        },
      };
      const resultProjects = [
        { id: 'project1', name: 'Project 1', key: 'Project 1', description: '', portal_id: portalId },
        { id: 'project2', name: 'Project 2', key: 'Project 2', description: '', portal_id: portalId },
      ];

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: clickupData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await clickupService.getProjects(userDummy.id, portalId);

      expect(result).toEqual(resultProjects);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.CLICK_UP,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://api.clickup.com/api/v2/team/${portalId}/list`, {
        headers: { Authorization: `Bearer ${clickupData.access_token}` },
      });
    });

    it('negative: should throw an Error if the platform integration record is not found', async () => {
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

      await expect(() => clickupService.getProjects(userDummy.id, portalId)).rejects.toThrow(Error);
    });

    it('should throw a Error if an error occurs', async () => {
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

      const resultProject = {
        id: projectId,
        name: 'Test Project',
        key: 'Test Project',
        description: '',
        portal_id: portalId,
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: clickupData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await clickupService.getProject(userDummy.id, portalId, projectId);

      expect(result).toEqual(resultProject);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.CLICK_UP,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://api.clickup.com/api/v2/list/${projectId}`, {
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
    const date = 1595282645000;

    const timeEntry = {
      seconds: 300,
      date,
    };

    it('positive: should add a new time entry to the specified task', async () => {
      const clickupData = {
        access_token: 'test-access-token',
      };
      const response = { data: {} };
      const timestamp = new Date(timeEntry.date).getTime() / 1000;
      const data = {
        duration: timeEntry.seconds * 1000,
        tid: taskId,
        start: timestamp,
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: clickupData,
      });

      mockedAxios.post.mockResolvedValue(response);

      await clickupService.addTimeEntry(userDummy.id, portalId, projectId, taskId, timeEntry);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `https://api.clickup.com/api/v2/team/${portalId}/time_entries`,
        JSON.stringify(data),
        {
          headers: {
            Authorization: clickupData.access_token,
            'Content-Type': 'application/json',
          },
        },
      );

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.CLICK_UP,
        userDummy.id,
      );
    });

    it('negative: should throw an Error if the platform integration record is not found', async () => {
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
