import { Inject, Injectable } from '@nestjs/common';
import * as Pusher from 'pusher';
import { createHmac } from 'crypto';
import { IPusherOptions } from './interfaces';
import { PUSHER_MODULE_OPTIONS } from './pusher.constants';

@Injectable()
export class PusherService extends Pusher {
  constructor(@Inject(PUSHER_MODULE_OPTIONS) private options: IPusherOptions) {
    super({ ...options });
  }

  generateAuthKey(userId: string, socketId: string) {
    const pusherKey = this.options.key;
    const pusherSecret = this.options.secret;
    const userData = JSON.stringify({ id: userId });
    const signature = createHmac('sha256', pusherSecret).update(`${socketId}::user::${userData}`).digest('hex');
    return { auth: `${pusherKey}:${signature}`, user_data: userData };
  }
}
