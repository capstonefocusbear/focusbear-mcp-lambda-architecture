import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { AnnouncementViewEntity, ViewAction } from '../entities/announcement-views.entity';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';

@Injectable()
export class AnnouncementViewsRepository extends BaseRepository<AnnouncementViewEntity> {
  constructor(private readonly connection: Connection) {
    super(connection, AnnouncementViewEntity);
  }

  /**
   * Find all announcement IDs that a user has already viewed/dismissed
   */
  async findViewedAnnouncement_ids(user_id: string): Promise<string[]> {
    const views = await this.orm
      .createQueryBuilder('view')
      .select('view.announcement_id')
      .where('view.user_id = :user_id', { user_id })
      .getMany();

    return views.map((view) => view.announcement_id);
  }

  /**
   * Record that a user has viewed/dismissed an announcement (idempotent)
   */
  async recordView(data: {
    user_id: string;
    announcement_id: string;
    action?: ViewAction;
    source?: string;
    read_at?: Date;
  }): Promise<AnnouncementViewEntity> {
    const { user_id, announcement_id, action = ViewAction.VIEWED, source, read_at } = data;

    // Try to find existing view first
    const view = await this.orm
      .createQueryBuilder('view')
      .where('view.user_id = :user_id', { user_id })
      .andWhere('view.announcement_id = :announcement_id', { announcement_id })
      .getOne();

    if (view) {
      view.action = action;
      view.read_at = read_at || new Date();
      return this.orm.save(view);
    }

    // Create new view
    const newView = this.orm.create({
      user_id,
      announcement_id,
      source,
      action,
      read_at: read_at || new Date(),
    });

    return this.orm.save(newView);
  }
}
