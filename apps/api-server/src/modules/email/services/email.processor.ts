import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { SendGridService } from '@app/send-grid';

@Processor('emailQueue')
export class EmailProcessor {
  constructor(private readonly sendGridService: SendGridService) {}

  @Process('sendEmail')
  public async handleSendEmail(job: Job) {
    const { to, from, replyTo, subject, text } = job.data;

    await this.sendGridService.sendEmail({
      to,
      from,
      replyTo,
      subject,
      text,
    });
  }
}
