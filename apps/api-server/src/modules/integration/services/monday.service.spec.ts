import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { savedMondayTaskDummy, mondayTaskDummy } from '../../../../test/dummies/integration.dummies';
import { userDummy } from '../../../../test/dummies';
import { PlatformIntegrationsServiceMock, SentryServiceMock, MondayAuthServiceMock } from '../../../../test/mocks';
import {
  FocusModeTagRepositoryMock,
  SyncedProjectsRepositoryMock,
  ToDoRepositoryMock,
  UserRepositoryMock,
} from '../../../../test/mocks/repositories.mock';
import { MondayService } from './monday.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { MondayAuthService } from '../../auth/services/monday-auth.service';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { PlatformIntegration } from '../../platform-integrations/entities/platform-integration.entity';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { SyncedProject } from '../../to-do/entities/synced-project.entity';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('mondayService', () => {
  let mondayService: MondayService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MondayService,
        UserRepository,
        FocusModeTagRepository,
        ToDoRepository,
        MondayAuthService,
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
      .overrideProvider(MondayAuthService)
      .useValue(MondayAuthServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .overrideProvider(SyncedProjectsRepository)
      .useValue(SyncedProjectsRepositoryMock)
      .compile();
    mondayService = moduleRef.get<MondayService>(MondayService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('positive: should be defined', () => {
    expect(mondayService).toBeDefined();
  });

  describe('getUser', () => {
    it('positive: user should be fetched from DB', async () => {
      ToDoRepositoryMock.orm.find.mockResolvedValueOnce([savedMondayTaskDummy]);

      await mondayService.getUser(userDummy.id);

      expect(UserRepositoryMock.orm.findOneBy).toBeCalledWith({ id: userDummy.id });
    });
  });

  describe('getMondayTasksToSync', () => {
    it('positive: returns tasks already saved and ones that need to be synced', async () => {
      ToDoRepositoryMock.orm.find.mockResolvedValueOnce([savedMondayTaskDummy]);

      const result = await mondayService.getMondayTasksToSync([mondayTaskDummy], userDummy.id);

      expect(result.tasksToSync.length).toBe(0);
      expect(result.syncedMondayTasks.length).toBe(1);
    });
  });

  describe('updateTaskStatus', () => {
    it('positive: should call httpService.post with the correct arguments', async () => {
      const taskId = 'task123';
      const statusId = 'status123';
      const monday_access_token = 'token123';
  
      const platformIntegrationRecord = {
        data: {
            monday_access_token,
        },
      };
  
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(
        platformIntegrationRecord,
      );
  
      const expectedQuery = `mutation  { move_item_to_group ( item_id: ${taskId}, group_id: ${statusId}) { id }  }`;
      const expectedHeaders = { Authorization: `Bearer ${monday_access_token}` };
      const expectedUrl = 'https://api.monday.com/v2';
      
      const mockResponse = {
        data: {
          data: { id: 'task123' },
        },
      };
  
      mockedAxios.post.mockResolvedValue(mockResponse);
  
      const result = await mondayService.updateTaskStatus(userDummy.id, taskId, statusId);
  
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.MONDAY,
        userDummy.id,
      );
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expectedUrl,
        { query: expectedQuery },
        { headers: expectedHeaders },
      );
      expect(result).toEqual({ id: 'task123' });
    });
  
    it('negative: should throw an error if platformIntegrationRecord is not found', async () => {
      const taskId = 'task123';
      const statusId = 'status123';
  
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(undefined);
  
      const result = await mondayService.updateTaskStatus(userDummy.id, taskId, statusId);
      expect(result).toBeUndefined();
    });
  });

  describe('getTaskOwnedByUser', () => {
    it('positive: should call httpService.post with the correct arguments', async () => {
      const projectId = 'project123';
      const monday_access_token = 'token123';

      const platformIntegrationRecord = {
        data: {
          monday_access_token,
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(
        platformIntegrationRecord,
      );
      const expectedUrl = 'https://api.monday.com/v2';
      const expectedQuery = `query {boards (ids: ${projectId}) {items {id name state}}}`;
      const expectedHeaders = { Authorization: `Bearer ${monday_access_token}` };

      const mockResponse = {
        data: {
          data: {
            boards: [
              {
                items: [
                  { id: 'task1', name: 'Task 1', state: 'done' },
                  { id: 'task2', name: 'Task 2', state: 'in progress' },
                ],
              },
            ],
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);
      const expectedTasks = [
        { id: 'task1', name: 'Task 1', state: 'done', project_id: projectId },
        { id: 'task2', name: 'Task 2', state: 'in progress', project_id: projectId },
      ];

      const tasks = await mondayService.getTasksOwnedByUser(userDummy.id, projectId);
      expect (PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.MONDAY,
        userDummy.id,
      );
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expectedUrl,
        { query: expectedQuery },
        { headers: expectedHeaders },
      );

      expect(tasks).toEqual(expectedTasks);

    });

    it('negative: should return an empty array if platformIntegrationRecord is not found', async () => {
      const projectId = 'project123';

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(undefined);

      const tasks = await mondayService.getTasksOwnedByUser(userDummy.id, projectId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.MONDAY,
        userDummy.id,
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(tasks).toBeUndefined();
    })
  })

  describe('getPortals', () => {
    it('negative: if no integration record is found error should be thrown', async () => {
      let exception = null;
      const errorMessage = `User with ID: ${userDummy.id} has not authenticated with Monday!`;

      try {
        await mondayService.getPortals(userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    describe('upsertSyncedProjectRecord', () => {
      it('positive: if no record exists for project, new synced project record should be saved', async () => {
        const portalId = 'portal-dummy-id';
        const projectId = 'project-dummy-id';
        const incomingStatusDummy = { title: 'In Progress', id: 'test-id' };
        const syncedProjectDBResponseDummy = new SyncedProject({
          user_id: userDummy.id,
          external_project_id: projectId,
          external_portal_id: portalId,
          available_statuses: [
            { label: incomingStatusDummy.title, status_id: incomingStatusDummy.id, should_complete_task: false },
          ],
          platform: IntegrationPlatforms.MONDAY,
        });
        PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(
          new PlatformIntegration({ user_id: userDummy.id, platform: IntegrationPlatforms.MONDAY, data: {} }),
        );
        mockedAxios.post.mockResolvedValueOnce({ data: { data: { boards: [ { groups: [incomingStatusDummy] } ] } } });
        // mock no existing projects
        SyncedProjectsRepositoryMock.orm.find.mockResolvedValueOnce([]);

        await mondayService.upsertSyncedProjectRecord(userDummy.id, portalId, projectId);

        expect(SyncedProjectsRepositoryMock.orm.save).toBeCalledWith(
          new SyncedProject({
            ...syncedProjectDBResponseDummy,
          }),
        );
      });

      it('positive: if new statuses are returned from Monday, they should be saved to existing synced project record', async () => {
        const portalId = 'portal-dummy-id';
        const projectId = 'project-dummy-id';
        const existingStatusDummy = { title: 'Done', id: 'test-id' };
        const incomingStatusDummy = { title: 'In Progress', id: 'test-id' };
        const syncedProjectDBResponseDummy = new SyncedProject({
          user_id: userDummy.id,
          external_project_id: projectId,
          available_statuses: [
            { label: existingStatusDummy.title, status_id: existingStatusDummy.id, should_complete_task: false },
          ],
          platform: IntegrationPlatforms.MONDAY,
        });
        PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(
          new PlatformIntegration({ user_id: userDummy.id, platform: IntegrationPlatforms.MONDAY, data: {} }),
        );
        mockedAxios.post.mockResolvedValueOnce({ data: { data: { boards: [ { groups: [existingStatusDummy, incomingStatusDummy] } ] } } });
        SyncedProjectsRepositoryMock.orm.find.mockResolvedValueOnce([syncedProjectDBResponseDummy]);

        await mondayService.upsertSyncedProjectRecord(userDummy.id, portalId, projectId);

        expect(SyncedProjectsRepositoryMock.orm.save).toBeCalledWith(
          new SyncedProject({
            ...syncedProjectDBResponseDummy,
            available_statuses: [
              { label: existingStatusDummy.title, status_id: existingStatusDummy.id, should_complete_task: false },
              { label: incomingStatusDummy.title, status_id: incomingStatusDummy.id, should_complete_task: false },
            ],
          }),
        );
      });
    });
  });
  describe('getTasks: when platform integration record is not found', () => {
    it('should return undefined', async () => {
      const projectId = 'project123';

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(undefined);

      const result = await mondayService.getTasks(userDummy.id, projectId);

      expect(result).toBeUndefined();
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.MONDAY,
        userDummy.id,
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('getTasks: when platform integration record is found', () => {
    it('should return tasks data', async () => {
      const projectId = 'project123';
      const tasksData = [{ id: 'task1', name: 'Task 1' }, { id: 'task2', name: 'Task 2' }];

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce({
        data: {
          monday_access_token: 'token123',
        },
      });
      mockedAxios.post.mockResolvedValueOnce({ data: tasksData });

      const result = await mondayService.getTasks(userDummy.id, projectId);

      expect(result).toEqual(tasksData);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.MONDAY,
        userDummy.id,
      );
      expect(mockedAxios.post).toHaveBeenCalledWith('https://api.monday.com/v2', { query: expect.any(String) }, {
        headers: { Authorization: 'Bearer token123' },
      });
    });
  });

  describe('getProjects', () => {
    it('negative: should return undefined if no platform integration data is found', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(null);
  
      const result = await mondayService.getProjects(userDummy.id, 'portalId');
  
      expect(result).toBeUndefined();
    });
  
    it('positive: should return an empty array if no boards are found', async () => {
      const data = { data: { monday_access_token: 'accessToken' } };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(data);
      mockedAxios.post.mockResolvedValueOnce({ data: { data: { boards: [] } } });
  
      const result = await mondayService.getProjects(userDummy.id, 'portalId');
  
      expect(result).toEqual([]);
    });
  
    it('positive: should return an array of boards if boards are found', async () => {
      const data = { data: { monday_access_token: 'accessToken' } };
      const boards = [{ id: 'board1', name: 'Board 1', state: 'active', permissions: [] }];
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(data);
      mockedAxios.post.mockResolvedValueOnce({ data: { data: { boards } } });
  
      const result = await mondayService.getProjects(userDummy.id, 'portalId');
  
      expect(result).toEqual(boards);
    });
  });
  
  describe('getProject', () => {
    it('negative: should return undefined if the platform integration record is not found', async () => {
      const portalId = 'portalId';
      const projectId = 'projectId';
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(undefined);
  
      const result = await mondayService.getProject(userDummy.id, portalId, projectId);
  
      expect(result).toBeUndefined();
    });
  
    it('positive: should return the project data correctly', async () => {
      const portalId = 'portalId';
      const projectId = 'projectId';
      const data = { data: { monday_access_token: 'access_token' } };
      const boards = [{ id: projectId, name: 'Project 1' }];
      const expectedProject = { id: projectId, name: 'Project 1' };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(data);
      mockedAxios.post.mockResolvedValueOnce({ data: { data: { boards } } });
  
      const result = await mondayService.getProject(userDummy.id, portalId, projectId);
  
      expect(result).toEqual(expectedProject);
    });
  });
  
});
