import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import * as axios from 'axios';
import { RevenueCatService } from '@app/revenue-cat';
import { UserRepository } from '../repositories/user.repository';
import { Entitlement } from '../../subscription/domain/entitlement.enum';
import { ACTIVE, MONTH, PERSONAL_PLAN_COST_CENTS, TRIALING, TRIAL_COST_CENTS } from '../../../shared/utils/constants';

@Processor('revenue-cat-status')
export class RevenueCatStatusConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly revenueCatService: RevenueCatService,
    private readonly userRepository: UserRepository,
  ) {}

  getHighestRankingSubscription(userSubscriptions: Entitlement[] | string[]) {
    if (userSubscriptions.includes(Entitlement.team_owner)) {
      return Entitlement.team_owner;
    }
    if (userSubscriptions.includes(Entitlement.team_member)) {
      return Entitlement.team_member;
    }
    if (userSubscriptions.includes(Entitlement.personal)) {
      return Entitlement.personal;
    }
    if (userSubscriptions.includes(Entitlement.trial)) {
      return Entitlement.trial;
    }
    return null;
  }

  @Process('update-revenue-cat-status')
  async readOperationJob(
    job: Job<{
      user_id: string;
    }>,
  ) {
    const {
      data: { user_id },
    } = job;
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating user revenue cat status',
        data: {
          user_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      const { last_status_synced_with_profitwell } = user;
      const revenueCatUser = await this.revenueCatService.getOrCreateSubscriber(user_id);
      const subscriptionInfo = this.revenueCatService.checkSubscriptionStatus(revenueCatUser.subscriber);
      const userActiveSubscription = this.getHighestRankingSubscription(subscriptionInfo.activeEntitlements);
      await this.userRepository.update(user_id, {
        revenue_cat_data: subscriptionInfo,
        revenue_cat_status: userActiveSubscription,
        last_date_revenue_cat_data_synced: new Date(),
      });
      // if user current subscription type isn't same as what revenue cat returned, update subscription in ProfitWell
      if (
        last_status_synced_with_profitwell &&
        last_status_synced_with_profitwell !== userActiveSubscription &&
        user.stripe_customer_id
      ) {
        // update profit well status
        const PROFITWELL_UPDATE_ENDPOINT = `https://api.profitwell.com/v2/subscriptions/${user.stripe_customer_id}_pw_subscription`;
        const effectiveDate = subscriptionInfo.hasActiveSubscription
          ? Math.round(new Date(subscriptionInfo.expirations[userActiveSubscription].purchase_date).getTime() / 1000)
          : Math.round(new Date().getTime() / 1000);
        const dataForProfitWell = {
          plan_id: userActiveSubscription ?? last_status_synced_with_profitwell,
          plan_interval: MONTH,
          status: subscriptionInfo.hasActiveSubscription ? ACTIVE : TRIALING,
          value:
            subscriptionInfo.expirations.length === 1 && !subscriptionInfo.expirations.includes(Entitlement.trial)
              ? PERSONAL_PLAN_COST_CENTS
              : TRIAL_COST_CENTS,
          effective_date: effectiveDate,
        };
        await axios.default.put(PROFITWELL_UPDATE_ENDPOINT, dataForProfitWell, {
          headers: {
            Authorization: process.env.PROFITWELL_API_KEY,
          },
        });
        await this.userRepository.update(user_id, {
          profitwell_registration_date: new Date(effectiveDate),
        });
      }
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
    }
  }
}
