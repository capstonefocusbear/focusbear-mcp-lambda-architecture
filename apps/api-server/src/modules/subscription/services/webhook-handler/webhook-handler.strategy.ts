import { Injectable } from '@nestjs/common';

@Injectable()
export class WebhookHandlerStrategy {
  INITIAL_PURCHASE() {
    /** 1) Get Subscription status
     * */
    /** 2) create a new subscription item
     * itentifier = notification.event.product_id
     * user_id = notification.event.app_user_id
     * provider = notification.event.store // fix enum in the DB
     * type = personal || team ??
     * expires_date = new Date(notification.event.expiration_at_ms)
     * subscription_status = result of step 1
     * subscription_metadata = ??
     * */
    return 'INITIAL_PURCHASE';
  }

  // NON_RENEWING_PURCHASE() {}

  // RENEWAL() {}

  // CANCELLATION() {}

  // UNCANCELLATION() {}

  // BILLING_ISSUE() {}

  // EXPIRATION() {}
}
