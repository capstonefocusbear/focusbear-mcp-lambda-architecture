import { Inject, Injectable } from '@nestjs/common';
import * as PusherBeams from '@pusher/push-notifications-server';
import { ActivityCompletedPush } from 'apps/api-server/src/modules/activity/domain/activity-completed-push.model';
import { CompletedFocusBlock } from 'apps/api-server/src/modules/focus-mode/entities/completed-focus-block.entity';
import { BeamsPublishRequest } from './domains/pusher-beams-publish-request.model';
import { IPusherBeamsOptions } from './interfaces';
import { PUSHER_BEAMS_MODULE_OPTIONS } from './pusher-beams.constants';
import { ApsOverwrite } from './interfaces/aps-overwrite';

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
    pushData?: ActivityCompletedPush | CompletedFocusBlock;
    // we use push notification to trigger a state update for the mobile app, was requested
    // that we exclude title and body for Android
    should_send_only_data_for_android?: boolean;
  }): PusherBeams.PublishRequest {
    const data: PusherBeams.PublishRequestWithApnsAndFcm = {
      apns: {
        aps: { alert: { title, body }, 'mutable-content': 1 } as ApsOverwrite,
        data: pushData,
      },
      fcm: {
        notification: {
          title: should_send_only_data_for_android ? undefined : title,
          body: should_send_only_data_for_android ? undefined : body,
        },
        data: pushData,
      },
    };
    const beamsPublishRequest = new BeamsPublishRequest(data);
    return beamsPublishRequest;
  }
}
