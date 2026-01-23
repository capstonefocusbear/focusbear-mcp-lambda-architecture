import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { CompletedFocusBlockRepositoryMock, UserRepositoryMock, SentryServiceMock } from '../../../../../test/mocks';
import { UserRepository } from '../../../user/repositories/user.repository';
import { CompletedFocusBlockRepository } from '../../repositories/completed-focus-block.repository';
import { CompletedFocusBlockService } from './completed-focus-blocks.service';
import { CompletedFocusBlockDummy, userDummy } from '../../../../../test/dummies';

describe('CompletedFocusBlockService', () => {
  let completedFocusBlocksService: CompletedFocusBlockService;

  beforeAll(async () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
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
        metadata: {},
      });
    });

    it('positive: should use default time range when from_time and to_time are undefined', async () => {
      CompletedFocusBlockRepositoryMock.getFocusBlockLogsForTimeRange.mockResolvedValueOnce([CompletedFocusBlockDummy]);

      await completedFocusBlocksService.getFocusBlockStats(userDummy.id, {});

      expect(CompletedFocusBlockRepositoryMock.getFocusBlockLogsForTimeRange).toHaveBeenCalledWith(
        userDummy.id,
        expect.objectContaining({
          from_time: expect.any(Date),
          to_time: expect.any(Date),
        }),
      );
    });

    it('positive: should return metadata when present in completed focus block', async () => {
      const focusBlockWithMetadata = {
        ...CompletedFocusBlockDummy,
        metadata: {
          focus_alignment_score: 80,
          tab_count: 5,
          average_tab_count: 4.2,
          average_tab_duration: 120,
        },
      };
      CompletedFocusBlockRepositoryMock.getFocusBlockLogsForTimeRange.mockResolvedValueOnce([focusBlockWithMetadata]);

      const focusBlocksStats = await completedFocusBlocksService.getFocusBlockStats(userDummy.id, {
        from_time: new Date(),
        to_time: new Date(),
      });

      expect(focusBlocksStats[0].metadata).toEqual({
        focus_alignment_score: 80,
        tab_count: 5,
        average_tab_count: 4.2,
        average_tab_duration: 120,
      });
    });

    it('positive: should return empty metadata object when metadata is null or undefined', async () => {
      const focusBlockWithoutMetadata = {
        ...CompletedFocusBlockDummy,
        metadata: null,
      };
      CompletedFocusBlockRepositoryMock.getFocusBlockLogsForTimeRange.mockResolvedValueOnce([
        focusBlockWithoutMetadata,
      ]);

      const focusBlocksStats = await completedFocusBlocksService.getFocusBlockStats(userDummy.id, {
        from_time: new Date(),
        to_time: new Date(),
      });

      expect(focusBlocksStats[0].metadata).toEqual({});
    });

    it('positive: should handle undefined focus_mode_id and tag_id', async () => {
      CompletedFocusBlockRepositoryMock.getFocusBlockLogsForTimeRange.mockResolvedValueOnce([CompletedFocusBlockDummy]);

      await completedFocusBlocksService.getFocusBlockStats(userDummy.id, {
        from_time: new Date(),
        to_time: new Date(),
        // focus_mode_id and tag_id are undefined
      });

      expect(CompletedFocusBlockRepositoryMock.getFocusBlockLogsForTimeRange).toHaveBeenCalledWith(
        userDummy.id,
        expect.objectContaining({
          from_time: expect.any(Date),
          to_time: expect.any(Date),
        }),
      );
    });

    it('positive: should handle focus_mode_id and tag_id when provided', async () => {
      const focusModeId = '123e4567-e89b-12d3-a456-426614174000';
      const tagId = '123e4567-e89b-12d3-a456-426614174001';
      CompletedFocusBlockRepositoryMock.getFocusBlockLogsForTimeRange.mockResolvedValueOnce([CompletedFocusBlockDummy]);

      await completedFocusBlocksService.getFocusBlockStats(userDummy.id, {
        from_time: new Date(),
        to_time: new Date(),
        focus_mode_id: focusModeId,
        tag_id: tagId,
      });

      expect(CompletedFocusBlockRepositoryMock.getFocusBlockLogsForTimeRange).toHaveBeenCalledWith(
        userDummy.id,
        expect.objectContaining({
          from_time: expect.any(Date),
          to_time: expect.any(Date),
          focus_mode_id: focusModeId,
          tag_id: tagId,
        }),
      );
    });
  });
});
