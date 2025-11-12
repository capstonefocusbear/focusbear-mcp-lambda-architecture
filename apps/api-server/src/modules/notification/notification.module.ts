import { Module } from '@nestjs/common';
import { UserRepository } from '../user/repositories/user.repository';
import { NotificationController } from './controller/notification.controller';
import { NotificationRepository } from './repository/notification.repository';
import { NotificationService } from './services/notification.service';

@Module({
  providers: [UserRepository, NotificationService, NotificationRepository],
  exports: [NotificationService, NotificationRepository],
  controllers: [NotificationController],
})
export class NotificationModule {}
