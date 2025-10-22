import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { AnnouncementEntity, AnnouncementType } from '../entities/announcements.entity';

@Injectable()
export class AnnouncementsRepository {
  constructor(
    @InjectRepository(AnnouncementEntity)
    private readonly repository: Repository<AnnouncementEntity>,
  ) {}

  // Find all active announcements that haven't expired
  async findActiveAnnouncements(): Promise<AnnouncementEntity[]> {
    return this.repository.find({
      where: {
        expiryDate: MoreThan(new Date()), // Not expired
      },
      order: {
        priority: 'DESC', // Higher priority first
        createdAt: 'DESC', // Newest first for same priority
      },
    });
  }

  // Find announcements by type
  async findByType(type: AnnouncementType): Promise<AnnouncementEntity[]> {
    return this.repository.find({
      where: {
        type,
        expiryDate: MoreThan(new Date()),
      },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  // Find a single announcement by ID
  async findById(id: string): Promise<AnnouncementEntity | null> {
    return this.repository.findOne({
      where: { id },
    });
  }
}
