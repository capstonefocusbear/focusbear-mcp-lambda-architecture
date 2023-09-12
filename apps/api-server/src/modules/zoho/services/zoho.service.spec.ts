import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import {
  savedZohoProjectDummy,
  savedZohoTaskDummy,
  zohoProjectDummy,
  zohoTaskDummy,
} from '../../../../test/dummies/zoho.dummies';
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

  describe('getZohoProjectsToSync', () => {
    it('positive: returns projects already saved and ones that need to be synced', async () => {
      FocusModeTagRepositoryMock.orm.find.mockResolvedValueOnce([savedZohoProjectDummy]);

      const result = await zohoService.getZohoProjectsToSync([zohoProjectDummy], userDummy.id);

      expect(result.projectsToSync.length).toBe(0);
      expect(result.syncedZohoProjects.length).toBe(1);
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
          available_statuses: [{ label: incomingStatusDummy.name, status_id: incomingStatusDummy.id }],
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
          available_statuses: [{ label: existingStatusDummy.name, status_id: existingStatusDummy.id }],
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
              { label: existingStatusDummy.name, status_id: existingStatusDummy.id },
              { label: incomingStatusDummy.name, status_id: incomingStatusDummy.id },
            ],
          }),
        );
      });
    });
  });
});
