import { Test } from '@nestjs/testing';
import { syncedProjectDummy, userDummy } from '../../../../test/dummies';
import { SyncedProjectsRepositoryMock } from '../../../../test/mocks';

import { SyncedProjectsRepository } from '../repositories/synced-projects.repository';
import { SyncedProjectsService } from './synced-projects.service';

describe('SyncedProjectsService', () => {
  let service: SyncedProjectsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SyncedProjectsService, SyncedProjectsRepository],
    })
      .overrideProvider(SyncedProjectsRepository)
      .useValue(SyncedProjectsRepositoryMock)
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
});
