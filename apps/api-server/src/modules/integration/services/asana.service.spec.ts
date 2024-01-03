import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import axios from 'axios';
import { getQueueToken } from '@nestjs/bull';
import { asanaTaskDummy } from '../../../../test/dummies/integration.dummies';
import { QueueMock, userDummy } from '../../../../test/dummies';
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
import { BullQueues } from '../../../shared/utils/constants';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('asanaService', () => {
  let asanaService: AsanaService;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.clearAllMocks();

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
        {
          provide: getQueueToken(BullQueues.SYNC_TASKS),
          useValue: QueueMock,
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

  it('positive: should be defined', () => {
    expect(asanaService).toBeDefined();
  });

  describe('getUser', () => {
    it('positive: user should be fetched from DB', async () => {
      await asanaService.getUser(userDummy.id);

      expect(UserRepositoryMock.orm.findOneBy).toBeCalledWith({ id: userDummy.id });
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
          data: [asanaTaskDummy],
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: asanaData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await asanaService.getTasksOwnedByUser(userDummy.id, portalId, projectId);

      expect(result).toEqual([
        {
          id: 'test-id',
          name: 'test-name',
          description: 'test-notes',
          key: '',
          external_status: 'section-id',
          external_metadata: {
            id: 'test-id',
            ...asanaTaskDummy,
            project_id: projectId,
            portal_id: portalId,
          },
        },
      ]);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ASANA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://app.asana.com/api/1.0/projects/${projectId}/tasks`, {
        headers: {
          Authorization: `Bearer ${asanaData.access_token}`,
        },
        params: {
          opt_fields: 'name,notes,memberships.section',
        },
      });
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
            { gid: 'portal-1', name: 'Portal 1' },
            { gid: 'portal-2', name: 'Portal 2' },
          ],
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: asanaData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await asanaService.getPortals(userDummy.id);

      expect(result).toEqual([{ id: 'portal-1' }, { id: 'portal-2' }]);
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

  describe('getProjects', () => {
    const portalId = 'test-portal-id';

    it('positive: should return projects for a given user and portal', async () => {
      const asanaData = {
        access_token: 'test-access-token',
      };

      const response = {
        data: {
          data: [
            { gid: 'project-1', name: 'Project 1' },
            { gid: 'project-2', name: 'Project 2' },
          ],
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: asanaData,
      });

      mockedAxios.get.mockResolvedValue(response);

      const result = await asanaService.getProjects(userDummy.id, portalId);

      expect(result).toEqual([
        { id: 'project-1', name: 'Project 1', description: undefined, key: '' },
        { id: 'project-2', name: 'Project 2', description: undefined, key: '' },
      ]);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ASANA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith('https://app.asana.com/api/1.0/projects', {
        headers: {
          Authorization: `Bearer ${asanaData.access_token}`,
        },
        params: {
          workspace: 'test-portal-id',
          opt_fields: 'name,notes',
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
            gid: projectId,
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

      expect(result).toEqual({
        id: projectId,
        name: 'Test Project',
        key: '',
        description: undefined,
      });
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
