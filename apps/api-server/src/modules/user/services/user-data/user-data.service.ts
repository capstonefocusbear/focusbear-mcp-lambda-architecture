import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import * as axios from 'axios';
import { Auth0ManagementService } from '../../../../../../../libs/auth0/src';
import { UserRepository } from '../../repositories/user.repository';
import { RevenueCatService } from '../../../../../../../libs/revenue-cat/src';
import { StripeService } from '../../../../../../../libs/stripe/src';

@Injectable()
export class UserDataService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly revenueCatService: RevenueCatService,
    private readonly stripeService: StripeService,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async getAllUserPersonalData(user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching user personal data',
        data: {
          user_id,
        },
      });
      const userFocusBearData = await this.userRepository.orm.findOne({
        where: { id: user_id },
        relations: [
          'devices',
          'activity_sequences',
          'activities',
          'completed_activities',
          'focus_modes',
          'completed_focus_blocks',
          'log_quantity_questions',
          'log_quantity_answers',
        ],
      });
      const auth0Promise = this.auth0ManagementService.getAuth0User(userFocusBearData.auth0_id);
      const revenueCatPromise = this.revenueCatService.getOrCreateSubscriber(user_id);
      const [userAuth0Data, userRevenueCatData] = await Promise.all([auth0Promise, revenueCatPromise]);
      return { focus_bear_data: userFocusBearData, auth0_data: userAuth0Data, revenue_cat_data: userRevenueCatData };
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async deleteUser(user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Deleting user accounts',
        data: {
          user_id,
        },
      });
      const user = await this.userRepository.orm.findOne({
        where: { id: user_id },
      });
      const auth0Promise = this.auth0ManagementService.deleteAuth0User(user.auth0_id);
      const revenueCatPromise = this.revenueCatService.deleteUserFromRevenueCat(user_id);
      const stripePromise = this.stripeService.deleteStripeCustomer(user.stripe_customer_id);
      const userRepositoryPromise = this.userRepository.orm.delete({ id: user_id });
      const backendAlertPromise = axios.default.post(process.env.SLACK_BACKEND_ALERTS_WEBHOOK, {
        text: 'Account deleted for user with email: testaccountdeletion@mail.com and ID: 41765292-33d0-4834-a387-97bddd5c0500',
      });
      await Promise.all([auth0Promise, revenueCatPromise, stripePromise, userRepositoryPromise, backendAlertPromise]);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }
}
