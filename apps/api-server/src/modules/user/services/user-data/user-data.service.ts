import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import axios from 'axios';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { RevenueCatService } from '@app/revenue-cat';
import { Auth0ManagementService } from '@app/auth0';
import { StripeService } from '@app/stripe';
import { BrevoService } from '@app/brevo/brevo.service';
import { SendGridService, isTestEmail } from '@app/send-grid';
import { UserRepository } from '../../repositories/user.repository';
import { LanguageOptions } from '../../../../shared/domain/language-options.enum';
import { DeleteUserQueryParamDto } from '../../dto/delete-user-query-params.dto';
import { maskEmail } from '../../../../shared/utils/helpers';
import { BullQueues, BullWorkers, EMAIL_SUBJECTS, FOCUS_BEAR_EMAILS } from '../../../../shared/utils/constants';
import { User } from '../../entities/user.entity';
import { SurveyAnswerMetadata } from '../../../survey/entities/survey-answer-metadata.entity';
import { SurveyAnswer } from '../../../survey/entities/survey-answer.entity';
import { Survey } from '../../../survey/entities/survey.entity';
import { LessonCompletion } from '../../../lesson/entities/lesson-completion.entity';
import { Tutorial } from '../../../activity/entities/tutorial.entity';
import { UsageData } from '../../entities/usage-data.entity';
import { HealthMetrics } from '../../entities/health-metrics.entity';

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

  async deleteUser(user_id: string, { message, can_contact }: DeleteUserQueryParamDto, headers: any) {
    // extracting App_platform from the header
    const requestHeaders = { ...headers };
    const appPlatform = requestHeaders.platform;
    // remove user access token from logged headers - better security
    delete requestHeaders.authorization;

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

      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exists!`);

      const auth0user = await this.auth0ManagementService.getAuth0User(user.auth0_id);
      if (auth0user) {
        await this.auth0ManagementService.deleteAuth0User(user.auth0_id);
      }

      await this.deleteUserDataFromDatabase(user_id);

      const cleanupTasks: Array<{ label: string; promise: Promise<unknown> }> = [];
      const revenueCatUser = await this.revenueCatService.getSubscriberFromRevenueCat(user_id);
      if (revenueCatUser) {
        cleanupTasks.push({
          label: 'RevenueCat user deletion',
          promise: this.revenueCatService.deleteUserFromRevenueCat(user_id),
        });
      }

      // Check if this is an internal test account
      const email = auth0user?.email || '';
      const isInternalTestAccount = isTestEmail(email);
      const shouldSendNotification = isInternalTestAccount ? message?.toLowerCase().startsWith('dolog') : true;

      if (can_contact && shouldSendNotification) {
        // email payload for notification
        const emailPayload = {
          to: [FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT],
          from: FOCUS_BEAR_EMAILS.SUPPORT,
          replyTo: auth0user.email,
          text: `Account deleted for user with email: ${auth0user.email} and ID: ${user.id}\n\nMessage: ${message}\n\nCan contact: ${can_contact}`,
          subject: `${EMAIL_SUBJECTS.USER_ACCOUNT_DELETE} ${user.id}`,
        };

        // send email payload
        cleanupTasks.push({
          label: 'Delete notification email',
          promise: this.emailService.sendEmail(emailPayload),
        });
      }

      // Cliq message included user's plaform
      if (shouldSendNotification) {
        const cliqUrl = `${process.env.ZOHO_CLIQ_BACKEND_BOT_WEBHOOK}?zapikey=${process.env.ZOHO_CLIQ_API_KEY}`;
        const body = {
          channel: process.env.ZOHO_CLIQ_QUIT_UNINSTALL_CHANNEL,
          message: `Account deleted for user with email: ${maskEmail(
            auth0user?.email,
          )} and ID: ${user_id} \n\n Message: ${message ?? ''} \n\n Can contact: ${
            can_contact ?? false
          } \n\n Platform: ${appPlatform}`,
        };
        cleanupTasks.push({
          label: 'Cliq delete notification',
          promise: axios.post(cliqUrl, body),
        });
      }

      // conditionally delete in stripe because of issue with stripe IDs being cleared
      if (user.stripe_customer_id) {
        cleanupTasks.push({
          label: 'Stripe customer deletion',
          promise: this.stripeService.deleteStripeCustomer(user.stripe_customer_id),
        });
      }

      if (auth0user?.email) {
        cleanupTasks.push({
          label: 'Brevo contact deletion',
          promise: this.brevoService.deleteContactFromBrevo(auth0user.email),
        });
      }

      await this.runBestEffortCleanup(cleanupTasks, user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private async deleteUserDataFromDatabase(userId: string) {
    try {
      await this.userRepository.orm.manager.transaction(async (manager) => {
        await manager.delete(SurveyAnswerMetadata, { user_id: userId });
        await manager.delete(SurveyAnswer, { user_id: userId });
        await manager.delete(Survey, { creator: userId });
        await manager.delete(LessonCompletion, { user_id: userId });
        await manager.delete(Tutorial, { user_id: userId });
        await manager.delete(UsageData, { userId });
        await manager.delete(HealthMetrics, { userId });
        await manager.delete(User, { id: userId });
      });
    } catch (error) {
      throw new InternalServerErrorException(`Failed to delete user ${userId} from database`);
    }
  }

  private async runBestEffortCleanup(tasks: Array<{ label: string; promise: Promise<unknown> }>, userId: string) {
    if (!tasks.length) return;

    const results = await Promise.allSettled(tasks.map((task) => task.promise));

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.sentryService.instance().captureException(result.reason, {
          level: 'error',
          extra: {
            userId,
            task: tasks[index].label,
          },
        });
      }
    });
  }
}
