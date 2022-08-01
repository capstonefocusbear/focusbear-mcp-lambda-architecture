import { Injectable } from '@nestjs/common';
import { Subscription } from '../../entities/subscription.entity';
import { SubscriptionRepository } from '../../repositories/subscription.repository';
import { SyncSubscriptionStatusStrategy } from './sync-subscription-status.strategy';

@Injectable()
export class SubscriptionStatusService {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly syncStrategy: SyncSubscriptionStatusStrategy,
  ) {}

  async getSubscriptionStatus(
    user_id: string,
    { syncup = false }: { syncup: boolean },
  ): Promise<{ hasActiveSubscription: boolean; activeSubscriptions: Subscription[] }> {
    let subscriptions: Subscription[];
    subscriptions = await this.subscriptionRepository.getActiveSubscriptionsForUser(user_id);
    if (syncup) subscriptions = await this.syncSubscriptions(subscriptions);
    const hasActiveSubscription = subscriptions.length > 0;
    return { hasActiveSubscription, activeSubscriptions: subscriptions };
  }

  async syncSubscriptions(subscriptions: Subscription[]): Promise<Subscription[]> {
    return Promise.all(subscriptions.map((e) => this.syncStrategy[e.type](e)));
  }
}
