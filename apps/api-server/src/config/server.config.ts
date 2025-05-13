import { registerAs } from '@nestjs/config';

export const serverConfig = registerAs('server', () => ({
  port: process.env.SERVER_PORT || 5038,
  host: process.env.SERVER_HOST || '0.0.0.0',
  frontEndUrl: process.env.frontEndUrl,
  devFrontendUrl: process.env.devFrontendUrl,
}));
