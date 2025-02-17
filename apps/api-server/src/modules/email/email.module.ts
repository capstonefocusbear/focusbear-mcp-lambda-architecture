import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SendGridService } from '@app/send-grid';
import { EmailProcessor } from './services/email.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'emailQueue',
    }),
  ],
  providers: [EmailProcessor, SendGridService],
  exports: [BullModule],
})
export class EmailModule {}
