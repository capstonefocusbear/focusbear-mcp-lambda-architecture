import { Injectable, BadRequestException } from '@nestjs/common';
import { AnnouncementsRepository } from '../repositories/announcements.repository';
import { AnnouncementViewsRepository } from '../repositories/announcement-views.repository';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';
import { GetAnnouncementsResponseDto } from '../dto/get-announcements-response.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly announcementsRepository: AnnouncementsRepository,
    private readonly announcementViewsRepository: AnnouncementViewsRepository,
  ) {}

  /**
   * Get active announcements for a user filtered by OS
   * @param user_id User's unique identifier
   * @param os_name Operating system name (case-insensitive)
   * @returns Active, unread announcements
   */
  async getActiveAnnouncements(user_id: string, os_name: string): Promise<GetAnnouncementsResponseDto> {
    const normalizedOs = os_name.trim().toLowerCase();

    // Map os_name to OperatingSystem enum (case-insensitive)
    const osMap: Record<string, OperatingSystem> = {
      ios: OperatingSystem.iOS,
      android: OperatingSystem.Android,
      mac: OperatingSystem.MacOS,
      macos: OperatingSystem.MacOS,
      windows: OperatingSystem.Windows,
      web: OperatingSystem.Web,
      unknown: OperatingSystem.Unknown,
    };

    const os = osMap[normalizedOs];
    if (!os) {
      throw new BadRequestException(
        `Invalid operating system: ${os_name}. Must be one of: ios, android, macos, windows, web or unknown`,
      );
    }

    // Get announcement IDs the user has already viewed
    const viewedIds = await this.announcementViewsRepository.findViewedAnnouncementIds(user_id);

    // Fetch active announcements excluding viewed ones
    const announcements = await this.announcementsRepository.findActiveAnnouncements(viewedIds, os);

    return { announcements };
  }
}
