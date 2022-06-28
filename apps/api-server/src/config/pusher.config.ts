import { registerAs } from '@nestjs/config';

export const pusherCongif = registerAs('pusher', () => ({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET,
  cluster: 'ap1',
  useTLS: true,
}));
