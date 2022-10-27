import { Module } from '@nestjs/common';
import { SendinblueService } from './sendinblue.service';

@Module({
  providers: [SendinblueService],
  exports: [SendinblueService],
})
export class SendinblueModule {}
