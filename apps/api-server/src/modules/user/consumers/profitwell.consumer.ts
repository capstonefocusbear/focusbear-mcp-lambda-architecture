/* eslint-disable no-console */
import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { StripeService } from '@app/stripe';
import {
  MONTH,
  PROFITWELL_ADD_SUBSCRIPTION_ENDPOINT,
  TRIALING,
  ACTIVE,
  USD,
  TEN_SECONDS_AS_MILLIS,
  TRIAL,
  TRIAL_COST_CENTS,
} from '../../../shared/utils/constants';
import { ProfitWellCustomer } from '../domain/profitwell-customer.model';
import { UserRepository } from '../repositories/user.repository';
import { Entitlement } from '../../subscription/domain/entitlement.enum';
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

@Processor('profitwell')
export class ProfitWellConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
    private readonly stripeService: StripeService,
  ) {}

  @Process('register-profitwell-user')
  async readOperationJob(
    job: Job<{
      user_id: string;
      stripe_id: string;
      plan_id: Entitlement | null;
      renewalAmountCents: number;
      effectiveDate: number;
    }>,
  ) {
    try {
      const {
        data: { user_id, stripe_id },
      } = job;
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Registering user in ProfitWell',
        data: {
          user_id,
          stripe_id,
        },
      });
      const isUserRegisteredInProfitWell = await this.userService.doesUserExistInProfitWell(stripe_id);
      if (isUserRegisteredInProfitWell) return;
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      const { revenue_cat_data, revenue_cat_status } = user;
      const revenueCatStatus = revenue_cat_status ?? TRIAL;
      let renewalAmountCents = TRIAL_COST_CENTS;
      const hasPersonalSubscription = revenue_cat_data?.activeEntitlements?.includes(Entitlement.personal);
      if (hasPersonalSubscription) {
        renewalAmountCents = await this.stripeService.getCustomerSubscriptionRate(stripe_id);
      }
      const effectiveDate = revenue_cat_data?.hasActiveSubscription
        ? Math.round(new Date(revenue_cat_data?.expirations[revenueCatStatus]?.purchase_date).getTime() / 1000)
        : Math.round(new Date().getTime() / 1000);
      const userAlias = stripe_id;
      const subscriptionAlias = `${stripe_id}_pw_subscription`;
      const subscriptionStatus = revenueCatStatus === Entitlement.trial ? TRIALING : ACTIVE;

      const dataForProfitWell = new ProfitWellCustomer({
        user_alias: userAlias,
        subscription_alias: subscriptionAlias,
        email: stripe_id,
        plan_id: revenueCatStatus,
        plan_interval: MONTH,
        value: renewalAmountCents,
        plan_currency: USD,
        effective_date: effectiveDate,
        status: subscriptionStatus,
        data_provider_user_id: stripe_id,
      });

      const { data: profitWellUser } = await axios.post(PROFITWELL_ADD_SUBSCRIPTION_ENDPOINT, dataForProfitWell, {
        headers: {
          Authorization: process.env.PROFITWELL_API_KEY,
        },
      });

      await this.userRepository.update(user_id, {
        profitwell_id: profitWellUser.user_id,
        profitwell_registration_date: new Date(),
      });
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      console.log(
        'Error in ProfitWell queued job: ',
        'Req: ',
        error?.request?.config?.data,
        'Res: ',
        error?.response?.data,
      );
    }
  }
}
