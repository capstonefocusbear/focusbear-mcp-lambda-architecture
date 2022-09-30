import { registerAs } from '@nestjs/config';
import { ISendGridOptions } from '../../../../libs/send-grid/src';

export const sendGridConfig = registerAs(
  'sendGrid',
  (): ISendGridOptions => ({
    apiKey: process.env.SENDGRID_KEY,
  }),
);
