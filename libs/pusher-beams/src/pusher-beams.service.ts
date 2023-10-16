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

  createBeamsPublishRequest(
    title: string,
    body: string,
    pushData?: ActivityCompletedPush | CompletedFocusBlock,
  ): PusherBeams.PublishRequest {
    const data: PusherBeams.PublishRequestWithApnsAndFcm = {
      apns: {
        aps: { alert: { title, body }, 'mutable-content': 1 } as ApsOverwrite,
        data: pushData,
      },
      fcm: { notification: { title, body }, data: pushData },
    };
    const beamsPublishRequest = new BeamsPublishRequest(data);
    return beamsPublishRequest;
  }
}
