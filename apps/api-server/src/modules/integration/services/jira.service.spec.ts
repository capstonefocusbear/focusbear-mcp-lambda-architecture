import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import axios from 'axios';
import { getQueueToken } from '@nestjs/bull';
import { jiraIssueDummy, savedJiraTaskDummy } from '../../../../test/dummies/integration.dummies';
import { QueueMock, userDummy } from '../../../../test/dummies';
import { PlatformIntegrationsServiceMock, SentryServiceMock, JiraAuthServiceMock } from '../../../../test/mocks';
import {
  FocusModeTagRepositoryMock,
  SyncedProjectsRepositoryMock,
  ToDoRepositoryMock,
  UserRepositoryMock,
} from '../../../../test/mocks/repositories.mock';
import { JiraService } from './jira.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { JiraAuthService } from '../../auth/services/jira-auth.service';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { SyncedProject } from '../../to-do/entities/synced-project.entity';
import { BullQueues } from '../../../shared/utils/constants';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('jiraService', () => {
  let jiraService: JiraService;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        JiraService,
        UserRepository,
        FocusModeTagRepository,
        ToDoRepository,
        JiraAuthService,
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
      .overrideProvider(JiraAuthService)
      .useValue(JiraAuthServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .overrideProvider(SyncedProjectsRepository)
      .useValue(SyncedProjectsRepositoryMock)
      .compile();
    jiraService = moduleRef.get<JiraService>(JiraService);
  });

  it('positive: should be defined', () => {
    expect(jiraService).toBeDefined();
  });

  describe('getUser', () => {
    it('positive: user should be fetched from DB', async () => {
      ToDoRepositoryMock.orm.find.mockResolvedValueOnce([savedJiraTaskDummy]);

      await jiraService.getUser(userDummy.id);

      expect(UserRepositoryMock.orm.findOneBy).toBeCalledWith({ id: userDummy.id });
    });
  });

  describe('updateTaskStatus', () => {
    const portalId = 'portal123';
    const projectId = 'project123';
    const taskId = 'task123';
    const statusId = 'status123';
    const transition = {
      id: 'transitionId1',
      to: { id: statusId },
    };
    const jiraData = { access_token: 'access_token' };
    const platformIntegrationRecord = { data: jiraData };
    const url = `https://api.atlassian.com/ex/jira/${portalId}/rest/api/3/issue/${taskId}/transitions`;
    const headers = { Authorization: `Bearer ${jiraData.access_token}` };
    const formData = { transition: { id: transition.id } };
    const transitions = {
      data: { transitions: [transition] },
    };
    const response = { data: {} };

    it('positive: should update the task status when the request is successful', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(platformIntegrationRecord);
      mockedAxios.get.mockResolvedValueOnce(transitions);
      mockedAxios.post.mockResolvedValueOnce(response);

      const result = await jiraService.updateTaskStatus(userDummy.id, portalId, projectId, taskId, statusId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.JIRA,
        userDummy.id,
      );
      expect(mockedAxios.post).toHaveBeenCalledWith(url, formData, { headers });
      expect(result).toEqual(response.data);
    });

    it('positive: should retry the request if a 401 response is received', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(platformIntegrationRecord);
      mockedAxios.get.mockResolvedValue(transitions);
      mockedAxios.post.mockRejectedValueOnce({ response: { status: 401 } }).mockResolvedValueOnce(response);
      JiraAuthServiceMock.handleUnauthorizedError.mockResolvedValueOnce(1);

      const result = await jiraService.updateTaskStatus(userDummy.id, portalId, projectId, taskId, statusId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.JIRA,
        userDummy.id,
      );

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(mockedAxios.post).toHaveBeenCalledWith(url, formData, { headers });
      expect(result).toEqual(response.data);
    });

    it('positive: should return undefined if the platform integration record is not found', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(null);

      const result = await jiraService.updateTaskStatus(userDummy.id, portalId, projectId, taskId, statusId);
      expect(result).toBeUndefined();
    });
  });

  describe('getTasksOwnedByUser', () => {
    const portalId = 'portal123';
    const projectId = 'project123';
    const jiraData = { access_token: 'access_token', user_id: 'user123' };
    const platformIntegrationRecord = { data: jiraData };
    const url = `https://api.atlassian.com/ex/jira/${portalId}/rest/api/3/search`;
    const headers = { Authorization: `Bearer ${jiraData.access_token}` };

    const response = {
      data: {
        issues: [jiraIssueDummy],
      },
    };
    const tasksOwnedByUser = [
      {
        id: jiraIssueDummy.id,
        name: jiraIssueDummy.fields.summary,
        key: jiraIssueDummy.key,
        description: jiraIssueDummy.fields.description.type,
        project_id: projectId,
        portal_id: portalId,
        status: jiraIssueDummy.fields.status.id,
        external_metadata: { ...jiraIssueDummy, portal_id: portalId, project_id: projectId },
      },
    ];
    const params = {
      jql: `project=${projectId}`,
      fields: 'status, description, summary',
    };

    it('positive: should retrieve tasks owned by the user when the request is successful', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(platformIntegrationRecord);
      mockedAxios.get.mockResolvedValue(response);
      const result = await jiraService.getTasksOwnedByUser(userDummy.id, portalId, projectId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.JIRA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(url, { headers, params });
      expect(result).toEqual(tasksOwnedByUser);
    });

    it('positive: should retry the request if a 401 response is received', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(platformIntegrationRecord);
      mockedAxios.get.mockRejectedValueOnce({ response: { status: 401 } }).mockResolvedValue(response);
      JiraAuthServiceMock.handleUnauthorizedError.mockResolvedValue(1);

      const result = await jiraService.getTasksOwnedByUser(userDummy.id, portalId, projectId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.JIRA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      expect(mockedAxios.get).toHaveBeenCalledWith(url, { headers, params });
      expect(result).toEqual(tasksOwnedByUser);
    });

    it('positive: should return an empty array when platform integration record does not exist', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(null);
      const result = await jiraService.getTasks(userDummy.id, projectId, portalId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.JIRA,
        userDummy.id,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('getPortals', () => {
    const jiraData = { access_token: 'access_token' };
    const platformIntegrationRecord = { data: jiraData };
    const url = 'https://api.atlassian.com/oauth/token/accessible-resources';
    const headers = { Authorization: `Bearer ${jiraData.access_token}`, Accept: 'appication/json' };
    const response = { data: [{ id: 'portal123' }] };

    it('positive: should retrieve the list of portals when the request is successful', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(platformIntegrationRecord);
      mockedAxios.get.mockResolvedValueOnce(response);

      const result = await jiraService.getPortals(userDummy.id);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.JIRA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(url, { headers });
      expect(result).toEqual(response.data);
    });

    it('positive: should retry the request if a 401 response is received', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue(platformIntegrationRecord);
      mockedAxios.get.mockRejectedValueOnce({ response: { status: 401 } }).mockResolvedValueOnce(response);
      JiraAuthServiceMock.handleUnauthorizedError.mockResolvedValueOnce(1);
      mockedAxios.get.mockResolvedValueOnce(response);

      const result = await jiraService.getPortals(userDummy.id);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.JIRA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(mockedAxios.get).toHaveBeenCalledWith(url, { headers });
      expect(result).toEqual(response.data);
    });
  });

  describe('upsertSyncedProjectRecord', () => {
    const portalId = 'portal123';
    const projectId = 'project123';
    const syncedProjects = [];
    const newProject = new SyncedProject({
      user_id: userDummy.id,
      external_project_id: projectId,
      external_portal_id: portalId,
      available_statuses: undefined,
      platform: IntegrationPlatforms.JIRA,
    });

    it('positive: should create a new synced project record if the project has not been synced before', async () => {
      mockedAxios.get.mockResolvedValueOnce(SyncedProject);
      SyncedProjectsRepositoryMock.orm.find.mockResolvedValueOnce(syncedProjects);
      SyncedProjectsRepositoryMock.orm.save.mockResolvedValueOnce(newProject);

      const result = await jiraService.upsertSyncedProjectRecord(userDummy.id, portalId, projectId);

      expect(SyncedProjectsRepositoryMock.orm.find).toHaveBeenCalledWith({ where: { user_id: userDummy.id } });
      expect(SyncedProjectsRepositoryMock.orm.save).toHaveBeenCalledWith(newProject);
      expect(result).toEqual(newProject);
    });
  });

  describe('getProjects', () => {
    const portalId = 'portal123';
    const jiraData = { access_token: 'token123' };
    const projects = [
      { id: 'project1', key: 'key1', name: 'Project 1' },
      { id: 'project2', key: 'key2', name: 'Project 2' },
    ];
    const resultProjects = [
      { id: 'project1', key: 'key1', name: 'Project 1', description: '', portal_id: portalId },
      { id: 'project2', key: 'key2', name: 'Project 2', description: '', portal_id: portalId },
    ];
    const headers = { Authorization: `Bearer ${jiraData.access_token}` };

    it('positive: should return an array of projects when platform integration record exists', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce({ data: jiraData });
      mockedAxios.get.mockResolvedValueOnce({ data: projects });

      const result = await jiraService.getProjects(userDummy.id, portalId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.JIRA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://api.atlassian.com/ex/jira/${portalId}/rest/api/3/project`, {
        headers,
      });
      expect(result).toEqual(resultProjects);
    });

    it('positive: should retry when a 401 error occurs', async () => {
      const errorResponse = { response: { status: 401 } };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce({ data: jiraData });
      mockedAxios.get.mockRejectedValue(errorResponse).mockResolvedValueOnce({ data: projects });
      JiraAuthServiceMock.handleUnauthorizedError.mockResolvedValueOnce(1);

      const result = await jiraService.getProjects(userDummy.id, portalId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.JIRA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://api.atlassian.com/ex/jira/${portalId}/rest/api/3/project`, {
        headers: { Authorization: `Bearer ${jiraData.access_token}` },
      });
      expect(result).toEqual(resultProjects);
    });
  });

  describe('getProject', () => {
    const portalId = 'portal123';
    const projectId = 'project123';
    const jiraData = { access_token: 'token123' };
    const project = { id: 'project1', key: 'key1', name: 'Project 1' };
    const resultProject = { id: 'project1', key: 'key1', name: 'Project 1', portal_id: portalId, description: '' };

    it('positive: should return the project when platform integration record exists', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce({ data: jiraData });
      mockedAxios.get.mockResolvedValueOnce({ data: project });
      const result = await jiraService.getProject(userDummy.id, portalId, projectId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.JIRA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `https://api.atlassian.com/ex/jira/${portalId}/rest/api/3/project/${projectId}`,
        {
          headers: { Authorization: `Bearer ${jiraData.access_token}` },
        },
      );
      expect(result).toEqual(resultProject);
    });

    it('positive: should return undefined when platform integration record does not exist', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(null);
      const result = await jiraService.getProject(userDummy.id, portalId, projectId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.JIRA,
        userDummy.id,
      );
      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('addTimeEntry', () => {
    const portalId = 'test-portal-id';
    const projectId = 'test-project-id';
    const taskId = 'test-task-id';
    const timeEntry = {
      note: 'milestone',
      seconds: '2:30',
    };

    it('positive: should add a time entry for a given user, portal, project, task, and time entry data', async () => {
      const jiraData = {
        access_token: 'test-access-token',
      };
      const response = {
        data: {},
      };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValue({
        data: jiraData,
      });
      const data = {
        version: 1,
        type: 'doc',
        timeSpentSeconds: timeEntry.seconds,
        content: [
          {
            content: [
              {
                text: timeEntry.note,
                type: 'text',
              },
            ],
            type: 'paragraph',
          },
        ],
      };

      mockedAxios.post.mockResolvedValue(response);

      const result = await jiraService.addTimeEntry(userDummy.id, portalId, projectId, taskId, timeEntry);

      expect(result).toEqual(response.data);

      const url = `https://api.atlassian.com/ex/jira/${portalId}/rest/api/3/issue/${taskId}/worklog`;
      expect(mockedAxios.post).toBeCalledWith(url, data, {
        headers: {
          Authorization: `Bearer ${jiraData.access_token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.JIRA,
        userDummy.id,
      );
    });
  });
});
