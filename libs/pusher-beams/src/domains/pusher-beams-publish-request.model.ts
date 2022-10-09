import * as PusherBeams from '@pusher/push-notifications-server';
import { IsNotEmpty } from 'class-validator';

export class BeamsPublishRequest {
  constructor(data: PusherBeams.PublishRequestWithApnsAndFcm) {
    this.apns = data.apns;
    this.fcm = data.fcm;
  }

  @IsNotEmpty()
  apns: PusherBeams.ApnsPayload;

  @IsNotEmpty()
  fcm: PusherBeams.FcmPayload;
}
