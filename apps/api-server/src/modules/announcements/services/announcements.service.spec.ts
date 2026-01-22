import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsRepository } from '../repositories/announcements.repository';
import { AnnouncementViewsRepository } from '../repositories/announcement-views.repository';
import { AnnouncementsRepositoryMock, AnnouncementViewsRepositoryMock } from '../../../../test/mocks/repositories.mock';
import {
  announcementDummyiOS,
  announcementDummyAndroid,
  announcementDummyWeb,
  announcementDummyMacOS,
  announcementDummyWindows,
  announcementDummyHighPriority,
} from '../../../../test/dummies';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';

describe('AnnouncementsService', () => {
  let announcementsService: AnnouncementsService;
  const userId = 'test-user-id';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AnnouncementsService, AnnouncementsRepository, AnnouncementViewsRepository],
    })
      .overrideProvider(AnnouncementsRepository)
      .useValue(AnnouncementsRepositoryMock)
      .overrideProvider(AnnouncementViewsRepository)
      .useValue(AnnouncementViewsRepositoryMock)
      .compile();

    announcementsService = moduleRef.get<AnnouncementsService>(AnnouncementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(announcementsService).toBeDefined();
  });

  describe('getActiveAnnouncements', () => {
    it('positive: should return active announcements for iOS (lowercase)', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([announcementDummyiOS]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'ios');

      expect(AnnouncementViewsRepositoryMock.findViewedAnnouncementIds).toHaveBeenCalledWith(userId);
      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith([], OperatingSystem.iOS);
      expect(result).toEqual({
        announcements: [announcementDummyiOS],
      });
    });

    it('positive: should return active announcements for iOS (capitalized)', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([announcementDummyiOS]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'iOS');

      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith([], OperatingSystem.iOS);
      expect(result).toEqual({
        announcements: [announcementDummyiOS],
      });
    });

    it('positive: should return active announcements for Android (lowercase)', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([announcementDummyAndroid]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'android');

      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith([], OperatingSystem.Android);
      expect(result).toEqual({
        announcements: [announcementDummyAndroid],
      });
    });

    it('positive: should return active announcements for Android (capitalized)', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([announcementDummyAndroid]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'Android');

      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith([], OperatingSystem.Android);
      expect(result).toEqual({
        announcements: [announcementDummyAndroid],
      });
    });

    it('positive: should return active announcements for MacOS (mac)', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([announcementDummyMacOS]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'mac');

      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith([], OperatingSystem.MacOS);
      expect(result).toEqual({
        announcements: [announcementDummyMacOS],
      });
    });

    it('positive: should return active announcements for MacOS (macos lowercase)', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([announcementDummyMacOS]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'macos');

      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith([], OperatingSystem.MacOS);
      expect(result).toEqual({
        announcements: [announcementDummyMacOS],
      });
    });

    it('positive: should return active announcements for MacOS (capitalized)', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([announcementDummyMacOS]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'MacOS');

      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith([], OperatingSystem.MacOS);
      expect(result).toEqual({
        announcements: [announcementDummyMacOS],
      });
    });

    it('positive: should return active announcements for Windows (lowercase)', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([announcementDummyWindows]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'windows');

      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith([], OperatingSystem.Windows);
      expect(result).toEqual({
        announcements: [announcementDummyWindows],
      });
    });

    it('positive: should return active announcements for Windows (capitalized)', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([announcementDummyWindows]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'Windows');

      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith([], OperatingSystem.Windows);
      expect(result).toEqual({
        announcements: [announcementDummyWindows],
      });
    });

    it('positive: should return active announcements for Web (lowercase)', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([announcementDummyWeb]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'web');

      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith([], OperatingSystem.Web);
      expect(result).toEqual({
        announcements: [announcementDummyWeb],
      });
    });

    it('positive: should return active announcements for Web (capitalized)', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([announcementDummyWeb]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'Web');

      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith([], OperatingSystem.Web);
      expect(result).toEqual({
        announcements: [announcementDummyWeb],
      });
    });

    it('positive: should return active announcements for Unknown (lowercase)', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'unknown');

      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith([], OperatingSystem.Unknown);
      expect(result).toEqual({
        announcements: [],
      });
    });

    it('positive: should return active announcements for Unknown (capitalized)', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'Unknown');

      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith([], OperatingSystem.Unknown);
      expect(result).toEqual({
        announcements: [],
      });
    });

    it('positive: should exclude viewed announcements from results', async () => {
      const viewedIds = ['ann_2024_12_ios_update', 'ann_2024_12_critical_survey'];
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce(viewedIds);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'ios');

      expect(AnnouncementViewsRepositoryMock.findViewedAnnouncementIds).toHaveBeenCalledWith(userId);
      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith(viewedIds, OperatingSystem.iOS);
      expect(result).toEqual({
        announcements: [],
      });
    });

    it('positive: should return all active announcements when user has not viewed any', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([
        announcementDummyiOS,
        announcementDummyHighPriority,
      ]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'ios');

      expect(AnnouncementViewsRepositoryMock.findViewedAnnouncementIds).toHaveBeenCalledWith(userId);
      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith([], OperatingSystem.iOS);
      expect(result).toEqual({
        announcements: [announcementDummyiOS, announcementDummyHighPriority],
      });
    });

    it('positive: should exclude a viewed announcement from results', async () => {
      const viewedIds = ['ann_2024_12_ios_update'];
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce(viewedIds);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([announcementDummyHighPriority]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'ios');

      expect(AnnouncementViewsRepositoryMock.findViewedAnnouncementIds).toHaveBeenCalledWith(userId);
      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).toHaveBeenCalledWith(viewedIds, OperatingSystem.iOS);
      expect(result).toEqual({
        announcements: [announcementDummyHighPriority],
      });
      expect(result.announcements).not.toContainEqual(announcementDummyiOS);
      expect(announcementDummyiOS.id).toBe('ann_2024_12_ios_update');
    });

    it('positive: should return empty announcements array when no active announcements exist', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'ios');

      expect(result).toEqual({
        announcements: [],
      });
    });

    it('positive: should return multiple announcements when available', async () => {
      AnnouncementViewsRepositoryMock.findViewedAnnouncementIds.mockResolvedValueOnce([]);
      AnnouncementsRepositoryMock.findActiveAnnouncements.mockResolvedValueOnce([
        announcementDummyiOS,
        announcementDummyHighPriority,
      ]);

      const result = await announcementsService.getActiveAnnouncements(userId, 'ios');

      expect(result).toEqual({
        announcements: [announcementDummyiOS, announcementDummyHighPriority],
      });
    });

    it('negative: should throw BadRequestException for invalid operating system', async () => {
      try {
        await announcementsService.getActiveAnnouncements(userId, 'invalid_os');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          'Invalid operating system: invalid_os. Must be one of: ios, android, macos, windows, web or unknown',
        );
      }

      expect(AnnouncementViewsRepositoryMock.findViewedAnnouncementIds).not.toHaveBeenCalled();
      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).not.toHaveBeenCalled();
    });

    it('negative: should throw BadRequestException for empty string operating system', async () => {
      try {
        await announcementsService.getActiveAnnouncements(userId, '');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          'Invalid operating system: . Must be one of: ios, android, macos, windows, web or unknown',
        );
      }

      expect(AnnouncementViewsRepositoryMock.findViewedAnnouncementIds).not.toHaveBeenCalled();
      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).not.toHaveBeenCalled();
    });

    it('negative: should throw BadRequestException for random string operating system', async () => {
      try {
        await announcementsService.getActiveAnnouncements(userId, 'linux');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          'Invalid operating system: linux. Must be one of: ios, android, macos, windows, web or unknown',
        );
      }

      expect(AnnouncementViewsRepositoryMock.findViewedAnnouncementIds).not.toHaveBeenCalled();
      expect(AnnouncementsRepositoryMock.findActiveAnnouncements).not.toHaveBeenCalled();
    });
  });
});
