import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { I18nService } from 'nestjs-i18n';
import { RevenueCatService } from '@app/revenue-cat';
import { Auth0ManagementService } from '@app/auth0';
import { R2Service } from '@app/r2/services/r2.service';
import { SendGridService } from '@app/send-grid';
import { UserRepository } from '../repositories/user.repository';
import { LanguageOptions } from '../domain/language-options.enum';
import { FOCUS_BEAR_TEAM_EMAIL } from '../../../shared/utils/constants';

@Processor('user-data')
export class UserPersonalDataConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly revenueCatService: RevenueCatService,
    private readonly userRepository: UserRepository,
    private readonly r2Service: R2Service,
    private readonly emailService: SendGridService,
    private readonly i18nService: I18nService,
  ) {}

  @Process('get-user-personal-data')
  async readOperationJob(
    job: Job<{
      user_id: string;
      language: LanguageOptions;
    }>,
  ) {
    const {
      data: { user_id, language },
    } = job;
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching all user personal data and saving it to R2 bucket',
        data: {
          user_id,
        },
      });
      const userFocusBearData = await this.userRepository.orm.findOne({
        where: { id: user_id },
        relations: ['devices', 'activities', 'activities.log_quantity_questions', 'focus_modes'],
      });
      const auth0Promise = this.auth0ManagementService.getAuth0User(userFocusBearData.auth0_id);
      const revenueCatPromise = this.revenueCatService.getOrCreateSubscriber(user_id);
      const [userAuth0Data, userRevenueCatData] = await Promise.all([auth0Promise, revenueCatPromise]);
      await this.r2Service.addObjectToBucket('user-data', user_id, {
        focus_bear_data: userFocusBearData,
        auth0_data: userAuth0Data,
        revenue_cat_data: userRevenueCatData,
      });
      const downloadLink = await this.r2Service.getPresignedUrl('user-data', `${user_id}.json`);
      await this.emailService.sendEmail({
        to: userFocusBearData.email,
        from: FOCUS_BEAR_TEAM_EMAIL,
        text: this.i18nService.t('common.user_data_email_body', { lang: language, args: { link: downloadLink } }),
        subject: this.i18nService.t('common.user_data_email_header', { lang: language }),
      });
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
    }
  }
}
