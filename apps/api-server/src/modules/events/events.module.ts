import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BrevoService } from '@app/brevo/brevo.service';
import { IPusherBeamsOptions, PusherBeamsModule } from '@app/pusher-beams';
import { ISendGridOptions, SendGridModule } from '@app/send-grid';
import { UserRepository } from '../user/repositories/user.repository';
import { EventsConsumer } from './consumers/events.consumer';
import { EventsController } from './controllers/events.controller';
import { EventsService } from './services/events.service';
import { Auth0Module } from '../../../../../libs/auth0/src';
import { EventsRepository } from './repositories/events.repository';
import { UserModule } from '../user/user.module';
import { DeviceModule } from '../device/device.module';

@Module({
  providers: [EventsService, BrevoService, UserRepository, EventsConsumer, EventsRepository],
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
    PusherBeamsModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IPusherBeamsOptions => configService.get('pusher-beams'),
    }),
    SendGridModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ISendGridOptions => configService.get('sendGrid'),
    }),
    UserModule,
    DeviceModule,
  ],
  controllers: [EventsController],
})
export class EventsModule {}
