import { Test } from '@nestjs/testing';
import { Inject } from '@nestjs/common';
import { SENTRY_TOKEN } from '@app/observability';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { BaseIntegrationService } from './base.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { BaseIntegrationAuthService } from '../../auth/services/base-integration.auth.service';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { SyncedProjectsRepository } from '../../to-do/repositories/synced-projects.repository';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { BullQueues } from '../../../shared/utils/constants';
import { userDummy, QueueMock } from '../../../../test/dummies';
import { SentryServiceMock } from '../../../../test/mocks';
import {
  UserRepositoryMock,
  FocusModeTagRepositoryMock,
  ToDoRepositoryMock,
  SyncedProjectsRepositoryMock,
} from '../../../../test/mocks/repositories.mock';

class TestIntegrationService extends BaseIntegrationService {
  constructor(
    userRepository: UserRepository,
    focusModeTagRepository: FocusModeTagRepository,
    toDoRepository: ToDoRepository,
    integrationAuthService: BaseIntegrationAuthService,
    platformIntegrationsService: PlatformIntegrationsService,
    syncedProjectsRepository: SyncedProjectsRepository,

    @Inject(getQueueToken(BullQueues.SYNC_TASKS)) syncTasksQueue: Queue,
    @Inject(SENTRY_TOKEN) sentryService: any,
  ) {
    super(
      userRepository,
      focusModeTagRepository,
      toDoRepository,
      integrationAuthService,
      platformIntegrationsService,
      syncedProjectsRepository,
      IntegrationPlatforms.CLICK_UP,
      syncTasksQueue,
      sentryService,
    );
  }

  protected tryAddTimeEntry = jest.fn();

  protected tryGetTasks = jest.fn();

  protected tryGetProjects = jest.fn();

  protected tryGetPortals = jest.fn();

  protected tryGetProject = jest.fn();

  protected tryGetALLTasksOwnedByUser = jest.fn();

  protected tryGetProjectStatuses = jest.fn();

  protected tryUpdateTaskStatus = jest.fn();
}

describe('BaseIntegrationService', () => {
  let service: TestIntegrationService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TestIntegrationService,
        { provide: UserRepository, useValue: UserRepositoryMock },
        { provide: FocusModeTagRepository, useValue: FocusModeTagRepositoryMock },
        { provide: ToDoRepository, useValue: ToDoRepositoryMock },
        { provide: BaseIntegrationAuthService, useValue: {} },
        { provide: PlatformIntegrationsService, useValue: {} },
        { provide: SyncedProjectsRepository, useValue: SyncedProjectsRepositoryMock },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: getQueueToken(BullQueues.SYNC_TASKS),
          useValue: QueueMock,
        },
      ],
    }).compile();

    service = moduleRef.get<TestIntegrationService>(TestIntegrationService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('positive: should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllUserProjects', () => {
    const mockProjectId = 'mock_project_123';

    it('positive: should properly map and format the synced_at date to an ISO string', async () => {
      const mockDate = new Date('2026-03-18T10:00:00.000Z');

      SyncedProjectsRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          user_id: userDummy.id,
          external_project_id: mockProjectId,
          available_statuses: [],
          have_tasks_been_synced: true,
          synced_at: mockDate,
        },
      ]);

      const result = await service.getAllUserProjects(userDummy.id);

      expect(result).toHaveLength(1);
      expect(result[0].is_synced).toBe(true);
      expect(result[0].have_tasks_been_synced).toBe(true);
      expect(result[0].synced_at).toBe('2026-03-18T10:00:00.000Z');
      expect(SyncedProjectsRepositoryMock.orm.find).toHaveBeenCalledWith({
        where: { user_id: userDummy.id },
      });
    });

    it('positive: should return null for synced_at if the database value is null', async () => {
      SyncedProjectsRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          user_id: userDummy.id,
          external_project_id: mockProjectId,
          available_statuses: [],
          have_tasks_been_synced: false,
          synced_at: null,
        },
      ]);

      const result = await service.getAllUserProjects(userDummy.id);

      expect(result).toHaveLength(1);
      expect(result[0].synced_at).toBeNull();
    });

    it('negative: should capture exception via Sentry if a database error occurs', async () => {
      const mockError = new Error('Database connection failed');
      SyncedProjectsRepositoryMock.orm.find.mockRejectedValueOnce(mockError);

      await expect(service.getAllUserProjects(userDummy.id)).rejects.toThrow('Database connection failed');
      expect(SentryServiceMock.instance().captureException).toHaveBeenCalledWith(mockError, { level: 'error' });
    });
  });
});
