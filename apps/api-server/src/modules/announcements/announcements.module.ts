import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementsController } from './controllers/announcements.controller';
import { AnnouncementsService } from './services/announcements.service';
import { AnnouncementEntity } from './entities/announcements.entity';
import { AnnouncementViewEntity } from './entities/announcement-views.entity';
import { AnnouncementsRepository } from './repositories/announcements.repository';
import { AnnouncementViewsRepository } from './repositories/announcement-views.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AnnouncementEntity, AnnouncementViewEntity])],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService, AnnouncementsRepository, AnnouncementViewsRepository],
  exports: [AnnouncementsRepository, AnnouncementViewsRepository],
})
export class AnnouncementsModule {}
