import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AnnouncementViewsService } from './announcement-views.service';
import { AnnouncementsRepository } from '../repositories/announcements.repository';
import { AnnouncementViewsRepository } from '../repositories/announcement-views.repository';
import { AnnouncementsRepositoryMock, AnnouncementViewsRepositoryMock } from '../../../../test/mocks/repositories.mock';
import {
  announcementDummyiOS,
  announcementViewDummy,
  viewAnnouncementDtoWithAllFields,
  viewAnnouncementDtoMinimal,
  viewAnnouncementDtoDismissed,
} from '../../../../test/dummies';
import { ViewAction } from '../entities/announcement-views.entity';

describe('AnnouncementViewsService', () => {
  let announcementViewsService: AnnouncementViewsService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AnnouncementViewsService, AnnouncementsRepository, AnnouncementViewsRepository],
    })
      .overrideProvider(AnnouncementsRepository)
      .useValue(AnnouncementsRepositoryMock)
      .overrideProvider(AnnouncementViewsRepository)
      .useValue(AnnouncementViewsRepositoryMock)
      .compile();

    announcementViewsService = moduleRef.get<AnnouncementViewsService>(AnnouncementViewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(announcementViewsService).toBeDefined();
  });

  describe('markAnnouncementAsViewed', () => {
    const userId = announcementViewDummy.user_id;
    const announcementId = announcementDummyiOS.id;

    it('positive: should successfully record a view with all DTO fields', async () => {
      AnnouncementsRepositoryMock.findById.mockResolvedValueOnce(announcementDummyiOS);
      AnnouncementViewsRepositoryMock.recordView.mockResolvedValueOnce(undefined);

      await announcementViewsService.markAnnouncementAsViewed(userId, announcementId, viewAnnouncementDtoWithAllFields);

      expect(AnnouncementsRepositoryMock.findById).toHaveBeenCalledWith(announcementId);
      expect(AnnouncementViewsRepositoryMock.recordView).toHaveBeenCalledWith({
        user_id: userId,
        announcement_id: announcementId,
        action: viewAnnouncementDtoWithAllFields.action,
        source: viewAnnouncementDtoWithAllFields.source,
        read_at: viewAnnouncementDtoWithAllFields.viewed_at,
      });
    });

    it('positive: should successfully record a view with minimal DTO fields', async () => {
      AnnouncementsRepositoryMock.findById.mockResolvedValueOnce(announcementDummyiOS);
      AnnouncementViewsRepositoryMock.recordView.mockResolvedValueOnce(undefined);

      await announcementViewsService.markAnnouncementAsViewed(userId, announcementId, viewAnnouncementDtoMinimal);

      expect(AnnouncementsRepositoryMock.findById).toHaveBeenCalledWith(announcementId);
      expect(AnnouncementViewsRepositoryMock.recordView).toHaveBeenCalledWith({
        user_id: userId,
        announcement_id: announcementId,
        action: undefined,
        source: undefined,
        read_at: undefined,
      });
    });

    it('positive: should record view with VIEWED action', async () => {
      AnnouncementsRepositoryMock.findById.mockResolvedValueOnce(announcementDummyiOS);
      AnnouncementViewsRepositoryMock.recordView.mockResolvedValueOnce(undefined);

      const dto = {
        action: ViewAction.VIEWED,
        source: 'mobile_app',
      };

      await announcementViewsService.markAnnouncementAsViewed(userId, announcementId, dto);

      expect(AnnouncementViewsRepositoryMock.recordView).toHaveBeenCalledWith({
        user_id: userId,
        announcement_id: announcementId,
        action: ViewAction.VIEWED,
        source: 'mobile_app',
        read_at: undefined,
      });
    });

    it('positive: should record view with DISMISSED action', async () => {
      AnnouncementsRepositoryMock.findById.mockResolvedValueOnce(announcementDummyiOS);
      AnnouncementViewsRepositoryMock.recordView.mockResolvedValueOnce(undefined);

      await announcementViewsService.markAnnouncementAsViewed(userId, announcementId, viewAnnouncementDtoDismissed);

      expect(AnnouncementViewsRepositoryMock.recordView).toHaveBeenCalledWith({
        user_id: userId,
        announcement_id: announcementId,
        action: ViewAction.DISMISSED,
        source: viewAnnouncementDtoDismissed.source,
        read_at: viewAnnouncementDtoDismissed.viewed_at,
      });
    });

    it('positive: should record view with custom viewed_at timestamp', async () => {
      AnnouncementsRepositoryMock.findById.mockResolvedValueOnce(announcementDummyiOS);
      AnnouncementViewsRepositoryMock.recordView.mockResolvedValueOnce(undefined);

      const customDate = new Date('2024-12-15T08:00:00Z');
      const dto = {
        viewed_at: customDate,
      };

      await announcementViewsService.markAnnouncementAsViewed(userId, announcementId, dto);

      expect(AnnouncementViewsRepositoryMock.recordView).toHaveBeenCalledWith({
        user_id: userId,
        announcement_id: announcementId,
        action: undefined,
        source: undefined,
        read_at: customDate,
      });
    });

    it('positive: should record view with custom source value', async () => {
      AnnouncementsRepositoryMock.findById.mockResolvedValueOnce(announcementDummyiOS);
      AnnouncementViewsRepositoryMock.recordView.mockResolvedValueOnce(undefined);

      const dto = {
        source: 'notification_banner',
      };

      await announcementViewsService.markAnnouncementAsViewed(userId, announcementId, dto);

      expect(AnnouncementViewsRepositoryMock.recordView).toHaveBeenCalledWith({
        user_id: userId,
        announcement_id: announcementId,
        action: undefined,
        source: 'notification_banner',
        read_at: undefined,
      });
    });

    it('positive: should handle idempotent behavior - marking same announcement twice', async () => {
      AnnouncementsRepositoryMock.findById.mockResolvedValue(announcementDummyiOS);
      AnnouncementViewsRepositoryMock.recordView.mockResolvedValue(undefined);

      // First call
      await announcementViewsService.markAnnouncementAsViewed(userId, announcementId, viewAnnouncementDtoWithAllFields);

      // Second call with same params
      await announcementViewsService.markAnnouncementAsViewed(userId, announcementId, viewAnnouncementDtoWithAllFields);

      expect(AnnouncementsRepositoryMock.findById).toHaveBeenCalledTimes(2);
      expect(AnnouncementViewsRepositoryMock.recordView).toHaveBeenCalledTimes(2);
      expect(AnnouncementViewsRepositoryMock.recordView).toHaveBeenNthCalledWith(1, {
        user_id: userId,
        announcement_id: announcementId,
        action: viewAnnouncementDtoWithAllFields.action,
        source: viewAnnouncementDtoWithAllFields.source,
        read_at: viewAnnouncementDtoWithAllFields.viewed_at,
      });
      expect(AnnouncementViewsRepositoryMock.recordView).toHaveBeenNthCalledWith(2, {
        user_id: userId,
        announcement_id: announcementId,
        action: viewAnnouncementDtoWithAllFields.action,
        source: viewAnnouncementDtoWithAllFields.source,
        read_at: viewAnnouncementDtoWithAllFields.viewed_at,
      });
    });

    it('negative: should throw NotFoundException when announcement does not exist', async () => {
      AnnouncementsRepositoryMock.findById.mockResolvedValueOnce(null);

      try {
        await announcementViewsService.markAnnouncementAsViewed(
          userId,
          'non_existent_id',
          viewAnnouncementDtoWithAllFields,
        );
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Announcement not found');
      }

      expect(AnnouncementsRepositoryMock.findById).toHaveBeenCalledWith('non_existent_id');
      expect(AnnouncementViewsRepositoryMock.recordView).not.toHaveBeenCalled();
    });

    it('negative: should throw NotFoundException with message when user_id is null', async () => {
      await expect(
        announcementViewsService.markAnnouncementAsViewed(null, announcementId, viewAnnouncementDtoMinimal),
      ).rejects.toThrow(new NotFoundException('Announcement not found'));
    });

    it('negative: should throw NotFoundException with message when announcement_id is null', async () => {
      await expect(
        announcementViewsService.markAnnouncementAsViewed(userId, null, viewAnnouncementDtoMinimal),
      ).rejects.toThrow(new NotFoundException('Announcement not found'));
    });
  });
});
