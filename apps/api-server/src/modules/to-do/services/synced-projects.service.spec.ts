import { Test } from '@nestjs/testing';
import { syncedProjectDummy, userDummy } from '../../../../test/dummies';
import {
  FocusModeTagRepositoryMock,
  SyncedProjectsRepositoryMock,
  ToDoRepositoryMock,
  ZohoServiceMock,
} from '../../../../test/mocks';

import { SyncedProjectsRepository } from '../repositories/synced-projects.repository';
import { SyncedProjectsService } from './synced-projects.service';
import { ZohoService } from '../../zoho/services/zoho.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { ToDoRepository } from '../repositories/to-do.repository';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';

describe('SyncedProjectsService', () => {
  let service: SyncedProjectsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SyncedProjectsService, SyncedProjectsRepository, ZohoService, ToDoRepository, FocusModeTagRepository],
    })
      .overrideProvider(SyncedProjectsRepository)
      .useValue(SyncedProjectsRepositoryMock)
      .overrideProvider(ZohoService)
      .useValue(ZohoServiceMock)
      .overrideProvider(ToDoRepository)
      .useValue(ToDoRepositoryMock)
      .overrideProvider(FocusModeTagRepository)
      .useValue(FocusModeTagRepositoryMock)
      .compile();

    service = moduleRef.get<SyncedProjectsService>(SyncedProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapStatusesToComplete', () => {
    it('positive: should save new incoming statuses to synced project record', async () => {
      const dummyProjectId = 'some-id';
      const dummyExternalStatuses = [
        { status_id: 'id-1', label: 'label 1', should_complete_task: true },
        { status_id: 'id-2', label: 'label 2', should_complete_task: false },
      ];
      SyncedProjectsRepositoryMock.orm.findOne.mockResolvedValueOnce(syncedProjectDummy);

      await service.mapStatusesToComplete(userDummy.id, dummyProjectId, dummyExternalStatuses);

      expect(SyncedProjectsRepositoryMock.orm.save).toBeCalledWith({
        ...syncedProjectDummy,
        available_statuses: dummyExternalStatuses,
      });
    });
  });

  describe('getUserSyncedProjects', () => {
    it('positive: should fetch projects from platform specified in query param', async () => {
      await service.getUserSyncedProjects(userDummy.id, { platform: IntegrationPlatforms.ZOHO });

      expect(ZohoServiceMock.getAllUserProjects).toBeCalledWith(userDummy.id);
    });
  });

  describe('syncProject', () => {
    it('positive: should sync project from external platform', async () => {
      const dummyData = { platform: IntegrationPlatforms.ZOHO, portal_id: 'dummy-id', project_id: 'dummy-id-2' };
      await service.syncProject(userDummy.id, dummyData);

      expect(ZohoServiceMock.syncProjectAndChildTasks).toBeCalledWith(
        userDummy.id,
        dummyData.portal_id,
        dummyData.project_id,
      );
    });
  });
});
