import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { AnnouncementEntity } from '../entities/announcements.entity';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';

@Injectable()
export class AnnouncementsRepository extends BaseRepository<AnnouncementEntity> {
  constructor(private readonly connection: Connection) {
    super(connection, AnnouncementEntity);
  }

  /**
   * Find active announcements for a specific OS, excluding viewed announcements
   * @param viewedIds Array of announcement IDs the user has already viewed
   * @param os Operating system to filter by
   * @returns Active, non-expired, unviewed announcements sorted by priority and date
   */
  async findActiveAnnouncements(viewedIds: string[], os: OperatingSystem): Promise<AnnouncementEntity[]> {
    const queryBuilder = await this.orm
      .createQueryBuilder('announcement')
      .where('announcement.expiry_date > :now', { now: new Date() })
      .andWhere('announcement.operating_system = :os', { os });

    // Exclude viewed announcements if any exist
    if (viewedIds.length > 0) {
      queryBuilder.andWhere('announcement.id NOT IN (:...viewedIds)', { viewedIds });
    }

    // Custom ORDER BY for priority enum
    queryBuilder
      .orderBy(
        `CASE announcement.priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END`,
        'ASC',
      )
      .addOrderBy('announcement.created_at', 'DESC');

    return queryBuilder.getMany();
  }

  /**
   * Find a single announcement by ID
   * @param id Announcement ID
   * @returns Announcement entity or null
   */
  async findById(id: string): Promise<AnnouncementEntity | null> {
    const ann = await this.orm.createQueryBuilder('announcement').where('announcement.id = :id', { id }).getOne();
    return ann;
  }
}
