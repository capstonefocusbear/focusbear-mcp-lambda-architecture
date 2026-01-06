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
  async findViewedAnnouncementIds(user_id: string): Promise<string[]> {
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
  }): Promise<void> {
    const { user_id, announcement_id, action = ViewAction.VIEWED, source, read_at } = data;

    await this.orm
      .createQueryBuilder()
      .insert()
      .into(AnnouncementViewEntity)
      .values({
        user_id,
        announcement_id,
        source,
        action,
        read_at: read_at || new Date(),
      })
      .orUpdate({
        conflict_target: ['user_id', 'announcement_id'],
        overwrite: ['action', 'source', 'read_at'],
      })
      .execute();
  }
}
