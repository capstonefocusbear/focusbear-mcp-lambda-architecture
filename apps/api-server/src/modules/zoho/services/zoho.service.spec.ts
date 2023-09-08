import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
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
  ToDoRepositoryMock,
  UserRepositoryMock,
} from '../../../../test/mocks/repositories.mock';
import { ZohoService } from './zoho.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { ZohoAuthService } from '../../auth/services/zoho-auth.service';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';

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
});
