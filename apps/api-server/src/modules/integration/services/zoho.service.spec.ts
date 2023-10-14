import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { savedZohoTaskDummy, zohoTaskDummy } from '../../../../test/dummies/integration.dummies';
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
import * as FormData from 'form-data';

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
      ToDoRepositoryMock.orm.find.mockResolvedValueOnce([savedZohoTaskDummy]);

      await zohoService.getUser(userDummy.id);

      expect(UserRepositoryMock.orm.findOneBy).toBeCalledWith({ id: userDummy.id });
    });
  });

  describe('getZohoTasksToSync', () => {
    it('positive: returns tasks already saved and ones that need to be synced', async () => {
      ToDoRepositoryMock.orm.find.mockResolvedValueOnce([savedZohoTaskDummy]);

      const result = await zohoService.getZohoTasksToSync([zohoTaskDummy], userDummy.id);

      expect(result.tasksToSync.length).toBe(0);
      expect(result.syncedZohoTasks.length).toBe(1);
    });
  });

  describe('getPortals', () => {
    it('negative: if no integration record is found error should be thrown', async () => {
      let exception = null;
      const errorMessage = `User with ID: ${userDummy.id} has not authenticated with Zoho!`;

      try {
        await zohoService.getPortals(userDummy.id);
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
        PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(
          new PlatformIntegration({ user_id: userDummy.id, platform: IntegrationPlatforms.ZOHO, data: {} }),
        );
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
        PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(
          new PlatformIntegration({ user_id: userDummy.id, platform: IntegrationPlatforms.ZOHO, data: {} }),
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
  });
  describe('addTimeEntry', () => {
    it('positive: should call httpService.post with the correct arguments', async () => {
      const portalId = 'portal123';
      const projectId = 'project123';
      const taskId = 'task123';
      const timeEntry = {
        date: '2023-10-13',
        bill_status: 'billed',
        hours: '2:00',
        notes: 'test note',
      };
  
      const platformIntegrationRecord = {
        data: {
            zoho_location: 'us',
            zoho_access_token: 'token123',
        },
      };
  
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(
        platformIntegrationRecord,
      );
  
      const expectedUrl = `https://projectsapi.zoho.com/restapi/portal/${portalId}/projects/${projectId}/tasks/${taskId}/logs/`;
      const expectedHeaders = { Authorization: `Bearer token123` };
      const expectedFormData = new FormData();
      expectedFormData.append('date', '10-13-2023');
      expectedFormData.append('bill_status', 'billed');
      expectedFormData.append('hours', '2:00');
      expectedFormData.append('notes', 'test note');
  
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
      const tasksData = [{ id: 'task1' }, { id: 'task2' }];

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce({
        data: {
          zoho_location: 'us',
          zoho_access_token: 'token123',
        },
      });
      mockedAxios.get.mockResolvedValueOnce({ data: { tasks: tasksData } });

      const result = await zohoService.getTasks(userDummy.id, projectId, portalId);

      expect(result).toEqual(tasksData);
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

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(undefined);

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
      const projectsData = [{ id: 'project1', name: 'Project 1' }, { id: 'project2', name: 'Project 2' }];

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce({
        data: {
          zoho_location: 'us',
          zoho_access_token: 'token123',
        },
      });
      mockedAxios.get.mockResolvedValueOnce({ data: { projects: projectsData } });

      const result = await zohoService.getProjects(userDummy.id, portalId);

      expect(result).toEqual(projectsData);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ZOHO,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://projectsapi.zoho.com/restapi/portal/${portalId}/projects/`, {
        headers: { Authorization: 'Bearer token123' },
      });
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
        zoho_location: 'us',
        zoho_access_token: 'token123',
      };
      const responseData = { id: taskId, custom_status: statusId };

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce({
        data: zohoData,
      });
      mockedAxios.post.mockResolvedValueOnce({ data: responseData });

      const result = await zohoService.updateTaskStatus(userDummy.id, portalId, projectId, taskId, statusId);

      expect(result).toEqual(responseData);
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ZOHO,
        userDummy.id,
      );
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `https://projectsapi.zoho.com/restapi/portal/${portalId}/projects/${projectId}/tasks/${taskId}/`,
        expect.any(FormData),
        {
          headers: { Authorization: `Bearer ${zohoData.zoho_access_token}` },
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
      const platformIntegrationRecord = { data: { zoho_location: 'us', zoho_access_token: 'access_token' } };
      const projectData = { projects: [{ id: projectId, name: 'Project 1' }] };
      const expectedProject = { id: projectId, name: 'Project 1' };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(platformIntegrationRecord);
      mockedAxios.get.mockResolvedValueOnce({ data: projectData });
  
      const result = await zohoService.getProject(userDummy.id, portalId, projectId);
  
      expect(result).toEqual(expectedProject);
    });
  });
  
});
