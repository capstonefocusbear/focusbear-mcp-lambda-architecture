import { Inject, Injectable } from '@nestjs/common';
import * as Pusher from 'pusher';
import { IPusherOptions } from './interfaces';
import { PUSHER_MODULE_OPTIONS } from './pusher.constants';

@Injectable()
export class PusherService extends Pusher {
  constructor(@Inject(PUSHER_MODULE_OPTIONS) private options: IPusherOptions) {
    super({ ...options });
  }
}
