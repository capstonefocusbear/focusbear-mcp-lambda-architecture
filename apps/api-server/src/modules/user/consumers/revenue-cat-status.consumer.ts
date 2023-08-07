import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { RevenueCatService } from '@app/revenue-cat';
import { UserRepository } from '../repositories/user.repository';
import { Entitlement } from '../../subscription/domain/entitlement.enum';
import {
  ACTIVE,
  MONTH,
  ONE_SECOND_AS_MILLIS,
  PERSONAL_PLAN_COST_CENTS,
  PROFITWELL_ADD_SUBSCRIPTION_ENDPOINT,
  TEN_SECONDS_AS_MILLIS,
  TRIALING,
  TRIAL_COST_CENTS,
  USD,
} from '../../../shared/utils/constants';
import { ProfitWellCustomer } from '../domain/profitwell-customer.model';

axiosRetry(axios, {
  retries: 3,
  shouldResetTimeout: true,
  retryDelay: (retryCount) => retryCount * TEN_SECONDS_AS_MILLIS,
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkError(error) ||
      axiosRetry.isRetryableError(error) ||
      (error.response && error.response.status === 429)
    );
  },
});

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
      const { last_status_synced_with_profitwell, profitwell_id, stripe_customer_id } = user;
      const revenueCatUser = await this.revenueCatService.getOrCreateSubscriber(user_id);
      const subscriptionInfo = this.revenueCatService.checkSubscriptionStatus(revenueCatUser.subscriber);
      const userActiveSubscription = this.getHighestRankingSubscription(subscriptionInfo.activeEntitlements);
      await this.userRepository.update(user_id, {
        revenue_cat_data: subscriptionInfo,
        revenue_cat_status: userActiveSubscription,
        last_date_revenue_cat_data_synced: new Date(),
      });
      const renewalAmountCents = subscriptionInfo.expirations[Entitlement.personal]
        ? PERSONAL_PLAN_COST_CENTS
        : TRIAL_COST_CENTS;
      const effectiveDate = subscriptionInfo.hasActiveSubscription
        ? Math.round(
            new Date(subscriptionInfo.expirations[userActiveSubscription].purchase_date).getTime() /
              ONE_SECOND_AS_MILLIS,
          )
        : Math.round(new Date().getTime() / ONE_SECOND_AS_MILLIS);
      const subscriptionStatus =
        userActiveSubscription === Entitlement.trial || !userActiveSubscription ? TRIALING : ACTIVE;
      // if user current subscription type isn't same as what revenue cat returned, update subscription in ProfitWell
      if (
        last_status_synced_with_profitwell &&
        last_status_synced_with_profitwell !== userActiveSubscription &&
        stripe_customer_id
      ) {
        // update profit well status
        const PROFITWELL_UPDATE_ENDPOINT = `https://api.profitwell.com/v2/subscriptions/${stripe_customer_id}_pw_subscription`;
        const dataForProfitWell = {
          plan_id: userActiveSubscription ?? last_status_synced_with_profitwell,
          plan_interval: MONTH,
          status: subscriptionStatus,
          value: renewalAmountCents,
          effective_date: effectiveDate,
        };
        await axios.put(PROFITWELL_UPDATE_ENDPOINT, dataForProfitWell, {
          headers: {
            Authorization: process.env.PROFITWELL_API_KEY,
          },
        });
        await this.userRepository.update(user_id, {
          profitwell_registration_date: new Date(effectiveDate),
          last_status_synced_with_profitwell: userActiveSubscription ?? last_status_synced_with_profitwell,
        });
        return;
      }
      // register user in profitwell if not registered yet
      if (!profitwell_id && stripe_customer_id) {
        const userAlias = stripe_customer_id;
        const subscriptionAlias = `${stripe_customer_id}_pw_subscription`;

        const profitWellData = new ProfitWellCustomer({
          user_alias: userAlias,
          subscription_alias: subscriptionAlias,
          email: stripe_customer_id,
          plan_id: userActiveSubscription ?? Entitlement.trial,
          plan_interval: MONTH,
          value: renewalAmountCents,
          plan_currency: USD,
          effective_date: effectiveDate,
          status: subscriptionStatus,
        });

        const { data: profitWellUser } = await axios.post(PROFITWELL_ADD_SUBSCRIPTION_ENDPOINT, profitWellData, {
          headers: {
            Authorization: process.env.PROFITWELL_API_KEY,
          },
        });

        await this.userRepository.update(user_id, {
          profitwell_id: profitWellUser.user_id,
          profitwell_registration_date: new Date(),
          last_status_synced_with_profitwell: userActiveSubscription ?? Entitlement.trial,
        });
      }
    } catch (error) {
      console.error({ error, data: error.response?.data });
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
    }
  }
}
