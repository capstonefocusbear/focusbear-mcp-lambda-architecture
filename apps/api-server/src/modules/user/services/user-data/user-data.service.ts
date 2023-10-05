import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import axios from 'axios';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { RevenueCatService } from '@app/revenue-cat';
import { Auth0ManagementService } from '@app/auth0';
import { StripeService } from '@app/stripe';
import { BrevoService } from '@app/brevo/brevo.service';
import { UserRepository } from '../../repositories/user.repository';
import { LanguageOptions } from '../../domain/language-options.enum';
import { DeleteUserQueryParamDto } from '../../dto/delete-user-query-params.dto';
import { maskEmail } from '../../../../shared/utils/helpers';

@Injectable()
export class UserDataService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly revenueCatService: RevenueCatService,
    private readonly stripeService: StripeService,
    @InjectSentry() private readonly sentryService: SentryService,
    @InjectQueue('user-data') private userDataQueue: Queue,
    private readonly brevoService: BrevoService,
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

  async deleteUser(user_id: string, { message, can_contact }: DeleteUserQueryParamDto) {
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
      const brevoPromise = this.brevoService.deleteContactFromBrevo(auth0user.email);
      const userRepositoryPromise = this.userRepository.orm.delete({ id: user_id });
      const backendAlertPromise = axios.post(process.env.SLACK_BACKEND_ALERTS_WEBHOOK, {
        text: `Account deleted for user with email: ${maskEmail(auth0user?.email)} and ID: ${user_id} \n\n Message: ${
          message ?? ''
        } \n\n Can contact: ${can_contact ?? false}`,
      });
      // conditionally delete in stripe because of issue with stripe IDs being cleared
      if (user.stripe_customer_id) {
        await this.stripeService.deleteStripeCustomer(user.stripe_customer_id);
      }
      await Promise.all([auth0Promise, revenueCatPromise, brevoPromise, userRepositoryPromise, backendAlertPromise]);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }
}
