import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementsController } from './controllers/announcements.controller';
import { AnnouncementViewsController } from './controllers/announcement-views.controller';
import { AnnouncementsService } from './services/announcements.service';
import { AnnouncementViewsService } from './services/announcement-views.service';
import { AnnouncementEntity } from './entities/announcements.entity';
import { AnnouncementViewEntity } from './entities/announcement-views.entity';
import { AnnouncementsRepository } from './repositories/announcements.repository';
import { AnnouncementViewsRepository } from './repositories/announcement-views.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AnnouncementEntity, AnnouncementViewEntity])],
  controllers: [AnnouncementsController, AnnouncementViewsController],
  providers: [AnnouncementsService, AnnouncementViewsService, AnnouncementsRepository, AnnouncementViewsRepository],
  exports: [AnnouncementsService, AnnouncementsRepository, AnnouncementViewsRepository],
})
export class AnnouncementsModule {}
