import { IPusherBeamsOptions } from '@app/pusher-beams';
import { registerAs } from '@nestjs/config';

export const pusherBeamsConfig = registerAs(
  'pusher-beams',
  (): IPusherBeamsOptions => ({
    instanceId: process.env.PUSHER_BEAMS_INSTANCE_ID,
    secretKey: process.env.PUSHER_BEAMS_PRIMARY_KEY,
  }),
);
