import * as PusherBeams from '@pusher/push-notifications-server';

export interface ApsOverwrite extends PusherBeams.ApsPayload {
  'mutable-content': number;
}
