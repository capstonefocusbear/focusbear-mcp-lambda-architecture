import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '../../domain/subscription-status.enum';
import { Subscription } from '../../entities/subscription.entity';
import { SubscriptionRepository } from '../../repositories/subscription.repository';

@Injectable()
export class SyncSubscriptionStatusStrategy {
  constructor(private readonly subscriptionRepository: SubscriptionRepository) {}

  async trial(subscription: Subscription): Promise<Subscription> {
    const { item, isAffected } = this.checkLocalExpirationTime(subscription);
    if (isAffected) await this.subscriptionRepository.orm.save(item);
    return item;
  }

  private checkLocalExpirationTime(subscription: Subscription): { item: Subscription; isAffected: boolean } {
    const nowDate = new Date();
    const expirationDate = new Date(subscription.expires_date);
    const isActive = nowDate < expirationDate;
    if (isActive) return { item: subscription, isAffected: false };
    const item = { ...subscription, subscription_status: SubscriptionStatus.expired };
    return { item, isAffected: true };
  }

  // async personal(subscription: Subscription): Promise<Subscription> {
  //   const expirationTimeCheck = this.checkLocalExpirationTime(subscription);
  //   const
  // }

  // private async checkRevenueCatSubscriptionStatus(subscription: Subscription): Subscription {

  // }

  // async team_member() {}

  // async team_owner() {}
}
