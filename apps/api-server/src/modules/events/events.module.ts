import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SendinblueService } from '@app/sendinblue/sendinblue.service';
import { UserRepository } from '../user/repositories/user.repository';
import { EventsConsumer } from './consumers/events.consumer';
import { EventsController } from './controllers/events.controller';
import { EventsService } from './services/events.service';
import { Auth0Module } from '../../../../../libs/auth0/src';
import { EventsRepository } from './repositories/events.repository';

@Module({
  providers: [EventsService, SendinblueService, UserRepository, EventsConsumer, EventsRepository],
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
    Auth0Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('auth0'),
    }),
  ],
  controllers: [EventsController],
})
export class EventsModule {}
