import * as sendGrid from '@sendgrid/mail';

export interface ISendGridService {
  sendEmail(
    payload: sendGrid.MailDataRequired | sendGrid.MailDataRequired[],
    isMultiple?: boolean,
  ): Promise<any | void>;
}
