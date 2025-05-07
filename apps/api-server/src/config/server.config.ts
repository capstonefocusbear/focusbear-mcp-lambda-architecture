import { registerAs } from '@nestjs/config';

export const serverConfig = registerAs('server', () => ({
  port: process.env.PORT || process.env.SERVER_PORT || 3009,
  host: process.env.SERVER_HOST || '127.0.0.1',
  frontEndUrl: process.env.SERVER_FRONTEND_URL,
}));
