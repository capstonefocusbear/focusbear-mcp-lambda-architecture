import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import axios from 'axios';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { RevenueCatService } from '@app/revenue-cat';
import { Auth0ManagementService } from '@app/auth0';
import { StripeService } from '@app/stripe';
import { BrevoService } from '@app/brevo/brevo.service';
import { SendGridService } from '@app/send-grid';
import { UserRepository } from '../../repositories/user.repository';
import { LanguageOptions } from '../../domain/language-options.enum';
import { DeleteUserQueryParamDto } from '../../dto/delete-user-query-params.dto';
import { maskEmail } from '../../../../shared/utils/helpers';
import { BullQueues, BullWorkers, EMAIL_SUBJECTS, FOCUS_BEAR_EMAILS } from '../../../../shared/utils/constants';

@Injectable()
export class UserDataService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly revenueCatService: RevenueCatService,
    private readonly stripeService: StripeService,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly emailService: SendGridService,
    @InjectQueue(BullQueues.USER_DATA) private userDataQueue: Queue,
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
      await this.userDataQueue.add(BullWorkers.GET_USER_PERSONAL_DATA, {
        user_id,
        language,
      });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
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

      if (can_contact) {
        // email payload for notification
        const emailPayload = {
          to: [FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT],
          from: FOCUS_BEAR_EMAILS.SUPPORT,
          replyTo: auth0user.email,
          text: `Account deleted for user with email: ${auth0user.email} and ID: ${user.id}\n\nMessage: ${message}\n\nCan contact: ${can_contact}`,
          subject: `${EMAIL_SUBJECTS.USER_ACCOUNT_DELETE} ${user.id}`,
        };

        // send email payload
        await this.emailService.sendEmail(emailPayload);
      }

      const cliqUrl = `${process.env.ZOHO_CLIQ_BACKEND_BOT_WEBHOOK}?zapikey=${process.env.ZOHO_CLIQ_API_KEY}`;
      const body = {
        channel: process.env.ZOHO_CLIQ_QUIT_UNINSTALL_CHANNEL,
        message: `Account deleted for user with email: ${maskEmail(
          auth0user?.email,
        )} and ID: ${user_id} \n\n Message: ${message ?? ''} \n\n Can contact: ${can_contact ?? false}`,
      };
      const alertPromise = axios.post(cliqUrl, body);

      // conditionally delete in stripe because of issue with stripe IDs being cleared
      if (user.stripe_customer_id) {
        await this.stripeService.deleteStripeCustomer(user.stripe_customer_id);
      }
      await Promise.all([auth0Promise, revenueCatPromise, brevoPromise, userRepositoryPromise, alertPromise]);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
