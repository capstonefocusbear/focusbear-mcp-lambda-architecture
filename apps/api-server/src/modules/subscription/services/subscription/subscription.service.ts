import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseCRUDService } from '../../../../shared/services/base-crud.service';
import { SubscriptionStatus } from '../../domain/subscription-status.enum';
import { SubscriptionType } from '../../domain/subscription-type.enum';
import { Subscription } from '../../entities/subscription.entity';
import { SubscriptionRepository } from '../../repositories/subscription.repository';

@Injectable()
export class SubscriptionService extends BaseCRUDService<SubscriptionRepository, Subscription> {
  constructor(private readonly repo: SubscriptionRepository, private readonly config: ConfigService) {
    super(repo);
  }

  async createInitialTrialForNewUser(user_id: string): Promise<Subscription> {
    const expires_date = this.calculateTrialExpiresDateISOTimestamp();
    const trialSubscription = new Subscription({
      user_id,
      subscription_status: SubscriptionStatus.active,
      type: SubscriptionType.trial,
      expires_date,
    });
    return this.create(trialSubscription);
  }

  private calculateTrialExpiresDateISOTimestamp(): string {
    const { trialDurationDays } = this.config.get<{ trialDurationDays: string }>('constants.subscriptions');
    const expiresUnixTime = Date.now() + Number(trialDurationDays) * 24 * 60 * 60 * 1000;
    const expiresDateISOTimestamp = new Date(expiresUnixTime).toISOString();
    return expiresDateISOTimestamp;
  }
}
