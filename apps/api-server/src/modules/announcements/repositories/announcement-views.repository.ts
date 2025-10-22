import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnouncementViewEntity, ViewAction } from '../entities/announcement-view.entity';

@Injectable()
export class AnnouncementViewsRepository {
  constructor(
    @InjectRepository(AnnouncementViewEntity)
    private readonly repository: Repository<AnnouncementViewEntity>,
  ) {}

  /**
   * Find all announcement IDs that a user has already viewed/dismissed
   */
  async findViewedAnnouncementIds(userId: string): Promise<string[]> {
    const views = await this.repository.find({
      where: { userId },
      select: ['announcementId'],
    });

    return views.map((view) => view.announcementId);
  }

  /**
   * Check if a user has already viewed a specific announcement
   */
  async hasUserViewedAnnouncement(userId: string, announcementId: string): Promise<boolean> {
    const view = await this.repository.findOne({
      where: { userId, announcementId },
    });

    return !!view;
  }

  /**
   * Record that a user has viewed/dismissed an announcement (idempotent)
   */
  async recordView(
    userId: string,
    announcementId: string,
    action: ViewAction = ViewAction.VIEWED,
    source?: string,
    readAt?: Date,
  ): Promise<AnnouncementViewEntity> {
    // Try to find existing view first
    let view = await this.repository.findOne({
      where: { userId, announcementId },
    });

    if (view) {
      // Update existing view (idempotent behavior)
      view.action = action;
      view.readAt = readAt || new Date();
      if (source) view.source = source;
    } else {
      // Create new view
      view = this.repository.create({
        userId,
        announcementId,
        action,
        source,
        readAt: readAt || new Date(),
      });
    }

    return this.repository.save(view);
  }

  /**
   * Get all views for a specific user with announcement details
   */
  async findUserViews(userId: string): Promise<AnnouncementViewEntity[]> {
    return this.repository.find({
      where: { userId },
      relations: ['announcement'],
      order: { readAt: 'DESC' },
    });
  }

  /**
   * Get analytics: count of views per announcement
   */
  async getViewCounts(announcementIds: string[]): Promise<{ announcementId: string; viewCount: number }[]> {
    const result = await this.repository
      .createQueryBuilder('view')
      .select('view.announcementId', 'announcementId')
      .addSelect('COUNT(*)', 'viewCount')
      .where('view.announcementId IN (:...ids)', { ids: announcementIds })
      .groupBy('view.announcementId')
      .getRawMany();

    return result.map((row) => ({
      announcementId: row.announcementId,
      viewCount: parseInt(row.viewCount, 10),
    }));
  }
}
