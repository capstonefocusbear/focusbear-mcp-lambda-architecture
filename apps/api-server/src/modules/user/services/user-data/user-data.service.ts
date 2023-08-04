import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import * as axios from 'axios';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { RevenueCatService } from '@app/revenue-cat';
import { Auth0ManagementService } from '@app/auth0';
import { StripeService } from '@app/stripe';
import { UserRepository } from '../../repositories/user.repository';
import { LanguageOptions } from '../../domain/language-options.enum';

@Injectable()
export class UserDataService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly revenueCatService: RevenueCatService,
    private readonly stripeService: StripeService,
    @InjectSentry() private readonly sentryService: SentryService,
    @InjectQueue('user-data') private userDataQueue: Queue,
  ) {}

  async processAndEmailUserData(user_id: string, language: LanguageOptions) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching user personal data',
        data: {
          user_id,
        },
      });
      await this.userDataQueue.add('get-user-personal-data', {
        user_id,
        language,
      });
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
      const auth0user = await this.auth0ManagementService.getAuth0User(user.auth0_id);
      const auth0Promise = this.auth0ManagementService.deleteAuth0User(user.auth0_id);
      const revenueCatPromise = this.revenueCatService.deleteUserFromRevenueCat(user_id);
      const stripePromise = this.stripeService.deleteStripeCustomer(user.stripe_customer_id);
      const userRepositoryPromise = this.userRepository.orm.delete({ id: user_id });
      const backendAlertPromise = axios.default.post(process.env.SLACK_BACKEND_ALERTS_WEBHOOK, {
        text: `Account deleted for user with email: ${auth0user?.email} and ID: ${user_id}`,
      });
      await Promise.all([auth0Promise, revenueCatPromise, stripePromise, userRepositoryPromise, backendAlertPromise]);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }
}
