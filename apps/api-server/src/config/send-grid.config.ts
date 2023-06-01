import { registerAs } from '@nestjs/config';
import { ISendGridOptions } from '@app/send-grid';

export const sendGridConfig = registerAs(
  'sendGrid',
  (): ISendGridOptions => ({
    apiKey: process.env.SENDGRID_KEY,
  }),
);
