import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { isUUID } from '../../../../shared/utils/helpers';
import { BullQueues, BullWorkers } from '../../../../shared/utils/constants';

@Injectable()
export class WebhookHandlerStrategy {
  constructor(@InjectQueue(BullQueues.REVENUE_CAT_STATUS) private revenueCatQueue: Queue) {}

  async updateUserRevenueCatCache(user_id: string) {
    if (!isUUID(user_id)) return;
    await this.revenueCatQueue.add(BullWorkers.UPDATE_REVENUE_CAT_STATUS, { user_id });
  }

  async INITIAL_PURCHASE(event) {
    await this.updateUserRevenueCatCache(event.app_user_id);
    return null;
  }

  // should be handled // for team_owners and members
  async RENEWAL(event) {
    await this.updateUserRevenueCatCache(event.app_user_id);
    return null;
  }

  async EXPIRATION(event) {
    try {
      await this.updateUserRevenueCatCache(event.app_user_id);
    } catch (error) {
      console.error(error);
    }
  }

  TEST() {
    return null;
  }

  // TODO: handle creating teams for subscriptions
  // assigned from the RevenueCat dashboard
  // https://github.com/Focus-Bear/backend/issues/54
  async NON_RENEWING_PURCHASE(event) {
    await this.updateUserRevenueCatCache(event.app_user_id);
    return null;
  }

  async PRODUCT_CHANGE(event) {
    await this.updateUserRevenueCatCache(event.app_user_id);
    return null;
  }

  async CANCELLATION(event) {
    await this.updateUserRevenueCatCache(event.app_user_id);
    return null;
  }

  async UNCANCELLATION(event) {
    await this.updateUserRevenueCatCache(event.app_user_id);
    return null;
  }

  BILLING_ISSUE() {
    return null;
  }

  SUBSCRIPTION_PAUSED() {
    return null;
  }

  TRANSFER() {
    return null;
  }
}
