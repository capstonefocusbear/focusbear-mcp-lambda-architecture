import { registerAs } from '@nestjs/config';
import * as Bull from 'bull';

export const bullConfig = registerAs(
  'bull',
  (): Bull.QueueOptions => ({
    redis: {
      host: process.env.REDIS_HOSTNAME,
      port: Number(process.env.REDIS_PORT),
    },
  }),
);
