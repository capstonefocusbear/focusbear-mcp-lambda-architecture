import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { Controller } from './controller/.controller';
import { AnnouncementsController } from './controller/announcements.controller';
import { AnnouncementsService } from './services/announcements.service';
import { AnnouncementEntity } from './entities/announcements.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AnnouncementEntity])],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
