import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { zohoProjectDummy } from '../../../../test/dummies/integration.dummies';
import { userDummy } from '../../../../test/dummies';
import { PlatformIntegrationsServiceMock, SentryServiceMock, ZohoAuthServiceMock } from '../../../../test/mocks';
import {
  FocusModeTagRepositoryMock,
  SyncedProjectsRepositoryMock,
  ToDoRepositoryMock,
  UserRepositoryMock,
} from '../../../../test/mocks/repositories.mock';
import { ZohoService } from './zoho.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { ZohoAuthService } from '../../auth/services/zoho-auth.service';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { PlatformIntegration } from '../../platform-integrations/entities/platform-integration.entity';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { SyncedProject } from '../../to-do/entities/synced-project.entity';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ZohoService', () => {
  let zohoService: ZohoService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ZohoService,
        UserRepository,
        FocusModeTagRepository,
        ToDoRepository,
        ZohoAuthService,
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
      .overrideProvider(ZohoAuthService)
      .useValue(ZohoAuthServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .overrideProvider(SyncedProjectsRepository)
      .useValue(SyncedProjectsRepositoryMock)
      .compile();
    zohoService = moduleRef.get<ZohoService>(ZohoService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('positive: should be defined', () => {
    expect(zohoService).toBeDefined();
  });

  describe('getUser', () => {
    it('positive: user should be fetched from DB', async () => {
      await zohoService.getUser(userDummy.id);

      expect(UserRepositoryMock.orm.findOneBy).toBeCalledWith({ id: userDummy.id });
    });
  });

  describe('getPortals', () => {
    it('negative: if no integration record is found error should be thrown', async () => {
      let exception = null;
      const errorMessage = `User with ID: ${userDummy.id} is not is not authorized to access portals`;

      try {
        await zohoService.getPortals(userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });
  });

  describe('upsertSyncedProjectRecord', () => {
    it('positive: if no record exists for project, new synced project record should be saved', async () => {
      const portalId = 'portal-dummy-id';
      const projectId = 'project-dummy-id';
      const incomingStatusDummy = { name: 'In Progress', id: 'test-id' };
      const syncedProjectDBResponseDummy = new SyncedProject({
        user_id: userDummy.id,
        external_project_id: projectId,
        external_portal_id: portalId,
        available_statuses: [
          { label: incomingStatusDummy.name, status_id: incomingStatusDummy.id, should_complete_task: false },
        ],
        platform: IntegrationPlatforms.ZOHO,
      });
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        user_id: userDummy.id,
        platform: IntegrationPlatforms.ZOHO,
        data: { access_token: 'test-token' },
      });
      mockedAxios.get.mockResolvedValueOnce({ data: { status_details: [incomingStatusDummy] } });
      // mock no existing projects
      SyncedProjectsRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await zohoService.upsertSyncedProjectRecord(userDummy.id, portalId, projectId);

      expect(SyncedProjectsRepositoryMock.orm.save).toBeCalledWith(
        new SyncedProject({
          ...syncedProjectDBResponseDummy,
        }),
      );
    });

    it('positive: if new statuses are returned from Zoho, they should be saved to existing synced project record', async () => {
      const portalId = 'portal-dummy-id';
      const projectId = 'project-dummy-id';
      const existingStatusDummy = { name: 'Done', id: 'test-id' };
      const incomingStatusDummy = { name: 'In Progress', id: 'test-id' };
      const syncedProjectDBResponseDummy = new SyncedProject({
        user_id: userDummy.id,
        external_project_id: projectId,
        available_statuses: [
          { label: existingStatusDummy.name, status_id: existingStatusDummy.id, should_complete_task: false },
        ],
        platform: IntegrationPlatforms.ZOHO,
      });
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(
        new PlatformIntegration({
          user_id: userDummy.id,
          platform: IntegrationPlatforms.ZOHO,
          data: { access_token: 'test-token' },
        }),
      );
      mockedAxios.get.mockResolvedValueOnce({ data: { status_details: [existingStatusDummy, incomingStatusDummy] } });
      SyncedProjectsRepositoryMock.orm.find.mockResolvedValueOnce([syncedProjectDBResponseDummy]);

      await zohoService.upsertSyncedProjectRecord(userDummy.id, portalId, projectId);

      expect(SyncedProjectsRepositoryMock.orm.save).toBeCalledWith(
        new SyncedProject({
          ...syncedProjectDBResponseDummy,
          available_statuses: [
            { label: existingStatusDummy.name, status_id: existingStatusDummy.id, should_complete_task: false },
            { label: incomingStatusDummy.name, status_id: incomingStatusDummy.id, should_complete_task: false },
          ],
        }),
      );
    });
  });

  describe('addTimeEntry', () => {
    it('positive: should call httpService.post with the correct arguments', async () => {
      const portalId = 'portal123';
      const projectId = 'project123';
      const taskId = 'task123';
      const timeEntry = {
        date: '2023-10-13',
        bill_status: 'billed',
        seconds: 7200,
        note: 'test note',
      };

      const platformIntegrationRecord = {
        data: {
          location: 'us',
          access_token: 'token123',
        },
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(platformIntegrationRecord);

      const expectedUrl = `https://projectsapi.zoho.com/restapi/portal/${portalId}/projects/${projectId}/tasks/${taskId}/logs/`;
      const expectedHeaders = { Authorization: 'Bearer token123' };
      const expectedFormData = {
        date: '10-13-2023',
        bill_status: 'billed',
        hours: '02:00',
        notes: 'test note',
      };

      const mockResponse = {
        data: { id: 'timeEntry123' },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await zohoService.addTimeEntry(userDummy.id, portalId, projectId, taskId, timeEntry);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ZOHO,
        userDummy.id,
      );
      expect(mockedAxios.post).toHaveBeenCalledWith(expectedUrl, expectedFormData, {
        headers: {
          ...expectedHeaders,
          'Content-Type': 'multipart/form-data',
        },
      });
      expect(result).toEqual({ id: 'timeEntry123' });
    });

    it('negative: should throw an error if all retries fail', async () => {
      const portalId = 'portal123';
      const projectId = 'project123';
      const taskId = 'task123';
      const timeEntry = {
        date: '2023-10-13',
        bill_status: 'billed',
        hours: '2:00',
        notes: 'test note',
      };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(undefined);

      const result = await zohoService.addTimeEntry(userDummy.id, portalId, projectId, taskId, timeEntry);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });
  describe('getTasks: when platform integration record is not found', () => {
    it('negative: should return undefined', async () => {
      const projectId = 'project123';
      const portalId = 'portal123';

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(undefined);

      const result = await zohoService.getTasks(userDummy.id, projectId, portalId);

      expect(result).toBeUndefined();
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ZOHO,
        userDummy.id,
      );
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('getTasks: when platform integration record is found', () => {
    it('positive: should return tasks data', async () => {
      const projectId = 'project123';
      const portalId = 'portal123';
      const task1 = { id_string: 'task1', key: 'key1', status: { id: 'status' } };
      const task2 = { id_string: 'task2', key: 'key2', status: { id: 'status' } };
      const tasksData = [task1, task2];
      const taskResult = [
        {
          id: 'task1',
          status: 'status',
          key: 'key1',
          name: undefined,
          descrption: undefined,
          external_metadata: {
            ...task1,
            portal_id: portalId,
            project_id: projectId,
          },
        },
        {
          id: 'task2',
          status: 'status',
          key: 'key2',
          name: undefined,
          descrption: undefined,
          external_metadata: {
            ...task2,
            portal_id: portalId,
            project_id: projectId,
          },
        },
      ];

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: {
          location: 'us',
          access_token: 'token123',
        },
      });
      mockedAxios.get.mockResolvedValueOnce({ data: { tasks: tasksData } });

      const result = await zohoService.getTasks(userDummy.id, projectId, portalId);

      expect(result).toEqual(taskResult);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ZOHO,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `https://projectsapi.zoho.com/restapi/portal/${portalId}/projects/${projectId}/tasks/`,
        {
          headers: { Authorization: 'Bearer token123' },
        },
      );
    });
  });

  describe('getProjects: when platform integration record is not found', () => {
    it('should return undefined', async () => {
      const portalId = 'portal123';

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(undefined);

      const result = await zohoService.getProjects(userDummy.id, portalId);

      expect(result).toBeUndefined();
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ZOHO,
        userDummy.id,
      );
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('getProjects: when platform integration record is found', () => {
    it('should return projects data', async () => {
      const portalId = 'portal123';
      const projectsData = [zohoProjectDummy];
      const resultProject = [{ ...zohoProjectDummy, portal_id: portalId }];

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: {
          location: 'us',
          access_token: 'token123',
        },
      });
      mockedAxios.get.mockResolvedValueOnce({ data: { projects: projectsData } });

      const result = await zohoService.getProjects(userDummy.id, portalId);

      expect(result).toEqual(resultProject);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ZOHO,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `https://projectsapi.zoho.com/restapi/portal/${portalId}/projects/`,
        {
          headers: { Authorization: 'Bearer token123' },
        },
      );
    });
  });

  describe('updateTaskStatus: when platform integration record is not found', () => {
    it('negative: should return undefined', async () => {
      const portalId = 'portal123';
      const projectId = 'project123';
      const taskId = 'task123';
      const statusId = 'status123';

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(undefined);

      const result = await zohoService.updateTaskStatus(userDummy.id, portalId, projectId, taskId, statusId);

      expect(result).toBeUndefined();
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ZOHO,
        userDummy.id,
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('updateTaskStatus: when platform integration record is found', () => {
    it('positive: should update task status and return response data', async () => {
      const portalId = 'portal123';
      const projectId = 'project123';
      const taskId = 'task123';
      const statusId = 'status123';
      const zohoData = {
        location: 'us',
        access_token: 'token123',
      };
      const responseData = { id: taskId, custom_status: statusId };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: zohoData,
      });
      mockedAxios.post.mockResolvedValueOnce({ data: responseData });

      const result = await zohoService.updateTaskStatus(userDummy.id, portalId, projectId, taskId, statusId);

      expect(result).toEqual(responseData);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ZOHO,
        userDummy.id,
      );
      const expectedFormData = {
        custom_status: statusId,
      };
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `https://projectsapi.zoho.com/restapi/portal/${portalId}/projects/${projectId}/tasks/${taskId}/`,
        expectedFormData,
        {
          headers: { Authorization: `Bearer ${zohoData.access_token}` },
        },
      );
    });
  });

  describe('getProject', () => {
    it('negative: should return undefined if the platform integration record is not found', async () => {
      const portalId = 'portalId';
      const projectId = 'projectId';
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(undefined);

      const result = await zohoService.getProject(userDummy.id, portalId, projectId);

      expect(result).toBeUndefined();
    });

    it('positive: should return the project data correctly', async () => {
      const portalId = 'portalId';
      const projectId = 'projectId';
      const platformIntegrationRecord = { data: { location: 'us', access_token: 'access_token' } };
      const projectData = { projects: [{ id: projectId, name: 'Project 1' }] };
      const expectedProject = { id: projectId, name: 'Project 1', key: undefined, portal_id: portalId };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(platformIntegrationRecord);
      mockedAxios.get.mockResolvedValueOnce({ data: projectData });

      const result = await zohoService.getProject(userDummy.id, portalId, projectId);

      expect(result).toEqual(expectedProject);
    });
  });
});
