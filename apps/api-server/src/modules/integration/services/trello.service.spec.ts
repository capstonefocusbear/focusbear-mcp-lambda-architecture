import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import axios from 'axios';
import { userDummy } from '../../../../test/dummies';
import { PlatformIntegrationsServiceMock, SentryServiceMock, TrelloAuthServiceMock } from '../../../../test/mocks';
import {
  FocusModeTagRepositoryMock,
  SyncedProjectsRepositoryMock,
  ToDoRepositoryMock,
  UserRepositoryMock,
} from '../../../../test/mocks/repositories.mock';
import { TrelloService } from './trello.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { TrelloAuthService } from '../../auth/services/trello-auth.service';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { PlatformIntegration } from '../../platform-integrations/entities/platform-integration.entity';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { SyncedProject } from '../../to-do/entities/synced-project.entity';
import { trelloTaskDummy } from '../../../../test/dummies/integration.dummies';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('trelloService', () => {
  let trelloService: TrelloService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TrelloService,
        UserRepository,
        FocusModeTagRepository,
        ToDoRepository,
        TrelloAuthService,
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
      .overrideProvider(TrelloAuthService)
      .useValue(TrelloAuthServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .overrideProvider(SyncedProjectsRepository)
      .useValue(SyncedProjectsRepositoryMock)
      .compile();
    trelloService = moduleRef.get<TrelloService>(TrelloService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('positive: should be defined', () => {
    expect(trelloService).toBeDefined();
  });

  describe('getUser', () => {
    it('positive: user should be fetched from DB', async () => {
      await trelloService.getUser(userDummy.id);

      expect(UserRepositoryMock.orm.findOneBy).toBeCalledWith({ id: userDummy.id });
    });
  });

  describe('updateTaskStatus', () => {
    it('positive: should call httpService.post with the correct arguments', async () => {
      const taskId = 'task123';
      const statusId = 'status123';
      const access_token = 'token123';
      const client_id = 'key123';

      const platformIntegrationRecord = {
        data: {
          access_token,
          client_id,
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(platformIntegrationRecord);

      const expectedUrl = `https://api.trello.com/1/cards/${taskId}/idList`;
      const expectedParams = {
        key: client_id,
        token: access_token,
        value: statusId,
      };

      const mockResponse = {
        data: { id: 'task123' },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await trelloService.updateTaskStatus(userDummy.id, null, null, taskId, statusId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.TRELLO,
        userDummy.id,
      );
      expect(mockedAxios.post).toHaveBeenCalledWith(expectedUrl, null, { params: expectedParams });
      expect(result).toEqual({ id: 'task123' });
    });

    it('negative: should throw an error if platformIntegrationRecord is not found', async () => {
      const taskId = 'task123';
      const statusId = 'status123';

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(undefined);

      const result = await trelloService.updateTaskStatus(userDummy.id, null, null, taskId, statusId);
      expect(result).toBeUndefined();
    });
  });

  describe('getTaskOwnedByUser', () => {
    it('positive: should call httpService.post with the correct arguments', async () => {
      const portalId = 'portalId123';
      const projectId = 'projectId123';
      const trelloData = {
        access_token: 'token123',
        client_id: 'key123',
      };
      const platformIntegrationRecord = {
        data: trelloData,
      };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(platformIntegrationRecord);
      const expectedUrl = `https://api.trello.com/1/boards/${projectId}/cards`;
      const expectedParams = {
        key: trelloData.client_id,
        token: trelloData.access_token,
      };

      const mockResponse = {
        data: [{ id: '9080', name: 'task1', desc: 'new task 1' }],
      };

      mockedAxios.get.mockResolvedValue(mockResponse);
      const expectedTasks = [
        {
          id: '9080',
          name: 'task1',
          description: 'new task 1',
          key: '',
          external_metadata: {
            id: '9080',
            name: 'task1',
            desc: 'new task 1',
            project_id: projectId,
            portal_id: portalId,
          },
        },
      ];

      const tasks = await trelloService.getTasksOwnedByUser(userDummy.id, portalId, projectId);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.TRELLO,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(expectedUrl, { params: expectedParams });
      expect(tasks).toEqual(expectedTasks);
    });

    it('negative: should return an empty array if platformIntegrationRecord is not found', async () => {
      const projectId = 'project123';

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(undefined);

      const tasks = await trelloService.getTasksOwnedByUser(userDummy.id, null, projectId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.TRELLO,
        userDummy.id,
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(tasks).toBeUndefined();
    });
  });

  describe('getPortals', () => {
    it('positive: should return the list of portals', async () => {
      const trelloData = {
        client_id: 'client_id',
        access_token: 'access_token',
      };
      const portals = [{ id: 'portal1' }, { id: 'portal2' }];
      mockedAxios.get.mockResolvedValueOnce({ data: portals });
      const platformIntegrationRecord = {
        data: trelloData,
      };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(platformIntegrationRecord);

      const result = await trelloService.getPortals(userDummy.id);

      expect(axios.get).toHaveBeenCalledWith('https://api.trello.com/1/members/me/organizations', {
        params: {
          key: trelloData.client_id,
          token: trelloData.access_token,
        },
      });
      expect(result).toEqual(portals);
    });

    it('negative: should throw an UnauthorizedException if platform integration record is not found', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(null);
      const result = trelloService.getPortals(userDummy.id);
      expect(result).rejects.toThrow(UnauthorizedException);
    });

    it('negative: should throw an error if the request fails', async () => {
      const error = new Error('Failed to get portals');
      mockedAxios.get.mockRejectedValueOnce(error);
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(null);
      const result = trelloService.getPortals(userDummy.id);
      expect(result).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('upsertSyncedProjectRecord', () => {
    it('positive: if no record exists for project, new synced project record should be saved', async () => {
      const portalId = 'portal123';
      const projectId = 'project123';
      const syncedProjects = [];
      const newProject = new SyncedProject({
        user_id: userDummy.id,
        external_project_id: projectId,
        external_portal_id: portalId,
        available_statuses: undefined,
        platform: IntegrationPlatforms.TRELLO,
      });

      mockedAxios.get.mockResolvedValueOnce(SyncedProject);
      SyncedProjectsRepositoryMock.orm.find.mockResolvedValueOnce(syncedProjects);
      SyncedProjectsRepositoryMock.orm.save.mockResolvedValueOnce(newProject);

      const result = await trelloService.upsertSyncedProjectRecord(userDummy.id, portalId, projectId);

      expect(SyncedProjectsRepositoryMock.orm.find).toHaveBeenCalledWith({ where: { user_id: userDummy.id } });
      expect(SyncedProjectsRepositoryMock.orm.save).toHaveBeenCalledWith(newProject);
      expect(result).toEqual(newProject);
    });

    it('positive: if new statuses are returned from Trello, they should be saved to existing synced project record', async () => {
      const portalId = 'portal-dummy-id';
      const projectId = 'project-dummy-id';
      const existingStatusDummy = { title: 'Done', id: 'test-id' };
      const incomingStatusDummy = { title: 'In Progress', id: 'test-id' };
      const syncedProjectDBResponseDummy = new SyncedProject({
        user_id: userDummy.id,
        external_project_id: projectId,
        available_statuses: [
          { label: existingStatusDummy.title, status_id: existingStatusDummy.id, should_complete_task: false },
          { label: incomingStatusDummy.title, status_id: incomingStatusDummy.id, should_complete_task: false },
        ],
        platform: IntegrationPlatforms.TRELLO,
      });
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(
        new PlatformIntegration({ user_id: userDummy.id, platform: IntegrationPlatforms.TRELLO, data: {} }),
      );
      mockedAxios.get.mockResolvedValueOnce([
        { label: existingStatusDummy.title, status_id: existingStatusDummy.id, should_complete_task: false },
        { label: incomingStatusDummy.title, status_id: incomingStatusDummy.id, should_complete_task: false },
      ]);
      SyncedProjectsRepositoryMock.orm.find.mockResolvedValueOnce([syncedProjectDBResponseDummy]);

      await trelloService.upsertSyncedProjectRecord(userDummy.id, portalId, projectId);

      expect(SyncedProjectsRepositoryMock.orm.save).toBeCalledWith(
        new SyncedProject({
          ...syncedProjectDBResponseDummy,
        }),
      );
    });
  });

  describe('getTasks: when platform integration record is not found', () => {
    it('should return undefined', async () => {
      const projectId = 'project123';

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(undefined);

      const result = await trelloService.getTasks(userDummy.id, projectId, null);

      expect(result).toBeUndefined();
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.TRELLO,
        userDummy.id,
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('getTasks: when platform integration record is found', () => {
    it('should return tasks data', async () => {
      const projectId = 'project123';
      const task = { id: 'task1', name: 'Task 1', desc: 'task', idList: '123' };
      const resultTasks = [
        {
          id: 'task1',
          name: 'Task 1',
          key: '',
          description: 'task',
          status: '123',
          external_metadata: { ...task },
        },
      ];
      const trelloData = {
        client_id: 'client_id',
        access_token: 'access_token',
      };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce({
        data: trelloData,
      });
      mockedAxios.get.mockResolvedValueOnce({ data: [task] });
      const params = {
        key: trelloData.client_id,
        token: trelloData.access_token,
      };
      const result = await trelloService.getTasks(userDummy.id, projectId, null);

      expect(result).toEqual(resultTasks);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.TRELLO,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://api.trello.com/1/boards/${projectId}/cards`, {
        params,
      });
    });
  });

  describe('getProjects', () => {
    it.only('positive: should return an array of projects when the request is successful', async () => {
      const portalId = 'portal123';
      const platformIntegrationRecord = {
        data: {
          client_id: 'client_id',
          access_token: 'access_token',
        },
      };
      const projects = [
        {
          id: 'test-id',
          name: 'test-name',
          key: '',
          description: 'test-description',
        },
      ];

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(platformIntegrationRecord);
      mockedAxios.get.mockResolvedValueOnce({ data: [trelloTaskDummy] });

      const result = await trelloService.getProjects(userDummy.id, portalId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.TRELLO,
        userDummy.id,
      );

      expect(mockedAxios.get).toHaveBeenCalledWith(`https://api.trello.com/1/organizations/${portalId}/boards`, {
        params: {
          key: platformIntegrationRecord.data.client_id,
          token: platformIntegrationRecord.data.access_token,
        },
      });
      expect(result).toEqual(projects);
    });
  });
});
