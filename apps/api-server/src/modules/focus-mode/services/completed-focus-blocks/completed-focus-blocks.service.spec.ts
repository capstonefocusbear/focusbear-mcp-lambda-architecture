import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { CompletedFocusBlockRepositoryMock, UserRepositoryMock, SentryServiceMock } from '../../../../../test/mocks';
import { UserRepository } from '../../../user/repositories/user.repository';
import { CompletedFocusBlockRepository } from '../../repositories/completed-focus-block.repository';
import { CompletedFocusBlockService } from './completed-focus-blocks.service';
import { CompletedFocusBlockDummy, userDummy } from '../../../../../test/dummies';

describe('CompletedFocusBlockService', () => {
  let completedFocusBlocksService: CompletedFocusBlockService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CompletedFocusBlockService,
        CompletedFocusBlockRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(CompletedFocusBlockRepository)
      .useValue(CompletedFocusBlockRepositoryMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .compile();

    completedFocusBlocksService = moduleRef.get<CompletedFocusBlockService>(CompletedFocusBlockService);
  });

  it('should be defined', () => {
    expect(completedFocusBlocksService).toBeDefined();
  });

  describe('getFocusBlocksStats', () => {
    it('positive: should return formatted stats for retrieved completed focus blocks', async () => {
      CompletedFocusBlockRepositoryMock.getFocusBlockLogsForTimeRange.mockResolvedValueOnce([CompletedFocusBlockDummy]);

      const focusBlocksStats = await completedFocusBlocksService.getFocusBlockStats(userDummy.id, {
        from_time: new Date(),
        to_time: new Date(),
      });

      expect(focusBlocksStats[0]).toStrictEqual({
        name: CompletedFocusBlockDummy.focus_mode.name,
        start_time: CompletedFocusBlockDummy.start_time,
        duration:
          (new Date(CompletedFocusBlockDummy.finish_time).getTime() -
            new Date(CompletedFocusBlockDummy.start_time).getTime()) /
          1000,
        achievements: CompletedFocusBlockDummy.achievements,
        distractions: CompletedFocusBlockDummy.distractions,
        tags: CompletedFocusBlockDummy.tags?.map((tag) => tag.text),
      });
    });
  });
});
