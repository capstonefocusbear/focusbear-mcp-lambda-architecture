import { Module } from '@nestjs/common';
import { SendinblueService } from '../../../../../libs/sendinblue/src/sendinblue.service';
import { UserRepository } from '../user/repositories/user.repository';
import { EventsController } from './controllers/events.controller';
import { EventsService } from './services/events.service';

@Module({
  providers: [EventsService, SendinblueService, UserRepository],
  exports: [EventsService],
  controllers: [EventsController],
})
export class EventsModule {}
