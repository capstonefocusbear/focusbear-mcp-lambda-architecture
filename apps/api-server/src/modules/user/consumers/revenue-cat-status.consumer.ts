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
  BullQueues,
  BullWorkers,
  INTERNAL_TEST,
  MONTH,
  ONE_SECOND_AS_MILLIS,
  PROFITWELL_ADD_SUBSCRIPTION_ENDPOINT,
  TEN_SECONDS_AS_MILLIS,
  TRIALING,
  TRIAL_COST_CENTS,
  TRIAL_LENGTH_DAYS,
  USD,
} from '../../../shared/utils/constants';
import { ProfitWellCustomer } from '../domain/profitwell-customer.model';
import { ProfitWellData } from '../domain/profitwell-data.model';
import { UserService } from '../services/user/user.service';

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

@Processor(BullQueues.REVENUE_CAT_STATUS)
export class RevenueCatStatusConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly revenueCatService: RevenueCatService,
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
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
      data_provider_user_id: stripe_customer_id,
    });

    const { data: profitWellUser } = await axios.post(PROFITWELL_ADD_SUBSCRIPTION_ENDPOINT, profitWellData, {
      headers: {
        Authorization: process.env.PROFITWELL_API_KEY,
      },
    });
    return profitWellUser;
  }

  async updateUserInfo(userId: string, subscriptionInfo: any, userActiveSubscription: string) {
    await this.userRepository.update(userId, {
      revenue_cat_data: subscriptionInfo,
      revenue_cat_status: userActiveSubscription,
      last_date_revenue_cat_data_synced: new Date(),
    });
  }

  async updateSubscriptionStatusInProfitWell(
    user: any,
    userActiveSubscription: Entitlement,
    effectiveDate: number,
    renewalAmountCents: number,
    subscriptionStatus: string,
  ) {
    await this.updateProfitWellSubscription({
      stripe_customer_id: user.stripe_customer_id,
      userActiveSubscription,
      last_status_synced_with_profitwell: user.last_status_synced_with_profitwell,
      subscriptionStatus,
      renewalAmountCents,
      effectiveDate,
    });

    await this.userRepository.update(user.id, {
      profitwell_registration_date: new Date(effectiveDate),
      last_status_synced_with_profitwell: userActiveSubscription ?? user.last_status_synced_with_profitwell,
    });
  }

  @Process(BullWorkers.UPDATE_REVENUE_CAT_STATUS)
  async readOperationJob(job: Job<{ user_id: string }>) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating user revenue cat status',
        data: {
          user_id: job.data.user_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: job.data.user_id });
      if (!user) return;

      const revenueCatUser = await this.revenueCatService.getOrCreateSubscriber(job.data.user_id);
      const subscriptionInfo = this.revenueCatService.checkSubscriptionStatus(revenueCatUser.subscriber);
      const userActiveSubscription = this.getHighestRankingSubscription(subscriptionInfo.activeEntitlements);
      const subscriptionStatus =
        userActiveSubscription === Entitlement.trial || !userActiveSubscription ? TRIALING : ACTIVE;
      await this.updateUserInfo(job.data.user_id, subscriptionInfo, userActiveSubscription);

      if (!user.stripe_customer_id) return;

      let renewalAmountCents = TRIAL_COST_CENTS;
      if (userActiveSubscription === Entitlement.personal) {
        renewalAmountCents = await this.stripeService.getCustomerSubscriptionRate(user.stripe_customer_id);
      }

      // user had trial that's expired now
      if (user.last_status_synced_with_profitwell === Entitlement.trial && !userActiveSubscription) {
        await this.churnTrial(user.profitwell_registration_date, user.stripe_customer_id);
        await this.userRepository.update(job.data.user_id, {
          profitwell_registration_date: null,
          last_status_synced_with_profitwell: null,
        });
        return;
      }

      // has been registered in profitwell, but subscription changed
      if (
        user.last_status_synced_with_profitwell &&
        user.last_status_synced_with_profitwell !== userActiveSubscription
      ) {
        const effectiveDate = this.getEffectiveDate(subscriptionInfo, userActiveSubscription);
        await this.updateSubscriptionStatusInProfitWell(
          user,
          userActiveSubscription,
          effectiveDate,
          renewalAmountCents,
          subscriptionStatus,
        );
        return;
      }

      const { email } = await this.auth0ManagementService.getAuth0User(user.auth0_id);
      if (email.toLowerCase().includes(INTERNAL_TEST)) return;

      const isUserRegistered = await this.userService.doesUserExistInProfitWell(user.stripe_customer_id);
      if (isUserRegistered) return;

      const effectiveDate = this.getEffectiveDate(subscriptionInfo, userActiveSubscription);
      const profitWellUser = await this.registerUserInProfitWell({
        stripe_customer_id: user.stripe_customer_id,
        userActiveSubscription,
        effectiveDate,
        subscriptionStatus,
        renewalAmountCents,
      });

      await this.userRepository.update(job.data.user_id, {
        profitwell_id: profitWellUser.user_id,
        profitwell_registration_date: new Date(),
        last_status_synced_with_profitwell: userActiveSubscription ?? Entitlement.trial,
      });
    } catch (error) {
      console.error({ error, data: error.response?.data });
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
    }
  }

  getEffectiveDate(subscriptionInfo: any, userActiveSubscription: string): number {
    return subscriptionInfo.hasActiveSubscription
      ? Math.round(
          new Date(subscriptionInfo.expirations[userActiveSubscription]?.purchase_date).getTime() /
            ONE_SECOND_AS_MILLIS,
        )
      : Math.round(new Date().getTime() / ONE_SECOND_AS_MILLIS);
  }
}
