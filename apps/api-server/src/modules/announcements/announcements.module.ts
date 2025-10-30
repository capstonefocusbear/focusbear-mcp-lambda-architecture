import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementsController } from './controller/announcements.controller';
import { AnnouncementsService } from './services/announcements.service';
import { AnnouncementEntity } from './entities/announcements.entity';
import { AnnouncementViewEntity } from './entities/announcement-view.entity';
import { AppVersionEntity } from './entities/app-versions.entity';
import { AnnouncementsRepository } from './repositories/announcements.repository';
import { AnnouncementViewsRepository } from './repositories/announcement-views.repository';
import { AppVersionsRepository } from './repositories/app-versions.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AnnouncementEntity, AnnouncementViewEntity, AppVersionEntity])],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService, AnnouncementsRepository, AnnouncementViewsRepository, AppVersionsRepository],
  exports: [AnnouncementsRepository, AnnouncementViewsRepository, AppVersionsRepository],
})
export class AnnouncementsModule {}
