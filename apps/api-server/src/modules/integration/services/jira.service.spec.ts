import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import axios from 'axios';
import { savedJiraTaskDummy } from '../../../../test/dummies/integration.dummies';
import { userDummy } from '../../../../test/dummies';
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

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('jiraService', () => {
  let jiraService: JiraService;

  beforeEach(async () => {
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

  afterEach(() => {
    jest.resetAllMocks();
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
    const jiraData = { access_token: 'access_token' };
    const platformIntegrationRecord = { data: jiraData };
    const url = `https://api.atlassian.com/ex/jira/${portalId}/rest/api/3/issue/${taskId}/transitions`;
    const headers = { Authorization: `Bearer ${jiraData.access_token}` };
    const formData = { transition: { id: statusId } };
    const response = { data: { success: true } };

    it('positive: should update the task status when the request is successful', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(platformIntegrationRecord);
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
    const url = `https://api.atlassian.com/ex/jira/${portalId}/rest/api/3/search?jql=project=${projectId}&accountId=${jiraData.user_id}`;
    const headers = { Authorization: `Bearer ${jiraData.access_token}` };
    const response = { data: { issues: [{ id: 'task123' }] } };

    it('positive: should retrieve tasks owned by the user when the request is successful', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(platformIntegrationRecord);
      mockedAxios.get.mockResolvedValueOnce(response);
      const result = await jiraService.getTasksOwnedByUser(userDummy.id, portalId, projectId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.JIRA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(url, { headers });
      expect(result).toEqual([{ id: 'task123', portal_id: portalId }]);
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
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(mockedAxios.get).toHaveBeenCalledWith(url, { headers });
      expect(result).toEqual([{ id: 'task123', portal_id: portalId }]);
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

  describe('getTasks', () => {
    const projectId = 'project123';
    const portalId = 'portal123';
    const jiraData = { access_token: 'token123' };
    const issues = [
      { id: 'task1', summary: 'Task 1' },
      { id: 'task2', summary: 'Task 2' },
    ];

    it('positve: should return an array of issues when platform integration record exists', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce({ data: jiraData });
      mockedAxios.get.mockResolvedValueOnce({ data: { issues } });

      const result = await jiraService.getTasks(userDummy.id, projectId, portalId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.JIRA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://api.atlassian.com/ex/jira/${portalId}/rest/api/3/search`, {
        headers: { Authorization: `Bearer ${jiraData.access_token}` },
        params: {
          jql: `project=${projectId}`,
          fields: 'creator, status, project, priority, summary',
        },
      });
      expect(result).toEqual(issues);
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

  describe('getProjects', () => {
    const portalId = 'portal123';
    const jiraData = { access_token: 'token123' };
    const projects = [
      { id: 'project1', name: 'Project 1' },
      { id: 'project2', name: 'Project 2' },
    ];

    it('positive: should return an array of projects when platform integration record exists', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce({ data: jiraData });
      mockedAxios.get.mockResolvedValueOnce({ data: projects });

      const result = await jiraService.getProjects(userDummy.id, portalId);

      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.JIRA,
        userDummy.id,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(`https://api.atlassian.com/ex/jira/${portalId}/rest/api/3/project`, {
        headers: { Authorization: `Bearer ${jiraData.access_token}` },
      });
      expect(result).toEqual(projects);
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
      expect(result).toEqual(projects);
    });
  });

  describe('getProject', () => {
    const portalId = 'portal123';
    const projectId = 'project123';
    const jiraData = { access_token: 'token123' };
    const project = { id: 'project1', name: 'Project 1' };

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
      expect(result).toEqual(project);
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
});
