import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SendinblueService } from '../../../../../libs/sendinblue/src/sendinblue.service';
import { UserRepository } from '../user/repositories/user.repository';
import { EventsConsumer } from './consumers/events.consumer';
import { EventsController } from './controllers/events.controller';
import { EventsService } from './services/events.service';

@Module({
  providers: [EventsService, SendinblueService, UserRepository, EventsConsumer],
  exports: [EventsService],
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => config.get('bull'),
    }),
    BullModule.registerQueue({
      name: 'events',
    }),
  ],
  controllers: [EventsController],
})
export class EventsModule {}
