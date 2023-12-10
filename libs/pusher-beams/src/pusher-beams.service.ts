import { Inject, Injectable } from '@nestjs/common';
import * as PusherBeams from '@pusher/push-notifications-server';
import { BeamsPublishRequest } from './domains/pusher-beams-publish-request.model';
import { IPusherBeamsOptions } from './interfaces';
import { PUSHER_BEAMS_MODULE_OPTIONS } from './pusher-beams.constants';

@Injectable()
export class PusherBeamsService extends PusherBeams {
  constructor(@Inject(PUSHER_BEAMS_MODULE_OPTIONS) private options: IPusherBeamsOptions) {
    super({ ...options });
  }

  createBeamsPublishRequest({
    title,
    body,
    pushData,
    should_send_only_data_for_android = false,
  }: {
    title?: string;
    body?: string;
    pushData?: { [key: string]: any };
    // we use push notification to trigger a state update for the mobile app, was requested
    // that we exclude title and body for Android
    should_send_only_data_for_android?: boolean;
  }): PusherBeams.PublishRequest {
    const data: PusherBeams.PublishRequestWithApnsAndFcm = {
      apns: {
        aps: { alert: { title, body } },
        data: pushData,
      },
      fcm: {
        ...(!should_send_only_data_for_android && {
          notification: {
            title,
            body,
          },
        }),
        data: pushData,
      },
    };
    const beamsPublishRequest = new BeamsPublishRequest(data);
    return beamsPublishRequest;
  }
}
