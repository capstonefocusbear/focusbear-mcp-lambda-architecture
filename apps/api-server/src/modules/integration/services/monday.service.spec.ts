import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { getQueueToken } from '@nestjs/bull';
import { BullQueues, FIELD_NAME_TOTAL, FIELD_NAME_WORKLOG } from '../../../shared/utils/constants';
import { mondayTaskDummy } from '../../../../test/dummies/integration.dummies';
import { QueueMock, userDummy } from '../../../../test/dummies';
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

  beforeAll(async () => {
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
      .overrideProvider(MondayAuthService)
      .useValue(MondayAuthServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .overrideProvider(SyncedProjectsRepository)
      .useValue(SyncedProjectsRepositoryMock)
      .compile();
    mondayService = moduleRef.get<MondayService>(MondayService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it('positive: should be defined', () => {
    expect(mondayService).toBeDefined();
  });

  describe('getUser', () => {
    it('positive: user should be fetched from DB', async () => {
      await mondayService.getUser(userDummy.id);

      expect(UserRepositoryMock.orm.findOneBy).toHaveBeenCalledWith({ id: userDummy.id });
    });
  });

  describe('updateTaskStatus', () => {
    it('positive: should call httpService.post with the correct arguments', async () => {
      const taskId = 'task123';
      const statusId = 'status123';
      const access_token = 'token123';

      const platformIntegrationRecord = {
        data: {
          access_token,
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(platformIntegrationRecord);

      const expectedQuery = `mutation  { move_item_to_group ( item_id: ${taskId}, group_id: ${statusId}) { id }  }`;
      const expectedHeaders = { Authorization: `Bearer ${access_token}` };
      const expectedUrl = 'https://api.monday.com/v2';

      const mockResponse = {
        data: {
          data: { id: 'task123' },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await mondayService.updateTaskStatus(userDummy.id, null, null, taskId, statusId);

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

      const result = await mondayService.updateTaskStatus(userDummy.id, null, null, taskId, statusId);
      expect(result).toBeUndefined();
    });
  });

  describe('getTaskOwnedByUser', () => {
    it('positive: should call httpService.post with the correct arguments', async () => {
      const projectId = 'project123';
      const access_token = 'token123';

      const platformIntegrationRecord = {
        data: {
          access_token,
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(platformIntegrationRecord);
      const expectedUrl = 'https://api.monday.com/v2';
      const expectedQuery = `query { boards(ids: ${projectId}) {items { id name group { id } }}}`;
      const expectedHeaders = { Authorization: `Bearer ${access_token}` };

      const mockResponse = {
        data: {
          data: {
            boards: [
              {
                items: [mondayTaskDummy],
              },
            ],
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);
      const expectedTasks = [
        {
          id: 'task1',
          name: 'Task 1',
          external_status: 'group1',
          key: '',
          description: '',
          external_metadata: { ...mondayTaskDummy, project_id: projectId, portal_id: null },
        },
      ];

      const tasks = await mondayService.getTasksOwnedByUser(userDummy.id, null, projectId);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
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

    it('negative: should return an undefined if platformIntegrationRecord is not found', async () => {
      const projectId = 'project123';

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(undefined);

      const tasks = await mondayService.getTasksOwnedByUser(userDummy.id, null, projectId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.MONDAY,
        userDummy.id,
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(tasks).toBeUndefined();
    });
  });

  describe('getPortals', () => {
    it('negative: if no integration record is found error should be thrown', async () => {
      let exception = null;
      const errorMessage = `User with ID: ${userDummy.id} is not authorized to access portals`;

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
        mockedAxios.post.mockResolvedValueOnce({ data: { data: { boards: [{ groups: [incomingStatusDummy] }] } } });
        // mock no existing projects
        SyncedProjectsRepositoryMock.orm.find.mockResolvedValueOnce([]);

        await mondayService.upsertSyncedProjectRecord(userDummy.id, portalId, projectId);

        expect(SyncedProjectsRepositoryMock.orm.save).toHaveBeenCalledWith(
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
        mockedAxios.post.mockResolvedValueOnce({
          data: { data: { boards: [{ groups: [existingStatusDummy, incomingStatusDummy] }] } },
        });
        SyncedProjectsRepositoryMock.orm.find.mockResolvedValueOnce([syncedProjectDBResponseDummy]);

        await mondayService.upsertSyncedProjectRecord(userDummy.id, portalId, projectId);

        expect(SyncedProjectsRepositoryMock.orm.save).toHaveBeenCalledWith(
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

      const result = await mondayService.getTasks(userDummy.id, projectId, null);

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
      const portalId = 'portal123';
      const projectId = 'project123';
      const tasksData = [mondayTaskDummy];
      const resultTask = {
        id: 'task1',
        name: 'Task 1',
        external_status: 'group1',
        key: '',
        description: '',
        external_metadata: { ...mondayTaskDummy, project_id: projectId, portal_id: portalId },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce({
        data: {
          access_token: 'token123',
        },
      });
      mockedAxios.post.mockResolvedValue({ data: { data: { boards: [{ items: tasksData }] } } });

      const result = await mondayService.getTasks(userDummy.id, portalId, projectId);

      expect(result).toEqual([resultTask]);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.MONDAY,
        userDummy.id,
      );
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        { query: expect.any(String) },
        {
          headers: { Authorization: 'Bearer token123' },
        },
      );
    });
  });

  describe('getProjects', () => {
    it('negative: should return undefined if no platform integration data is found', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(null);

      const result = await mondayService.getProjects(userDummy.id, 'portalId');

      expect(result).toBeUndefined();
    });

    it('positive: should return an empty array if no boards are found', async () => {
      const data = { data: { access_token: 'accessToken' } };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(data);
      mockedAxios.post.mockResolvedValueOnce({ data: { data: { boards: [] } } });

      const result = await mondayService.getProjects(userDummy.id, 'portalId');

      expect(result).toEqual([]);
    });

    it('positive: should return an array of boards if boards are found', async () => {
      const data = { data: { access_token: 'accessToken' } };
      const boards = [{ id: 'board1', name: 'Board 1', state: 'active', permissions: [] }];
      const expectedBoards = [{ id: 'board1', name: 'Board 1', key: '', description: '' }];
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(data);
      mockedAxios.post.mockResolvedValueOnce({ data: { data: { boards } } });

      const result = await mondayService.getProjects(userDummy.id, 'portalId');

      expect(result).toEqual(expectedBoards);
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
      const data = { data: { access_token: 'access_token' } };
      const boards = [{ id: projectId, name: 'Project 1' }];
      const expectedProject = { id: projectId, name: 'Project 1', key: '', description: '' };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(data);
      mockedAxios.post.mockResolvedValueOnce({ data: { data: { boards } } });

      const result = await mondayService.getProject(userDummy.id, portalId, projectId);

      expect(result).toEqual(expectedProject);
    });
  });

  describe('addTimeEntry', () => {
    it('positive: add time log if Worklog and Total fields are available', async () => {
      const portalId = 'portal-id';
      const projectId = 'project-id';
      const taskId = 'task-id';
      const timeEntry = {
        seconds: 300,
        note: 'milestone',
      };
      const integrationRecord = {
        access_token: 'access-token',
        client_id: 'client-id',
      };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce({ data: integrationRecord });
      const headers = {
        Authorization: `Bearer ${integrationRecord.access_token}`,
        'Content-Type': 'application/json',
      };

      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            data: {
              boards: [
                {
                  columns: [
                    { title: FIELD_NAME_WORKLOG, id: 'worklog-id' },
                    { title: FIELD_NAME_TOTAL, id: 'total-id' },
                  ],
                },
              ],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              items: [
                {
                  column_values: [
                    { id: 'worklog-id', value: '{ "text": "milestone-1: 0h 5m" }' },
                    { id: 'total-id', value: '{ "text": "0h 5m" }' },
                  ],
                },
              ],
            },
          },
        })
        .mockResolvedValueOnce({ data: { data: {} } });

      await mondayService.addTimeEntry(userDummy.id, portalId, projectId, taskId, timeEntry);

      const baseUrl = 'https://api.monday.com/v2';
      const query = `
      mutation {
        change_worklog: change_simple_column_value (board_id: ${projectId}, item_id: ${taskId}, column_id: worklog-id, value: "milestone-1: 0h 5m milestone: 0h 5m") {
          id
        },
        change_total: change_simple_column_value (board_id: ${projectId}, item_id: ${taskId}, column_id: total-id, value: "0h 10m") {
          id
        }
      }
    `;

      expect(mockedAxios.post).toHaveBeenCalledWith(baseUrl, { query }, { headers });
    });

    it('positive: add custom fields and add worklog if Worklog and Total fields are not available', async () => {
      const portalId = 'portal-id';
      const projectId = 'project-id';
      const taskId = 'task-id';
      const timeEntry = {
        seconds: 300,
        note: 'milestone',
      };
      const integrationRecord = {
        access_token: 'access-token',
        client_id: 'client-id',
      };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce({ data: integrationRecord });
      const headers = {
        Authorization: `Bearer ${integrationRecord.access_token}`,
        'Content-Type': 'application/json',
      };

      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            data: {
              boards: [
                {
                  columns: [],
                },
              ],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              create_worklog: {
                id: 'worklog-id',
                title: 'Worklog',
              },
              create_total: {
                id: 'total-id',
                title: 'Total',
              },
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              items: [
                {
                  column_values: [
                    { id: 'worklog-id', value: '{ "text": "" }' },
                    { id: 'total-id', value: '{ "text": "" }' },
                  ],
                },
              ],
            },
          },
        })
        .mockResolvedValueOnce({ data: { data: {} } });

      await mondayService.addTimeEntry(userDummy.id, portalId, projectId, taskId, timeEntry);

      const baseUrl = 'https://api.monday.com/v2';
      const mutation = `
      mutation {
        change_worklog: change_simple_column_value (board_id: ${projectId}, item_id: ${taskId}, column_id: worklog-id, value: "milestone: 0h 5m") {
          id
        },
        change_total: change_simple_column_value (board_id: ${projectId}, item_id: ${taskId}, column_id: total-id, value: "0h 5m") {
          id
        }
      }
    `;
      expect(mockedAxios.post).toHaveBeenLastCalledWith(baseUrl, { query: mutation }, { headers });
    });
  });

  describe('getPortals', () => {
    it('positive: should return the list of portals', async () => {
      const mondayData = {
        client_id: 'client_id',
        access_token: 'access_token',
      };
      const headers = {
        Authorization: `Bearer ${mondayData.access_token}`,
        'Content-Type': 'application/json',
      };
      const portals = [{ id: 'portal1' }, { id: 'portal2' }];
      mockedAxios.post.mockResolvedValueOnce({ data: { data: { workspaces: portals } } });
      const platformIntegrationRecord = {
        data: mondayData,
      };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(platformIntegrationRecord);

      const result = await mondayService.getPortals(userDummy.id);

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        {
          query: 'query {workspaces{id name kind description state }}',
        },
        {
          headers,
        },
      );
      expect(result).toEqual(portals);
    });

    it('negative: should throw an UnauthorizedException if platform integration record is not found', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(null);
      const result = mondayService.getPortals(userDummy.id);
      expect(result).rejects.toThrow(UnauthorizedException);
    });

    it('negative: should throw an error if the request fails', async () => {
      const error = new Error('Failed to get portals');
      mockedAxios.get.mockRejectedValueOnce(error);
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(null);
      const result = mondayService.getPortals(userDummy.id);
      expect(result).rejects.toThrow(UnauthorizedException);
    });
  });
});
