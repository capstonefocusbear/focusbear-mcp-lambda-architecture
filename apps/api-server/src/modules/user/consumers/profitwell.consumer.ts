import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import * as axios from 'axios';
import { MONTH, PROFITWELL_ADD_SUBSCRIPTION_ENDPOINT, TRIALING, ACTIVE, USD } from '../../../shared/utils/constants';
import { ProfitWellCustomer } from '../domain/profitwell-customer.model';
import { UserRepository } from '../repositories/user.repository';
import { Entitlement } from '../../subscription/domain/entitlement.enum';

@Processor('profitwell')
export class ProfitWellConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly userRepository: UserRepository,
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
        data: { user_id, stripe_id, plan_id, renewalAmountCents, effectiveDate },
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

      const userAlias = stripe_id;
      const subscriptionAlias = `${stripe_id}_pw_subscription`;
      const subscriptionStatus = plan_id === Entitlement.trial ? TRIALING : ACTIVE;

      const dataForProfitWell = new ProfitWellCustomer({
        user_alias: userAlias,
        subscription_alias: subscriptionAlias,
        email: stripe_id,
        plan_id,
        plan_interval: MONTH,
        value: renewalAmountCents,
        plan_currency: USD,
        effective_date: effectiveDate,
        status: subscriptionStatus,
      });

      const { data: profitWellUser } = await axios.default.post(
        PROFITWELL_ADD_SUBSCRIPTION_ENDPOINT,
        dataForProfitWell,
        {
          headers: {
            Authorization: process.env.PROFITWELL_API_KEY,
          },
        },
      );

      await this.userRepository.update(user_id, {
        profitwell_id: profitWellUser.user_id,
        profitwell_registration_date: new Date(),
      });
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      // eslint-disable-next-line no-console
      console.log('Error in ProfitWell queued job: ', error);
    }
  }
}
