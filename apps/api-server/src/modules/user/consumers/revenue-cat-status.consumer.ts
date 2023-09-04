import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { RevenueCatService } from '@app/revenue-cat';
import { Auth0ManagementService } from '@app/auth0';
import { StripeService } from '@app/stripe';
import { UserRepository } from '../repositories/user.repository';
import { Entitlement } from '../../subscription/domain/entitlement.enum';
import {
  ACTIVE,
  INTERNAL_TEST,
  MONTH,
  ONE_SECOND_AS_MILLIS,
  PERSONAL_PLAN_COST_CENTS,
  PROFITWELL_ADD_SUBSCRIPTION_ENDPOINT,
  TEN_SECONDS_AS_MILLIS,
  TRIALING,
  TRIAL_COST_CENTS,
  TRIAL_LENGTH_DAYS,
  USD,
} from '../../../shared/utils/constants';
import { ProfitWellCustomer } from '../domain/profitwell-customer.model';
import { ProfitWellData } from '../domain/profitwell-data.model';

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
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly stripeService: StripeService,
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

  async churnTrial(registration_date: Date, stripe_customer_id: string) {
    const churnType = 'delinquent';
    const churnDate = new Date(registration_date);
    churnDate.setDate(churnDate.getDate() + TRIAL_LENGTH_DAYS);
    const churnTime = Math.floor(churnDate.getTime() / ONE_SECOND_AS_MILLIS);
    const CHURN_URL = `https://api.profitwell.com/v2/subscriptions/${stripe_customer_id}_pw_subscription/?effective_date=${churnTime}&churn_type=${churnType}`;
    await axios.delete(CHURN_URL, {
      headers: {
        Authorization: process.env.PROFITWELL_API_KEY,
      },
    });
  }

  async updateProfitWellSubscription({
    stripe_customer_id,
    userActiveSubscription,
    last_status_synced_with_profitwell,
    subscriptionStatus,
    renewalAmountCents,
    effectiveDate,
  }: ProfitWellData) {
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
  }

  async registerUserInProfitWell({
    stripe_customer_id,
    userActiveSubscription,
    effectiveDate,
    subscriptionStatus,
    renewalAmountCents,
  }: ProfitWellData) {
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
    return profitWellUser;
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
      const { last_status_synced_with_profitwell, profitwell_id, profitwell_registration_date, stripe_customer_id } =
        user;
      const revenueCatUser = await this.revenueCatService.getOrCreateSubscriber(user_id);
      const subscriptionInfo = this.revenueCatService.checkSubscriptionStatus(revenueCatUser.subscriber);
      const userActiveSubscription = this.getHighestRankingSubscription(subscriptionInfo.activeEntitlements);
      await this.userRepository.update(user_id, {
        revenue_cat_data: subscriptionInfo,
        revenue_cat_status: userActiveSubscription,
        last_date_revenue_cat_data_synced: new Date(),
      });
      const effectiveDate = subscriptionInfo.hasActiveSubscription
        ? Math.round(
            new Date(subscriptionInfo.expirations[userActiveSubscription].purchase_date).getTime() /
              ONE_SECOND_AS_MILLIS,
          )
        : Math.round(new Date().getTime() / ONE_SECOND_AS_MILLIS);
      const subscriptionStatus =
        userActiveSubscription === Entitlement.trial || !userActiveSubscription ? TRIALING : ACTIVE;
      // Avoid syncing user in ProfitWell if they don't have a Stripe ID
      if (!stripe_customer_id) {
        return;
      }
      let renewalAmountCents = TRIAL_COST_CENTS;
      const hasPersonalSubscription =
        userActiveSubscription === Entitlement.personal ? PERSONAL_PLAN_COST_CENTS : TRIAL_COST_CENTS;
      if (hasPersonalSubscription) {
        renewalAmountCents = await this.stripeService.getCustomerSubscriptionRate(stripe_customer_id);
      }
      // churn user if their trial expired
      if (last_status_synced_with_profitwell === Entitlement.trial && !userActiveSubscription && stripe_customer_id) {
        await this.churnTrial(profitwell_registration_date, stripe_customer_id);
        await this.userRepository.update(user_id, {
          profitwell_registration_date: null,
          last_status_synced_with_profitwell: null,
        });
        return;
      }
      // if user current subscription type isn't same as what revenue cat returned, update subscription in ProfitWell
      if (
        last_status_synced_with_profitwell &&
        last_status_synced_with_profitwell !== userActiveSubscription &&
        stripe_customer_id
      ) {
        // update profit well status
        await this.updateProfitWellSubscription({
          stripe_customer_id,
          userActiveSubscription,
          last_status_synced_with_profitwell,
          subscriptionStatus,
          renewalAmountCents,
          effectiveDate,
        });
        await this.userRepository.update(user_id, {
          profitwell_registration_date: new Date(effectiveDate),
          last_status_synced_with_profitwell: userActiveSubscription ?? last_status_synced_with_profitwell,
        });
        return;
      }
      // Avoid registering tets users with ProfitWell to keep analytics data accurate
      const { email } = await this.auth0ManagementService.getAuth0User(user.auth0_id);
      const isTestUser = email.toLowerCase().includes(INTERNAL_TEST);
      if (isTestUser) {
        return;
      }
      // register user in profitwell if not registered yet
      if (!profitwell_id && stripe_customer_id) {
        const profitWellUser = await this.registerUserInProfitWell({
          stripe_customer_id,
          userActiveSubscription,
          effectiveDate,
          subscriptionStatus,
          renewalAmountCents,
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
