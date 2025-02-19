import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ISendGridOptions, SendGridModule } from '@app/send-grid';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailProcessor } from './services/email.processor';

@Module({
  imports: [
    SendGridModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ISendGridOptions => configService.get('sendGrid'),
    }),
    BullModule.registerQueue({
      name: 'emailQueue',
    }),
  ],
  providers: [EmailProcessor],
  exports: [BullModule],
})
export class EmailModule {}
