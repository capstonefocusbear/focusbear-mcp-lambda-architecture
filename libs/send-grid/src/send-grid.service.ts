import { Inject, Injectable } from '@nestjs/common';
import * as sendGrid from '@sendgrid/mail';
import { ISendGridOptions, ISendGridService } from './interfaces';
import { SEND_GRID_MODULE_OPTIONS } from './send-grid.constants';

@Injectable()
export class SendGridService implements ISendGridService {
  private readonly sendGridClient: sendGrid.MailService;

  constructor(@Inject(SEND_GRID_MODULE_OPTIONS) private readonly options: ISendGridOptions) {
    this.sendGridClient = sendGrid;
    this.sendGridClient.setApiKey(this.options.apiKey);
  }

  async sendEmail(
    payload: sendGrid.MailDataRequired | sendGrid.MailDataRequired[],
    isMultiple?: boolean,
  ): Promise<any | void> {
    return this.sendGridClient.send(payload, isMultiple);
  }
}
