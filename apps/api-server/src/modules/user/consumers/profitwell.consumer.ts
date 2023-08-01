import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import * as axios from 'axios';
import { MONTH, PROFITWELL_ADD_SUBSCRIPTION_ENDPOINT, TRIAL, TRIALING, USD } from '../../../shared/utils/constants';
import { ProfitWellCustomer } from '../domain/profitwell-customer.model';
import { UserRepository } from '../repositories/user.repository';

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

      const renewalAmountCents = 0;
      const planPeriod = MONTH;
      const userAlias = stripe_id;
      const subscriptionAlias = `${stripe_id}_trial`;

      const dataForProfitWell = new ProfitWellCustomer({
        user_alias: userAlias,
        subscription_alias: subscriptionAlias,
        email: stripe_id,
        plan_id: TRIAL,
        plan_interval: planPeriod,
        value: renewalAmountCents,
        plan_currency: USD,
        effective_date: Math.round(new Date().getTime() / 1000),
        status: TRIALING,
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
