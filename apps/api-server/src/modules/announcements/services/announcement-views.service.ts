import { Injectable, NotFoundException } from '@nestjs/common';
import { AnnouncementsRepository } from '../repositories/announcements.repository';
import { AnnouncementViewsRepository } from '../repositories/announcement-views.repository';
import { ViewAnnouncementDto } from '../dto/view-announcement.dto';

@Injectable()
export class AnnouncementViewsService {
  constructor(
    private readonly announcementsRepository: AnnouncementsRepository,
    private readonly announcementViewsRepository: AnnouncementViewsRepository,
  ) {}

  /**
   * Mark an announcement as viewed or dismissed
   * @param user_id The authenticated user's ID
   * @param announcement_id The announcement ID to mark as viewed
   * @param dto Contains optional action and viewed_at timestamp
   */
  async markAnnouncementAsViewed(user_id: string, announcement_id: string, dto: ViewAnnouncementDto): Promise<void> {
    // Validate that the announcement exists
    const announcement = await this.announcementsRepository.findById(announcement_id);
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // Record the view (idempotent operation)
    await this.announcementViewsRepository.recordView({
      user_id,
      announcement_id,
      action: dto.action,
      source: dto.source,
      read_at: dto.viewed_at,
    });
  }
}
