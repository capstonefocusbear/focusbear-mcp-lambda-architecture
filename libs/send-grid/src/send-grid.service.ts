import { Inject, Injectable, Logger } from '@nestjs/common';
import * as sendGrid from '@sendgrid/mail';
import { ISendGridOptions, ISendGridService } from './interfaces';
import { SEND_GRID_MODULE_OPTIONS } from './send-grid.constants';
import { EmailRecipients, extractEmails, filterTestRecipients } from './email-utils';

type SendGridMailPayload = sendGrid.MailDataRequired & {
  cc?: EmailRecipients;
  bcc?: EmailRecipients;
};

@Injectable()
export class SendGridService implements ISendGridService {
  private readonly sendGridClient: sendGrid.MailService;

  private readonly logger = new Logger(SendGridService.name);

  constructor(@Inject(SEND_GRID_MODULE_OPTIONS) private readonly options: ISendGridOptions) {
    this.sendGridClient = sendGrid;
    this.sendGridClient.setApiKey(this.options.apiKey);
  }

  async sendEmail(
    payload: sendGrid.MailDataRequired | sendGrid.MailDataRequired[],
    isMultiple?: boolean,
  ): Promise<any | void> {
    const payloads = (Array.isArray(payload) ? payload : [payload]) as SendGridMailPayload[];
    const filteredPayloads: SendGridMailPayload[] = [];

    let suppressedRecipientCount = 0;
    let suppressedPayloadCount = 0;

    for (const payloadItem of payloads) {
      const filteredPayload: SendGridMailPayload = { ...payloadItem };

      const toResult = filterTestRecipients(filteredPayload.to as EmailRecipients);
      const ccResult = filterTestRecipients(filteredPayload.cc);
      const bccResult = filterTestRecipients(filteredPayload.bcc);

      suppressedRecipientCount +=
        toResult.removedEmails.length + ccResult.removedEmails.length + bccResult.removedEmails.length;

      filteredPayload.to = toResult.filtered as SendGridMailPayload['to'];
      filteredPayload.cc = ccResult.filtered;
      filteredPayload.bcc = bccResult.filtered;

      // Keep behavior aligned with transactional sends in this codebase: if `to` is fully filtered out, skip the message.
      if (extractEmails(filteredPayload.to as EmailRecipients).length === 0) {
        suppressedPayloadCount += 1;
      } else {
        filteredPayloads.push(filteredPayload);
      }
    }

    if (suppressedRecipientCount > 0) {
      this.logger.warn(
        `Suppressed ${suppressedRecipientCount} test recipient(s) across ${suppressedPayloadCount} skipped payload(s).`,
      );
    }

    if (filteredPayloads.length === 0) {
      return;
    }

    const filteredPayload = Array.isArray(payload)
      ? filteredPayloads
      : (filteredPayloads[0] as sendGrid.MailDataRequired | undefined);

    if (!filteredPayload) {
      return;
    }

    return this.sendGridClient.send(filteredPayload, isMultiple);
  }
}
