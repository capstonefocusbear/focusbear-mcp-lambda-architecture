import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@app/observability';
import { Job } from 'bull';
import { RevenueCatService } from '@app/revenue-cat';
import { UserRepository } from '../repositories/user.repository';
import { Entitlement } from '../../subscription/domain/entitlement.enum';
import { BullQueues, BullWorkers, ONE_DAY_MILLISECONDS, TRIAL_LENGTH_DAYS } from '../../../shared/utils/constants';

@Processor(BullQueues.REVENUE_CAT_STATUS)
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

  async updateRevenueCatInfo(userId: string, subscriptionInfo: any, userActiveSubscription: string) {
    await this.userRepository.update(userId, {
      revenue_cat_data: subscriptionInfo,
      revenue_cat_status: userActiveSubscription,
      last_date_revenue_cat_data_synced: new Date(),
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
      let revenueCatUser = await this.revenueCatService.getOrCreateSubscriber(job.data.user_id);
      // Check if new users have trial subscription
      if (new Date(user.created_at) > new Date(new Date().getTime() - TRIAL_LENGTH_DAYS * ONE_DAY_MILLISECONDS)) {
        // Check if the object has a trial entitlement
        if (!revenueCatUser.entitlements[Entitlement.trial]) {
          revenueCatUser = await this.revenueCatService.grantTrialAccess(job.data.user_id);
        }
      }
      const subscriptionInfo = this.revenueCatService.checkSubscriptionStatus(revenueCatUser);
      const userActiveSubscription = this.getHighestRankingSubscription(subscriptionInfo.activeEntitlements);
      await this.updateRevenueCatInfo(user.id, subscriptionInfo, userActiveSubscription);
    } catch (error) {
      console.error({ error, data: error.response?.data });
      this.sentryService.instance().captureException(error, { level: 'error' });
    }
  }
}
